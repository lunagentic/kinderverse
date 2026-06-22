// =============================================================================
// Design Recipe Engine — 타입 정의.
// 사용자 입력을 분석해 "어떤 템플릿/테마/스타일을 쓸지" 결정한 결과(레시피)의 계약.
// (이미지 생성·에셋·렌더링은 하지 않는다 — 결정만 한다.)
// =============================================================================

/** 지원하는 계획 종류 (확장: weekly_plan, daily_plan ...) */
export type PlanType = "monthly_plan";

/** 템플릿 패밀리 (레이아웃 골격 식별자) */
export type TemplateFamily = "monthly_plan_v1";

/** 테마 패밀리 (계절/분위기) — theme 텍스트에서 결정 */
export type ThemeFamily = "summer" | "spring" | "autumn" | "winter" | "default";

/** 스타일 패밀리 (일러스트 톤) — MVP 고정 */
export type StyleFamily = "pixar_storybook";

/** 사용자 입력 */
export interface DesignRecipeInput {
  type: string; // 예: "monthly_plan"
  theme: string; // 예: "여름이 왔어요"
  age?: string; // 예: "3~5세"
  month?: string; // 예: "6월"
  /** (Phase 5) 실제 월안 JSON(MonthlyPlanRawData). 있으면 content 를 데이터로 채운다. */
  payload?: unknown;
}

/** 레이아웃 레시피 — 어떤 섹션을 어떤 순서로 둘지 */
export interface LayoutRecipe {
  sections: string[];
}

/** 주차 한 칸 — 소주제 + 놀이명 목록 */
export interface MonthlyWeek {
  title: string; // 소주제 (여름과 날씨)
  plays: string[]; // 놀이명들 (여름 날씨 알아보기 …)
}

/** Blueprint 텍스트에 채울 실제 콘텐츠 (payload 연결 시 채워짐, 없으면 레퍼런스 기본값) */
export interface MonthlyContent {
  title: string; // 대표 주제 (여름이 왔어요)
  age: string; // 연령 3~5세
  month: string; // 6월
  theme: string; // 생활주제 : 여름
  reasonTitle: string;
  reasonBody: string; // 놀이 선정 이유 본문
  flowTitle: string;
  weeks: MonthlyWeek[]; // 주차별 소주제 + 놀이명
  eventsTitle: string; // 이달의 행사
  events: string[]; // 행사 항목들
  expectationTitle: string; // 교사의 기대
  expectations: string[]; // 교사의 기대 항목들
}

/** Design Recipe Engine 의 최종 산출물 */
export interface DesignRecipe {
  templateFamily: TemplateFamily;
  themeFamily: ThemeFamily;
  styleFamily: StyleFamily;
  layoutRecipe: LayoutRecipe;
  /** (Phase 5) 실제 데이터 콘텐츠 — 없으면 Blueprint 가 레퍼런스 기본값 사용 */
  content?: MonthlyContent;
}
