// raw monthly_plan JSON → MonthlyPlanViewModel. 정규화의 유일한 지점.
import type {
  MonthlyPlanRawData,
  MonthlyPlanViewModel,
  WeekVM,
  CurriculumLinkVM,
  KV,
} from "../types";
import { str, arr, compact, CURRICULUM_AREAS } from "./helpers";

type RawPeriod = { label?: string; start_date?: string; end_date?: string };

function periodLabel(period: RawPeriod | undefined, season: string): string {
  const p = period ?? {};
  const label = str(p.label);
  if (label) return label;
  const start = str(p.start_date);
  const end = str(p.end_date);
  if (start && end) return `${start} ~ ${end}`;
  return start || end || season;
}

// 5영역을 고정 순서로 보장. 누락 영역은 빈칸으로 채운다.
function ensureCurriculumAreas(
  links: Array<{ area?: string; category?: string; content?: string }>
): CurriculumLinkVM[] {
  return CURRICULUM_AREAS.map((area) => {
    const found = links.find((l) => str(l?.area) === area);
    return { area, category: str(found?.category), content: str(found?.content) };
  });
}

/**
 * MonthlyPlanRawData(LLM 원본) → MonthlyPlanViewModel(렌더러용) 변환.
 *
 * 계약
 * - 순수 함수: 입력 `raw` 를 읽기만 하고 절대 변경하지 않는다(원본 JSON 보존).
 *   모든 결과는 새 객체/배열로 생성하며, sort 도 map 으로 만든 사본에만 적용한다.
 * - 방어적: 결측·null·잘못된 타입을 흡수해 항상 non-null·정상 형태를 반환한다.
 * - 정규화: camelCase 평탄화, 교육과정 5영역 고정 순서, 주차 오름차순,
 *   파생값(periodLabel) 계산, 빈 항목/"-" 제거 → 렌더러가 분기 없이 바로 소비.
 */
export function normalizeMonthlyPlan(raw: MonthlyPlanRawData = {}): MonthlyPlanViewModel {
  const bi = raw.basic_info ?? {};
  const r = raw.rationale ?? {};
  const ci = r.children_interest ?? {};
  const se = r.season_and_environment ?? {};
  const dv = r.developmental_value ?? {};
  const safety = raw.safety_education ?? {};
  const ch = raw.character_education ?? {};
  const hc = raw.home_connection ?? {};
  const season = str(bi.season);

  const weeklyFlow: WeekVM[] = arr<NonNullable<MonthlyPlanRawData["weekly_flow"]>[number]>(raw.weekly_flow)
    .map((w) => ({
      week: Number(w?.week) || 0,
      flowStage: str(w?.flow_stage),
      subTheme: str(w?.sub_theme),
      plays: arr<{ title?: string; core_experience?: string }>(w?.play_ideas)
        .map((p) => ({ title: str(p?.title), coreExperience: str(p?.core_experience) }))
        .filter((p) => p.title),
    }))
    .filter((w) => w.week || w.subTheme || w.plays.length)
    .sort((a, b) => a.week - b.week);

  const safetyKV: KV[] = [
    { label: "놀이 안전", value: str(safety.play_safety) },
    { label: "도구 안전", value: str(safety.tool_safety) },
    { label: "생활 안전", value: str(safety.life_safety) },
  ].filter((x) => x.value);

  const homeKV: KV[] = [
    { label: "가정 놀이", value: str(hc.home_play) },
    { label: "부모 질문", value: str(hc.parent_question) },
    { label: "추천 그림책", value: str(hc.recommended_picture_book) },
  ].filter((x) => x.value);

  return {
    planType: "monthly_plan",
    basicInfo: {
      ageBand: str(bi.age_band),
      className: str(bi.class_name),
      theme: str(bi.theme),
      lifeTheme: str(bi.life_theme),
      season,
      periodLabel: periodLabel(bi.period, season),
    },
    rationale: {
      summary: str(r.summary),
      childrenInterest: compact([ci.recent_interest, ci.play_experience]),
      seasonEnv: compact([se.seasonal_feature, se.natural_environment, se.institution_event]),
      devValue: compact([dv.cognitive, dv.social, dv.physical, dv.language, dv.artistic]),
    },
    teacherExpectations: arr<{ goal?: string; focus?: string }>(raw.teacher_expectations)
      .map((e) => ({ goal: str(e?.goal), focus: str(e?.focus) }))
      .filter((e) => e.goal),
    curriculumLinks: ensureCurriculumAreas(
      arr<{ area?: string; category?: string; content?: string }>(raw.curriculum_links)
    ),
    weeklyFlow,
    outdoorPlay: arr<NonNullable<MonthlyPlanRawData["outdoor_and_physical_play"]>[number]>(
      raw.outdoor_and_physical_play
    )
      .map((o) => ({
        week: Number(o?.week) || 0,
        activityName: str(o?.activity_name),
        method: str(o?.method),
      }))
      .filter((o) => o.activityName)
      .sort((a, b) => a.week - b.week),
    safety: safetyKV,
    character: { coreValue: str(ch.core_value), practiceContext: str(ch.practice_context) },
    events: arr<{ name?: string; date?: string; connection?: string }>(raw.events)
      .map((e) => ({ name: str(e?.name), date: str(e?.date), connection: str(e?.connection) }))
      .filter((e) => e.name && e.name !== "-"),
    homeConnection: homeKV,
  };
}
