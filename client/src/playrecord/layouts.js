// 놀이기록 → A4 DesignDoc(요소 배열) 빌더.
// 한 벌의 PlayRecordTemplate(payload)을 세 가지 편집 가능한 레이아웃으로 변환한다.
//   - card   : 카드형  (3열 활동 카드 그리드 포스터)
//   - canvas : 캔버스형 (사진 스크랩북 — 자유 배치/회전)
//   - story  : 스토리형 (번호 흐름 인포그래픽 + 정보 칩 + 하단 패널)
// 결과는 DesignFrame(요소 기반 자유 캔버스 에디터)이 그대로 렌더·편집한다.

export const A4 = { W: 794, H: 1123 };

// 레이아웃 버전 — 올리면 기존에 캐시된 디자인 문서(docs)를 최신 레이아웃으로 재생성한다.
export const LAYOUT_VERSION = "2026-06-25-canvas-flow-removed";

const arr = (v) => (Array.isArray(v) ? v.filter((x) => x != null && x !== "") : []);
const has = (v) => v != null && v !== "";

// ── 테마 팔레트 (주제/계절 키워드) ──
// 레퍼런스(클레이 키즈 포스터) 기준: 제목은 모두 딥 네이비, 배지는 깔끔한 단색(흰 글씨),
// 배경은 밝은 크림·파스텔 워시 — 채도 낮고 가벼워 네이비 제목과 클레이 오브젝트가 또렷하게 보인다.
const TITLE_NAVY = "#223160"; // 모든 제목·소제목 공통 딥 네이비
const THEMES = [
  { key: "traffic", test: /교통|안전|신호|횡단|보행|버스|도로|자전거|킥보드|표지/,
    accent: "#3b82d6", title: TITLE_NAVY, badgeBg: "#2f6bc4",
    pageBg: "linear-gradient(155deg,#fdf6e6 0%,#eaf2fc 54%,#e9f6f3 100%)",
    learnBg: "#fdeef0", supportBg: "#e9f6ef", deco: ["🚦", "🚌", "🚸"] },
  { key: "winter", test: /겨울|눈|썰매|얼음|눈사람|크리스마스|루돌프|펭귄/,
    accent: "#4f9ad0", title: TITLE_NAVY, badgeBg: "#3d7fbe",
    pageBg: "linear-gradient(155deg,#eaf3fb 0%,#f6f0e2 60%,#fdfaf4 100%)",
    learnBg: "#eef4fb", supportBg: "#e9f6ef", deco: ["⛄", "❄️", "🦌"] },
  { key: "chuseok", test: /추석|한가위|송편|보름달|한복|차례|명절/,
    accent: "#e0921a", title: TITLE_NAVY, badgeBg: "#c47a16",
    pageBg: "linear-gradient(155deg,#fdf3df 0%,#fcefe0 50%,#eef6e9 100%)",
    learnBg: "#fdf2e2", supportBg: "#eef6e6", deco: ["🌕", "🍂", "🏮"] },
  { key: "eco", test: /환경|지구|재활용|분리수거|에너지|자연보호|식물|텃밭/,
    accent: "#43ad68", title: TITLE_NAVY, badgeBg: "#369356",
    pageBg: "linear-gradient(155deg,#eaf7ec 0%,#f6f2df 55%,#fdfbf3 100%)",
    learnBg: "#fdeef0", supportBg: "#e9f6ec", deco: ["🌱", "🌍", "♻️"] },
  { key: "spring", test: /봄|꽃|새싹|나비|벚꽃/,
    accent: "#e06b9c", title: TITLE_NAVY, badgeBg: "#cf5786",
    pageBg: "linear-gradient(155deg,#fdeef4 0%,#f6eef8 50%,#eafaf0 100%)",
    learnBg: "#fdeaf2", supportBg: "#eafaef", deco: ["🌸", "🌱", "🦋"] },
  { key: "summer", test: /여름|물놀이|바다|모래|수박|얼음|곤충/,
    accent: "#18a8c0", title: TITLE_NAVY, badgeBg: "#1390a6",
    pageBg: "linear-gradient(155deg,#fdf8e6 0%,#e3f4fb 55%,#eafaf7 100%)",
    learnBg: "#eef6fb", supportBg: "#e8f7f0", deco: ["🌊", "🐠", "🍉"] },
  { key: "autumn", test: /가을|단풍|낙엽|허수아비|열매|도토리/,
    accent: "#e07b3a", title: TITLE_NAVY, badgeBg: "#c9692f",
    pageBg: "linear-gradient(155deg,#fdefdc 0%,#fcf3e2 50%,#f3f6e6 100%)",
    learnBg: "#fdefdf", supportBg: "#eef6e6", deco: ["🍁", "🌰", "🍂"] },
  { key: "dino", test: /공룡|화석|쥐라기|티라노|브라키오|스테고/,
    accent: "#4f9e57", title: TITLE_NAVY, badgeBg: "#3f8a48",
    pageBg: "linear-gradient(155deg,#eaf6ea 0%,#f4f2dc 55%,#fdfbf2 100%)",
    learnBg: "#ecf6ea", supportBg: "#fdeef0", deco: ["🦕", "🦖", "🌋"] },
  { key: "shapes", test: /모양|도형|블록|삼각형|사각형|육각형|오각형|원형/,
    accent: "#7a5aa0", title: TITLE_NAVY, badgeBg: "#674a8c",
    pageBg: "linear-gradient(155deg,#f1ecf8 0%,#f6eef3 52%,#fdf8f0 100%)",
    learnBg: "#f2ecf8", supportBg: "#e9f6ef", deco: ["🔷", "🔶", "⭐"] },
  { key: "mart", test: /마트|배달|영수증|가격|세일|상품|장바구니|카트|결제/,
    accent: "#e07a5f", title: TITLE_NAVY, badgeBg: "#c96650",
    pageBg: "linear-gradient(155deg,#fdeee6 0%,#fcf2e6 52%,#fdfaf2 100%)",
    learnBg: "#fdeee8", supportBg: "#eef6e6", deco: ["🛒", "🏷️", "💰"] },
  { key: "media", test: /에너지|미디어|카메라|라디오|컴퓨터|모니터|위성|마이크|방송/,
    accent: "#3f7fd0", title: TITLE_NAVY, badgeBg: "#316bbd",
    pageBg: "linear-gradient(155deg,#eaf1fb 0%,#f1f0f6 52%,#fdfbf4 100%)",
    learnBg: "#eef3fb", supportBg: "#e9f6ef", deco: ["📷", "📺", "🎤"] },
  { key: "default", test: /.*/,
    accent: "#2bb3a3", title: TITLE_NAVY, badgeBg: "#1f9c8d",
    pageBg: "linear-gradient(155deg,#fff5dc 0%,#fde7ee 46%,#e6f5f0 100%)",
    learnBg: "#fdeef1", supportBg: "#e9f6ef", deco: ["🌈", "🎈", "⭐"] },
];

export function themeFor(text) {
  const t = text || "";
  return THEMES.find((th) => th.key !== "default" && th.test.test(t)) || THEMES[THEMES.length - 1];
}

// ── 활동 제목 → 아이콘 이모지 ──
const ICON_MAP = [
  [/횡단보도|건너|보행/, "🚸"], [/신호등|신호/, "🚦"], [/안전벨트|벨트/, "🔒"],
  [/자전거|킥보드|타기|타고/, "🚲"], [/버스|승하차|승차/, "🚌"], [/주차|차도|도로|인도/, "🅿️"],
  [/표지판|표지/, "🚧"], [/구호|외치|약속/, "📣"], [/배려|양보|협력|도와|함께/, "🤝"],
  [/송편/, "🍡"], [/차례|제사/, "🍽️"], [/보름달|소원|달/, "🌕"], [/한복|의상|옷/, "👘"],
  [/노래|음악|부르/, "🎵"], [/선물/, "🎁"], [/이야기|나누|소개|알아보/, "💬"],
  [/음식|먹|요리/, "🍱"], [/윷|제기|투호|전통\s*놀이/, "🪀"], [/사진|찍/, "📷"],
  [/그림|미술|색칠|꾸미/, "🎨"], [/만들|제작|구성/, "🔨"], [/물|바다|모래/, "🌊"],
  [/꽃|식물|나무|자연|텃밭|화분/, "🌿"], [/곤충|벌레|개미|나비/, "🐞"], [/책|그림책|읽/, "📖"],
  [/블록|쌓기/, "🧱"], [/역할|상상/, "🎭"], [/분리수거|쓰레기|재활용/, "♻️"],
  [/전기|에너지|아끼/, "💡"], [/지구|환경/, "🌍"],
];
const FALLBACK_ICONS = ["🧩", "🌈", "⭐", "🎈", "🪁", "🧸", "🌟", "🍀", "🎨"];
function iconFor(title, i) {
  const t = title || "";
  for (const [re, e] of ICON_MAP) if (re.test(t)) return e;
  return FALLBACK_ICONS[i % FALLBACK_ICONS.length];
}

// 레퍼런스(킨더 인포그래픽) 톤의 부드럽고 조화로운 색 — 원색 무지개 대신 파스텔 채도
const CARD_COLORS = [
  "#F4A259", // 따뜻한 앰버
  "#7FB685", // 세이지 그린
  "#6DAEDB", // 스카이 블루
  "#E98EA8", // 로즈 핑크
  "#A78BC9", // 라벤더
  "#EF8E6A", // 소프트 코랄
  "#5FC2B6", // 민트 틸
  "#E9B949", // 허니
  "#8AA9DD", // 페리윙클
  "#CC8FB8", // 모브
  "#7CC4A0", // 제이드
  "#E0855E", // 테라코타
];

// 자유 텍스트 → 문장 리스트
function toItems(text) {
  if (!text) return [];
  return String(text)
    .split(/\n+/)
    .flatMap((s) => s.split(/(?<=[.!?。…])\s+/))
    .map((s) => s.trim())
    .filter(Boolean);
}
function bulletText(text, mark = "•") {
  const items = toItems(text);
  if (!items.length) return text || "";
  return items.map((t) => `${mark} ${t}`).join("\n");
}

// 공백 포함 최대 limit(기본 30)자에서 줄바꿈. 단어 경계를 우선하되 한 단어가 길면 강제로 자른다.
// 기존 줄바꿈(\n)은 보존하고 각 줄을 다시 limit 단위로 접는다.
function wrap30(text, limit = 30) {
  if (!text) return text || "";
  const foldLine = (line) => {
    const words = line.split(" ");
    const out = [];
    let cur = "";
    for (let w of words) {
      while (w.length > limit) {
        // 한 단어가 limit 초과 → 강제 분할
        if (cur) { out.push(cur); cur = ""; }
        out.push(w.slice(0, limit));
        w = w.slice(limit);
      }
      if (!cur) cur = w;
      else if ((cur + " " + w).length <= limit) cur += " " + w;
      else { out.push(cur); cur = w; }
    }
    if (cur) out.push(cur);
    return out.join("\n");
  };
  return String(text).split("\n").map(foldLine).join("\n");
}

// 문장 하나마다 줄바꿈(레퍼런스 본문 스타일). 마침표/물음표/느낌표 단위로 끊는다.
function sentenceLines(text) {
  const items = toItems(text);
  return items.length ? items.join("\n") : (text || "");
}

// 텍스트 영역에 맞춰 자동 줄바꿈 + 폰트 크기 자동 축소 → 잘림/스크롤 없이 전부 보이게.
// (놀이의 흐름·놀이 속 배움·교사의 지원 영역 전용 정책)
function fitFontSize(text, boxW, boxH, base, min = 9, lh = 1.4) {
  const t = String(text || "");
  for (let fs = base; fs >= min; fs -= 0.5) {
    const cpl = Math.max(6, Math.floor(boxW / (fs * 0.92))); // 한글 기준 한 줄 글자 수
    let lines = 0;
    for (const para of t.split("\n")) lines += Math.max(1, Math.ceil((para.length || 1) / cpl));
    if (lines * fs * lh <= boxH) return fs;
  }
  return min;
}

// ── 요소 팩토리 (id 는 build 마다 유일) ──
function maker() {
  let n = 0;
  const id = (p) => `${p}${n++}`;
  return {
    bg: (style) => ({ id: id("bg"), type: "shape", x: 0, y: 0, w: A4.W, h: A4.H, locked: true, style: { radius: 0, ...style } }),
    shape: (x, y, w, h, style) => ({ id: id("s"), type: "shape", x, y, w, h, style }),
    text: (x, y, w, h, text, style, extra = {}) => ({ id: id("t"), type: "text", x, y, w, h, text, style, ...extra }),
    photo: (x, y, w, h, src, style = {}, extra = {}) => ({
      id: id("p"), type: "photo", x, y, w, h, src: src || null, fit: "cover",
      style: { bg: "#eee7df", radius: 14, shadow: "0 6px 16px rgba(0,0,0,0.14)", ...style }, ...extra,
    }),
    emoji: (x, y, size, ch, rot) => ({
      id: id("e"), type: "text", x, y, w: Math.round(size * 1.5), h: Math.round(size * 1.5),
      text: ch, rotation: rot, sticker: true, style: { fontSize: size, align: "center", valign: "center" },
    }),
  };
}

const TITLE_FONT = "'ONE Mobile POP', sans-serif";
const HEAD_FONT = "'Cafe24Ssurround', sans-serif";
const BODY_FONT = "'SUIT', sans-serif";
// 소제목(놀이의 흐름·배움·지원 등) 전용 — 둥글고 또렷한 Jua 로 포인트
const LABEL_FONT = "'Jua', 'Cafe24Ssurround', sans-serif";

// ── 장식 스티커 ──
const KIDS_STICKERS = ["⭐", "✨", "💛", "💚", "🩵", "🌈", "🎈", "☁️", "💗", "🌟"];
const SHAPE_STICKERS = ["🔺", "🔵", "🟡", "🟢", "🟠", "💗", "⭐", "🔶", "💜", "🧡", "💛", "💚"];
// 크기 강약: 큰/작은 섞어 배치(레퍼런스의 큰 마스코트 + 작은 눈송이/점). 에셋 로드 여부와 무관하게 크기만 결정.
const STICKER_SIZES = [78, 40, 66, 34, 72, 46, 50, 36, 38];
const STICKER_MAXBOX = Math.round(78 * 1.5);

// 두 사각형이 겹치는지(여백 pad 포함)
function rectsOverlap(a, b, pad = 0) {
  return a.x - pad < b.x + b.w && a.x + a.w + pad > b.x && a.y - pad < b.y + b.h && a.y + a.h + pad > b.y;
}
// 스티커가 피해야 할 영역 — 텍스트만(사진 위에는 올라가도 됨: 레퍼런스처럼 이미지 위/여백 배치 허용)
function occupiedRects(els) {
  return els
    .filter((e) => e.type === "text" && !e.locked)
    .map((e) => ({ x: e.x, y: e.y, w: e.w, h: e.h }));
}
// 후보 지점: ① 가장자리(좌·우 세로 + 상·하 가로) 우선, ② 내부 그리드(가장자리가 막히면 빈 곳 채움).
// 충돌 회피는 scatterStickers 에서 처리하므로 후보는 넉넉히 두고 빈 곳만 골라 쓴다.
function stickerCandidates(boxW) {
  const e = 6, left = [], right = [], horiz = [], grid = [];
  for (let y = 92; y <= A4.H - boxW - 24; y += 112) {
    left.push({ x: e, y });
    right.push({ x: A4.W - boxW - e, y });
  }
  for (let x = 150; x <= A4.W - boxW - 150; x += 150) {
    horiz.push({ x, y: 2 });
    horiz.push({ x, y: A4.H - boxW - 2 });
  }
  for (let y = 92; y <= A4.H - boxW - 24; y += 44) {
    for (let x = 30; x <= A4.W - boxW - 24; x += 54) grid.push({ x, y });
  }
  const edge = [];
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    if (left[i]) edge.push(left[i]);
    if (right[i]) edge.push(right[i]);
  }
  return [...edge, ...horiz, ...grid];
}
// 배치된 모든 스티커를 stickerAsset 으로 태깅 → 에디터가 기존 에셋 재사용(없으면 생성)으로 이미지 교체.
// 즉시 표시용 placeholder 는 주제 이모지(deco). 텍스트는 피하되 이미지 위/여백 배치 허용, 크기 강약, 스티커끼리 안 겹침.
function scatterStickers(m, theme, n, themeLabel = "", occupied = []) {
  const deco = theme.deco || [];
  const cands = stickerCandidates(STICKER_MAXBOX);
  const placed = [];
  const out = [];
  for (const c of cands) {
    if (out.length >= n) break;
    const i = out.length;
    const size = STICKER_SIZES[i % STICKER_SIZES.length];
    const boxW = Math.round(size * 1.5);
    const rect = { x: c.x, y: c.y, w: boxW, h: boxW };
    if (rect.x < 0 || rect.y < 0 || rect.x + boxW > A4.W || rect.y + boxW > A4.H) continue;
    if (occupied.some((o) => rectsOverlap(rect, o, 8))) continue; // 텍스트 회피
    if (placed.some((o) => rectsOverlap(rect, o, 8))) continue; // 스티커끼리 회피
    const ch = deco.length ? deco[i % deco.length] : KIDS_STICKERS[i % KIDS_STICKERS.length];
    const rot = (i % 2 === 0 ? -1 : 1) * (6 + (i % 3) * 3);
    const el = m.emoji(c.x, c.y, size, ch, rot);
    el.stickerAsset = { themeKey: theme.key, themeLabel: themeLabel || theme.key, idx: i };
    out.push(el);
    placed.push(rect);
  }
  return out;
}

// 캔버스형 고정 스티커 배치 — 현재 자동배치 결과를 그대로 고정(좌표·크기 불변). theme=true 는 큰 마스코트(에셋 교체 대상).
const CANVAS_STICKER_SPOTS = [
  { x: 671, y: 92, size: 78, theme: true },
  { x: 671, y: 316, size: 66, theme: true },
  { x: 671, y: 428, size: 72, theme: true },
  { x: 6, y: 540, size: 40 },
  { x: 6, y: 652, size: 34 },
  { x: 671, y: 652, size: 46 },
  { x: 450, y: 2, size: 36 },
  { x: 462, y: 92, size: 50 },
  { x: 570, y: 92, size: 38 },
];
function placeFixedStickers(m, theme, themeLabel, spots) {
  const deco = theme.deco || [];
  // 좌표·크기는 고정. 모든 spot 을 기존 에셋 로드 대상으로(없으면 생성). placeholder 는 주제 이모지.
  return spots.map((s, i) => {
    const ch = deco.length ? deco[i % deco.length] : KIDS_STICKERS[i % KIDS_STICKERS.length];
    const rot = (i % 2 === 0 ? -1 : 1) * (6 + (i % 3) * 3);
    const el = m.emoji(s.x, s.y, s.size, ch, rot);
    el.stickerAsset = { themeKey: theme.key, themeLabel: themeLabel || theme.key, idx: i };
    return el;
  });
}

// 영유아 발화 말풍선 (빈 공간에 따뜻함 더하기) — 도형(테두리) + 아이 이모지 + 인용문
function speechBubble(m, x, y, w, text, color, h = 66) {
  return [
    m.shape(x, y, w, h, { bg: "#fffdfb", radius: 18, stroke: color, strokeWidth: 2, shadow: "0 4px 12px rgba(60,50,40,0.10)" }),
    m.emoji(x + 8, y + h / 2 - 17, 26, "🧒", -4),
    m.text(x + 44, y + 8, w - 54, h - 16, `“${text}”`, { fontSize: 13, fontFamily: BODY_FONT, color, align: "left", valign: "center" }),
  ];
}

// 상/하단 컬러 도형 스티커 띠 (스토리형 — 레퍼런스의 모서리 도형 보더)
function shapeBorder(m, rows = ["top"]) {
  const els = [], n = 11, gap = (A4.W - 24) / (n - 1);
  for (let i = 0; i < n; i++) {
    const x = Math.round(12 + i * gap - 13);
    if (rows.includes("top")) els.push(m.emoji(x, 2, 24, SHAPE_STICKERS[i % SHAPE_STICKERS.length], 0));
    if (rows.includes("bottom")) els.push(m.emoji(x, A4.H - 32, 24, SHAPE_STICKERS[(i + 4) % SHAPE_STICKERS.length], 0));
  }
  return els;
}

// 공통 데이터 추출
function read(payload) {
  const d = payload || {};
  return {
    title: d?.header?.title || d?.meta?.theme || "우리반 놀이기록",
    subtitle: d?.header?.subtitle || "",
    intro: d?.introduction?.text || "",
    activities: arr(d.activities),
    learning: d?.learning || { title: "놀이 속 배움", text: "" },
    support: d?.teacherSupport || { title: "교사의 지원", text: "" },
    meta: d?.meta || {},
    className: d?.className || "",
    month: d?.month || "",
    photos: arr(d.photos),
  };
}

const doc = (title, bg, elements) => ({
  output_type: "DesignDoc", title, frame: { w: A4.W, h: A4.H, bg }, elements,
});

// ════════════════════════════ 카드형 ════════════════════════════
// 활동 수(3~8)에 맞춘 2열 매거진 카드 — 카드마다 사진 + 아이콘 + 제목 + 요약.
export function buildCardDoc(payload) {
  const c = read(payload);
  const th = themeFor(`${c.meta.theme} ${c.title}`);
  const m = maker();
  const els = [m.bg({ bg: th.pageBg })];
  const M = 46, W = A4.W;

  // 헤더
  els.push(m.shape(W / 2 - 105, 34, 210, 40, { bg: th.badgeBg, radius: 999 }));
  els.push(m.text(W / 2 - 105, 34, 210, 40, "우리반 놀이기록", { fontSize: 18, fontFamily: LABEL_FONT, color: "#fff", align: "center", valign: "center" }));
  els.push(m.text(M, 84, W - 2 * M, 74, c.title, { fontSize: 54, fontFamily: TITLE_FONT, color: th.title, align: "center", valign: "center" }, { textRole: "title" }));
  if (has(c.subtitle)) els.push(m.text(M, 162, W - 2 * M, 26, c.subtitle, { fontSize: 16, fontFamily: LABEL_FONT, color: th.badgeBg, align: "center", valign: "center" }));
  if (has(c.intro)) els.push(m.text(M + 30, 190, W - 2 * M - 60, 62, sentenceLines(c.intro), { fontSize: 16, fontFamily: BODY_FONT, color: "#5a5048", align: "center", valign: "top" }));

  // 활동 카드 — 사진 슬롯 최소 9개(3열×3행), 사진은 4:3 비율. 요약은 박스에 맞춰 전부 노출.
  const acts = c.activities.length ? c.activities : [{ title: c.title, summary: c.intro }];
  const N = 9; // 사진 슬롯 9개 고정(활동이 적으면 빈 슬롯은 사진 자리)
  const cols = 3, gap = 12, gridTop = 258;
  const rows = Math.ceil(N / cols);
  const cardW = Math.floor((W - 2 * M - (cols - 1) * gap) / cols);
  const panelH = 134, gridBottom = A4.H - panelH - 18;
  const rowH = Math.min(232, Math.floor((gridBottom - gridTop - (rows - 1) * gap) / rows));
  const photoW = cardW - 20, photoH = Math.round(photoW * 0.75); // 4:3
  for (let i = 0; i < N; i++) {
    const a = acts[i] || {};
    const col = i % cols, row = Math.floor(i / cols);
    const x = M + col * (cardW + gap), y = gridTop + row * (rowH + gap);
    const color = CARD_COLORS[i % CARD_COLORS.length];
    els.push(m.shape(x, y, cardW, rowH, { bg: "#ffffff", radius: 18, shadow: "0 6px 16px rgba(60,50,40,0.12)" }));
    els.push(m.photo(x + 10, y + 10, photoW, photoH, c.photos[i] || null, { radius: 12 }));
    const ty = y + photoH + 16;
    els.push(m.shape(x + 12, ty, 26, 26, { bg: color, radius: 8 }));
    els.push(m.text(x + 12, ty, 26, 26, iconFor(a.title, i), { fontSize: 15, align: "center", valign: "center" }));
    els.push(m.text(x + 44, ty - 1, cardW - 56, 28, a.title || `놀이 ${i + 1}`, { fontSize: 14, fontFamily: LABEL_FONT, color, align: "left", valign: "center" }, { textRole: "title" }));
    if (has(a.summary)) {
      const sw = cardW - 28, sh = rowH - photoH - 50;
      els.push(m.text(x + 14, ty + 32, sw, sh, a.summary, { fontSize: fitFontSize(a.summary, sw, sh, 12), fontFamily: BODY_FONT, color: "#5a5048", align: "left", valign: "top" }));
    }
  }

  // 하단 2패널 (배움 / 지원) — 하단 고정
  const py = A4.H - panelH - 22;
  const pw = Math.floor((W - 2 * M - gap) / 2), ph = panelH;
  const panel = (px, bg, title, body) => {
    els.push(m.shape(px, py, pw, ph, { bg, radius: 18 }));
    els.push(m.text(px + 20, py + 16, pw - 40, 28, title, { fontSize: 19, fontFamily: LABEL_FONT, color: th.title, align: "left", valign: "center" }, { textRole: "title" }));
    const tw = pw - 40, tht = ph - 60;
    const fs = fitFontSize(body, tw, tht, 13); // 박스에 맞춰 전부 보이게
    els.push(m.text(px + 20, py + 48, tw, tht, body, { fontSize: fs, fontFamily: BODY_FONT, color: "#4d453d", align: "left", valign: "top" }));
  };
  panel(M, th.learnBg, `♥ ${c.learning.title || "놀이 속 배움"}`, c.learning.text);
  panel(M + pw + gap, th.supportBg, `✓ ${c.support.title || "교사의 지원"}`, c.support.text);

  els.push(...scatterStickers(m, th, 9, c.meta.theme || c.title, occupiedRects(els))); // 강약 섞어 9개
  return doc(c.title, th.pageBg, els);
}

// ════════════════════════════ 캔버스형 ════════════════════════════
// 사진 스크랩북: 큰 제목 + 소개 + 흩어진(약간 회전) 사진 + 마스코트 + 하단 3블록
// 좌상단(x<388, y<450)은 제목·소개 텍스트 전용 → 사진은 우측 칼럼 + 하단 밴드에만 배치(텍스트와 안 겹침)
// 모두 4:3 비율(h = w*0.75). 좌상단은 제목·소개 텍스트 전용 → 사진은 우측 칼럼 + 하단 밴드.
const SCATTER = [
  { x: 438, y: 38, w: 300, h: 225, r: 2 },   // 우측 상 4:3
  { x: 438, y: 286, w: 300, h: 225, r: -3 }, // 우측 하 4:3
  { x: 44, y: 540, w: 224, h: 168, r: -4 },  // 하단 좌 4:3
  { x: 282, y: 540, w: 224, h: 168, r: 3 },  // 하단 중 4:3
  { x: 520, y: 540, w: 224, h: 168, r: -2 }, // 하단 우 4:3
];
// 캔버스형(스크랩북) — 레퍼런스 톤: 따뜻한 크림 종이 배경 + 2톤 제목 + 칩 라벨/밝은 본문 박스
const CANVAS_BG = "linear-gradient(165deg,#f7f0e0 0%,#f1e7d2 58%,#efe5cf 100%)";
export function buildCanvasDoc(payload) {
  const c = read(payload);
  const th = themeFor(`${c.meta.theme} ${c.title}`);
  const m = maker();
  const els = [m.bg({ bg: CANVAS_BG })];
  const M = 56;

  // 제목 — 2톤(첫 줄 네이비 + 둘째 줄 accent), 레퍼런스의 "겨울/놀이" 처럼
  const words = c.title.split(/\s+/);
  const half = Math.ceil(words.length / 2);
  const line1 = words.slice(0, half).join(" ");
  const line2 = words.length > 1 ? words.slice(half).join(" ") : "";
  els.push(m.text(M, 52, 360, 92, line1, { fontSize: 70, fontFamily: TITLE_FONT, color: th.title, align: "left", valign: "top" }, { textRole: "title" }));
  if (line2) els.push(m.text(M, 142, 360, 92, line2, { fontSize: 70, fontFamily: TITLE_FONT, color: th.accent, align: "left", valign: "top" }, { textRole: "title" }));
  const introY = line2 ? 250 : 158;
  if (has(c.subtitle)) els.push(m.text(M + 4, introY, 330, 28, c.subtitle, { fontSize: 16, fontFamily: LABEL_FONT, color: th.badgeBg, align: "left", valign: "center" }));
  if (has(c.intro)) els.push(m.text(M + 4, introY + 36, 332, 150, wrap30(c.intro, 22), { fontSize: 17, fontFamily: BODY_FONT, color: "#5b5246", align: "left", valign: "top" }));

  // 사진 (없으면 빈 슬롯) — 레퍼런스처럼 두꺼운 흰 폴라로이드 테두리 + 그림자
  SCATTER.forEach((p, i) => {
    els.push(m.photo(p.x, p.y, p.w, p.h, c.photos[i] || null, { bg: "#ffffff", radius: 10, stroke: "#ffffff", strokeWidth: 16, shadow: "0 10px 24px rgba(40,30,20,0.2)" }, { rotation: p.r }));
  });

  // 유아 발화 말풍선(최대 2개) — 사진 위에 살짝 올려 따뜻하게
  const cq = c.activities.flatMap((a) => arr(a?.childQuotes)).filter(Boolean).slice(0, 2);
  const cqSpots = [{ x: 446, y: 214 }, { x: 290, y: 548 }];
  cq.forEach((q, i) => { if (cqSpots[i]) els.push(...speechBubble(m, cqSpots[i].x, cqSpots[i].y, 200, q, th.badgeBg, 48)); });

  // 하단 블록 — 배움/지원 (놀이의 흐름은 상단 소개와 중복이라 제외). 차분한 베이지 라벨.
  const PILL_BG = "#e3d9c4", PILL_TX = "#6f6149"; // 약화된 라벨(베이지)
  const blocks = [
    { label: c.learning.title || "놀이 속 배움", text: c.learning.text },
    { label: c.support.title || "교사의 지원", text: c.support.text },
  ];
  const bw = A4.W - 2 * M, pillW = 128, textH = 80, bgap = 10;
  const totalH = blocks.length * (34 + textH) + bgap * (blocks.length - 1);
  let by = A4.H - 22 - totalH;
  blocks.forEach((b) => {
    els.push(m.shape(M, by, pillW, 30, { bg: PILL_BG, radius: 15 }));
    els.push(m.text(M, by, pillW, 30, b.label, { fontSize: 15, fontFamily: LABEL_FONT, color: PILL_TX, align: "center", valign: "center" }, { textRole: "title" }));
    els.push(m.shape(M, by + 34, bw, textH, { bg: "#fffdf7cc", radius: 12, stroke: "#e7dcc4", strokeWidth: 1.5 }));
    // 텍스트 영역에 맞춰 줄바꿈 + 폰트 자동맞춤 → 잘림/스크롤 없이 전부 노출
    const fs = fitFontSize(b.text, bw - 32, textH - 14, 13.5);
    els.push(m.text(M + 16, by + 41, bw - 32, textH - 14, b.text, { fontSize: fs, fontFamily: BODY_FONT, color: "#5a5046", align: "left", valign: "top" }));
    by += 34 + textH + bgap;
  });

  els.push(...placeFixedStickers(m, th, c.meta.theme || c.title, CANVAS_STICKER_SPOTS));
  return doc(c.title, CANVAS_BG, els);
}

// ── 스토리형 흐름: 다양한 색 화살표 + 사진 자연 변주 ──
const ARROW_COLORS = ["#F06DA0", "#F4B731", "#5BA7E6", "#A77FCB", "#62B97A", "#F2884B",
  "#E8688A", "#54B6C0", "#F08C5B", "#8AA9DD", "#E1719E", "#7CC4A0"];
// 결정적 변주(위치 dx/dy, 크기 ds, 회전 r) — 정석 그리드를 자연스럽게 흩뜨림
const PHOTO_JITTER = [
  { dx: -10, dy: -6, ds: 10, r: -3 }, { dx: 8, dy: 7, ds: -6, r: 2 }, { dx: -6, dy: 11, ds: 6, r: -2 },
  { dx: 13, dy: -8, ds: -4, r: 3 }, { dx: -13, dy: 6, ds: 16, r: -4 }, { dx: 6, dy: -11, ds: -8, r: 2 },
  { dx: -9, dy: 9, ds: 8, r: -3 }, { dx: 11, dy: -6, ds: -6, r: 3 }, { dx: -11, dy: -9, ds: 13, r: -3 },
  { dx: 9, dy: 11, ds: -4, r: 2 }, { dx: -6, dy: -7, ds: 7, r: -2 }, { dx: 13, dy: 6, ds: -8, r: 3 },
];
const _u = (x, y) => { const l = Math.hypot(x, y) || 1; return { x: x / l, y: y / l }; };
const _r = (n) => Math.round(n * 10) / 10;
// 두 사진 중심 사이의 곡선 점선 화살표(+ 화살촉) 세그먼트
function arrowSeg(A, rA, B, rB, color, sign) {
  const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
  const dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy) || 1;
  const px = -dy / len, py = dx / len;
  const curve = len * 0.24 * sign; // 곡률
  const C = { x: mx + px * curve, y: my + py * curve };
  const ua = _u(C.x - A.x, C.y - A.y), start = { x: A.x + ua.x * (rA + 5), y: A.y + ua.y * (rA + 5) };
  const ub = _u(C.x - B.x, C.y - B.y), end = { x: B.x + ub.x * (rB + 10), y: B.y + ub.y * (rB + 10) };
  const d = `M ${_r(start.x)} ${_r(start.y)} Q ${_r(C.x)} ${_r(C.y)} ${_r(end.x)} ${_r(end.y)}`;
  const t = _u(end.x - C.x, end.y - C.y), a = 9; // 화살촉 크기
  const bp = { x: end.x - t.x * a, y: end.y - t.y * a }, nx = -t.y, ny = t.x;
  const head = `M ${_r(end.x)} ${_r(end.y)} L ${_r(bp.x + nx * a * 0.7)} ${_r(bp.y + ny * a * 0.7)} L ${_r(bp.x - nx * a * 0.7)} ${_r(bp.y - ny * a * 0.7)} Z`;
  return { d, head, color };
}

// ════════════════════════════ 스토리형 ════════════════════════════
export function buildStoryDoc(payload) {
  const c = read(payload);
  const th = themeFor(`${c.meta.theme} ${c.title}`);
  const m = maker();
  const els = [m.bg({ bg: th.pageBg })];
  const M = 40, W = A4.W;

  // 헤더: 제목 + 놀이기록 배지 (아이콘 박스와 제목 박스가 겹치지 않게)
  els.push(m.emoji(M - 2, 44, 56, th.deco[1] || "🌍", -4));
  els.push(m.text(M + 96, 40, 458, 70, c.title, { fontSize: 52, fontFamily: TITLE_FONT, color: th.title, align: "left", valign: "center" }, { textRole: "title" }));
  // 놀이기록 배지 — 상단 우측
  els.push(m.shape(W - M - 150, 50, 150, 36, { bg: th.badgeBg, radius: 8 }));
  els.push(m.text(W - M - 150, 50, 150, 36, "놀이기록", { fontSize: 18, fontFamily: LABEL_FONT, color: "#fff", align: "center", valign: "center" }));

  // 정보 칩 — 놀이기간 · 반이름 (좌측 2개)
  const chips = [
    ["🌱 놀이기간", has(c.month) ? c.month : (c.meta.period || "-")],
    ["🌸 반이름", c.className || "-"],
  ];
  const chipColors = ["#E8F1FB", "#FBEAF1"]; // 소프트 블루·핑크
  const chipText = ["#3E72A8", "#B05A82"];
  const chipW = Math.floor((W - 2 * M - 3 * 12) / 4);
  chips.forEach(([label, value], i) => {
    const x = M + i * (chipW + 12);
    els.push(m.shape(x, 162, chipW, 64, { bg: chipColors[i], radius: 14 }));
    els.push(m.text(x + 14, 170, chipW - 24, 24, label, { fontSize: 14, fontFamily: LABEL_FONT, color: chipText[i], align: "left", valign: "center" }));
    els.push(m.text(x + 14, 196, chipW - 24, 24, String(value), { fontSize: 15, fontFamily: BODY_FONT, color: "#4d453d", align: "left", valign: "center" }));
  });

  // 놀이의 흐름 — 상단 풀폭 밴드(사진을 중앙에 두기 위해 좌측 칼럼 제거)
  els.push(m.shape(M, 238, 150, 30, { bg: th.accent, radius: 8 }));
  els.push(m.text(M + 12, 238, 150, 30, "놀이의 흐름", { fontSize: 17, fontFamily: LABEL_FONT, color: "#fff", align: "left", valign: "center" }, { textRole: "title" }));
  els.push(m.text(M, 276, W - 2 * M, 58, c.intro, { fontSize: fitFontSize(c.intro, W - 2 * M, 58, 15), fontFamily: BODY_FONT, color: "#4d453d", align: "left", valign: "top" }));
  const quotes = c.activities.flatMap((a) => arr(a?.childQuotes)).filter(Boolean).slice(0, 2);

  // 번호 흐름 사진 12장 — 페이지 중앙에 정렬된 3열 그리드(정돈) + 곡선 점선 화살표
  const fcols = 3, NPHOTO = 12, dBase = 125, cellW = 182; // 사진 슬롯 120% 확대
  const gridW = fcols * cellW, fx = Math.round((W - gridW) / 2); // 가로 중앙 정렬
  const startY = 350, rowH = 151;
  const visCol = (i) => (Math.floor(i / fcols) % 2 === 1 ? fcols - 1 - (i % fcols) : i % fcols);
  const sActs = c.activities.length ? c.activities : [{ title: c.title, summary: "" }];

  // 1) 정돈된 중심(지터 제거) — 회전만 약하게
  const nodes = [];
  for (let i = 0; i < NPHOTO; i++) {
    const row = Math.floor(i / fcols), col = visCol(i);
    const rot = (i % 2 === 0 ? -1 : 1) * (1.5 + (i % 3));
    nodes.push({
      cx: fx + col * cellW + cellW / 2,
      cy: startY + row * rowH + dBase / 2,
      size: dBase, r: dBase / 2, rot,
    });
  }

  // 2) 곡선 점선 화살표(여러 색) — 사진 아래 레이어로 한 번에
  const segments = [];
  for (let i = 0; i < NPHOTO - 1; i++) {
    segments.push(arrowSeg(
      { x: nodes[i].cx, y: nodes[i].cy }, nodes[i].r,
      { x: nodes[i + 1].cx, y: nodes[i + 1].cy }, nodes[i + 1].r,
      ARROW_COLORS[i % ARROW_COLORS.length], i % 2 === 0 ? 1 : -1
    ));
  }
  els.push({ id: "conn0", type: "connector", locked: true, x: 0, y: 0, w: A4.W, h: A4.H, segments });

  // 3) 사진 + 번호 배지 (화살표 위)
  for (let i = 0; i < NPHOTO; i++) {
    const n = nodes[i];
    const x = Math.round(n.cx - n.size / 2), y = Math.round(n.cy - n.size / 2);
    const color = CARD_COLORS[i % CARD_COLORS.length];
    els.push(m.photo(x, y, n.size, n.size, c.photos[i] || null, { radius: 14, stroke: "#fff", strokeWidth: 11, shadow: "0 5px 14px rgba(0,0,0,0.18)" }, { rotation: n.rot }));
    els.push(m.shape(x - 6, y - 6, 28, 28, { bg: color, radius: 14, shadow: "0 2px 5px rgba(0,0,0,0.2)" }));
    els.push(m.text(x - 6, y - 6, 28, 28, String(i + 1), { fontSize: 15, fontFamily: HEAD_FONT, color: "#fff", align: "center", valign: "center" }));
  }

  // 4) 캡션: 활동 텍스트를 12장에 반복 없이 자연스럽게 분배(사진 1~2장당 1개, 그룹 중앙 아래)
  //    — 레퍼런스처럼 모든 사진 영역에 설명 텍스트가 닿도록, 활동 수가 적으면 2장이 한 캡션을 공유
  const caps = (c.activities.length ? c.activities.map((a) => a.summary || a.title || "") : [c.intro]).filter(Boolean);
  if (caps.length) {
    const groups = {};
    for (let i = 0; i < NPHOTO; i++) {
      const g = Math.floor((i * caps.length) / NPHOTO);
      (groups[g] = groups[g] || []).push(i);
    }
    Object.keys(groups).forEach((g) => {
      const idxs = groups[g], cap = caps[g];
      if (!cap) return;
      const cxs = idxs.map((i) => nodes[i].cx);
      const minX = Math.min(...cxs), maxX = Math.max(...cxs);
      const bottom = Math.max(...idxs.map((i) => nodes[i].cy + nodes[i].size / 2));
      const wCap = Math.min(cellW * idxs.length - 8, maxX - minX + cellW - 16);
      const hCap = rowH - dBase - 6; // 행 사이 여백에 맞춤
      els.push(m.text(
        Math.round((minX + maxX) / 2 - wCap / 2), Math.round(bottom + 3), Math.round(wCap), hCap,
        cap, { fontSize: fitFontSize(cap, wCap, hCap, 11), fontFamily: BODY_FONT, color: "#5a5048", align: "center", valign: "top" }
      ));
    });
  }

  // 하단 2패널
  const py = startY + (NPHOTO / fcols) * rowH + 8; // 4행 아래
  const pw = Math.floor((W - 2 * M - 16) / 2), ph = A4.H - py - 28;
  const panel = (px, bg, mark, title, body) => {
    els.push(m.shape(px, py, pw, ph, { bg, radius: 16 }));
    els.push(m.text(px + 20, py + 14, pw - 40, 30, `${mark} ${title}`, { fontSize: 19, fontFamily: LABEL_FONT, color: th.title, align: "left", valign: "center" }, { textRole: "title" }));
    const tw = pw - 40, tht = ph - 58;
    els.push(m.text(px + 20, py + 48, tw, tht, body, { fontSize: fitFontSize(body, tw, tht, 14), fontFamily: BODY_FONT, color: "#4d453d", align: "left", valign: "top" }));
  };
  panel(M, th.learnBg, "★", c.learning.title || "놀이 속 배움", c.learning.text);
  panel(M + pw + 16, th.supportBg, "♥", c.support.title || "교사의 지원", c.support.text);

  els.push(...scatterStickers(m, th, 9, c.meta.theme || c.title, occupiedRects(els)));
  return doc(c.title, th.pageBg, els);
}

// 사진 자리(빈 photo 요소) 1개 — 추가 시마다 조금씩 어긋나게 배치
let _slotN = 0;
export function makePhotoSlot() {
  const i = _slotN++;
  const off = (i % 6) * 22;
  return {
    id: `slot${Date.now()}_${i}`, type: "photo", x: 286 + off, y: 430 + off,
    w: 240, h: 180, src: null, fit: "cover",
    style: { bg: "#eee7df", radius: 14, shadow: "0 6px 16px rgba(0,0,0,0.14)" },
  };
}

// 빈 A4 페이지 (페이지 추가용)
export function blankPage(payload) {
  const th = themeFor(`${payload?.meta?.theme || ""} ${payload?.header?.title || ""}`);
  const m = maker();
  return doc("새 페이지", th.pageBg, [m.bg({ bg: th.pageBg })]);
}

export const VARIANTS = [
  { key: "card", label: "카드형", build: buildCardDoc },
  { key: "canvas", label: "캔버스형", build: buildCanvasDoc },
  { key: "story", label: "스토리형", build: buildStoryDoc },
];

export function buildVariant(key, payload) {
  const v = VARIANTS.find((x) => x.key === key) || VARIANTS[0];
  return v.build(payload);
}

// 변형별 첫 페이지가 소화하는 사진 수
const VARIANT_PHOTO_SLOTS = {
  card: () => 9,
  canvas: () => SCATTER.length,
  story: () => 12,
};

// 추가 사진 페이지(둥근 사각형 3열 그리드) — 첫 페이지에 못 담은 사진을 9장씩 채운다.
function buildPhotoGridPage(payload, photos, pageNo) {
  const c = read(payload);
  const th = themeFor(`${c.meta.theme} ${c.title}`);
  const m = maker();
  const els = [m.bg({ bg: th.pageBg })];
  const M = 46, W = A4.W, cols = 3, gap = 16;
  els.push(m.text(M, 40, W - 2 * M, 50, `${c.title}`, { fontSize: 34, fontFamily: TITLE_FONT, color: th.title, align: "center", valign: "center" }, { textRole: "title" }));
  els.push(m.text(M, 92, W - 2 * M, 26, `놀이 사진 ${pageNo}`, { fontSize: 15, fontFamily: LABEL_FONT, color: th.badgeBg, align: "center", valign: "center" }));
  const cw = Math.floor((W - 2 * M - (cols - 1) * gap) / cols);
  const chh = Math.round(cw * 0.84);
  const top = 134;
  photos.forEach((src, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const x = M + col * (cw + gap), y = top + row * (chh + gap);
    els.push(m.photo(x, y, cw, chh, src || null, { radius: 12, stroke: "#fff", strokeWidth: 13, shadow: "0 8px 18px rgba(40,30,20,0.16)" }));
  });
  els.push(...scatterStickers(m, th, 5, c.meta.theme || c.title, occupiedRects(els)));
  return doc(`놀이 사진 ${pageNo}`, th.pageBg, els);
}

// 변형 + 입력 사진 수에 맞춘 페이지 배열(첫 페이지에 못 담은 사진은 추가 페이지로).
export function buildVariantPages(key, payload) {
  const c = read(payload);
  const pages = [buildVariant(key, payload)];
  const used = (VARIANT_PHOTO_SLOTS[key] || (() => 0))(c);
  const PER = 9;
  let i = used, pageNo = 1;
  while (i < c.photos.length) {
    pages.push(buildPhotoGridPage(payload, c.photos.slice(i, i + PER), pageNo++));
    i += PER;
  }
  return pages;
}
