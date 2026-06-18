import type { SectionDefinition, FamilyConnectionSection } from "../../types";

// FamilyConnectionSection — 가정 연계
export const familyConnectionSection: SectionDefinition<FamilyConnectionSection> = {
  kind: "familyConnection",
  id: "home_connection",
  title: "가정 연계",
  role: "list",
  build(vm) {
    return vm.homeConnection.length ? { kind: "familyConnection", items: vm.homeConnection } : null;
  },
};
