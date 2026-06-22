// =============================================================================
// Template Blueprint Engine (Phase 1) — 공개 API.
//
//   월안(raw) → buildDesignRecipe()    → DesignRecipe       (의미 계층)
//             → buildTemplateBlueprint() → TemplateBlueprint  (편집 가능 골격)
//
// 포함: Design Recipe Engine / Template Blueprint Engine / Monthly Plan Template Family
// 제외: 이미지 생성 · Asset Family · Reference Preview · Style Family · Export · Editor UI
// =============================================================================
export { buildDesignRecipe } from "./recipe/buildDesignRecipe";
export { buildTemplateBlueprint } from "./blueprint/buildTemplateBlueprint";
export { MONTHLY_PLAN_FAMILY, TEMPLATE_VARIANTS } from "./blueprint/family";

export type {
  DesignRecipe,
  RecipeSection,
  RecipeEmphasis,
  RecipeDensity,
  RecipeTone,
  RecipeImageIntent,
} from "./recipe/types";
export type {
  TemplateBlueprint,
  TemplateVariant,
  BlueprintBlock,
  BlueprintSlot,
  BlueprintTextSlot,
  BlueprintShapeSlot,
  BlueprintImageSlot,
  SlotKind,
} from "./blueprint/types";
