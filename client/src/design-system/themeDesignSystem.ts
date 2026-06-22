// =============================================================================
// Theme Design System — 월안 템플릿 색상/타이포 규칙 (디자인 가이드 기준).
//
// 규칙(가이드):
//  - 테마 컬러 팔레트: 메인/포인트/보조1/보조2/배경 (계절별)
//  - 섹션 컬러 시스템(공통 구조): 모든 테마 동일한 섹션 hue
//      01 놀이 선정 이유 → 핑크 / 02 이달의 놀이 흐름 → 블루
//      03 교사의 기대 → 그린 / 04 주요 놀이 요소 → 퍼플
//  - 섹션 배경은 "연한 톤"(가독성), 콘텐츠(텍스트/배지)는 "진한 색"으로 대비
//  - 제목 폰트 ONE Mobile POP(폴백), 본문 SUIT
// =============================================================================
import type { ThemeFamily } from "../design-recipe";

export const TITLE_FONT = "'ONE Mobile POP', 'Black Han Sans', 'Jua', sans-serif";
// 소제목: 제목과 동일 계열(ONE Mobile POP) — Cafe24 이전 폰트
export const SUBTITLE_FONT = "'ONE Mobile POP', 'Black Han Sans', 'Jua', sans-serif";
export const BODY_FONT = "'SUIT', 'Pretendard', system-ui, sans-serif";

// 카드 완성도 — 부드러운 그림자 + 얇은 테두리(섹션 accent) 기준값
export const CARD_SHADOW = "0 12px 30px rgba(31, 40, 51, 0.14)";
export const CARD_BORDER_WIDTH = 2;
export const HERO_SHADOW = "0 16px 36px rgba(31, 40, 51, 0.18)";

/** 테마 컬러 팔레트 (메인/포인트/보조/배경) */
export interface ThemePalette {
  main: string;
  point: string;
  sub1: string;
  sub2: string;
  bg: string;
}

/** 섹션 색: 연한 배경(bg) + 진한 강조(accent, 배지/번호/제목) */
export interface SectionColor {
  bg: string;
  accent: string;
}

export interface SeasonTheme {
  palette: ThemePalette;
  bg: string; // 캔버스 배경 = palette.bg
  card: string; // 흰 카드 기본값
  ink: string;
  sub: string;
  hero: { bg: string; accent: string; title: string };
  // 섹션 컬러 시스템 (놀이선정이유/이달의놀이흐름/교사의기대/주요놀이요소)
  sections: {
    reason: SectionColor;
    flow: SectionColor;
    expectation: SectionColor;
    element: SectionColor;
  };
  // 주차 카드(1~4주) 색 — flow 섹션 내부
  weeks: { tint: string; accent: string }[];
}

// 섹션 강조색(공통 hue, 진한 톤 — 가이드의 계열)
const ACCENT = { reason: "#F2728E", flow: "#4F9BE0", expectation: "#5BB87A", element: "#9A7FD6" };

export const THEME_SYSTEM: Record<ThemeFamily, SeasonTheme> = {
  summer: {
    palette: { main: "#4AA8FF", point: "#FFB84D", sub1: "#6ED97A", sub2: "#BDA4FF", bg: "#FFF8EE" },
    bg: "#FFF8EE", card: "#FFFFFF", ink: "#3F3833", sub: "#8A8078",
    hero: { bg: "#4AA8FF", accent: "#1E63B0", title: "#FFFFFF" },
    sections: {
      reason: { bg: "#FFE6EC", accent: ACCENT.reason },
      flow: { bg: "#E6F3FF", accent: ACCENT.flow },
      expectation: { bg: "#E9F8E9", accent: ACCENT.expectation },
      element: { bg: "#F0E6FF", accent: ACCENT.element },
    },
    weeks: [
      { tint: "#FFE6EC", accent: ACCENT.reason },
      { tint: "#E9F8E9", accent: ACCENT.expectation },
      { tint: "#F0E6FF", accent: ACCENT.element },
      { tint: "#FFF1E2", accent: "#F0913E" },
    ],
  },
  autumn: {
    palette: { main: "#FF8C42", point: "#FFC857", sub1: "#7CB342", sub2: "#A67C52", bg: "#FFF6EC" },
    bg: "#FFF6EC", card: "#FFFFFF", ink: "#4A3B2E", sub: "#9A8676",
    hero: { bg: "#FF8C42", accent: "#9A4B16", title: "#FFFFFF" },
    sections: {
      reason: { bg: "#FFE9E6", accent: ACCENT.reason },
      flow: { bg: "#E6F0FF", accent: ACCENT.flow },
      expectation: { bg: "#ECF6E6", accent: ACCENT.expectation },
      element: { bg: "#F3E6FF", accent: ACCENT.element },
    },
    weeks: [
      { tint: "#FFE9E6", accent: ACCENT.reason },
      { tint: "#ECF6E6", accent: ACCENT.expectation },
      { tint: "#F3E6FF", accent: ACCENT.element },
      { tint: "#FFF0DD", accent: "#E08A3C" },
    ],
  },
  spring: {
    palette: { main: "#FF9EC4", point: "#FFD166", sub1: "#9BD96E", sub2: "#BDA4FF", bg: "#FFF6FA" },
    bg: "#FFF6FA", card: "#FFFFFF", ink: "#3F3340", sub: "#9A8794",
    hero: { bg: "#FF9EC4", accent: "#B43E70", title: "#FFFFFF" },
    sections: {
      reason: { bg: "#FFE6EC", accent: ACCENT.reason },
      flow: { bg: "#E6F3FF", accent: ACCENT.flow },
      expectation: { bg: "#E9F8E9", accent: ACCENT.expectation },
      element: { bg: "#F0E6FF", accent: ACCENT.element },
    },
    weeks: [
      { tint: "#FFE6EC", accent: ACCENT.reason },
      { tint: "#E9F8E9", accent: ACCENT.expectation },
      { tint: "#F0E6FF", accent: ACCENT.element },
      { tint: "#FFF3DE", accent: "#F0A53E" },
    ],
  },
  winter: {
    palette: { main: "#5BB0E8", point: "#9AD0F0", sub1: "#A8D8E8", sub2: "#BDA4FF", bg: "#F2F8FF" },
    bg: "#F2F8FF", card: "#FFFFFF", ink: "#2E3B4A", sub: "#7E8A9A",
    hero: { bg: "#5BB0E8", accent: "#2E5B86", title: "#FFFFFF" },
    sections: {
      reason: { bg: "#FFE6EC", accent: ACCENT.reason },
      flow: { bg: "#E6F3FF", accent: ACCENT.flow },
      expectation: { bg: "#E9F8E9", accent: ACCENT.expectation },
      element: { bg: "#F0E6FF", accent: ACCENT.element },
    },
    weeks: [
      { tint: "#E6F3FF", accent: ACCENT.flow },
      { tint: "#E9F8E9", accent: ACCENT.expectation },
      { tint: "#F0E6FF", accent: ACCENT.element },
      { tint: "#EAF6FF", accent: "#4F9BE0" },
    ],
  },
  default: {
    palette: { main: "#4AA8FF", point: "#FFB84D", sub1: "#6ED97A", sub2: "#BDA4FF", bg: "#FFF8EE" },
    bg: "#FFF8EE", card: "#FFFFFF", ink: "#3F3833", sub: "#8A8078",
    hero: { bg: "#4AA8FF", accent: "#1E63B0", title: "#FFFFFF" },
    sections: {
      reason: { bg: "#FFE6EC", accent: ACCENT.reason },
      flow: { bg: "#E6F3FF", accent: ACCENT.flow },
      expectation: { bg: "#E9F8E9", accent: ACCENT.expectation },
      element: { bg: "#F0E6FF", accent: ACCENT.element },
    },
    weeks: [
      { tint: "#FFE6EC", accent: ACCENT.reason },
      { tint: "#E9F8E9", accent: ACCENT.expectation },
      { tint: "#F0E6FF", accent: ACCENT.element },
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

/** tier 기준 크기 정규화 — default 폭, aspect(h/w)로 높이, min/max clamp */
export function stickerSize(tier: StickerTier, aspect = 1): { w: number; h: number } {
  const t = STICKER_SIZE[tier];
  const w = Math.round(Math.min(t.max, Math.max(t.min, t.default)));
  return { w, h: Math.round(w * aspect) };
}
