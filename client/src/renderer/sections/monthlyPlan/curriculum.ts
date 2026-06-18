import type { SectionDefinition, CurriculumSection } from "../../types";

// CurriculumSection — 교육과정 연계 (영역/범주/내용)
export const curriculumSection: SectionDefinition<CurriculumSection> = {
  kind: "curriculum",
  id: "curriculum_links",
  title: "교육과정 연계",
  role: "matrix",
  build(vm) {
    const links = vm.curriculumLinks.filter((c) => c.category || c.content);
    if (!links.length) return null;
    return { kind: "curriculum", links };
  },
};
