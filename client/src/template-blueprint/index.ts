// =============================================================================
// Template Blueprint — 공개 API.
//
//   import { buildDesignRecipe } from "@/design-recipe";
//   import { buildTemplateBlueprint } from "@/template-blueprint";
//
//   const recipe = buildDesignRecipe({ type: "monthly_plan", theme: "여름이 왔어요" });
//   const blueprint = buildTemplateBlueprint(recipe); // 편집 가능한 레이어 구조
//
// 모든 요소는 레이어 기반(background/shape/sticker/decoration/text). 아직 UI 없음.
// =============================================================================
export { buildTemplateBlueprint } from "./blueprintBuilder";
export { buildMonthlyPlanBlueprint } from "./monthlyPlanBlueprint";
export { createAssetSlot } from "./assetSlot";
export type { AssetSlotInput } from "./assetSlot";

export type {
  TemplateBlueprint,
  Canvas,
  Layer,
  LayerType,
  LayerChild,
  Frame,
  TemplateElement,
  TextElement,
  ShapeElement,
  ImageElement,
  StickerElement,
  DecorationElement,
  AssetSlot,
  AssetRole,
  TextStyle,
  ShapeStyle,
} from "./types";
