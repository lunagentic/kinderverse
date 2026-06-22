// =============================================================================
// Canvas Design Editor (Phase 4 MVP) — 에디터 데이터 모델.
// Blueprint 레이어를 z-순서 평탄 노드 목록으로 펼쳐 편집한다.
// =============================================================================
export type NodeKind = "shape" | "image" | "text";

export interface EditorNode {
  id: string;
  kind: NodeKind;
  layerType: string; // background | shape | sticker | decoration | text
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  locked?: boolean;
  // shape
  shape?: "rect" | "pill" | "circle" | "line";
  fill?: string;
  radius?: number;
  opacity?: number;
  shadow?: string;
  // image (asset)
  assetId?: string;
  assetFamily?: string;
  assetRole?: string;
  imageUrl?: string | null;
  // text
  text?: string;
  fontSize?: number;
  color?: string;
  weight?: number;
  align?: string;
  fontFamily?: string;
  stroke?: string;
  strokeWidth?: number;
}

export interface EditorDoc {
  canvas: { width: number; height: number };
  nodes: EditorNode[];
}
