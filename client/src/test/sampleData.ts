// =============================================================================
// 테스트용 샘플 데이터.
// =============================================================================
import type { DesignRecipeInput } from "../design-recipe";

/** "여름이 왔어요" 월안 입력 (기본 테스트 케이스) */
export const summerMonthlyPlanInput: DesignRecipeInput = {
  type: "monthly_plan",
  theme: "여름이 왔어요",
  age: "3~5세",
  month: "6월",
};
