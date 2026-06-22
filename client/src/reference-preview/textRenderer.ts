// =============================================================================
// Text Renderer — text 레이어 → Render Spec text DrawOp[].
// Text Layer 는 항상 최상단(가장 위)에 그려진다.
// =============================================================================
import type { Layer, TextElement } from "../template-blueprint";
import type { DrawOp } from "./types";

export function renderText(layer: Layer): DrawOp[] {
  const ops: DrawOp[] = [];
  for (const c of layer.children) {
    if ((c as TextElement).kind !== "text") continue;
    const t = c as TextElement;
    ops.push({
      op: "text",
      x: t.frame.x, y: t.frame.y, w: t.frame.width, h: t.frame.height,
      text: t.text,
      size: t.style?.fontSize ?? 32,
      color: t.style?.color ?? "#3F3833",
      weight: t.style?.weight ?? 700,
      align: t.style?.align ?? "left",
      fontFamily: t.style?.fontFamily,
    });
  }
  return ops;
}
