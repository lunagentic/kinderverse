import type { SectionDefinition, HeaderSection } from "../../types";
import { makeImageSlot, RATIO } from "../../image/slots";

// HeaderSection — 기본정보 + 월안 대표 이미지(Hero) 슬롯
export const headerSection: SectionDefinition<HeaderSection> = {
  kind: "header",
  id: "basic_info",
  title: "기본정보",
  role: "header",
  build(vm) {
    const b = vm.basicInfo;
    if (!(b.ageBand || b.className || b.theme || b.lifeTheme || b.season || b.periodLabel)) {
      return null;
    }
    return {
      kind: "header",
      basicInfo: b,
      hero: makeImageSlot({
        id: "hero",
        role: "hero",
        aspectRatio: RATIO.hero,
        label: `${b.theme || "월간 놀이"} 대표 이미지`,
        prompt: b.theme
          ? {
              text: `${b.theme} 유아 놀이 장면, 밝고 따뜻한 일러스트`,
              style: "illustration",
              origin: "auto",
              aspectRatio: RATIO.hero,
            }
          : undefined,
        // 오버레이(scrim 막 + 제목) 제거 — 일러스트가 그대로 보이게
      }),
    };
  },
};
