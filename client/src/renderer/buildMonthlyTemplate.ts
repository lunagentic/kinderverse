// MonthlyPlanViewModel → TemplateDocument(Section Tree).
// 구조만 생성한다 — 좌표/레이어/렌더 없음. Layout 은 후속 단계.
import type {
  MonthlyPlanViewModel,
  TemplateDocument,
  TemplateSectionNode,
} from "./types";
import { buildSections } from "./sections/registry";

export function buildMonthlyTemplate(vm: MonthlyPlanViewModel): TemplateDocument {
  // 레지스트리 순서대로 빌드된 섹션 인스턴스(데이터 없는 섹션은 생략됨)
  const instances = buildSections(vm);

  const sections: TemplateSectionNode[] = instances.map(({ def, section }) => ({
    id: def.id,
    kind: section.kind,
    title: def.title,
    role: def.role,
    section,
    children: [], // 현재 평면 트리 — 향후 중첩(주차 → 놀이 등) 확장 지점
  }));

  return {
    version: "1.0",
    planType: "monthly_plan",
    output: "template",
    sections,
  };
}
