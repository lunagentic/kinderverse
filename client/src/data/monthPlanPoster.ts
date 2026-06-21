// 월간계획안 "여름이 왔어요" 포스터의 주차별 "표시 스타일"(색/테두리/장식) 설정.
// ⚠️ 놀이명·제목 등 콘텐츠는 여기서 읽지 않는다 — 포스터를 만든 "생성 소스 데이터"
//    (sampleSummerPlan → ig.weeks: 놀이명 3개 포함)에서 가져온다. 아래 plays/title 은 참고용.
export interface PosterWeek {
  weekLabel: string; // "1주"
  title: string; // "여름의 시작"
  plays: string[]; // 놀이명 목록 (포스터의 "놀이명: …")
  illos: string[]; // 장식 일러스트(아이콘) 2개 — 포스터의 누끼 그림 대응
  badge: string; // 주차 배지/제목 색
  cardBg: string; // 카드 배경색
  border: string; // 카드 테두리색
}

export const monthPlanPoster = {
  theme: "여름이 왔어요",
  subtitle: "생활주제 여름 · 연령 3-5세 · 기간 6월",
  weeks: [
    { weekLabel: "1주", title: "여름의 시작", plays: ["여름 날씨 알아보기", "여름의 색깔 찾기"], illos: ["sun", "palette"], badge: "#E8607D", cardBg: "#FDEFF2", border: "#F4C6D2" },
    { weekLabel: "2주", title: "여름의 자연", plays: ["숲속 탐험", "해변의 소리 듣기"], illos: ["tree", "shell"], badge: "#6FB05A", cardBg: "#EFF7E7", border: "#CDE6BE" },
    { weekLabel: "3주", title: "여름의 놀이", plays: ["모래성 쌓기", "물놀이의 즐거움"], illos: ["sandcastle", "ball"], badge: "#9C7BC4", cardBg: "#F2ECF9", border: "#D9C9EC" },
    { weekLabel: "4주", title: "여름의 예술", plays: ["여름 풍경 그리기", "여름 노래 부르기"], illos: ["palette", "music"], badge: "#EE9038", cardBg: "#FDF1E3", border: "#F6D6B0" },
    { weekLabel: "5주", title: "여름의 발견", plays: ["여름 체험 발표회", "여름 책 만들기"], illos: ["book", "star"], badge: "#4F9BD9", cardBg: "#E9F2FB", border: "#C2DBF0" },
  ] as PosterWeek[],
};

export default monthPlanPoster;
