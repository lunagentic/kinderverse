import type { SectionDefinition, TeacherExpectationSection } from "../../types";

// TeacherExpectationSection — 교사의 기대
export const teacherExpectationSection: SectionDefinition<TeacherExpectationSection> = {
  kind: "teacherExpectation",
  id: "teacher_expectations",
  title: "교사의 기대",
  role: "list",
  build(vm) {
    if (!vm.teacherExpectations.length) return null;
    return { kind: "teacherExpectation", expectations: vm.teacherExpectations };
  },
};
