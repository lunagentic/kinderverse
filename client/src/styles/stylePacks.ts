// StylePack 정의 (색채연구소 인포그래픽 파이프라인 정본).
// 색상 토큰(bg/band/soft/ink/body/radius/font)은 기존 렌더러와 호환되며,
// 비주얼 디스크립터(배경·아이콘·장식·이미지프레임·그림자·포스터스타일)를 추가로 가진다.

// 장식 종류 — 팩마다 사용 가능한 집합이 다르다.
export type DecorationKind =
  | "palette"
  | "paint"
  | "color-chip"
  | "sun"
  | "cloud"
  | "wave";

export interface StylePack {
  id: string; // "color_lab" | "summer_play"
  name: string;

  // ── 색상 토큰 (기존 StylePack 호환) ──
  bg: string; // 페이지/카드 배경
  band: string; // 헤더/섹션 밴드
  soft: string; // 본문 박스
  ink: string; // 강조 글자색
  body: string; // 본문 글자색
  font?: string; // fontFamily (없으면 기본)
  radius: number;

  // ── 비주얼 디스크립터 ──
  palette: string[]; // 색상 스와치
  backgroundDesc: string; // 배경 설명 (프롬프트용)
  primaryIcon: string; // 대표 아이콘
  decorations: DecorationKind[]; // 사용 가능한 장식
  imageFrame: "rounded" | "square"; // 이미지 프레임 형태
  shadow: "soft" | "bright" | "none"; // 그림자 톤
  posterStyle: string; // 전체 포스터 스타일 (프롬프트용)
  styleKeywords: string[]; // 스타일 키워드 (프롬프트용)
}

// 1) color_lab — 파스텔 배경 · 팔레트/물감/색칩 장식 · 고급 교육 잡지 스타일
export const COLOR_LAB: StylePack = {
  id: "color_lab",
  name: "색채 연구소",
  bg: "#F7F3FB",
  band: "#ECE4F6",
  soft: "#FFFFFF",
  ink: "#5B53A8",
  body: "#4A4453",
  radius: 24,
  palette: ["#FF6B6B", "#FFB84D", "#FFD93D", "#6BCB77", "#4D96FF", "#C780FA"],
  backgroundDesc: "soft pastel background",
  primaryIcon: "palette",
  decorations: ["palette", "paint", "color-chip"],
  imageFrame: "rounded",
  shadow: "soft",
  posterStyle: "premium educational magazine style",
  styleKeywords: [
    "premium educational magazine",
    "editorial layout",
    "pastel tones",
    "rounded image frames",
    "soft drop shadow",
    "clean typography",
  ],
};

// 2) summer_play — 노란 배경 · 해/구름/파도 장식 · 밝은 유치원 포스터 스타일
export const SUMMER_PLAY: StylePack = {
  id: "summer_play",
  name: "여름 놀이",
  bg: "#FFF7D6",
  band: "#FFE9A8",
  soft: "#FFFFFF",
  ink: "#E8862B",
  body: "#5A4A2E",
  font: "'Jua', sans-serif",
  radius: 28,
  palette: ["#FFD93D", "#FF8A5B", "#4DBFFF", "#5BD1A0", "#FF6B9D"],
  backgroundDesc: "bright yellow background",
  primaryIcon: "sun",
  decorations: ["sun", "cloud", "wave"],
  imageFrame: "rounded",
  shadow: "bright",
  posterStyle: "bright kindergarten poster style",
  styleKeywords: [
    "bright kindergarten poster",
    "playful and cheerful",
    "sunny summer mood",
    "bold cheerful colors",
    "rounded friendly shapes",
  ],
};

export const STYLE_PACKS: StylePack[] = [COLOR_LAB, SUMMER_PLAY];

// 이번 테스트 기본값: color_lab
export const DEFAULT_STYLE_PACK: StylePack = COLOR_LAB;

export function getStylePack(id: string): StylePack {
  return STYLE_PACKS.find((p) => p.id === id) || DEFAULT_STYLE_PACK;
}
