import type { SectionDefinition, SelectionReasonSection } from "../../types";

// SelectionReasonSection — 놀이 선정 이유 (요약 + 세부 근거)
export const selectionReasonSection: SectionDefinition<SelectionReasonSection> = {
  kind: "selectionReason",
  id: "rationale",
  title: "놀이 선정 이유",
  role: "narrative",
  build(vm) {
    const r = vm.rationale;
    const details = [
      { label: "유아 관심", value: r.childrenInterest.join(" · ") },
      { label: "계절·환경", value: r.seasonEnv.join(" · ") },
      { label: "발달 가치", value: r.devValue.join(" · ") },
    ].filter((d) => d.value);
    if (!r.summary && !details.length) return null;
    return { kind: "selectionReason", summary: r.summary, details };
  },
};
