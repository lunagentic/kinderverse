// =============================================================================
// Template Blueprint — "편집 가능한 디자인의 골격".
// Design Recipe(의미) → Template Blueprint(좌표가 부여된 편집 가능 슬롯 구조).
// 이미지로 굽기 전, 모든 요소가 개별 슬롯(slot)으로 분리되어 편집/재사용 가능하다.
//
//   DesignRecipe → [Template Blueprint Engine / document variant]
//                → TemplateBlueprint { canvas, blocks[ { slots[] } ] }
//
// 슬롯은 기존 Layer 좌표 계산(blockToLayers)을 재사용해 만들되,
// editable / role / binding 을 갖춘 "편집 계약" 형태로 재구성한다.
// =============================================================================
import type { DataBinding, LayerStyle, Rect, SectionId, SectionRole } from "../../renderer/types";
import type { RecipeEmphasis } from "../recipe/types";

/** 이번 Phase 의 Template Family — document 1종 (Layout 변형, Style 아님) */
export type TemplateVariant = "document";

export type SlotKind = "text" | "shape" | "image";

interface SlotBase {
  id: string;
  kind: SlotKind;
  /** 슬롯의 의미 역할: "sectionTitle" | "content" | "rowBg" | "image" 등 */
  role: string;
  frame: Rect; // 캔버스 절대 좌표 (기존 DesignDoc element 호환)
  z: number;
  /** 사용자가 직접 편집 가능한 슬롯인지 */
  editable: boolean;
  /** 역동기화용 데이터 바인딩 (원본 월안 경로) */
  binding?: DataBinding;
  style?: LayerStyle;
}

export interface BlueprintTextSlot extends SlotBase {
  kind: "text";
  text: string;
}
export interface BlueprintShapeSlot extends SlotBase {
  kind: "shape";
}
export interface BlueprintImageSlot extends SlotBase {
  kind: "image";
  /** 담아야 할 대상(의미만 — 생성 아님) */
  subject?: string;
  placeholder?: string;
}

export type BlueprintSlot = BlueprintTextSlot | BlueprintShapeSlot | BlueprintImageSlot;

/** 한 섹션에 해당하는 편집 블록 (슬롯들의 컨테이너) */
export interface BlueprintBlock {
  id: string;
  sectionId: SectionId;
  role: SectionRole;
  title: string;
  emphasis: RecipeEmphasis;
  frame: Rect; // 캔버스 위 블록 바운딩
  slots: BlueprintSlot[];
}

export interface TemplateBlueprint {
  version: 1;
  family: "monthly_plan";
  variant: TemplateVariant;
  canvas: { w: number; h: number; bg: string };
  meta: { title: string; subtitle: string };
  blocks: BlueprintBlock[];
  /** 단일 페이지(Phase 1) 기준 콘텐츠가 캔버스 높이를 초과했는지 */
  overflow: boolean;
  /** 컨텐츠 총 높이(px) — overflow 진단용 */
  contentHeight: number;
}
