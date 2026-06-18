import type { SectionDefinition, EventSection } from "../../types";

// EventSection — 행사 (없으면 섹션 생략)
export const eventSection: SectionDefinition<EventSection> = {
  kind: "event",
  id: "events",
  title: "행사",
  role: "matrix",
  build(vm) {
    return vm.events.length ? { kind: "event", events: vm.events } : null;
  },
};
