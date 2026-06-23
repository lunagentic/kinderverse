// =============================================================================
// Blueprint → EditorDoc 변환 (브라우저 안전 — fs 사용 안 함).
// 에셋 imageUrl 은 규칙 경로(/generated-assets/<family>/<assetId>.png)로 부여하고,
// <img> 로드 실패(미생성)는 에디터가 placeholder 로 처리.
// =============================================================================
import { buildDesign } from "../builder";
import type { DesignRecipeInput } from "../design-recipe";
import type { AssetSlot, Layer, LayerChild, ShapeElement, TextElement } from "../template-blueprint";
import type { EditorDoc, EditorNode } from "./types";
import type { DesignDoc, DesignDocElement } from "../renderer/adapters/toDesignDoc";

function isAssetSlot(c: LayerChild): c is AssetSlot {
  return typeof (c as AssetSlot).assetId === "string";
}

export function assetUrl(family: string, assetId: string): string {
  return `/generated-assets/${family}/${assetId}.png`;
}

// 편집 디자인 템플릿 출력 규격: A4 폭(210mm @96dpi)에 맞추고 높이는 콘텐츠 비율대로 가변.
// 블루프린트는 1080폭 좌표로 저작되므로, 출력 시 A4_W/블루프린트폭 비율로 균일 축소한다.
// (비율 유지 → 디자인 모양 불변, 규격만 A4 폭으로 정규화. MonthlyDocCard 의 A4_W=794 와 일치.)
const A4_W = 794;
const r2 = (n: number) => Math.round(n * 100) / 100;

/** 월안 입력 → 편집용 EditorDoc (A4 폭 정규화 · 높이 가변) */
export function buildEditorDoc(input: DesignRecipeInput): EditorDoc {
  const { templateBlueprint } = buildDesign(input);
  const S = A4_W / templateBlueprint.canvas.width; // A4 폭 맞춤 스케일
  const nodes: EditorNode[] = [];
  let z = 0;

  for (const layer of templateBlueprint.layers as Layer[]) {
    for (const child of layer.children) {
      if (isAssetSlot(child)) {
        nodes.push({
          id: child.id,
          kind: "image",
          layerType: layer.type,
          x: r2(child.x * S), y: r2(child.y * S), w: r2(child.width * S), h: r2(child.height * S),
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
          x: r2(s.frame.x * S), y: r2(s.frame.y * S), w: r2(s.frame.width * S), h: r2(s.frame.height * S),
          z: z++,
          locked: layer.type === "background", // 배경 채움은 잠금
          shape: s.shape,
          fill: s.style?.fill ?? "#FFFFFF",
          radius: r2((s.style?.radius ?? (s.shape === "pill" ? Math.round(s.frame.height / 2) : 0)) * S),
          opacity: s.style?.opacity ?? 1,
          stroke: s.style?.stroke,
          strokeWidth: s.style?.strokeWidth != null ? r2(s.style.strokeWidth * S) : s.style?.strokeWidth,
          shadow: s.style?.shadow,
        });
        // (Hero 자체 배경 장면이 별도 존재 → 풀-캔버스 하늘 이미지는 중복이므로 추가하지 않음)
      } else if ((child as TextElement).kind === "text") {
        const t = child as TextElement;
        nodes.push({
          id: t.id,
          kind: "text",
          layerType: layer.type,
          x: r2(t.frame.x * S), y: r2(t.frame.y * S), w: r2(t.frame.width * S), h: r2(t.frame.height * S),
          z: z++,
          text: t.text,
          fontSize: r2((t.style?.fontSize ?? 32) * S),
          color: t.style?.color ?? "#3F3833",
          weight: t.style?.weight ?? 700,
          align: t.style?.align ?? "left",
          fontFamily: t.style?.fontFamily,
          stroke: t.style?.stroke,
          strokeWidth: t.style?.strokeWidth != null ? r2(t.style.strokeWidth * S) : t.style?.strokeWidth,
        });
      }
    }
  }

  // 캔버스: 폭=A4(794px), 높이=콘텐츠 비율대로 가변(A4 1장보다 길면 여러 장에 걸침)
  return { canvas: { width: A4_W, height: Math.round(templateBlueprint.canvas.height * S) }, nodes };
}

/**
 * 월안 입력 → 보드에 올릴 편집 가능한 DesignDoc.
 * (EditorDoc 노드를 보드 DesignFrame 이 편집하는 DesignDoc 요소로 변환)
 * 배경 채움(Background)은 frame.bg 로, 나머지는 요소로. 스티커/캐릭터/아이콘/장식 이미지는 cutout=true.
 */
export function editorDocToDesignDoc(input: DesignRecipeInput): DesignDoc {
  const doc = buildEditorDoc(input);
  const bgFill = (doc.nodes.find((n) => n.id === "Background")?.fill) ?? "#FFFFFF";

  const elements: DesignDocElement[] = doc.nodes
    .filter((n) => n.id !== "Background") // 캔버스 채움은 frame.bg 로 대체
    .map((n): DesignDocElement => {
      if (n.kind === "shape") {
        return {
          id: n.id, type: "shape", x: n.x, y: n.y, w: n.w, h: n.h, locked: n.locked,
          style: { bg: n.fill, radius: n.radius, opacity: n.opacity, stroke: n.stroke, strokeWidth: n.strokeWidth, shadow: n.shadow },
        };
      }
      if (n.kind === "text") {
        return {
          id: n.id, type: "text", x: n.x, y: n.y, w: n.w, h: n.h, text: n.text,
          style: { fontSize: n.fontSize, weight: n.weight, color: n.color, align: n.align, fontFamily: n.fontFamily, stroke: n.stroke, strokeWidth: n.strokeWidth },
        };
      }
      // image
      const isBg = n.assetRole === "background";
      return {
        id: n.id, type: "image", x: n.x, y: n.y, w: n.w, h: n.h,
        src: n.imageUrl ?? undefined,
        fit: isBg ? "cover" : "contain",
        cutout: !isBg, // 배경 이미지는 누끼 제외, 스티커/캐릭터/아이콘/장식은 누끼
        locked: isBg,
      };
    });

  return {
    output_type: "DesignDoc",
    title: input.theme || "월간 놀이계획",
    frame: { w: doc.canvas.width, h: doc.canvas.height, bg: bgFill },
    elements,
  };
}
