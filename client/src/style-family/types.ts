// =============================================================================
// Style Family — 타입 정의.
// 실제 렌더링을 하지 않는 "스타일 토큰" 정의. Blueprint / Asset Catalog 가 참조하고,
// 이후 Phase 에서 Asset Generator 가 assetPromptStyle 로 이미지 프롬프트를 만든다.
// =============================================================================
import type { StyleFamily as StyleFamilyId } from "../design-recipe";

/** 스타일 토큰 식별자 (예: "pixar_storybook") — Design Recipe 와 동일 출처 */
export type { StyleFamilyId };

export interface CharacterStyle {
  expression: string; // 예: "joyful"
  proportion: string; // 예: "cute"
  rendering: string; // 예: "3d_cinematic"
}

export interface TypographyStyle {
  title: string; // 예: "bold_rounded"
  body: string; // 예: "clean_readable"
}

export interface CardStyle {
  cornerRadius: string; // 예: "large"
  shadow: string; // 예: "soft"
  padding: string; // 예: "generous"
}

/** Asset Generator(Phase 2)가 이미지 프롬프트 작성에 사용할 스타일 힌트 */
export interface AssetPromptStyle {
  rendering: string;
  background: string;
  mood: string;
  quality: string;
}

/** 스타일 패밀리 전체 정의 (토큰) */
export interface StyleDefinition {
  id: StyleFamilyId;
  name: string;
  character: CharacterStyle;
  lighting: string;
  colorMood: string;
  shadow: string;
  typography: TypographyStyle;
  card: CardStyle;
  assetPromptStyle: AssetPromptStyle;
}
