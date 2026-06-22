// =============================================================================
// Style Family — 공개 API.
//
//   import { getStyle, getAssetPromptStyle } from "@/style-family";
//   const style = getStyle("pixar_storybook");          // StyleDefinition
//   const promptStyle = getAssetPromptStyle("pixar_storybook"); // Phase 2 Asset Generator 용
//
// 스타일 토큰만 제공한다 — 실제 렌더링/이미지 생성은 하지 않는다.
// =============================================================================
import type { StyleDefinition, StyleFamilyId, AssetPromptStyle } from "./types";
import { pixarStorybookStyle } from "./pixarStorybook";

/** 등록된 Style Family 레지스트리 (MVP: pixar_storybook) */
export const STYLE_FAMILIES: Record<StyleFamilyId, StyleDefinition> = {
  pixar_storybook: pixarStorybookStyle,
};

/** MVP 기본 스타일 */
export const DEFAULT_STYLE_ID: StyleFamilyId = "pixar_storybook";

/** 스타일 토큰 → 정의 조회 (없으면 기본 스타일) */
export function getStyle(id: StyleFamilyId = DEFAULT_STYLE_ID): StyleDefinition {
  return STYLE_FAMILIES[id] ?? pixarStorybookStyle;
}

/** Asset Generator(Phase 2)용 프롬프트 스타일 힌트 조회 */
export function getAssetPromptStyle(id: StyleFamilyId = DEFAULT_STYLE_ID): AssetPromptStyle {
  return getStyle(id).assetPromptStyle;
}

export { pixarStorybookStyle } from "./pixarStorybook";

export type {
  StyleDefinition,
  StyleFamilyId,
  CharacterStyle,
  TypographyStyle,
  CardStyle,
  AssetPromptStyle,
} from "./types";
