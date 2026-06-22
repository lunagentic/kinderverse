// =============================================================================
// Reference Preview Renderer — Blueprint + 에셋 → 완성 예시 미리보기 PNG.
// Layer 합성 순서: background → shape → decoration → sticker → text (text 최상단).
// =============================================================================
import type { DesignRecipe } from "../design-recipe";
import type { Layer, TemplateBlueprint } from "../template-blueprint";
import { renderBackground, renderShapes, renderAssets } from "./layerRenderer";
import { renderText } from "./textRenderer";
import { savePreview } from "./previewStorage";
import type { DrawOp, ReferencePreview, RenderSpec } from "./types";

function layerOf(bp: TemplateBlueprint, type: Layer["type"]): Layer | undefined {
  return bp.layers.find((l) => l.type === type);
}

export interface GeneratePreviewInput {
  designRecipe: DesignRecipe;
  templateBlueprint: TemplateBlueprint;
  /** 캔버스 전체에 깔 배경 이미지 URL (예: /generated-assets/summer/summer_sky.png) */
  backgroundImageUrl?: string | null;
}

/** Blueprint → Render Spec (그리기 명령 목록) */
export function buildRenderSpec(bp: TemplateBlueprint, backgroundImageUrl?: string | null): RenderSpec {
  const bg = layerOf(bp, "background");
  const shape = layerOf(bp, "shape");
  const decoration = layerOf(bp, "decoration");
  const sticker = layerOf(bp, "sticker");
  const text = layerOf(bp, "text");
  const canvas = { width: bp.canvas.width, height: bp.canvas.height };

  const ops: DrawOp[] = [];
  if (bg) ops.push(...renderBackground(bg, canvas, backgroundImageUrl)); // fill + 배경이미지
  if (shape) ops.push(...renderShapes(shape));
  if (decoration) ops.push(...renderAssets(decoration)); // decoration 먼저
  if (sticker) ops.push(...renderAssets(sticker)); // sticker 다음
  if (text) ops.push(...renderText(text)); // text 최상단

  const bgColor = (renderBackground(bg ?? ({ children: [] } as unknown as Layer))[0] as { color?: string })?.color ?? "#FFFFFF";
  return { width: bp.canvas.width, height: bp.canvas.height, background: bgColor, ops };
}

/**
 * Reference Preview 생성 (PNG 합성·저장).
 */
export function generateReferencePreview(input: GeneratePreviewInput): ReferencePreview {
  const { designRecipe, templateBlueprint } = input;
  const spec = buildRenderSpec(templateBlueprint, input.backgroundImageUrl);

  const templateId = designRecipe.templateFamily; // monthly_plan_v1
  const theme = designRecipe.themeFamily; // summer
  const fileName = `${theme}-preview.png`;

  const { previewUrl } = savePreview({ spec, templateId, fileName });

  return {
    id: `${templateId}-${theme}-preview`,
    templateId,
    previewUrl,
    width: templateBlueprint.canvas.width,
    height: templateBlueprint.canvas.height,
    createdAt: new Date().toISOString(),
  };
}
