// =============================================================================
// Template Blueprint — 타입 정의.
// Design Recipe(무엇을 쓸지 결정) → 실제 "편집 가능한 레이어 구조"로 변환하기 위한 계약.
// 모든 요소는 레이어 기반(layer-based)이며, 레이어 안에 개별 편집 요소(TemplateElement)가 들어간다.
// (아직 UI 없음 — 데이터 구조만)
// =============================================================================

import type { StyleFamily } from "../design-recipe";

/** 레이어 종류 — 최소 5종 지원 */
export type LayerType =
  | "background"
  | "shape"
  | "sticker"
  | "decoration"
  | "text";

/** 캔버스 — 항상 편집 가능 */
export interface Canvas {
  width: number;
  height: number;
  editable: true;
}

/** 위치/크기 (캔버스 절대 좌표) */
export interface Frame {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TextStyle {
  fontSize?: number;
  weight?: number;
  color?: string;
  align?: "left" | "center" | "right";
  fontFamily?: string;
  stroke?: string;
  strokeWidth?: number;
}

export interface ShapeStyle {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  radius?: number;
  opacity?: number;
  /** CSS box-shadow 문자열 (카드 입체감) */
  shadow?: string;
}

// ── 레이어 안에 들어가는 개별 편집 요소 (TemplateElement) ──
interface BaseElement {
  id: string;
  editable: boolean;
  movable: boolean;
  /** 크기 조절 가능 여부 (Shape 는 true) */
  resizable: boolean;
  visible: boolean;
  /** 위치값 x, y, width, height */
  frame: Frame;
  z?: number;
}

export interface TextElement extends BaseElement {
  kind: "text";
  /** 섹션 역할 (hero, play_reason ...) */
  role: string;
  text: string;
  style?: TextStyle;
  /** 역동기화용 데이터 경로 (있으면 원본과 연결) */
  binding?: string;
}

export interface ShapeElement extends BaseElement {
  kind: "shape";
  shape: "rect" | "circle" | "line" | "pill";
  style?: ShapeStyle;
}

export interface ImageElement extends BaseElement {
  kind: "image";
  /** 담아야 할 대상(의미만 — 생성 아님) */
  subject?: string;
  src?: string | null;
}

export interface StickerElement extends BaseElement {
  kind: "sticker";
  /** 스티커 식별자 (예: "sun", "watermelon") */
  sticker: string;
  src?: string | null;
}

export interface DecorationElement extends BaseElement {
  kind: "decoration";
  /** 장식 식별자 (예: "dots", "leaf") */
  decoration: string;
  style?: ShapeStyle;
}

export type TemplateElement =
  | TextElement
  | ShapeElement
  | ImageElement
  | StickerElement
  | DecorationElement;

// ── Asset Slot — Asset Catalog 의 에셋을 assetId 로 참조하는 연결 슬롯 ──
// (단순 assetKey 문자열이 아니라 assetId + assetFamily 참조 구조)
export type AssetRole = "character" | "object" | "decoration" | "icon" | "background";

export interface AssetSlot {
  id: string;
  type: "sticker" | "decoration";
  /** Asset Catalog 의 자산 식별자 (예: "summer_sun") */
  assetId: string;
  assetFamily: "summer";
  assetRole: AssetRole;
  x: number;
  y: number;
  width: number;
  height: number;
  editable: true;
  movable: true;
  scalable: true;
  rotatable: true;
  /** Phase 1 에서는 항상 null (실제 이미지 미연결) */
  imageUrl?: string | null;
}

/** 레이어에 들어갈 수 있는 자식 — 정적 요소(TemplateElement) 또는 에셋 슬롯(AssetSlot) */
export type LayerChild = TemplateElement | AssetSlot;

/** 레이어 — 항상 편집 가능·항상 표시, 이동 여부만 가변 */
export interface Layer {
  id: string;
  type: LayerType;
  editable: true;
  movable: boolean;
  visible: true;
  children: LayerChild[];
}

/** 최종 산출물 — 캔버스 + 레이어 스택 */
export interface TemplateBlueprint {
  /** 이 Blueprint 가 참조하는 스타일 토큰 (Style Family) */
  styleFamily: StyleFamily;
  canvas: Canvas;
  layers: Layer[];
}
