// =============================================================================
// Asset Generator — 카탈로그 기반 개별 에셋 생성 + Blueprint hydrate + 통합 함수.
// (포스터 X — 개별 에셋 이미지만 GPT 로 생성·저장하고 Blueprint imageUrl 에 연결)
// =============================================================================
import { buildDesign } from "../builder";
import type { DesignBuildResult } from "../builder";
import type { DesignRecipeInput, StyleFamily } from "../design-recipe";
import { validateAssetSlot } from "../asset-family";
import type { AssetSlot, Layer, LayerChild, TemplateBlueprint } from "../template-blueprint";
import { buildAssetPrompt } from "./promptBuilder";
import { getDefaultClient } from "./gptImageClient";
import { findStoredAsset, saveGeneratedAsset } from "./assetStorage";

/**
 * 이미 저장된 에셋의 imageUrl 만 Blueprint 에 연결한다 (GPT 생성 X, 비용 0).
 * 파일 없는 슬롯은 imageUrl=null 유지.
 */
export function linkExistingAssets(blueprint: TemplateBlueprint): TemplateBlueprint {
  const layers: Layer[] = blueprint.layers.map((layer) => ({
    ...layer,
    children: layer.children.map((child) => {
      if (typeof (child as AssetSlot).assetId === "string") {
        const slot = child as AssetSlot;
        const found = findStoredAsset(slot.assetId, slot.assetFamily);
        return { ...slot, imageUrl: found?.imageUrl ?? null };
      }
      return child;
    }),
  }));
  return { ...blueprint, layers };
}
import type { AssetQuality, GPTImageClient, GeneratedAsset, GeneratedAssetRole } from "./types";

/** 역할별 기본 품질 — 스티커류는 비용 절감 위해 low, 배경만 high */
function defaultQuality(role: GeneratedAssetRole): AssetQuality {
  return role === "background" ? "high" : "low";
}

function nowIso(): string {
  // tsx/Node 런타임 — Date 사용 가능
  return new Date().toISOString();
}

function isAssetSlot(child: LayerChild): child is AssetSlot {
  return typeof (child as AssetSlot).assetId === "string";
}

export interface GenerateAssetParams {
  assetId: string;
  assetFamily: string;
  assetRole: GeneratedAssetRole;
  styleFamily: StyleFamily;
  client?: GPTImageClient;
  forceRegenerate?: boolean;
  /** 미지정 시 역할 기반 기본값(스티커 low / 배경 high) */
  quality?: AssetQuality;
}

/**
 * 카탈로그의 단일 에셋 생성.
 * 1) 카탈로그 확인 → 2) 기존 이미지 확인 → 3) 있으면 반환
 * 4) 없으면 프롬프트 생성 → 5) GPT 호출 → 6) 저장 → 7) GeneratedAsset 반환
 */
export async function generateAssetFromCatalog(params: GenerateAssetParams): Promise<GeneratedAsset> {
  const { assetId, assetFamily, assetRole, styleFamily, forceRegenerate } = params;

  // 1. 카탈로그에 assetId 존재 확인 (없으면 throw)
  validateAssetSlot(assetId, assetFamily);

  const prompt = buildAssetPrompt({ assetId, assetRole, styleFamily });

  // 2~3. 이미 생성된 이미지가 있으면 재사용 (중복 생성 방지)
  if (!forceRegenerate) {
    const existing = findStoredAsset(assetId, assetFamily);
    if (existing) {
      return {
        assetId, assetFamily, assetRole, prompt,
        imageUrl: existing.imageUrl, mimeType: existing.mimeType,
        model: "gpt-image", createdAt: nowIso(), cached: true,
      };
    }
  }

  // 4~5. 프롬프트 → GPT 이미지 (스티커 기본 low quality)
  const client = params.client ?? getDefaultClient();
  const quality = params.quality ?? defaultQuality(assetRole);
  const { imageBuffer, mimeType } = await client.generateImage(prompt, {
    transparent: assetRole !== "background",
    quality,
  });

  // 6. 저장
  const stored = saveGeneratedAsset({ assetId, assetFamily, imageBuffer, mimeType, forceRegenerate });

  // 7. 반환
  return {
    assetId, assetFamily, assetRole, prompt,
    imageUrl: stored.imageUrl, mimeType: stored.mimeType,
    model: "gpt-image", createdAt: nowIso(), cached: false,
  };
}

export interface HydrateOptions {
  styleFamily: StyleFamily;
  client?: GPTImageClient;
  forceRegenerate?: boolean;
  /** 전체 슬롯 품질 override (미지정 시 역할 기반 기본값) */
  quality?: AssetQuality;
}

/** Template Blueprint 의 모든 AssetSlot 에 imageUrl 연결 (새 Blueprint 반환) */
export async function hydrateBlueprintAssets(
  blueprint: TemplateBlueprint,
  options: HydrateOptions
): Promise<TemplateBlueprint> {
  const layers: Layer[] = [];
  for (const layer of blueprint.layers) {
    const children: LayerChild[] = [];
    for (const child of layer.children) {
      if (isAssetSlot(child)) {
        const gen = await generateAssetFromCatalog({
          assetId: child.assetId,
          assetFamily: child.assetFamily,
          assetRole: child.assetRole,
          styleFamily: options.styleFamily,
          client: options.client,
          forceRegenerate: options.forceRegenerate,
          quality: options.quality,
        });
        children.push({ ...child, imageUrl: gen.imageUrl });
      } else {
        children.push(child);
      }
    }
    layers.push({ ...layer, children });
  }
  return { ...blueprint, layers };
}

export interface BuildWithAssetsOptions {
  client?: GPTImageClient;
  forceRegenerate?: boolean;
  quality?: AssetQuality;
}

/**
 * 통합(Phase 2) — 입력 → Phase 1 Blueprint → 에셋 생성 → imageUrl 연결.
 */
export async function buildEditableTemplateWithGeneratedAssets(
  input: DesignRecipeInput,
  options: BuildWithAssetsOptions = {}
): Promise<DesignBuildResult> {
  const { designRecipe, templateBlueprint } = buildDesign(input);
  const hydrated = await hydrateBlueprintAssets(templateBlueprint, {
    styleFamily: designRecipe.styleFamily,
    client: options.client,
    forceRegenerate: options.forceRegenerate,
    quality: options.quality,
  });
  return { designRecipe, templateBlueprint: hydrated };
}
