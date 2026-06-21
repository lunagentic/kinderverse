// 월안 JSON → 인포그래픽 구조 변환기 (mock transformer).
// 핵심: 실제 LLM 을 호출하지 않는다. 입력 월안을 결정적(deterministic)으로
// 인포그래픽 구조(MonthlyInfographicStructure)로 변환한다.
// 출력에는 반드시 weeks: WeekCardStructure[] 가 포함된다.

// ── 입력 계약: 월안 JSON ──
export interface MonthlyPlanWeekInput {
  title: string; // 주차 주제 (예: "색을 찾아요")
  phase: string; // 프로젝트 단계 (예: "탐색")
  playNames: string[]; // 주차 놀이명
  artifacts: string[]; // 결과물/산출물
  description: string; // 주차 설명
}

export interface MonthlyPlanInput {
  theme: string; // 월간 주제 (예: "꼬마 색채 연구소")
  age: string; // 대상 연령 (예: "만 3세")
  period: string; // 기간 (예: "2026년 6월")
  weeks: MonthlyPlanWeekInput[]; // 주차 배열
}

// ── 출력 계약: 인포그래픽 구조 ──
export type InfographicImageStyle =
  | "premium_watercolor"
  | "premium_realistic"
  | "premium_clay_3d";

// KinderLab 이미지 생성 가이드를 따르는 결정적 이미지 프롬프트 (생성 X, 명세만)
export interface ImagePrompt {
  subject: string; // 무엇을 보여줄지
  prompt: string; // 영문 생성 프롬프트
  negativePrompt: string; // 제외 요소
  style: InfographicImageStyle;
}

// 편집 가능한 WeekCard 한 장의 구조
export interface WeekCardStructure {
  id: string; // "week-1"
  weekNumber: number; // 1
  weekLabel: string; // "1주차"
  phase: string; // "탐색"
  title: string; // "색을 찾아요"
  description: string; // 원본 설명
  summary: string; // 카드용 짧은 요약
  playNames: string[]; // 놀이명
  artifacts: string[]; // 결과물
  accentColor: string; // 카드 강조색 (팔레트에서 순환)
  imagePrompt: ImagePrompt; // 대표 이미지 프롬프트
}

export interface MonthlyInfographicStructure {
  title: string; // 월간 주제
  subtitle: string; // "만 3세 · 2026년 6월"
  heroMessage: string; // 포스터 대표 문구
  meta: { theme: string; age: string; period: string };
  palette: string[]; // 색상 팔레트
  recommendedStylePack: string; // 렌더 단계 StylePack 추천 id
  heroImagePrompt: ImagePrompt; // 포스터 대표 이미지 프롬프트
  weeks: WeekCardStructure[]; // 주차 카드 구조 (필수)
}

// 색채 연구소에 어울리는 무지개 팔레트 (강조색 순환에 사용)
const PALETTE = ["#FF6B6B", "#FFB84D", "#FFD93D", "#6BCB77", "#4D96FF", "#C780FA"];

// 첫 문장만 잘라 카드 요약으로 사용 (없으면 전체를 길이 제한)
function toSummary(description: string): string {
  const text = (description || "").trim();
  if (!text) return "";
  const firstSentence = text.split(/(?<=[.!?。])\s|\n/)[0].trim();
  const base = firstSentence || text;
  return base.length > 60 ? base.slice(0, 60).trim() + "…" : base;
}

// 단계(phase) → 영문 장면 키워드. 색채 연구소 맥락에 맞춘 결정적 매핑.
function sceneForPhase(phase: string): string {
  const p = phase || "";
  if (/탐색|발견|관찰/.test(p)) return "young children discovering and collecting colors around them";
  if (/실험|혼합|섞/.test(p)) return "young children experimenting by mixing paints into new colors";
  if (/표현|창작|그림/.test(p)) return "young children expressing feelings with colorful artwork";
  if (/공유|전시|나눔/.test(p)) return "young children sharing a cheerful colorful art exhibition";
  return "young children joyfully exploring colors in a bright classroom";
}

// 주차 → 결정적 이미지 프롬프트 (LLM 호출 없음)
function buildImagePrompt(
  subject: string,
  scene: string,
  style: InfographicImageStyle = "premium_watercolor"
): ImagePrompt {
  return {
    subject,
    prompt: `A premium preschool educational illustration about "${subject}", ${scene}, soft warm lighting, gentle pastel tones, child-friendly, high detail`,
    negativePrompt: "text, watermark, logo, scary, dark, low quality, deformed hands",
    style,
  };
}

/**
 * 월안 JSON → 인포그래픽 구조 변환 (mock).
 * 실제 LLM 호출 없이 입력을 결정적으로 매핑한다.
 */
export function transformMonthlyPlanToInfographic(
  input: MonthlyPlanInput
): MonthlyInfographicStructure {
  const { theme, age, period } = input;

  const subtitle = [age, period].filter(Boolean).join(" · ");
  const heroMessage = `${theme} — ${input.weeks.length}주 동안 색을 탐험하고 표현해요`;

  const weeks: WeekCardStructure[] = input.weeks.map((w, i) => {
    const weekNumber = i + 1;
    return {
      id: `week-${weekNumber}`,
      weekNumber,
      weekLabel: `${weekNumber}주차`,
      phase: w.phase,
      title: w.title,
      description: w.description,
      summary: toSummary(w.description),
      playNames: [...w.playNames],
      artifacts: [...w.artifacts],
      accentColor: PALETTE[i % PALETTE.length],
      imagePrompt: buildImagePrompt(
        `${weekNumber}주차 ${w.title}`,
        sceneForPhase(w.phase)
      ),
    };
  });

  const heroImagePrompt = buildImagePrompt(
    `${theme} 대표 이미지`,
    "young children running a tiny color laboratory, jars of paint and rainbow swatches"
  );

  return {
    title: theme,
    subtitle,
    heroMessage,
    meta: { theme, age, period },
    palette: PALETTE,
    recommendedStylePack: "pastel",
    heroImagePrompt,
    weeks,
  };
}
