// =============================================================================
// Reference Preview (Phase 3) — 타입 정의.
// Template Blueprint + 에셋 imageUrl 을 합성해 "완성 예시" 미리보기 PNG 를 만든다.
// Reference Preview = 보기용(편집 불가). 실제 편집은 Template Blueprint 에서.
// =============================================================================

export interface ReferencePreview {
  id: string;
  templateId: string;
  previewUrl: string;
  width: number;
  height: number;
  createdAt: string;
}

// ── Render Spec — TS 엔진이 만들고 컴포지터(Pillow)가 그리는 그리기 명령 ──
export type DrawOp =
  | { op: "fill"; color: string }
  | { op: "rect"; x: number; y: number; w: number; h: number; fill?: string; radius?: number; opacity?: number }
  | { op: "image"; x: number; y: number; w: number; h: number; path: string; cover?: boolean } // path = public 기준 imageUrl; cover=풀블리드(잘라채움)
  | { op: "placeholder"; x: number; y: number; w: number; h: number; label: string } // 에셋 누락 시
  | { op: "text"; x: number; y: number; w: number; h: number; text: string; size: number; color: string; weight: number; align: string; fontFamily?: string };

export interface RenderSpec {
  width: number;
  height: number;
  background: string;
  ops: DrawOp[];
}
