import type { SectionDefinition, OutdoorActivitySection } from "../../types";

// OutdoorActivitySection — 바깥놀이·신체활동
export const outdoorActivitySection: SectionDefinition<OutdoorActivitySection> = {
  kind: "outdoorActivity",
  id: "outdoor_play",
  title: "바깥놀이·신체활동",
  role: "matrix",
  build(vm) {
    if (!vm.outdoorPlay.length) return null;
    return { kind: "outdoorActivity", activities: vm.outdoorPlay };
  },
};
