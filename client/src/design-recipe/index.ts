// =============================================================================
// Design Recipe Engine — 공개 API.
//
//   import { buildDesignRecipe } from "@/design-recipe";
//   const recipe = buildDesignRecipe({ type: "monthly_plan", theme: "여름이 왔어요", age: "3~5세", month: "6월" });
//
// 사용자 입력을 분석해 templateFamily / themeFamily / styleFamily / layoutRecipe 를 결정한다.
// (이미지 생성·에셋·렌더링은 하지 않는다.)
// =============================================================================
export { buildDesignRecipe } from "./builder";
export { resolveTemplate } from "./templateResolver";
export { resolveTheme } from "./themeResolver";
export { resolveStyle } from "./styleResolver";

export type {
  DesignRecipe,
  DesignRecipeInput,
  LayoutRecipe,
  PlanType,
  TemplateFamily,
  ThemeFamily,
  StyleFamily,
} from "./types";
