// 놀이기록 → A4 DesignDoc(요소 배열) 빌더.
// 한 벌의 PlayRecordTemplate(payload)을 세 가지 편집 가능한 레이아웃으로 변환한다.
//   - card   : 카드형  (3열 활동 카드 그리드 포스터)
//   - canvas : 캔버스형 (사진 스크랩북 — 자유 배치/회전)
//   - story  : 스토리형 (번호 흐름 인포그래픽 + 정보 칩 + 하단 패널)
// 결과는 DesignFrame(요소 기반 자유 캔버스 에디터)이 그대로 렌더·편집한다.

export const A4 = { W: 794, H: 1123 };

// 레이아웃 버전 — 올리면 기존에 캐시된 디자인 문서(docs)를 최신 레이아웃으로 재생성한다.
export const LAYOUT_VERSION = "2026-06-26-card-curated2";

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

// 캔버스형 고정 스티커 배치 — 디자이너가 편집한 배치/크기/회전을 디폴트로 고정.
// (좌표·size·rot 불변. theme=true 는 큰 마스코트, x 음수는 의도적 가장자리 오버행)
const CANVAS_STICKER_SPOTS = [
  { x: 564, y: 700, size: 78, rot: 2, theme: true },
  { x: 531, y: 254, size: 66, rot: 9, theme: true },
  { x: 671, y: 428, size: 72, rot: -12, theme: true },
  { x: 642, y: 810, size: 127, rot: 6 },
  { x: 401, y: 243, size: 72, rot: -22 },
  { x: 272, y: 694, size: 153, rot: 2 },
  { x: -26, y: 388, size: 116, rot: -6 },
  { x: 268, y: 80, size: 103, rot: 9 },
  { x: 164, y: 90, size: 99, rot: -12 },
];
function placeFixedStickers(m, theme, themeLabel, spots) {
  const deco = theme.deco || [];
  // 좌표·크기·회전 고정. 모든 spot 을 기존 에셋 로드 대상으로(없으면 생성). placeholder 는 주제 이모지.
  return spots.map((s, i) => {
    const ch = deco.length ? deco[i % deco.length] : KIDS_STICKERS[i % KIDS_STICKERS.length];
    const rot = s.rot ?? (i % 2 === 0 ? -1 : 1) * (6 + (i % 3) * 3);
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
// 카드형 겨울 주제 고정 스티커(사용자 큐레이션 기준). A4 794×1123.
// 캐릭터: 돋보기아이(1)·펭귄(2 大)·벙어리장갑(6) / 오브제: 눈송이(gen-4 ×2)·솔방울(deco-13 大)·코너 가지(deco-9)
const CARD_WINTER_STICKERS = [
  { src: "/assets/deco/stk-winter-9.png", x: 591, y: 27, w: 214, h: 214, rot: 0, flip: false },     // 우상단 코너 나뭇가지
  { src: "/assets/deco/stk-winter-9.png", x: -18, y: 8, w: 214, h: 214, rot: 0, flip: true },       // 좌상단 코너 나뭇가지(반전)
  { src: "/generated-assets/stk-winter-4.png", x: 492, y: 6, w: 86, h: 86, rot: -8, flip: false },  // 눈송이(상단 우)
  { src: "/generated-assets/stk-winter-4.png", x: 140, y: 93, w: 86, h: 86, rot: -8, flip: false }, // 눈송이(상단 좌)
  { src: "/generated-assets/stk-winter-6.png", x: 685, y: 234, w: 86, h: 86, rot: 10, flip: false },// 빨간 벙어리장갑(우측)
  { src: "/generated-assets/stk-winter-1.png", x: 567, y: 60, w: 120, h: 120, rot: -6, flip: false },// 돋보기 아이(상단 우, 제목 옆)
  { src: "/generated-assets/stk-winter-2.png", x: 172, y: 611, w: 164, h: 164, rot: 6, flip: true }, // 펭귄(좌측 중하, 大)
  { src: "/assets/deco/stk-winter-13.png", x: 655, y: 832, w: 157, h: 157, rot: 8, flip: false },    // 솔방울(우하단, 大)
];

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

  // 스티커: 겨울 주제는 레퍼런스 고정 배치, 그 외는 자동 산포(강약 9개)
  if (th.key === "winter") {
    CARD_WINTER_STICKERS.forEach((s, i) => {
      els.push({
        id: `cstk${i}`, type: "image", src: s.src, fit: "contain", sticker: true,
        x: s.x, y: s.y, w: s.w, h: s.h, rotation: s.rot ?? 0,
        flipH: s.flip || undefined, style: { radius: 0 },
      });
    });
  } else {
    els.push(...scatterStickers(m, th, 9, c.meta.theme || c.title, occupiedRects(els)));
  }
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
  if (has(c.intro)) els.push(m.text(M + 4, introY + 36, 332, 158, c.intro, { fontSize: fitFontSize(c.intro, 332, 158, 24), fontFamily: BODY_FONT, color: "#5b5246", align: "left", valign: "top" }));

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

// ════════════════════════════ 스토리형 (Figma 스크랩북) ════════════════════════════
// 흩뿌린 폴라로이드 사진 13 + 번호 활동 카드 4 + 하단 흐름칩/패널 + 다수 스티커
// (Figma node 2-365 좌표를 보더 13px 제하고 A4 794×1123 로 환산)
const STORY_PHOTO_SLOTS = [
  { x: 468, y: 13, w: 213, h: 171, r: 2 },
  { x: 445, y: 287, w: 145, h: 189, r: -2 },
  { x: 591, y: 292, w: 147, h: 186, r: 2 },
  { x: 55, y: 333, w: 181, h: 138, r: -2 },
  { x: 235, y: 351, w: 175, h: 130, r: 2 },
  { x: 195, y: 490, w: 214, h: 128, r: -2 },
  { x: 426, y: 487, w: 174, h: 128, r: 2 },
  { x: 603, y: 487, w: 174, h: 128, r: -2 },
  { x: 199, y: 636, w: 138, h: 189, r: 2 },
  { x: 298, y: 642, w: 132, h: 186, r: -2 },
  { x: 605, y: 640, w: 174, h: 129, r: 2 },
  { x: 532, y: 753, w: 130, h: 101, r: -3 },
  { x: 419, y: 761, w: 123, h: 91, r: 3 },
];
const STORY_ACT_CARDS = [
  { x: 493, y: 146, w: 181, h: 138 },
  { x: 28, y: 481, w: 196, h: 130 },
  { x: 25, y: 668, w: 194, h: 131 },
  { x: 425, y: 629, w: 171, h: 124 },
];
// 활동명/번호 배지 색 — 레퍼런스 순서: 파랑·초록·연보라·핑크
const STORY_ACT_COLORS = ["#3E72A8", "#5AA46A", "#9B7FC9", "#D173A0"];
const STORY_FLOW_CHIPS = [
  { x: 287, w: 100 }, { x: 396, w: 101 }, { x: 508, w: 97 }, { x: 615, w: 103 },
];
// 스티커 다수 — 큰 마스코트 + 사진 옆 작은 액센트. size = 이모지 fontSize(박스 = 1.5×size).
// placeFixedStickers 가 stickerAsset{themeKey,idx} 태그 → 에디터 resolveSticker 로 테마 PNG 해석(정책 유지).
const STORY_STICKER_SPOTS = [
  { x: 5, y: 920, size: 120 },    // 북극곰(좌하) 큰 마스코트
  { x: 683, y: 1008, size: 74 },  // 다람쥐(우하)
  { x: 643, y: 127, size: 85 },   // 펭귄(우중)
  { x: 295, y: 75, size: 72 },    // 아이·돋보기(제목 옆)
  { x: 668, y: 13, size: 84 },    // 솔방울·열매(우상)
  { x: 226, y: 8, size: 39 },     // 눈(상단)
  { x: 39, y: 114, size: 29 },    // 눈(좌상)
  { x: 681, y: 794, size: 64 },   // 펭귄(우 하단)
  { x: 158, y: 625, size: 39 },   // 펭귄(중)
  { x: 415, y: 268, size: 26 },   // 사진2 모서리
  { x: 690, y: 282, size: 26 },   // 사진3 모서리
  { x: 372, y: 338, size: 26 },   // 사진5 모서리
  { x: 498, y: 480, size: 26 },   // 사진7 모서리
  { x: 360, y: 632, size: 26 },   // 사진10 모서리
];
// 겨울 스토리 기본 디자인 — 레퍼런스('겨울의 즐거움') 구성: 캐릭터·배경(눈송이)·액센트(테이프/장갑)를 균형 배치.
// 캐릭터는 가장자리(북극곰 좌하·펭귄 우상/우중·다람쥐 우), 눈송이는 작게 흩뿌림, 깅엄 테이프·장갑은 액센트.
const STORY_WINTER_STICKERS = [
  // 디자이너 큐레이션(겨울의 즐거움) — 에셋·좌표·크기·회전·반전 그대로 고정 (20개)
  { src: "/assets/deco/stk-winter-14.png", x: 10, y: 891, w: 229, h: 229, rot: 4, flip: false },       // 북극곰 (기본 에셋, 좌하 大)
  { src: "/generated-assets/stk-winter-2.png", x: 636, y: 111, w: 150, h: 150, rot: 8, flip: true },   // 펭귄 (우상)
  { src: "/assets/deco/stk-winter-9.png", x: 674, y: 15, w: 132, h: 132, rot: -7, flip: false },        // 코너 나뭇가지 (우상단)
  { src: "/generated-assets/stk-winter-3.png", x: 645, y: 958, w: 138, h: 138, rot: -8, flip: true },   // 다람쥐 (우측 하단, 북극곰과 균형. 회전 bbox 우측끝≈792<794, 하단≈1105<1123 → 잘림 없음)
  { src: "/generated-assets/stk-winter-1.png", x: 359, y: 188, w: 129, h: 129, rot: -6, flip: false }, // 돋보기 아이 (최종 고정 위치)
  { src: "/generated-assets/stk-winter-4.png", x: 226, y: 4, w: 52, h: 52, rot: 6, flip: false },      // 눈송이
  { src: "/generated-assets/stk-winter-4.png", x: 560, y: 14, w: 46, h: 46, rot: -8, flip: false },
  { src: "/generated-assets/stk-winter-4.png", x: 14, y: 300, w: 44, h: 44, rot: 6, flip: false },
  { src: "/generated-assets/stk-winter-4.png", x: 742, y: 250, w: 42, h: 42, rot: 12, flip: false },
  { src: "/generated-assets/deco-pin-1.png", x: 442, y: 484, w: 65, h: 65, rot: -6, flip: false },     // 핀 (사진 위)
  { src: "/generated-assets/deco-gingham-2.png", x: 217, y: 324, w: 96, h: 96, rot: -10, flip: false },// 깅엄 (사진 위)
  { src: "/generated-assets/deco-gingham-2.png", x: 623, y: 237, w: 96, h: 96, rot: 8, flip: false },  // 깅엄 (사진 위, 우상)
  { src: "/generated-assets/stk-winter-4.png", x: 261, y: 32, w: 96, h: 96, rot: 6, flip: false },     // 눈송이(大, 상단 — 돋보기 아이와 겹침 방지)
  { src: "/assets/deco/stk-winter-10.png", x: -7, y: 817, w: 130, h: 130, rot: 0, flip: false },       // 겨울 나무(눈 가지, 좌하)
  { src: "/generated-assets/deco-pin-1.png", x: 225, y: 603, w: 69, h: 69, rot: 0, flip: false },      // 핀 (사진 위)
  { src: "/generated-assets/deco-tape-2.png", x: 73, y: 270, w: 130, h: 130, rot: 0, flip: false },    // 테이프 (사진 위)
  { src: "/generated-assets/deco-gingham-3.png", x: 516, y: -34, w: 130, h: 130, rot: 0, flip: false },// 깅엄 (상단)
  { src: "/assets/deco/stk-winter-2.png", x: -18, y: -26, w: 130, h: 130, rot: 0, flip: false },       // 고드름 (좌상단 고정)
  { src: "/assets/deco/stk-winter-13.png", x: 658, y: 748, w: 130, h: 130, rot: 0, flip: false },      // 겨울 소품 (우중하)
  { src: "/generated-assets/deco-gingham-1.png", x: 409, y: 729, w: 93, h: 93, rot: 0, flip: false },  // 깅엄 (사진 위)
];

export function buildStoryDoc(payload) {
  const c = read(payload);
  const th = themeFor(`${c.meta.theme} ${c.title}`);
  const m = maker();
  const els = [m.bg({ bg: th.pageBg })];

  // 제목 — 2톤·계단식("겨울" th.title / "놀이" th.accent)
  const words = c.title.split(/\s+/);
  const half = Math.ceil(words.length / 2);
  const line1 = words.slice(0, half).join(" ");
  const line2 = words.length > 1 ? words.slice(half).join(" ") : "";
  // 제목 박스 확대(440×150) + 두 줄 같은 크기로 자동맞춤(최대 101). 줄 간격을 넓혀 두 줄이 서로 겹치지 않게.
  const titleFs = Math.min(fitFontSize(line1, 440, 150, 101), line2 ? fitFontSize(line2, 440, 150, 101) : 101);
  els.push(m.text(51, 38, 440, 150, line1, { fontSize: titleFs, fontFamily: TITLE_FONT, color: th.title, align: "left", valign: "top" }, { textRole: "title" }));
  if (line2) els.push(m.text(75, 140, 440, 150, line2, { fontSize: titleFs, fontFamily: TITLE_FONT, color: th.accent, align: "left", valign: "top" }, { textRole: "title" }));

  // 인트로(좌상단)
  if (has(c.intro)) els.push(m.text(37, 234, 331, 98, c.intro, { fontSize: fitFontSize(c.intro, 331, 98, 16), fontFamily: "'Gaegu', cursive", color: "#5b5246", align: "left", valign: "top" }));

  // 사진 슬롯 13 — 폴라로이드(흰 테두리+그림자), 번호·화살표 없음
  STORY_PHOTO_SLOTS.forEach((p, i) => {
    els.push(m.photo(p.x, p.y, p.w, p.h, c.photos[i] || null, { bg: "#fff", radius: 10, stroke: "#fff", strokeWidth: 8, shadow: "0 6px 16px rgba(40,30,20,0.18)" }, { rotation: p.r }));
  });

  // 번호 활동 카드 4 — c.activities[0..3], 없으면 카드 숨김
  STORY_ACT_CARDS.forEach((cd, i) => {
    const a = c.activities[i];
    if (!a) return;
    els.push(m.shape(cd.x, cd.y, cd.w, cd.h, { bg: "#fffdf7", radius: 14, stroke: "#ece3d0", strokeWidth: 1.5, shadow: "0 6px 16px rgba(40,30,20,0.12)" }));
    const acol = STORY_ACT_COLORS[i % STORY_ACT_COLORS.length];
    els.push(m.shape(cd.x + 11, cd.y + 11, 26, 26, { bg: acol, radius: 13, shadow: "0 2px 5px rgba(0,0,0,0.2)" }));
    els.push(m.text(cd.x + 11, cd.y + 11, 26, 26, String(i + 1), { fontSize: 15, fontFamily: HEAD_FONT, color: "#fff", align: "center", valign: "center" }));
    els.push(m.text(cd.x + 45, cd.y + 12, cd.w - 56, 24, a.title || `놀이 ${i + 1}`, { fontSize: 15, fontFamily: LABEL_FONT, color: acol, align: "left", valign: "center" }, { textRole: "title" }));
    if (has(a.summary)) els.push(m.text(cd.x + 16, cd.y + 44, cd.w - 30, cd.h - 54, a.summary, { fontSize: fitFontSize(a.summary, cd.w - 30, cd.h - 54, 12), fontFamily: BODY_FONT, color: "#5a5046", align: "left", valign: "top" }));
  });

  // 하단 흐름 — 라벨 + 칩 4(활동 제목). 칩 텍스트는 자동맞춤으로 칩 밖으로 안 나감.
  const flowY = 906;
  els.push(m.shape(187, flowY, 90, 26, { bg: "#79b76e", radius: 13 }));
  els.push(m.text(187, flowY, 90, 26, "놀이의 흐름", { fontSize: 13, fontFamily: LABEL_FONT, color: "#fff", align: "center", valign: "center" }, { textRole: "title" }));
  STORY_FLOW_CHIPS.forEach((ch, i) => {
    const a = c.activities[i];
    if (!a) return;
    const txt = `${i + 1}. ${a.title || ""}`;
    els.push(m.shape(ch.x, flowY, ch.w, 26, { bg: "#f0ead9", radius: 13 }));
    els.push(m.text(ch.x + 9, flowY, ch.w - 14, 26, txt, { fontSize: fitFontSize(txt, ch.w - 14, 26, 12), fontFamily: LABEL_FONT, color: "#6f6149", align: "left", valign: "center" }));
  });

  // 하단 패널 — 놀이 비법(learning) + 교사의 지원(support). 둘 다 캔버스 안에(잘림 방지: support 끝 ≤ 1104).
  const panel = (y, h, bg, badge, title, body, bodyH) => {
    els.push(m.shape(181, y, 507, h, { bg, radius: 16, stroke: "#ece3d0", strokeWidth: 1.5 }));
    els.push(m.shape(194, y + 12, 74, 24, { bg: badge, radius: 8 }));
    els.push(m.text(194, y + 12, 74, 24, title, { fontSize: 13, fontFamily: LABEL_FONT, color: "#fff", align: "center", valign: "center" }, { textRole: "title" }));
    if (has(body)) els.push(m.text(282, y + 14, 392, bodyH, body, { fontSize: fitFontSize(body, 392, bodyH, 13), fontFamily: BODY_FONT, color: "#5a5046", align: "left", valign: "top" }));
  };
  panel(940, 78, th.learnBg, "#f9973f", c.learning.title || "놀이 비법", c.learning.text, 58);
  panel(1026, 78, th.supportBg, "#418bc8", c.support.title || "교사의 지원", c.support.text, 58);

  // 스티커: ① 사용자가 "찜"한 배치(localStorage) ② 겨울 큐레이션 디폴트 ③ 그 외 주제 자동 배치
  const fixed = savedStoryStickers(th.key) || (th.key === "winter" ? STORY_WINTER_STICKERS : null);
  if (fixed) {
    fixed.forEach((s, i) => {
      els.push({
        id: `wstk${i}`, type: "image", src: s.src, fit: "contain", sticker: true,
        x: s.x, y: s.y, w: s.w, h: s.h, rotation: s.rot ?? s.rotation ?? 0,
        flipH: (s.flip ?? s.flipH) || undefined, style: { radius: 0 },
      });
    });
  } else {
    els.push(...placeFixedStickers(m, th, c.meta.theme || c.title, STORY_STICKER_SPOTS));
  }
  return doc(c.title, th.pageBg, els);
}

// ── 스토리 스티커 "찜" 프리셋 (테마별 localStorage) ──
// 키에 LAYOUT_VERSION 포함 → 디자인 디폴트가 갱신되면 옛 찜은 자동 무효화(스테일 찜이 새 디폴트를 가리지 않음)
const STORY_STK_KEY = (themeKey) => `pr-story-stickers-${themeKey || "default"}-${LAYOUT_VERSION}`;
function savedStoryStickers(themeKey) {
  try {
    const raw = typeof localStorage !== "undefined" && localStorage.getItem(STORY_STK_KEY(themeKey));
    if (raw) { const arr = JSON.parse(raw); if (Array.isArray(arr) && arr.length) return arr; }
  } catch (e) { /* ignore */ }
  return null;
}
// 현재 스티커 배치를 그 주제의 스토리 디폴트로 저장(찜)
export function saveStoryStickers(themeKey, stickers) {
  try { localStorage.setItem(STORY_STK_KEY(themeKey), JSON.stringify(stickers)); return true; } catch (e) { return false; }
}
// payload → 주제 키 (찜 저장/조회용)
export function themeKeyOf(payload) {
  const text = `${payload?.meta?.theme || ""} ${payload?.header?.title || ""}`;
  return (themeFor(text) || {}).key || "default";
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
  story: () => STORY_PHOTO_SLOTS.length,
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
