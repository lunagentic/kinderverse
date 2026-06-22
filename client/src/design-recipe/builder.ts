// =============================================================================
// Design Recipe Builder — 입력을 분석해 최종 DesignRecipe 를 조립한다.
//   입력 { type, theme, age, month, payload? } → { templateFamily, themeFamily, styleFamily, layoutRecipe, content? }
// (Phase 5) payload(월안 JSON) 가 있으면 normalizeMonthlyPlan 으로 실제 content/테마를 추출한다.
// =============================================================================
import type { DesignRecipe, DesignRecipeInput, MonthlyContent } from "./types";
import { resolveTemplate } from "./templateResolver";
import { resolveTheme } from "./themeResolver";
import { resolveStyle } from "./styleResolver";
import { normalizeMonthlyPlan } from "../renderer/normalize/monthlyPlan";
import type { MonthlyPlanRawData } from "../renderer/types";

/** payload(월안 JSON) → 화면 콘텐츠 추출. 실패 시 undefined. */
function contentFromPayload(payload: unknown): { content: MonthlyContent; themeText: string } | null {
  if (!payload || typeof payload !== "object") return null;
  try {
    const vm = normalizeMonthlyPlan(payload as MonthlyPlanRawData);
    const b = vm.basicInfo;
    if (!b?.theme && !(vm.weeklyFlow && vm.weeklyFlow.length)) return null;
    const weeks = (vm.weeklyFlow || []).slice(0, 4).map((w) => w.subTheme).filter(Boolean);
    const content: MonthlyContent = {
      title: b.theme || "이달의 놀이",
      age: b.ageBand ? `연령 ${b.ageBand}` : "연령",
      month: b.periodLabel || "",
      theme: b.lifeTheme ? `생활주제 : ${b.lifeTheme}` : "생활주제",
      reasonTitle: "놀이 선정 이유",
      flowTitle: "이달의 놀이 흐름",
      expectationTitle: "교사의 기대",
      elementTitle: "주요 놀이 요소",
      weeks: weeks.length ? weeks : ["1주", "2주", "3주", "4주"],
    };
    return { content, themeText: b.theme || b.lifeTheme || b.season || "" };
  } catch {
    return null;
  }
}

export function buildDesignRecipe(input: DesignRecipeInput): DesignRecipe {
  const { family: templateFamily, layoutRecipe } = resolveTemplate(input);

  // payload 가 있으면 실제 데이터에서 content/테마 추출
  const fromPayload = contentFromPayload(input.payload);
  const themeText = fromPayload?.themeText || input.theme;
  const themeFamily = resolveTheme({ ...input, theme: themeText });
  const styleFamily = resolveStyle(input);

  return {
    templateFamily,
    themeFamily,
    styleFamily,
    layoutRecipe,
    content: fromPayload?.content,
  };
}
