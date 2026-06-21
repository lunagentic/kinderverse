// "여름이 왔어요" 월간계획안 샘플 (사용자 포스터 기준).
// 1주차 내용은 포스터의 "여름 시작" 밴드와 동일하게 맞춤.
import type { MonthlyPlanInput } from "../transformers/monthlyToInfographic";

export const sampleSummerPlan: MonthlyPlanInput = {
  theme: "여름이 왔어요",
  age: "만 3-5세",
  period: "2026년 6월",
  weeks: [
    {
      title: "여름 시작",
      phase: "탐색",
      playNames: ["여름 날씨 알아보기", "여름 그림 그리기", "여름의 소리 듣기"],
      artifacts: ["여름 날씨 차트", "여름 그림 작품", "여름 소리 카드"],
      description: "여름의 날씨와 느낌을 오감으로 탐색하며 한 달 여름 놀이를 시작해요.",
    },
    {
      title: "여름 자연",
      phase: "관찰",
      playNames: ["여름 곤충 관찰하기", "여름 식물 돌보기", "여름 꽃 꾸미기"],
      artifacts: ["곤충 관찰 노트", "식물 일지", "여름 꽃 콜라주"],
      description: "여름에 만나는 곤충과 식물을 관찰하고 자연의 변화를 살펴봐요.",
    },
    {
      title: "여름 색",
      phase: "표현",
      playNames: ["물감 번지기 놀이", "여름 색 팔레트 만들기", "시원한 색 그림"],
      artifacts: ["번지기 작품", "여름 색 팔레트", "시원한 색 그림판"],
      description: "여름의 시원하고 강렬한 색을 다양한 재료로 표현해요.",
    },
    {
      title: "여름 맛",
      phase: "체험",
      playNames: ["여름 과일 관찰하기", "수박 화채 만들기", "여름 간식 가게 놀이"],
      artifacts: ["과일 관찰판", "화채 레시피 카드", "간식 가게 메뉴판"],
      description: "여름 제철 과일과 시원한 간식을 직접 만들고 맛보며 즐겨요.",
    },
    {
      title: "여름 이야기",
      phase: "이야기나누기",
      playNames: ["여름 그림책 읽기", "여름 경험 나누기", "여름 이야기 꾸미기"],
      artifacts: ["여름 그림책", "경험 이야기 보드", "이야기 책 만들기"],
      description: "여름에 있었던 일과 그림책을 함께 나누며 한 달을 마무리해요.",
    },
  ],
};

export default sampleSummerPlan;
