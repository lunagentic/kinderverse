// Section Registry — 섹션 종류별 정의(메타+빌더)를 순서대로 모은 단일 출처.
// 각 섹션 모듈이 자신의 SectionDefinition 을 export 하고, 여기서 순서만 정한다.
// 출력형식 무관(의미 계층) — template/document/infographic 가 공통으로 사용한다.
import type { SectionDefinition, SectionInstance, MonthlyPlanViewModel } from "../types";
import { headerSection } from "./monthlyPlan/header";
import { selectionReasonSection } from "./monthlyPlan/selectionReason";
import { teacherExpectationSection } from "./monthlyPlan/teacherExpectation";
import { curriculumSection } from "./monthlyPlan/curriculum";
import { weeklyFlowSection } from "./monthlyPlan/weeklyFlow";
import { outdoorActivitySection } from "./monthlyPlan/outdoorActivity";
import { safetySection } from "./monthlyPlan/safety";
import { characterSection } from "./monthlyPlan/character";
import { eventSection } from "./monthlyPlan/event";
import { familyConnectionSection } from "./monthlyPlan/familyConnection";

// 출력 순서의 단일 출처 (문서 흐름과 일치). 새 섹션은 여기에 추가.
export const SECTION_REGISTRY: SectionDefinition[] = [
  headerSection,
  selectionReasonSection,
  teacherExpectationSection,
  curriculumSection,
  weeklyFlowSection,
  outdoorActivitySection,
  safetySection,
  characterSection,
  eventSection,
  familyConnectionSection,
];

// ViewModel → 빌드된 섹션 인스턴스[]. 데이터 없는 섹션(null)은 자동 생략.
export function buildSections(vm: MonthlyPlanViewModel): SectionInstance[] {
  const out: SectionInstance[] = [];
  for (const def of SECTION_REGISTRY) {
    const section = def.build(vm);
    if (section) out.push({ def, section });
  }
  return out;
}
