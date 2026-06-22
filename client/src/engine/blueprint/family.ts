// =============================================================================
// Monthly Plan Template Family — variant → layout 함수 레지스트리.
// Phase 1: "document" 1종. (다음 Phase 에서 poster/grid 등 추가)
// =============================================================================
import type { DesignRecipe } from "../recipe/types";
import type { TemplateBlueprint, TemplateVariant } from "./types";
import { layoutDocumentBlueprint } from "./variants/documentBlueprint";

export const MONTHLY_PLAN_FAMILY: Record<
  TemplateVariant,
  (recipe: DesignRecipe) => TemplateBlueprint
> = {
  document: layoutDocumentBlueprint,
};

export const TEMPLATE_VARIANTS = Object.keys(MONTHLY_PLAN_FAMILY) as TemplateVariant[];
