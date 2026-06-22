// =============================================================================
// Design Recipe Builder — 입력을 분석해 최종 DesignRecipe 를 조립한다.
// 각 결정은 전용 resolver 에 위임 (template / theme / style).
//   입력 { type, theme, age, month } → 출력 { templateFamily, themeFamily, styleFamily, layoutRecipe }
// 이미지 생성·에셋·렌더링 없음 — "무엇을 쓸지" 결정만 한다.
// =============================================================================
import type { DesignRecipe, DesignRecipeInput } from "./types";
import { resolveTemplate } from "./templateResolver";
import { resolveTheme } from "./themeResolver";
import { resolveStyle } from "./styleResolver";

export function buildDesignRecipe(input: DesignRecipeInput): DesignRecipe {
  const { family: templateFamily, layoutRecipe } = resolveTemplate(input);
  const themeFamily = resolveTheme(input);
  const styleFamily = resolveStyle(input);

  return {
    templateFamily,
    themeFamily,
    styleFamily,
    layoutRecipe,
  };
}
