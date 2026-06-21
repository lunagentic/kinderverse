// 색채연구소 월안 샘플 데이터 (템플릿 테스트용).
// transformMonthlyPlanToInfographic 의 입력으로 사용한다.
import type { MonthlyPlanInput } from "../transformers/monthlyToInfographic";

export const sampleMonthlyPlan: MonthlyPlanInput = {
  theme: "꼬마 색채 연구소",
  age: "만 3세",
  period: "2026년 6월",
  weeks: [
    {
      title: "색을 찾아요",
      phase: "탐색",
      playNames: ["내가 좋아하는 색", "우리 주변의 색", "색 탐험 놀이"],
      artifacts: ["자연 색 팔레트", "색 사진 카드", "색 수집 보드"],
      description:
        "색을 발견하고 모으며 우리 반만의 색 탐험 보드를 만들어요.",
    },
    {
      title: "색을 섞어요",
      phase: "실험",
      playNames: ["물감 섞기 놀이", "색깔 요정 만들기", "무지개 만들기"],
      artifacts: ["색 혼합 실험판", "나만의 색 카드", "무지개 띠"],
      description:
        "색과 색을 섞어 새로운 색이 태어나는 과정을 직접 실험하며 관찰해요.",
    },
    {
      title: "색으로 표현해요",
      phase: "표현",
      playNames: ["감정 색칠하기", "자연물 색 꾸미기", "색 그림 이야기"],
      artifacts: ["감정 색 지도", "자연물 콜라주", "색 이야기책"],
      description:
        "내 마음과 주변의 모습을 다양한 색으로 자유롭게 표현해요.",
    },
    {
      title: "색을 나누어요",
      phase: "전시",
      playNames: ["색채 전시회 준비", "색 작품 소개하기", "우리 반 색 잔치"],
      artifacts: ["색채 연구소 전시판", "작품 안내 카드", "색 잔치 초대장"],
      description:
        "한 달 동안 모은 색 작품을 친구, 가족과 함께 나누고 전시해요.",
    },
  ],
};

export default sampleMonthlyPlan;
