import type { SectionDefinition, WeeklyFlowSection } from "../../types";
import { makeImageSlot, RATIO } from "../../image/slots";

// WeeklyFlowSection — 주차별 놀이 흐름 + 주차별 대표 이미지 슬롯
export const weeklyFlowSection: SectionDefinition<WeeklyFlowSection> = {
  kind: "weeklyFlow",
  id: "weekly_flow",
  title: "주차별 놀이 흐름",
  role: "matrix",
  build(vm) {
    if (!vm.weeklyFlow.length) return null;
    // 주차마다 대표 이미지 슬롯(미생성 상태) 생성
    const weekImages = vm.weeklyFlow.map((w) => ({
      week: w.week,
      image: makeImageSlot({
        id: `week-${w.week}`,
        role: "weekly",
        aspectRatio: RATIO.square,
        label: `${w.week}주 ${w.subTheme || ""}`.trim(),
        prompt: w.subTheme
          ? {
              text: `${w.subTheme} 유아 놀이 일러스트`,
              style: "illustration",
              origin: "auto",
              aspectRatio: RATIO.square,
            }
          : undefined,
      }),
    }));
    return { kind: "weeklyFlow", weeks: vm.weeklyFlow, weekImages };
  },
};
