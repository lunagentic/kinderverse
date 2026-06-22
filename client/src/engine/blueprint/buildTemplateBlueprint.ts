// =============================================================================
// Template Blueprint Engine — DesignRecipe → TemplateBlueprint.
// Monthly Plan Template Family 에서 variant 를 선택해 레이아웃한다.
// =============================================================================
import type { DesignRecipe } from "../recipe/types";
import type { TemplateBlueprint, TemplateVariant } from "./types";
import { MONTHLY_PLAN_FAMILY } from "./family";

/**
 * Design Recipe 를 편집 가능한 Template Blueprint 로 변환.
 * @param recipe  buildDesignRecipe() 결과
 * @param variant Template Family 변형 (Phase 1: "document")
 */
export function buildTemplateBlueprint(
  recipe: DesignRecipe,
  variant: TemplateVariant = "document"
): TemplateBlueprint {
  const layout = MONTHLY_PLAN_FAMILY[variant] ?? MONTHLY_PLAN_FAMILY.document;
  return layout(recipe);
}
