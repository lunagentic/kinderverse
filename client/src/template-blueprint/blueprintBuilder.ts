// =============================================================================
// Template Blueprint Builder — Design Recipe → TemplateBlueprint.
// recipe.templateFamily 로 빌더를 선택한다. (Phase 1: monthly_plan_v1)
// =============================================================================
import type { DesignRecipe, TemplateFamily } from "../design-recipe";
import type { TemplateBlueprint } from "./types";
import { buildMonthlyPlanBlueprint } from "./monthlyPlanBlueprint";

const BLUEPRINT_BUILDERS: Record<TemplateFamily, (recipe: DesignRecipe) => TemplateBlueprint> = {
  monthly_plan_v1: buildMonthlyPlanBlueprint,
};

/**
 * Design Recipe 를 편집 가능한 Template Blueprint 로 변환.
 * @param recipe buildDesignRecipe() 결과
 */
export function buildTemplateBlueprint(recipe: DesignRecipe): TemplateBlueprint {
  const builder = BLUEPRINT_BUILDERS[recipe.templateFamily] ?? buildMonthlyPlanBlueprint;
  return builder(recipe);
}
