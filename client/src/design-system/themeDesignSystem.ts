// =============================================================================
// Theme Design System — 계절별 디자인 토큰(팔레트 · 배지 · 주차색 · 타이포그래피)
// + Sticker size-tier 정규화. monthlyPlanBlueprint 가 단일 출처로 참조한다.
// "에셋 나열형" → "디자인 시스템 기반" 전환의 핵심 모듈.
// =============================================================================
import type { ThemeFamily } from "../design-recipe";

// ── 폰트 스택 (제목 ONE Mobile POP → 폴백 / 본문 SUIT) ──
//   ONE Mobile POP .ttf 를 client/public/fonts 에 넣으면 자동으로 1순위 적용됨.
export const TITLE_FONT = "'ONE Mobile POP', 'Black Han Sans', 'Jua', sans-serif";
export const BODY_FONT = "'SUIT', 'Pretendard', system-ui, sans-serif";

export interface BadgeStyle {
  fill: string;
  text: string;
}

export interface SeasonTheme {
  // 캔버스/카드 팔레트
  bg: string;
  card: string;
  ink: string;
  sub: string;
  // Hero
  heroBg: string;
  heroAccent: string;
  heroTitle: string;
  // 섹션 제목 배지 (놀이선정이유 / 이달의놀이흐름 / 교사의기대 / 주요놀이요소)
  badges: {
    reason: BadgeStyle;
    flow: BadgeStyle;
    expectation: BadgeStyle;
    element: BadgeStyle;
  };
  // 주차 카드 색 (1~4주) — 카드 배경틴트 + 번호배지/제목 액센트
  weeks: { tint: string; accent: string }[];
}

const W = (text: string) => ({ fill: "#FFFFFF", text });

export const THEME_SYSTEM: Record<ThemeFamily, SeasonTheme> = {
  summer: {
    bg: "#EAF6FF", card: "#FFFFFF", ink: "#3F3833", sub: "#8A8078",
    heroBg: "#7EC8F2", heroAccent: "#1E63B0", heroTitle: "#E8412E",
    badges: { reason: W("#F4756B"), flow: W("#4F9BE0"), expectation: W("#5BC08A"), element: W("#4F9BE0") },
    weeks: [
      { tint: "#FDEDEF", accent: "#EE6F8A" }, // 1주 핑크
      { tint: "#E9F7EE", accent: "#3FB37A" }, // 2주 그린
      { tint: "#F0EBFB", accent: "#8A6FD6" }, // 3주 퍼플
      { tint: "#FFF1E2", accent: "#F0913E" }, // 4주 오렌지
    ],
  },
  autumn: {
    bg: "#FFF4E4", card: "#FFFFFF", ink: "#4A3B2E", sub: "#9A8676",
    heroBg: "#F4B860", heroAccent: "#9A4B16", heroTitle: "#D2691E",
    badges: { reason: W("#D9683B"), flow: W("#C8893B"), expectation: W("#8AA65A"), element: W("#C8893B") },
    weeks: [
      { tint: "#FDEDEF", accent: "#E0607E" },
      { tint: "#EEF6E5", accent: "#7FA64E" },
      { tint: "#F0EBFB", accent: "#8A6FD6" },
      { tint: "#FFF0DD", accent: "#E08A3C" },
    ],
  },
  spring: {
    bg: "#FBF1F6", card: "#FFFFFF", ink: "#3F3340", sub: "#9A8794",
    heroBg: "#F7B7D2", heroAccent: "#B43E70", heroTitle: "#E0578E",
    badges: { reason: W("#E07A9B"), flow: W("#6FB0E0"), expectation: W("#7BC47B"), element: W("#6FB0E0") },
    weeks: [
      { tint: "#FDEDF3", accent: "#E36F9E" },
      { tint: "#E9F7EE", accent: "#5FB87E" },
      { tint: "#F0EBFB", accent: "#9A7FD6" },
      { tint: "#FFF3DE", accent: "#F0A53E" },
    ],
  },
  winter: {
    bg: "#EEF4FB", card: "#FFFFFF", ink: "#2E3B4A", sub: "#7E8A9A",
    heroBg: "#A8D0F0", heroAccent: "#2E5B86", heroTitle: "#3E7AB0",
    badges: { reason: W("#5B8FB9"), flow: W("#6FA0D0"), expectation: W("#6FB8C0"), element: W("#6FA0D0") },
    weeks: [
      { tint: "#EEF2FB", accent: "#6E84C0" },
      { tint: "#E9F4F7", accent: "#4FA0B0" },
      { tint: "#F0EBFB", accent: "#8A7FD6" },
      { tint: "#EAF6FF", accent: "#4F9BE0" },
    ],
  },
  default: {
    bg: "#FBF7F0", card: "#FFFFFF", ink: "#3F3833", sub: "#8A8078",
    heroBg: "#F2D49B", heroAccent: "#9A6A2E", heroTitle: "#D97757",
    badges: { reason: W("#D97757"), flow: W("#4F9BE0"), expectation: W("#5BC08A"), element: W("#4F9BE0") },
    weeks: [
      { tint: "#FDEDEF", accent: "#EE6F8A" },
      { tint: "#E9F7EE", accent: "#3FB37A" },
      { tint: "#F0EBFB", accent: "#8A6FD6" },
      { tint: "#FFF1E2", accent: "#F0913E" },
    ],
  },
};

export function getTheme(family: ThemeFamily): SeasonTheme {
  return THEME_SYSTEM[family] ?? THEME_SYSTEM.default;
}

// ── Sticker Size System (크기 자동 정규화) ──
export type StickerTier = "hero" | "section" | "decoration";

export const STICKER_SIZE: Record<StickerTier, { min: number; max: number; default: number }> = {
  hero: { min: 280, max: 320, default: 300 },
  section: { min: 140, max: 180, default: 160 },
  decoration: { min: 300, max: 500, default: 360 },
};

/** tier 기준 크기 정규화 — 가로 기준 default 폭, aspect(h/w)로 높이 산출, min/max clamp */
export function stickerSize(tier: StickerTier, aspect = 1): { w: number; h: number } {
  const t = STICKER_SIZE[tier];
  const w = Math.round(Math.min(t.max, Math.max(t.min, t.default)));
  return { w, h: Math.round(w * aspect) };
}
