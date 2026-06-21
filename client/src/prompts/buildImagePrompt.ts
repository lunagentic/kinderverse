// WeekCardBlueprint → 이미지 생성 프롬프트 문자열.
// 주의: 이번 테스트에서는 실제 이미지 API 를 호출하지 않는다. 프롬프트 문자열만 반환한다.
import type { WeekCardBlueprint } from "../blueprints/buildWeekCardBlueprint";
import type { WeekCardStructure, MonthlyInfographicStructure } from "../transformers/monthlyToInfographic";
import type { StylePack } from "../styles/stylePacks";

// 장식 종류 → 영문 묘사 (프롬프트 삽입용)
const DECORATION_DESC: Record<string, string> = {
  palette: "a paint palette icon",
  paint: "playful paint splashes",
  "color-chip": "small color chips",
  sun: "a cheerful sun icon",
  cloud: "soft clouds",
  wave: "gentle waves",
};

/**
 * WeekCardBlueprint 를 기반으로 1주차 카드 이미지 생성 프롬프트를 만든다.
 * 반환값은 사람이 읽고 그대로 이미지 모델에 넣을 수 있는 프롬프트 문자열이다.
 */
export function buildWeekCardImagePrompt(
  blueprint: WeekCardBlueprint,
  week: WeekCardStructure
): string {
  const pack = blueprint.stylePack;
  const plays = week.playNames.join(", ");
  const artifacts = week.artifacts.join(", ");
  const decoration = DECORATION_DESC[blueprint.decoration.kind] || blueprint.decoration.kind;
  const palette = pack.palette.join(", ");
  const frame = pack.imageFrame === "rounded" ? "rounded image frames" : "square image frames";
  const shadow =
    pack.shadow === "soft" ? "soft drop shadows" : pack.shadow === "bright" ? "bright playful shadows" : "no heavy shadows";
  const main = blueprint.imageSlots.find((s) => s.role === "main");
  const subs = blueprint.imageSlots.filter((s) => s.role === "sub");

  return [
    `세로형 월안 포스터의 ${week.weekLabel} 카드 영역을, 첨부 이미지와 가장 비슷한 형태로 구현한 한 장의 비주얼.`,
    `구조: 좌측 텍스트, 우측 작품 사진 구조. 좌측에는 주차(${week.weekLabel}), 단계(${week.phase}), 제목 "${week.title}", 놀이 활동(${plays})이 들어가고, 우측에는 아이들의 작품 사진이 배치된다.`,
    `이미지 구성: main visual 1개, sub visual 2개 (${pack.imageFrame === "rounded" ? "둥근 모서리" : "사각"} 프레임).`,
    `main visual: ${main?.caption || week.title} — ${main?.prompt.prompt || week.imagePrompt.prompt}.`,
    `sub visual 2개: ${subs.map((s, i) => `${i + 1}) ${s.caption}`).join(", ") || artifacts}.`,
    `분위기: 실제 유치원 작품 전시 느낌 — 진짜 아이들이 만든 작품을 전시한 듯 따뜻하고 생생하게.`,
    `스타일: 고급 교육 잡지 스타일 (${pack.posterStyle}), ${pack.backgroundDesc}, ${decoration} 장식, ${frame}, ${shadow}. 색상 팔레트: ${palette}. 키워드: ${pack.styleKeywords.join(", ")}.`,
    `금지: 표 형태 금지 — 표/스프레드시트/격자 셀 레이아웃, 문서처럼 빽빽한 텍스트, 워터마크, 로고를 만들지 말 것.`,
  ].join("\n");
}

/**
 * "배경 이미지" 전용 프롬프트 — 편집 텍스트를 그 위에 얹는 구조용.
 * 글자/숫자/표를 절대 그리지 않고, 좌측은 텍스트를 얹을 수 있게 차분히 비워둔 full-bleed 배경.
 */
export function buildWeekCardBackgroundPrompt(
  blueprint: WeekCardBlueprint,
  week: WeekCardStructure
): string {
  const pack = blueprint.stylePack;
  const palette = pack.palette.join(", ");
  return [
    `${week.weekLabel} "${week.title}" (${week.phase}) 주제의 유아 교육 포스터 배경 일러스트 한 장.`,
    `화면 전체를 가득 채우는 full-bleed 배경 (${pack.posterStyle}, ${pack.backgroundDesc}).`,
    `장면: ${week.imagePrompt.prompt}`,
    `좌측 1/3 영역은 텍스트를 얹을 수 있도록 단순하고 차분하게(여백·은은한 톤) 비워둔다. 주요 그림 요소는 우측·하단에 배치.`,
    `색상 팔레트: ${palette}.`,
    `절대 금지: 글자·숫자·단어·캡션·로고·워터마크 등 어떤 텍스트도 그리지 말 것. 표/격자 레이아웃도 금지. (편집용 텍스트는 이 배경 위에 따로 얹는다)`,
  ].join("\n");
}

/**
 * "월안 전체 포스터(스타일 기준)" 프롬프트 — 한 달 분위기를 담은 글자 없는 배경.
 * 이 결과를 레퍼런스로 삼아 각 주차 배경을 같은 그림체로 컨디셔닝한다.
 */
export function buildMonthPosterPrompt(ig: MonthlyInfographicStructure, pack: StylePack): string {
  const palette = pack.palette.join(", ");
  const weeks = ig.weeks.map((w) => `${w.weekLabel} ${w.title}(${w.phase})`).join(", ");
  return [
    `유아 교육 "월간 놀이 계획" 인포그래픽 포스터 배경 일러스트 한 장 — 주제 "${ig.title}".`,
    `한 달 전체 흐름의 분위기: ${weeks}.`,
    `세로형 full-bleed 배경 (${pack.posterStyle}, ${pack.backgroundDesc}). 색상 팔레트: ${palette}.`,
    `아이들이 색을 탐험·실험·표현·전시하는 따뜻하고 일관된 분위기. 이 그림체가 모든 주차 카드의 스타일 기준이 된다.`,
    `절대 금지: 글자·숫자·표·로고·워터마크 등 어떤 텍스트도 그리지 말 것. (편집용 텍스트는 위에 따로 얹는다)`,
  ].join("\n");
}
