// raw → normalize → buildMonthlyTemplate(Section Tree) → layoutTemplate(LayoutDocument).
// 단계 분리: 구조(buildMonthlyTemplate) / 좌표(layoutTemplate) / 어댑터(toDesignDoc).
import type { MonthlyPlanRawData, TemplateDocument, LayoutDocument, LayerTree } from "./types";
import { normalizeMonthlyPlan } from "./normalize/monthlyPlan";
import { buildMonthlyTemplate } from "./buildMonthlyTemplate";
import { buildLayerTree } from "./buildLayerTree";
import { layoutTemplate } from "./renderers/template";
import { layoutColorLab } from "./templates/ColorLabTemplate";
import { layoutInfographic } from "./templates/InfographicTemplate";
import { resolveTemplateImages } from "./image/resolver";

// 구조만 (Section Tree)
export function buildTemplateFromRaw(raw: MonthlyPlanRawData): TemplateDocument {
  return buildMonthlyTemplate(normalizeMonthlyPlan(raw));
}

// 구조 → Layer Tree (좌표 없음)
export function buildLayerTreeFromRaw(raw: MonthlyPlanRawData): LayerTree {
  return buildLayerTree(buildTemplateFromRaw(raw));
}

// 좌표 부여된 출력 (preview 렌더 경로)
export function renderMonthlyPlanTemplate(raw: MonthlyPlanRawData): LayoutDocument {
  return layoutTemplate(buildTemplateFromRaw(raw));
}

// ColorLab 디자인 템플릿 (이미지 자리 = 주제/놀이 연관 이모지 연결). "레이어" 버튼용.
export function renderColorLabFromRaw(raw: MonthlyPlanRawData): LayoutDocument {
  const tree = buildTemplateFromRaw(raw);
  resolveTemplateImages(tree); // 이미지 슬롯에 주제/놀이 이모지 연결
  return layoutColorLab(tree);
}

// 인포그래픽 디자인 템플릿 (이미지 중심).
export function renderInfographicFromRaw(raw: MonthlyPlanRawData): LayoutDocument {
  const tree = buildTemplateFromRaw(raw);
  resolveTemplateImages(tree);
  return layoutInfographic(tree);
}
