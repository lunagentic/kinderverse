// =============================================================================
// Pixar Storybook — MVP 기본 Style Family.
// 실제 이미지 렌더링은 하지 않는다 — Blueprint/Asset 이 참조하는 스타일 토큰.
// =============================================================================
import type { StyleDefinition } from "./types";

export const pixarStorybookStyle: StyleDefinition = {
  id: "pixar_storybook",
  name: "Pixar Storybook",
  character: {
    expression: "joyful",
    proportion: "cute",
    rendering: "3d_cinematic",
  },
  lighting: "warm_daylight",
  colorMood: "bright_playful",
  shadow: "soft",
  typography: {
    title: "bold_rounded",
    body: "clean_readable",
  },
  card: {
    cornerRadius: "large",
    shadow: "soft",
    padding: "generous",
  },
  assetPromptStyle: {
    rendering: "pixar-inspired 3D storybook illustration",
    background: "transparent for sticker assets",
    mood: "bright, warm, preschool-friendly",
    quality: "premium educational design",
  },
};
