// =============================================================================
// Reference Preview (Phase 3) — 공개 API.
//
//   import { buildEditableTemplateWithPreview } from "@/reference-preview";
//   const { designRecipe, templateBlueprint, referencePreview } =
//     buildEditableTemplateWithPreview({ type:"monthly_plan", theme:"여름이 왔어요", age:"3~5세", month:"6월" });
//   // referencePreview.previewUrl → /generated-previews/monthly_plan_v1/summer-preview.png
//
// Reference Preview = 보기용(편집 불가). 실제 편집은 Template Blueprint.
// 기본은 기존 에셋만 연결(GPT 생성 X). 누락 에셋까지 생성하려면 opts.client 전달.
// =============================================================================
import { buildDesign } from "../builder";
import type { DesignBuildResult } from "../builder";
import type { DesignRecipeInput } from "../design-recipe";
import { linkExistingAssets, hydrateBlueprintAssets, findStoredAsset } from "../asset-generator";
import type { GPTImageClient } from "../asset-generator";

/** 테마의 배경 이미지 URL 해석 (sky → hill → lake 순, 저장된 것 사용) */
function resolveBackgroundImageUrl(family: string): string | null {
  for (const name of [`${family}_sky`, `${family}_hill`, `${family}_lake`]) {
    const found = findStoredAsset(name, family);
    if (found) return found.imageUrl;
  }
  return null;
}
import { generateReferencePreview } from "./previewRenderer";
import type { ReferencePreview } from "./types";

export { generateReferencePreview, buildRenderSpec } from "./previewRenderer";
export { savePreview } from "./previewStorage";
export { renderBackground, renderShapes, renderAssets } from "./layerRenderer";
export { renderText } from "./textRenderer";
export type { ReferencePreview, RenderSpec, DrawOp } from "./types";

export interface BuildWithPreviewResult extends DesignBuildResult {
  referencePreview: ReferencePreview;
}

export interface BuildWithPreviewOptions {
  /** 전달 시 누락 에셋을 GPT 로 생성(Phase 2). 미전달 시 기존 에셋만 연결(비용 0). */
  client?: GPTImageClient;
  forceRegenerate?: boolean;
  /** 배경 이미지를 캔버스 전체에 깔지 (기본 true). false 면 색 채움만. */
  background?: boolean;
}

/**
 * 통합(Phase 3) — 입력 → Design Recipe → Blueprint → (에셋 연결) → Reference Preview.
 */
export function buildEditableTemplateWithPreview(
  input: DesignRecipeInput,
  options: BuildWithPreviewOptions = {}
): BuildWithPreviewResult {
  // 1~2. Design Recipe + Template Blueprint
  const { designRecipe, templateBlueprint } = buildDesign(input);

  // 3~4. 에셋 imageUrl 연결 — client 있으면 GPT 생성, 없으면 기존 파일만 연결
  const linked = options.client
    ? // 주의: GPT 생성은 async — client 옵션 사용 시 아래 async 버전을 쓰세요.
      (() => {
        throw new Error("client 옵션은 buildEditableTemplateWithPreviewAsync 를 사용하세요.");
      })()
    : linkExistingAssets(templateBlueprint);

  // 5. Reference Preview 생성 (배경 이미지 깔기)
  const backgroundImageUrl =
    options.background === false ? null : resolveBackgroundImageUrl(designRecipe.themeFamily);
  const referencePreview = generateReferencePreview({ designRecipe, templateBlueprint: linked, backgroundImageUrl });

  // 6. 반환
  return { designRecipe, templateBlueprint: linked, referencePreview };
}

/** GPT 누락 에셋 생성까지 포함하는 async 버전 */
export async function buildEditableTemplateWithPreviewAsync(
  input: DesignRecipeInput,
  options: BuildWithPreviewOptions = {}
): Promise<BuildWithPreviewResult> {
  const { designRecipe, templateBlueprint } = buildDesign(input);
  const linked = options.client
    ? await hydrateBlueprintAssets(templateBlueprint, {
        styleFamily: designRecipe.styleFamily,
        client: options.client,
        forceRegenerate: options.forceRegenerate,
      })
    : linkExistingAssets(templateBlueprint);
  const backgroundImageUrl =
    options.background === false ? null : resolveBackgroundImageUrl(designRecipe.themeFamily);
  const referencePreview = generateReferencePreview({ designRecipe, templateBlueprint: linked, backgroundImageUrl });
  return { designRecipe, templateBlueprint: linked, referencePreview };
}
