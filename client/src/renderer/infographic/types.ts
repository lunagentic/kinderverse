// 세 번째 출력 형식: 인포그래픽 이미지형 — 데이터 구조.
// 핵심: 실제 이미지를 생성하지 않는다. 월안 → 인포그래픽용 구조 JSON(+이미지 프롬프트)까지만.
// (Notion: 「이미지 템플릿 만들기(인포그래픽)」)

export type InfographicImageStyle =
  | "premium_watercolor"
  | "premium_realistic"
  | "premium_clay_3d";

export type ImagePromptPurpose =
  | "hero"
  | "idea"
  | "activity"
  | "background"
  | "decoration";

// KinderLab 이미지 생성 스타일 가이드를 따르는 이미지 프롬프트
export interface InfographicImagePrompt {
  subject: string; // 무엇을 보여줄지
  purpose: ImagePromptPurpose; // 인포그래픽 안에서의 역할
  style: InfographicImageStyle;
  prompt: string; // 영문 생성 프롬프트
  negativePrompt: string; // 제외 요소
}

export interface KeyPlayIdea {
  title: string;
  shortDescription: string;
  imagePrompt: InfographicImagePrompt;
  tags: string[];
}

export interface InfographicWeek {
  week: string; // "1주차"
  title: string;
  shortSummary: string;
  plays?: string[]; // 주차 놀이명 (WeekCard 용)
  imagePrompt: InfographicImagePrompt;
}

export interface CurriculumHighlight {
  area: string;
  summary: string;
}

export interface FamilyConnectionBlock {
  title: string;
  message: string;
  imagePrompt?: InfographicImagePrompt;
}

export interface InfographicVisualStyle {
  theme: string;
  mood: string;
  colorPalette: string[];
  preferredImageStyle: InfographicImageStyle;
}

// LLM 변환 결과 JSON (월안 → 인포그래픽용 요약 구조)
export interface MonthlyInfographicData {
  title: string;
  subtitle: string;
  heroMessage: string;
  heroImagePrompt: InfographicImagePrompt;
  keyPlayIdeas: KeyPlayIdea[];
  weeklyFlow: InfographicWeek[];
  curriculumHighlights: CurriculumHighlight[];
  familyConnection: FamilyConnectionBlock;
  visualStyle: InfographicVisualStyle;
  imagePrompts: InfographicImagePrompt[];
}
