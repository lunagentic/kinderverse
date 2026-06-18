// 타입드 섹션 → Block[] (template 전용 투영). document/infographic 은 별도 투영을 둔다.
// 이미지 슬롯은 현재 렌더하지 않는다(이미지 렌더링 단계 아님) — 섹션 데이터에만 보존.
import type { Block, MonthlySection } from "../../types";

export function sectionToBlocks(section: MonthlySection): Block[] {
  switch (section.kind) {
    case "header": {
      const b = section.basicInfo;
      const items = [
        { label: "연령", value: b.ageBand },
        { label: "반", value: b.className },
        { label: "놀이주제", value: b.theme },
        { label: "생활주제", value: b.lifeTheme },
        { label: "계절", value: b.season },
        { label: "기간", value: b.periodLabel },
      ].filter((i) => i.value);
      return [{ kind: "keyValue", items }];
    }
    case "selectionReason": {
      const blocks: Block[] = [];
      if (section.summary) blocks.push({ kind: "paragraph", text: section.summary });
      if (section.details.length) blocks.push({ kind: "keyValue", items: section.details });
      return blocks;
    }
    case "teacherExpectation":
      return [
        {
          kind: "list",
          items: section.expectations.map((e) => (e.focus ? `${e.goal} (${e.focus})` : e.goal)),
        },
      ];
    case "curriculum":
      return [
        {
          kind: "table",
          columns: ["영역", "범주", "내용"],
          rows: section.links.map((c) => [c.area, c.category, c.content]),
        },
      ];
    case "weeklyFlow":
      return [
        {
          kind: "table",
          columns: ["주차", "흐름", "소주제", "놀이"],
          rows: section.weeks.map((w) => [
            `${w.week}주`,
            w.flowStage,
            w.subTheme,
            w.plays.map((p) => p.title).join(", "),
          ]),
        },
      ];
    case "outdoorActivity":
      return [
        {
          kind: "table",
          columns: ["주차", "활동", "방법"],
          rows: section.activities.map((o) => [`${o.week}주`, o.activityName, o.method]),
        },
      ];
    case "safety":
      return [{ kind: "keyValue", items: section.items }];
    case "character": {
      const items = [
        { label: "핵심 가치", value: section.coreValue },
        { label: "실천 맥락", value: section.practiceContext },
      ].filter((i) => i.value);
      return [{ kind: "keyValue", items }];
    }
    case "event":
      return [
        {
          kind: "table",
          columns: ["행사", "일자", "연계"],
          rows: section.events.map((e) => [e.name, e.date, e.connection]),
        },
      ];
    case "familyConnection":
      return [{ kind: "keyValue", items: section.items }];
    default: {
      const _exhaustive: never = section;
      return _exhaustive;
    }
  }
}
