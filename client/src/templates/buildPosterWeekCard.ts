// 월간계획안 포스터의 "주차 카드"를 편집 가능한 레이어로 만드는 공용 빌더.
//  - 콘텐츠(주차/제목/놀이명)는 생성 소스 데이터(ig.weeks = sampleSummerPlan)에서
//  - 표시 스타일(색/테두리/장식)은 monthPlanPoster 에서
//  - 장식 그림/꾸밈 기본값은 캐시된 클레이 에셋(assetLibrary)
// 보드 미리보기와 편집기에서 동일하게 사용해 디자인을 일치시킨다.
import { sampleSummerPlan } from "../data/sampleSummerPlan";
import { monthPlanPoster } from "../data/monthPlanPoster";
import { transformMonthlyPlanToInfographic } from "../transformers/monthlyToInfographic";
import { getStylePack } from "../styles/stylePacks";
import { getCachedAsset, descriptorFor } from "../utils/assetLibrary";
import type { EditableLayer } from "./buildEditableWeekCardTemplate";

export const RICH_W = 900;
export const RICH_H = 500; // 큰 그림(h300)·큰 글씨에 맞춘 카드 높이

const PACK = getStylePack("summer_play");
const IG = transformMonthlyPlanToInfographic(sampleSummerPlan);

// 장식 그림(클레이) 한글 라벨 — 컴포넌트 이름에 사용
export const ILLO_KO: Record<string, string> = {
  sun: "클레이 태양", palette: "클레이 팔레트", tree: "클레이 나무", shell: "클레이 조개",
  sandcastle: "클레이 모래성", ball: "클레이 공", music: "클레이 음표", book: "클레이 책",
  star: "클레이 별", flower: "클레이 꽃", watermelon: "클레이 수박",
  cloud: "클레이 구름", rainbow: "클레이 무지개", crayon: "클레이 크레파스", paint: "클레이 물감",
  water: "클레이 물놀이", leaf: "클레이 나뭇잎", insect: "클레이 곤충",
  calendar: "클레이 달력", puzzle: "클레이 퍼즐", camera: "클레이 카메라", drum: "클레이 북", icecream: "클레이 아이스크림",
  umbrella: "클레이 파라솔", fan: "클레이 부채", hat: "클레이 모자", boat: "클레이 배", butterfly: "클레이 나비",
  frog: "클레이 개구리", bird: "클레이 새", kite: "클레이 연", balloon: "클레이 풍선", watering_can: "클레이 물뿌리개",
  bucket: "클레이 모래통", popsicle: "클레이 아이스바", cup: "클레이 음료", magnifier: "클레이 돋보기",
};

// 주차 제목·놀이명 키워드 → 어울리는 클레이 그림 종류 도출.
//  핵심: "소재(명사: 과일·곤충·꽃…)"를 "속성(색깔·모양·소리…)"보다 먼저 매칭한다.
//  놀이명을 제목보다 우선해 주제를 더 정확히 반영.
export function illoKindsForWeek(title: string, plays: string[]): string[] {
  const text = `${(plays || []).join(" ")} ${title}`; // 놀이명 우선
  const rules: [RegExp, string][] = [
    // ── 구체 소재(명사) 먼저 ──
    [/수박|과일|딸기|포도|참외|메론|과채|간식|맛/, "watermelon"],
    [/곤충|벌레|개미|나비|무당벌레/, "insect"],
    [/꽃|식물|화분|새싹/, "flower"],
    [/나무|숲|잎/, "tree"],
    [/조개|불가사리/, "shell"],
    [/모래성|모래/, "sandcastle"],
    [/물놀이|수영|바다|물방울/, "water"],
    [/달력|캘린더|날짜|요일/, "calendar"],
    [/퍼즐|맞추기|조각/, "puzzle"],
    [/사진|카메라|찍기/, "camera"],
    [/아이스크림|아이스바|빙수|얼음과자/, "icecream"],
    // ── 기타(misc) ──
    [/나비/, "butterfly"],
    [/개구리/, "frog"],
    [/새\b|새소리|참새/, "bird"],
    [/우산|파라솔|양산/, "umbrella"],
    [/부채|바람개비|선풍기/, "fan"],
    [/모자/, "hat"],
    [/배\b|보트|요트|돛단배/, "boat"],
    [/연날리기|연\b/, "kite"],
    [/풍선/, "balloon"],
    [/물뿌리개|물주기/, "watering_can"],
    [/양동이|모래통|삽/, "bucket"],
    [/돋보기|관찰경/, "magnifier"],
    [/화채|주스|음료|에이드/, "cup"],
    [/책|이야기|그림책|동화/, "book"],
    [/노래|음악|악기|소리|북\b/, "music"],
    [/무지개/, "rainbow"],
    [/크레파스|크레용/, "crayon"],
    [/공놀이|공차기/, "ball"],
    [/축제|발표|전시|행사/, "star"],
    // ── 날씨/자연 ──
    [/그림자|그늘|구름|흐림/, "cloud"],
    [/날씨|햇볕|햇빛|태양|더위|여름\s*시작|해\b/, "sun"],
    [/자연/, "tree"],
    // ── 미술/표현(속성) — 가장 나중 ──
    [/물감|색칠/, "paint"],
    [/그림|미술|그리기|작품|꾸미기|팔레트/, "palette"],
    [/색깔|색\b|모양|만들기|놀이/, "palette"],
  ];
  const found: string[] = [];
  for (const [re, k] of rules) { if (re.test(text) && !found.includes(k)) found.push(k); if (found.length >= 2) break; }
  while (found.length < 2) found.push(found.includes("sun") ? "palette" : "sun");
  return found.slice(0, 2);
}

// 작은 꾸밈 요소 종류 도출 — 자연/과일/식물 주차는 잎(leaf), 기본은 ✦(corner-sparkle)
export function decoKindForWeek(title: string, plays: string[]): string {
  const text = `${(plays || []).join(" ")} ${title}`;
  if (/꽃|화분|새싹/.test(text)) return "flower"; // 꽃 주차 → 꽃 꾸밈
  if (/과일|식물|나무|숲|자연|곤충|잎|채소|열매|바다|물놀이/.test(text)) return "leaf";
  return "corner-sparkle";
}

export function posterWeekCount(): number {
  return Math.min(IG.weeks.length, monthPlanPoster.weeks.length);
}

export function posterWeekLabel(idx: number): { weekLabel: string; title: string } {
  const week = IG.weeks[idx % IG.weeks.length];
  return { weekLabel: week.weekLabel, title: week.title };
}

// override: 생성된 월안의 실제 1주 내용을 카드에 반영(없으면 샘플 사용). 스타일/장식은 그대로.
export interface WeekOverride { weekLabel?: string; title?: string; playNames?: string[]; illos?: string[]; decoKind?: string; illoSrc?: string; tag?: string }

export function buildPosterWeekCard(idx: number, override?: WeekOverride): { canvas: { w: number; h: number }; background: { color: string; radius: number }; layers: EditableLayer[] } {
  const week = IG.weeks[idx % IG.weeks.length];
  const w = monthPlanPoster.weeks[idx % monthPlanPoster.weeks.length];
  const cw = RICH_W, ch = RICH_H;
  const ink = "#4A423B";

  // 콘텐츠: override 우선(생성한 월안) → 없으면 샘플(ig)
  const weekLabel = (override && override.weekLabel) || week.weekLabel;
  const title = (override && override.title) || week.title;
  const playNames = (override && override.playNames && override.playNames.length ? override.playNames : week.playNames).slice(0, 4);

  // 장식 그림 — 메인 클레이 그림 1개(크게, h=300). 종류는 override.illos(월안 키워드) 우선.
  const illoKinds = (override && override.illos && override.illos.length ? override.illos : (w.illos || [])).slice(0, 1);
  const illos: EditableLayer[] = illoKinds.map((kind, i) => ({
    id: `illo-${i + 1}`, type: "image",
    name: `${title} · ${ILLO_KO[kind] || "클레이 그림"}`,
    editable: true, locked: false,
    x: 46, y: 152, width: 330, height: 300,
    content: `${ILLO_KO[kind] || "장식 그림"}`,
    src: (override && override.illoSrc) || getCachedAsset(descriptorFor("illustration", kind)) || undefined,
    style: { fit: "contain", radius: 12, background: "transparent" },
  }));

  // 작은 꾸밈 (h=80) — 내용에서 도출(자연/과일 → 잎, 기본 → ✦). 우상/우하 모서리.
  const decoKind = (override && override.decoKind) || decoKindForWeek(title, playNames);
  const decoAsset = getCachedAsset(descriptorFor("decoration", decoKind)) || undefined;
  const decoLabel = decoKind === "leaf" ? "클레이 잎" : decoKind === "flower" ? "클레이 꽃" : "클레이 ✦";
  const decoName = `${title} · 꾸밈 · ${decoLabel}`;
  const decos: EditableLayer[] = [
    { id: "deco-1", type: "image", name: decoName, editable: true, locked: false, x: cw - 104, y: 12, width: 94, height: 80, content: "꾸밈", src: decoAsset, style: { fit: "contain", radius: 0, background: "transparent" } },
    { id: "deco-2", type: "image", name: decoName, editable: true, locked: false, x: cw - 104, y: ch - 92, width: 94, height: 80, content: "꾸밈", src: decoAsset, style: { fit: "contain", radius: 0, background: "transparent" } },
  ];

  // 놀이명(우측 컬럼) — 큰 글씨(45), 글머리 기호, 세로 가운데 정렬
  const n = playNames.length;
  const rowGap = n >= 3 ? 80 : 100;
  const blockH = (n - 1) * rowGap;
  const startY = Math.round((150 + ch) / 2 - blockH / 2 - 28);
  const plays: EditableLayer[] = playNames.map((name, i) => ({
    id: `play-${i + 1}-value`, type: "text", name: `놀이명 ${i + 1}`, editable: true, locked: false,
    x: 408, y: startY + i * rowGap, width: 452, height: 58,
    content: `· ${name}`, src: undefined,
    style: { fontSize: 45, fontWeight: 700, color: ink, align: "left", lineClamp: 1, fontFamily: PACK.font },
  } as EditableLayer));

  const layers: EditableLayer[] = [
    { id: "background", type: "shape", name: "카드 배경", editable: true, locked: true, x: 0, y: 0, width: cw, height: ch, content: undefined, src: undefined, style: { fill: w.cardBg, backgroundColor: w.cardBg, radius: 28, border: w.border, borderWidth: 3 } },
    ...decos,
    { id: "week-badge", type: "text", name: "주차 배지", editable: true, locked: false, x: 44, y: 30, width: 110, height: 60, content: weekLabel, src: undefined, style: { fontSize: 32, fontWeight: 800, color: "#ffffff", align: "center", backgroundColor: w.badge, radius: 16, fontFamily: PACK.font } },
    { id: "title", type: "text", name: "제목", editable: true, locked: false, x: 176, y: 26, width: 684, height: 80, content: title, src: undefined, style: { fontSize: 60, fontWeight: 800, color: w.badge, align: "left", lineClamp: 1, fontFamily: PACK.font } },
    ...illos,
    ...plays,
  ];

  // 버전 비교용 태그 (좌하단 작은 글씨)
  if (override && override.tag) {
    layers.push({ id: "version-tag", type: "text", name: "버전", editable: true, locked: false, x: 40, y: ch - 40, width: 360, height: 28, content: override.tag, src: undefined, style: { fontSize: 18, fontWeight: 700, color: w.badge, align: "left", lineClamp: 1, fontFamily: PACK.font } } as EditableLayer);
  }

  return { canvas: { w: cw, h: ch }, background: { color: w.cardBg, radius: 28 }, layers };
}

function overrideFromWeek(wk: any): WeekOverride | null {
  if (!wk) return null;
  const ideas = Array.isArray(wk.play_ideas) ? wk.play_ideas : Array.isArray(wk.playNames) ? wk.playNames : [];
  const playNames = ideas.map((p: any) => (typeof p === "string" ? p : p.title || p.play_name || p.name)).filter(Boolean);
  const title = wk.sub_theme || wk.theme || wk.title || `${wk.week || 1}주차`;
  return {
    weekLabel: `${wk.week || 1}주`,
    title,
    playNames,
    illos: illoKindsForWeek(title, playNames), // 월안 내용으로 그림 종류 도출
    decoKind: decoKindForWeek(title, playNames), // 꾸밈 종류도 내용에서 도출
  };
}

// 보드의 "월안" 아이템 data 에서 1주 카드 override 추출 (없으면 null)
export function weekOverrideFromMonthly(data: any): WeekOverride | null {
  if (!data) return null;
  const root = data.payload || data.plan || data;
  const flow = root.weekly_flow || root.weeks;
  return Array.isArray(flow) ? overrideFromWeek(flow[0]) : null;
}

// 모든 주차 override 추출 (1주, 2주 … 연속 생성용)
export function weekOverridesFromMonthly(data: any): WeekOverride[] {
  if (!data) return [];
  const root = data.payload || data.plan || data;
  const flow = root.weekly_flow || root.weeks;
  if (!Array.isArray(flow)) return [];
  return flow.map((wk: any) => overrideFromWeek(wk)).filter(Boolean) as WeekOverride[];
}
