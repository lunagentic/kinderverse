// =============================================================================
// Layer Renderer — Blueprint 레이어 → Render Spec DrawOp[].
//  - background: 캔버스 전체 fill
//  - shape: 사각/알약 카드 rect
//  - sticker/decoration: imageUrl 있으면 image, 없으면 placeholder
// (text 는 textRenderer 가 담당)
// =============================================================================
import type {
  AssetSlot,
  Layer,
  LayerChild,
  ShapeElement,
} from "../template-blueprint";
import type { DrawOp } from "./types";

function isAssetSlot(c: LayerChild): c is AssetSlot {
  return typeof (c as AssetSlot).assetId === "string";
}

/** background 레이어 → fill op (첫 shape 의 fill 색) + (있으면) 배경 이미지 풀블리드 */
export function renderBackground(
  layer: Layer,
  canvas?: { width: number; height: number },
  backgroundImageUrl?: string | null
): DrawOp[] {
  const shape = layer.children.find((c) => (c as ShapeElement).kind === "shape") as ShapeElement | undefined;
  const color = shape?.style?.fill ?? "#FFFFFF";
  const ops: DrawOp[] = [{ op: "fill", color }];
  if (backgroundImageUrl && canvas) {
    ops.push({ op: "image", x: 0, y: 0, w: canvas.width, h: canvas.height, path: backgroundImageUrl, cover: true });
  }
  return ops;
}

/** shape 레이어 → rect op[] */
export function renderShapes(layer: Layer): DrawOp[] {
  const ops: DrawOp[] = [];
  for (const c of layer.children) {
    if ((c as ShapeElement).kind !== "shape") continue;
    const s = c as ShapeElement;
    const radius = s.style?.radius ?? (s.shape === "pill" ? Math.round(s.frame.height / 2) : 0);
    ops.push({
      op: "rect",
      x: s.frame.x, y: s.frame.y, w: s.frame.width, h: s.frame.height,
      fill: s.style?.fill ?? "#FFFFFF",
      radius,
      opacity: s.style?.opacity ?? 1,
    });
  }
  return ops;
}

/** sticker/decoration 레이어 → image op (또는 누락 시 placeholder) */
export function renderAssets(layer: Layer): DrawOp[] {
  const ops: DrawOp[] = [];
  for (const c of layer.children) {
    if (!isAssetSlot(c)) continue;
    const frame = { x: c.x, y: c.y, w: c.width, h: c.height };
    if (c.imageUrl) {
      ops.push({ op: "image", ...frame, path: c.imageUrl });
    } else {
      ops.push({ op: "placeholder", ...frame, label: c.assetId.replace(/^summer_/, "") });
    }
  }
  return ops;
}
