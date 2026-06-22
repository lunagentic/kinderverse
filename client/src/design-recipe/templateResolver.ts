// =============================================================================
// Template Resolver — 입력 type → 템플릿 패밀리 + 레이아웃 레시피 결정.
//   조건: type === "monthly_plan" → "monthly_plan_v1"
// =============================================================================
import type { DesignRecipeInput, LayoutRecipe, TemplateFamily } from "./types";

interface TemplateSpec {
  family: TemplateFamily;
  layoutRecipe: LayoutRecipe;
}

// 템플릿 패밀리별 기본 레이아웃(섹션 순서). 확장: 새 type → 새 엔트리.
const TEMPLATE_REGISTRY: Record<string, TemplateSpec> = {
  monthly_plan: {
    family: "monthly_plan_v1",
    layoutRecipe: {
      sections: [
        "hero",
        "play_reason",
        "weekly_flow",
        "teacher_expectation",
        "learning_elements",
      ],
    },
  },
};

// 미지원 type 의 MVP 폴백 (현재 유일 패밀리).
const FALLBACK: TemplateSpec = TEMPLATE_REGISTRY.monthly_plan;

export function resolveTemplate(input: DesignRecipeInput): TemplateSpec {
  const key = (input.type || "").trim().toLowerCase();
  return TEMPLATE_REGISTRY[key] ?? FALLBACK;
}
