// 월안(MonthlyPlanViewModel) → MonthlyInfographicData 변환.
// 스펙상 "LLM 변환" 단계지만, 이번 작업에서는 실제 LLM/이미지 API 없이
// ViewModel 을 인포그래픽용 요약 구조로 결정적(deterministic) 변환한다.
import type { MonthlyPlanViewModel } from "../types";
import type {
  MonthlyInfographicData,
  KeyPlayIdea,
  InfographicWeek,
} from "./types";
import { buildImagePrompt } from "./imagePrompt";

const PASTEL = ["#FFD9E1", "#FFE9C7", "#FFF6C9", "#D8F0DC", "#CFE6F2", "#E4DAF5"];

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n).trim() + "…" : s);

// 주제 → 영문 장면 키워드 (간단 매핑; 없으면 일반 키워드)
function sceneFor(text: string): string {
  const t = text || "";
  if (/물놀이|물|바다|모래|얼음/.test(t)) return "children joyfully playing with water and sand";
  if (/곤충|벌|개미|잠자리/.test(t)) return "children observing gentle summer insects in nature";
  if (/꽃|식물|나무|자연/.test(t)) return "children exploring flowers and plants in a garden";
  if (/과일|딸기|수박/.test(t)) return "fresh summer fruits arranged softly";
  if (/날씨|비|구름|무지개/.test(t)) return "soft summer weather scene with clouds and rainbow";
  if (/그림|미술|색/.test(t)) return "children creating colorful artwork together";
  if (/노래|음악|소리/.test(t)) return "children singing and enjoying music together";
  return "young children happily engaged in a warm classroom play activity";
}

export function buildInfographicData(vm: MonthlyPlanViewModel): MonthlyInfographicData {
  const b = vm.basicInfo;
  const theme = b.theme || "월간 놀이 프로젝트";

  const subtitle = [b.ageBand && `${b.ageBand}`, b.className, b.periodLabel]
    .filter(Boolean)
    .join(" · ");

  const heroMessage =
    clip(vm.rationale.summary || "", 60) || `${theme}, 놀이로 만나는 한 달`;

  const heroImagePrompt = buildImagePrompt(
    `${theme} 대표 이미지`,
    `A premium preschool educational infographic hero image about "${theme}", ${sceneFor(theme)}`,
    "hero"
  );

  // 핵심 놀이아이디어 카드 — 주차별 첫 놀이 우선, 최대 6개
  const ideaSrc: { title: string; week: WeekHint }[] = [];
  for (const w of vm.weeklyFlow) {
    for (const p of w.plays) ideaSrc.push({ title: p.title, week: { sub: w.subTheme, n: w.week } });
  }
  const keyPlayIdeas: KeyPlayIdea[] = ideaSrc.slice(0, 6).map((it) => ({
    title: it.title,
    shortDescription: it.week.sub ? `${it.week.sub} 놀이` : `${it.week.n}주차 놀이`,
    imagePrompt: buildImagePrompt(
      `${it.title} 놀이아이디어`,
      `A premium clay 3D educational asset representing the play idea "${it.title}", ${sceneFor(it.title)}`,
      "idea"
    ),
    tags: [it.week.sub, `${it.week.n}주차`].filter(Boolean) as string[],
  }));

  // 주차별 흐름 (4~5개 카드)
  const weeklyFlow: InfographicWeek[] = vm.weeklyFlow.slice(0, 5).map((w) => {
    const summary = (w.plays || []).slice(0, 2).map((p) => p.title).join(" · ");
    return {
      week: `${w.week}주차`,
      title: w.subTheme || `${w.week}주차 놀이`,
      shortSummary: summary,
      plays: (w.plays || []).map((p) => p.title).filter(Boolean),
      imagePrompt: buildImagePrompt(
        `${w.week}주차 ${w.subTheme || ""} 이미지`.trim(),
        `A premium educational illustration for week ${w.week} "${w.subTheme || theme}", ${sceneFor(w.subTheme || theme)}`,
        "idea"
      ),
    };
  });

  // 교육과정 하이라이트
  const curriculumHighlights = vm.curriculumLinks
    .filter((c) => c.area)
    .slice(0, 5)
    .map((c) => ({ area: c.area, summary: c.content || c.category || "" }));

  // 가정 연계
  const familyMessage = vm.homeConnection
    .map((kv) => (kv.label ? `${kv.label}: ${kv.value}` : kv.value))
    .filter(Boolean)
    .join("  ·  ");
  const familyConnection = {
    title: "가정에서 함께해요",
    message: familyMessage || "가정과 연계해 놀이를 이어가요.",
    imagePrompt: buildImagePrompt(
      "가정 연계 따뜻한 이미지",
      `A premium watercolor illustration of a parent and child enjoying ${theme} together at home`,
      "background"
    ),
  };

  const visualStyle = {
    theme,
    mood: "warm, gentle, premium",
    colorPalette: PASTEL,
    preferredImageStyle: "premium_watercolor" as const,
  };

  const imagePrompts = [
    heroImagePrompt,
    ...keyPlayIdeas.map((k) => k.imagePrompt),
    ...weeklyFlow.map((w) => w.imagePrompt),
    ...(familyConnection.imagePrompt ? [familyConnection.imagePrompt] : []),
  ];

  return {
    title: theme,
    subtitle,
    heroMessage,
    heroImagePrompt,
    keyPlayIdeas,
    weeklyFlow,
    curriculumHighlights,
    familyConnection,
    visualStyle,
    imagePrompts,
  };
}

interface WeekHint {
  sub: string;
  n: number;
}
