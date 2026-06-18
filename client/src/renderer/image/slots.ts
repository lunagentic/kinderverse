// 이미지 슬롯 생성 헬퍼 (데이터만 — 생성/렌더링 코드 아님).
// URL 없이 동작하는 빈/프롬프트 슬롯을 만든다. 위치(x/y)는 담지 않는다.
import type { ImageSlot, ImageRole, AspectRatio, ImagePrompt, OverlayLayer } from "../types";

export const RATIO = {
  hero: { w: 16, h: 9, preset: "16:9" } as AspectRatio,
  card: { w: 4, h: 3, preset: "4:3" } as AspectRatio,
  square: { w: 1, h: 1, preset: "1:1" } as AspectRatio,
  portrait: { w: 3, h: 4, preset: "3:4" } as AspectRatio,
};

export function makeImageSlot(opts: {
  id: string;
  role: ImageRole;
  aspectRatio: AspectRatio;
  label: string;
  prompt?: ImagePrompt;
  overlays?: OverlayLayer[];
}): ImageSlot {
  return {
    id: opts.id,
    role: opts.role,
    visualType: opts.role === "decoration" ? "decoration" : "contentImage",
    status: opts.prompt ? "prompt" : "empty", // 미생성 상태
    aspectRatio: opts.aspectRatio,
    placeholder: { label: opts.label, showPrompt: !!opts.prompt },
    source: opts.prompt ? "ai" : undefined,
    prompt: opts.prompt,
    overlays: opts.overlays,
    // asset 없음 → 추후 생성/업로드로 교체. x/y 없음 → Layout Engine 담당.
  };
}
