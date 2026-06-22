// =============================================================================
// Blueprint → EditorDoc 변환 (브라우저 안전 — fs 사용 안 함).
// 에셋 imageUrl 은 규칙 경로(/generated-assets/<family>/<assetId>.png)로 부여하고,
// <img> 로드 실패(미생성)는 에디터가 placeholder 로 처리.
// =============================================================================
import { buildDesign } from "../builder";
import type { DesignRecipeInput } from "../design-recipe";
import type { AssetSlot, Layer, LayerChild, ShapeElement, TextElement } from "../template-blueprint";
import type { EditorDoc, EditorNode } from "./types";

function isAssetSlot(c: LayerChild): c is AssetSlot {
  return typeof (c as AssetSlot).assetId === "string";
}

export function assetUrl(family: string, assetId: string): string {
  return `/generated-assets/${family}/${assetId}.png`;
}

/** 월안 입력 → 편집용 EditorDoc */
export function buildEditorDoc(input: DesignRecipeInput): EditorDoc {
  const { designRecipe, templateBlueprint } = buildDesign(input);
  const family = designRecipe.themeFamily;
  const cw = templateBlueprint.canvas.width;
  const ch = templateBlueprint.canvas.height;
  const nodes: EditorNode[] = [];
  let z = 0;

  for (const layer of templateBlueprint.layers as Layer[]) {
    for (const child of layer.children) {
      if (isAssetSlot(child)) {
        nodes.push({
          id: child.id,
          kind: "image",
          layerType: layer.type,
          x: child.x, y: child.y, w: child.width, h: child.height,
          z: z++,
          assetId: child.assetId,
          assetFamily: child.assetFamily,
          assetRole: child.assetRole,
          imageUrl: assetUrl(child.assetFamily, child.assetId),
        });
      } else if ((child as ShapeElement).kind === "shape") {
        const s = child as ShapeElement;
        nodes.push({
          id: s.id,
          kind: "shape",
          layerType: layer.type,
          x: s.frame.x, y: s.frame.y, w: s.frame.width, h: s.frame.height,
          z: z++,
          locked: layer.type === "background", // 배경 채움은 잠금
          shape: s.shape,
          fill: s.style?.fill ?? "#FFFFFF",
          radius: s.style?.radius ?? (s.shape === "pill" ? Math.round(s.frame.height / 2) : 0),
          opacity: s.style?.opacity ?? 1,
        });
        // 배경 레이어: 색 채움 위에 풀-캔버스 배경 이미지(summer_sky) 추가 (잠금, 누끼 제외)
        if (layer.type === "background") {
          nodes.push({
            id: "Background-image",
            kind: "image",
            layerType: "background",
            x: 0, y: 0, w: cw, h: ch,
            z: z++,
            locked: true,
            assetId: `${family}_sky`,
            assetFamily: family,
            assetRole: "background",
            imageUrl: assetUrl(family, `${family}_sky`),
          });
        }
      } else if ((child as TextElement).kind === "text") {
        const t = child as TextElement;
        nodes.push({
          id: t.id,
          kind: "text",
          layerType: layer.type,
          x: t.frame.x, y: t.frame.y, w: t.frame.width, h: t.frame.height,
          z: z++,
          text: t.text,
          fontSize: t.style?.fontSize ?? 32,
          color: t.style?.color ?? "#3F3833",
          weight: t.style?.weight ?? 700,
          align: t.style?.align ?? "left",
          fontFamily: t.style?.fontFamily,
        });
      }
    }
  }

  return { canvas: { width: templateBlueprint.canvas.width, height: templateBlueprint.canvas.height }, nodes };
}
