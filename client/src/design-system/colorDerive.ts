// =============================================================================
// Color Derive — 주제(테마) 대표색(seed)에서 카드/섹션/제목 컬러를 자동 도출.
//
//  - inferSeed(themeText): 주제명 키워드 → 시드 hex. 미매칭이면 텍스트 해시 → 고유 hue.
//  - deriveSeasonTheme(seed): SeasonTheme 전체(palette/bg/hero/sections/weeks) 생성.
//  - deriveTitleColors(seed): 제목 2톤 [앞(선명), 뒤(진한 보색계)].
//
// 미등록 새 주제도 색이 자동으로 잡히게 하는 일반화 엔진. (계절 4종은 themeDesignSystem 큐레이션 유지)
// =============================================================================
import type { SeasonTheme, SectionColor } from "./themeDesignSystem";

// ── HSL 유틸 ──
export function hexToHsl(hex: string): [number, number, number] {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let hue = 0;
  if (d !== 0) {
    if (max === r) hue = ((g - b) / d) % 6;
    else if (max === g) hue = (b - r) / d + 2;
    else hue = (r - g) / d + 4;
  }
  hue = Math.round(hue * 60);
  if (hue < 0) hue += 360;
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return [hue, Math.round(s * 100), Math.round(l * 100)];
}

export function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const to = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

// ── 주제명 → 시드색 ──
const SEED_KEYWORDS: { keywords: string[]; seed: string }[] = [
  { keywords: ["여름", "summer", "물놀이"], seed: "#4AA8FF" },
  { keywords: ["가을", "autumn", "fall", "단풍", "추석"], seed: "#FF8C42" },
  { keywords: ["봄", "spring", "꽃", "새싹"], seed: "#FF8FB1" },
  { keywords: ["겨울", "winter", "눈", "크리스마스", "christmas"], seed: "#5BB0E8" },
  { keywords: ["바다", "sea", "ocean", "물고기", "해양"], seed: "#1FB6C9" },
  { keywords: ["우주", "space", "별", "행성", "로켓"], seed: "#6C63FF" },
  { keywords: ["공룡", "dino", "숲", "forest", "정글", "나무"], seed: "#3FAE5A" },
  { keywords: ["동물", "animal", "농장", "farm"], seed: "#E0A33E" },
  { keywords: ["음식", "food", "과일", "fruit"], seed: "#FF6B6B" },
];

/** 문자열 → 0~359 hue (결정적 해시) */
function hashHue(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h % 360;
}

/** 주제명 → 시드 hex. 키워드 우선, 없으면 해시 hue 기반 생기있는 색. */
export function inferSeed(themeText: string): string {
  const t = (themeText || "").toLowerCase();
  for (const { keywords, seed } of SEED_KEYWORDS) {
    if (keywords.some((k) => t.includes(k.toLowerCase()))) return seed;
  }
  return hslToHex(hashHue(t), 70, 60);
}

// ── seed → 컬러 도출 ──
const sect = (h: number, s: number): SectionColor => ({
  bg: hslToHex(h, Math.min(s, 60), 93), // 연한 카드 배경
  accent: hslToHex(h, Math.max(s, 60), 52), // 진한 배지/번호
});

/** seed → SeasonTheme 전체 (palette/bg/hero/sections/weeks) */
export function deriveSeasonTheme(seed: string): SeasonTheme {
  const [h, s] = hexToHsl(seed);
  // 섹션 4색: seed 기준 분산 hue(직관적 구분) — 놀이선정/흐름/교사기대/요소
  const hues = [h, (h + 205) % 360, (h + 130) % 360, (h + 275) % 360];
  return {
    palette: {
      main: seed,
      point: hslToHex((h + 40) % 360, Math.max(s, 70), 60),
      sub1: hslToHex((h + 130) % 360, 55, 60),
      sub2: hslToHex((h + 275) % 360, 45, 70),
      bg: hslToHex(h, 40, 96),
    },
    bg: hslToHex(h, 40, 96),
    card: "#FFFFFF",
    ink: hslToHex(h, 25, 24),
    sub: hslToHex(h, 14, 55),
    hero: { bg: seed, accent: hslToHex(h, Math.max(s, 60), 30), title: "#FFFFFF" },
    sections: {
      reason: sect(hues[0], s),
      flow: sect(hues[1], s),
      expectation: sect(hues[2], s),
      element: sect(hues[3], s),
    },
    weeks: [
      { tint: hslToHex(hues[0], 55, 93), accent: hslToHex(hues[0], 65, 52) },
      { tint: hslToHex(hues[2], 55, 93), accent: hslToHex(hues[2], 65, 52) },
      { tint: hslToHex(hues[3], 55, 93), accent: hslToHex(hues[3], 65, 52) },
      { tint: hslToHex((h + 40) % 360, 60, 93), accent: hslToHex((h + 40) % 360, 70, 50) },
    ],
  };
}

/** seed → 제목 2톤 [앞(선명한 주제색), 뒤(보색계 진한색)] */
export function deriveTitleColors(seed: string): [string, string] {
  const [h, s] = hexToHsl(seed);
  return [hslToHex(h, Math.max(s, 80), 52), hslToHex((h + 200) % 360, Math.max(s, 55), 42)];
}
