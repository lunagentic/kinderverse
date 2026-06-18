import type { SectionDefinition, SafetySection } from "../../types";

// SafetySection — 안전교육 (놀이/도구/생활 안전)
export const safetySection: SectionDefinition<SafetySection> = {
  kind: "safety",
  id: "safety",
  title: "안전교육",
  role: "list",
  build(vm) {
    return vm.safety.length ? { kind: "safety", items: vm.safety } : null;
  },
};
