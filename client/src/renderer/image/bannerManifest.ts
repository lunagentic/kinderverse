// 섹션 제목 배너(리본) + 캐릭터 매니페스트.
// 파일은 client/public/assets/banners/ , characters/ 에 둔다.
// 파일이 없으면 렌더러가 자동으로 텍스트 제목으로 폴백한다(img onError → 숨김).

// LayoutSection.id → 배너 이미지 경로 (투명 PNG 리본)
export const SECTION_BANNERS: Record<string, string> = {
  weekly_flow: "/assets/banners/flow.png", // 이 달의 놀이 흐름 (구름)
  teacher_expectations: "/assets/banners/expectation.png", // 교사의 기대 (꽃)
  // goal.png = 놀이 목표 (현재 레이아웃에 섹션 없음)
  // 놀이 선정 이유 배너는 추가되면 여기 매핑 → 없으면 텍스트 제목으로 표시
};

export function bannerFor(sectionId: string): string | undefined {
  return SECTION_BANNERS[sectionId];
}

// 캐릭터
export const TEACHER_CHARACTER = "/assets/characters/teacher.png";
