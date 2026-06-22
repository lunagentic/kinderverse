// =============================================================================
// Design Recipe Engine — 월안(raw) → DesignRecipe.
// 기존 파이프라인 자산을 그대로 재사용한다(맨바닥 재구현 X):
//   normalizeMonthlyPlan → buildMonthlyTemplate(섹션 트리) → sectionToBlocks(콘텐츠 IR)
// 여기에 "강조도(emphasis) / 의도(intent) / 메타(meta)"의 의미 계층만 부여한다.
// =============================================================================
import {
  normalizeMonthlyPlan,
  buildMonthlyTemplate,
  sectionToBlocks,
} from "../../renderer";
import type {
  MonthlyPlanRawData,
  SectionId,
  TemplateSectionNode,
} from "../../renderer/types";
import type {
  DesignRecipe,
  RecipeEmphasis,
  RecipeImageIntent,
  RecipeSection,
} from "./types";

// 섹션별 강조도 — 월안에서 의미상 중요한 순서. (레이아웃이 크기/순서 힌트로 사용)
const EMPHASIS: Record<SectionId, RecipeEmphasis> = {
  basic_info: "primary",
  weekly_flow: "primary",
  rationale: "secondary",
  curriculum_links: "secondary",
  teacher_expectations: "secondary",
  outdoor_play: "tertiary",
  safety: "tertiary",
  character: "tertiary",
  events: "tertiary",
  home_connection: "tertiary",
};

const EMPHASIS_ORDER: RecipeEmphasis[] = ["primary", "secondary", "tertiary"];

/** 섹션의 의미적 이미지 의도 (Phase 1: hero 1개만 — 생성/스타일 아님, 메타데이터) */
function imageIntentFor(node: TemplateSectionNode, theme: string): RecipeImageIntent[] | undefined {
  if (node.id === "basic_info") {
    return [{ role: "hero", subject: theme || "월간 놀이 주제 대표 이미지" }];
  }
  return undefined;
}

/**
 * 월안 raw payload → DesignRecipe.
 * @param raw MonthlyPlanRawData (snake_case 월안 JSON)
 */
export function buildDesignRecipe(raw: MonthlyPlanRawData = {}): DesignRecipe {
  const vm = normalizeMonthlyPlan(raw);
  const tdoc = buildMonthlyTemplate(vm);
  const theme = vm.basicInfo.theme;

  const sections: RecipeSection[] = tdoc.sections.map((node) => ({
    id: node.id,
    role: node.role,
    title: node.title,
    emphasis: EMPHASIS[node.id] ?? "secondary",
    blocks: sectionToBlocks(node.section),
    imageIntent: imageIntentFor(node, theme),
  }));

  const priorityOrder: SectionId[] = [...sections]
    .sort((a, b) => EMPHASIS_ORDER.indexOf(a.emphasis) - EMPHASIS_ORDER.indexOf(b.emphasis))
    .map((s) => s.id);

  const subtitle = [vm.basicInfo.ageBand, vm.basicInfo.periodLabel, vm.basicInfo.lifeTheme]
    .filter(Boolean)
    .join(" · ");

  return {
    version: 1,
    kind: "monthly_plan",
    meta: {
      title: theme || "월간 놀이계획",
      subtitle,
      season: vm.basicInfo.season || undefined,
      locale: "ko",
    },
    intent: {
      priorityOrder,
      density: "comfortable",
      tone: "plan",
    },
    sections,
  };
}
