// =============================================================================
// Theme Resolver — 입력 theme 텍스트 → 테마 패밀리(계절/분위기) 결정.
//   조건: theme 에 "여름" 포함 → "summer"
// =============================================================================
import type { DesignRecipeInput, ThemeFamily } from "./types";

// 키워드 → 테마 패밀리. 앞에서부터 첫 매칭을 사용. (확장: 봄/가을/겨울 등)
const THEME_KEYWORDS: { family: ThemeFamily; keywords: string[] }[] = [
  { family: "summer", keywords: ["여름", "summer"] },
  { family: "spring", keywords: ["봄", "spring"] },
  { family: "autumn", keywords: ["가을", "autumn", "fall"] },
  { family: "winter", keywords: ["겨울", "winter"] },
];

export function resolveTheme(input: DesignRecipeInput): ThemeFamily {
  const text = (input.theme || "").toLowerCase();
  for (const { family, keywords } of THEME_KEYWORDS) {
    if (keywords.some((k) => text.includes(k.toLowerCase()))) return family;
  }
  return "default";
}
