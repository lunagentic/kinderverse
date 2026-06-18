import type { SectionDefinition, CharacterSection } from "../../types";

// CharacterSection — 인성교육 (핵심 가치 + 실천 맥락)
export const characterSection: SectionDefinition<CharacterSection> = {
  kind: "character",
  id: "character",
  title: "인성교육",
  role: "list",
  build(vm) {
    const c = vm.character;
    if (!c.coreValue && !c.practiceContext) return null;
    return { kind: "character", coreValue: c.coreValue, practiceContext: c.practiceContext };
  },
};
