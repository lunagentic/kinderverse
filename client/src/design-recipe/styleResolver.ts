// =============================================================================
// Style Resolver — 스타일 패밀리(일러스트 톤) 결정.
//   조건: MVP 에서는 "pixar_storybook" 으로 고정.
// (후속 Phase 에서 theme/age 기반 분기 또는 Style Family 도입 지점)
// =============================================================================
import type { DesignRecipeInput, StyleFamily } from "./types";

const MVP_STYLE: StyleFamily = "pixar_storybook";

export function resolveStyle(_input: DesignRecipeInput): StyleFamily {
  return MVP_STYLE;
}
