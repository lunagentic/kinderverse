// =============================================================================
// monthly_plan_v1 Template Blueprint — Theme Design System 기반.
//
// 구조: Hero Scene → 놀이 선정 이유(본문) → 이달의 놀이 흐름(주차별 놀이명)
//       → 이달의 행사 → 가정 연계 → 주요 놀이 요소 아이콘(하단 풋터)
//
// Hero Scene System(5 레이어): Background · Environment · Main Object · Decorative · Title Area
// 섹션 배경=연한 톤, 콘텐츠(배지/번호/제목)=진한 색. 제목=ONE Mobile POP, 본문=SUIT.
// content 는 recipe.content(실제 월안) 우선, 없으면 레퍼런스 기본값.
// =============================================================================
import type { DesignRecipe } from "../design-recipe";
import { createAssetSlot } from "./assetSlot";
import { buildHeroScene, heroSceneToBuckets } from "./heroScene";
import {
  getTheme,
  stickerSize,
  TITLE_FONT,
  SUBTITLE_FONT,
  BODY_FONT,
  CARD_SHADOW,
  CARD_BORDER_WIDTH,
  type StickerTier,
} from "../design-system/themeDesignSystem";
import type {
  AssetSlot,
  Frame,
  Layer,
  ShapeElement,
  ShapeStyle,
  TemplateBlueprint,
  TextElement,
  TextStyle,
} from "./types";

const CANVAS_W = 1080;
const CANVAS_H = 1920;

// 레퍼런스 기본 콘텐츠 (payload 없을 때)
const DEFAULT_CONTENT = {
  title: "여름이 왔어요",
  age: "연령 3~5세",
  month: "6월",
  theme: "생활주제 : 여름",
  reasonTitle: "놀이 선정 이유",
  reasonBody:
    "여름철 자연환경에 대한 호기심과 즐거움을 유아들이 느낄 수 있도록 다양한 놀이 경험을 제공합니다. 여름철 변화 탐구를 통해 인지적·사회적·신체적·언어적·예술적 발달을 도모합니다.",
  flowTitle: "이달의 놀이 흐름",
  weeks: [
    { title: "여름과 날씨", plays: ["여름 날씨 알아보기", "여름 그림 그리기", "여름의 소리 듣기"] },
    { title: "여름의 생물", plays: ["여름 곤충 관찰하기", "물놀이 준비하기", "여름 꽃 만들기"] },
    { title: "물과 얼음 놀이", plays: ["얼음 녹이기 실험", "워터파크 만들기", "여름 물감 놀이"] },
    { title: "여름의 즐거움", plays: ["여름 캠핑 놀이", "여름 과일 탐험", "신나는 여름 노래"] },
  ],
  eventsTitle: "이달의 행사",
  events: ["여름맞이 물놀이 (6/15)", "가족 캠핑 데이 (6/28)"],
  expectationTitle: "교사의 기대",
  expectations: ["오감으로 여름을 탐색하며 호기심을 키운다", "친구와 협력하며 즐겁게 놀이한다"],
};

function shape(id: string, kind: ShapeElement["shape"], frame: Frame, style: ShapeStyle, z: number): ShapeElement {
  return { id, kind: "shape", shape: kind, frame, editable: true, movable: true, resizable: true, visible: true, z, style };
}
function text(id: string, role: string, value: string, frame: Frame, style: TextStyle, z: number, binding?: string): TextElement {
  return { id, kind: "text", role, text: value, frame, editable: true, movable: true, resizable: true, visible: true, z, style, binding };
}
function sticker(id: string, assetId: string, role: AssetSlot["assetRole"], tier: StickerTier, x: number, y: number, aspect = 1): AssetSlot {
  const { w, h } = stickerSize(tier, aspect);
  return createAssetSlot({ id, type: "sticker", assetId, assetRole: role, x, y, width: w, height: h });
}
const bullets = (items: string[]) => items.map((s) => `· ${s}`).join("\n");

export function buildMonthlyPlanBlueprint(recipe: DesignRecipe): TemplateBlueprint {
  const T = getTheme(recipe.themeFamily);
  const C = { ...DEFAULT_CONTENT, ...(recipe.content ?? {}) };
  const S = T.sections;
  const pill = (fill: string): ShapeStyle => ({ fill, radius: 999 });
  // 카드: 둥근 모서리 + 섹션 accent 얇은 테두리 + 부드러운 그림자
  const card = (fill: string, accent: string, radius = 32): ShapeStyle => ({
    fill, radius, opacity: 1, stroke: accent, strokeWidth: CARD_BORDER_WIDTH, shadow: CARD_SHADOW,
  });

  // ── Hero Scene System (5 레이어 합성: Background/Environment/MainObject/Decorative/TitleArea) ──
  const hero = heroSceneToBuckets(
    buildHeroScene({
      theme: T,
      themeFamily: recipe.themeFamily,
      region: { x: 0, y: 0, width: CANVAS_W, height: 420 }, // 풀블리드 상단 장면
      title: C.title,
      age: C.age,
      lifeTheme: C.theme,
    })
  );

  // 타이포 토큰
  const badgeTitle: TextStyle = { fontSize: 38, weight: 700, color: "#FFFFFF", align: "center", fontFamily: SUBTITLE_FONT };
  const weekNumStyle: TextStyle = { fontSize: 30, weight: 800, color: "#FFFFFF", align: "center", fontFamily: TITLE_FONT };
  const bodyStyle: TextStyle = { fontSize: 26, weight: 500, color: T.ink, align: "left", fontFamily: BODY_FONT };
  const playStyle: TextStyle = { fontSize: 24, weight: 600, color: T.ink, align: "left", fontFamily: BODY_FONT };
  const iconLabel: TextStyle = { fontSize: 22, weight: 700, color: T.ink, align: "center", fontFamily: BODY_FONT };

  // ── background (캔버스 배경 채움) ──
  const background: Layer = {
    id: "layer-background", type: "background", editable: true, movable: false, visible: true,
    children: [shape("Background", "rect", { x: 0, y: 0, width: CANVAS_W, height: CANVAS_H }, { fill: T.bg }, 0)],
  };

  // ── shape (카드 / 배지) ── Hero(Background + Title Area 배지) + 섹션 카드
  const shapes: ShapeElement[] = [
    ...hero.shapes,
    // 놀이 선정 이유
    shape("ReasonCard", "rect", { x: 60, y: 460, width: 960, height: 230 }, card(S.reason.bg, S.reason.accent), 1),
    shape("ReasonBadge", "pill", { x: 350, y: 476, width: 380, height: 70 }, pill(S.reason.accent), 2),
    // 이달의 놀이 흐름 (배지)
    shape("FlowTitleBadge", "pill", { x: 330, y: 716, width: 420, height: 74 }, pill(S.flow.accent), 2),
    // 이달의 행사 (퍼플) — 축소
    shape("EventsCard", "rect", { x: 60, y: 1350, width: 960, height: 150 }, card(S.element.bg, S.element.accent), 1),
    shape("EventsBadge", "pill", { x: 350, y: 1360, width: 380, height: 60 }, pill(S.element.accent), 2),
    // 교사의 기대 (그린) — 확대
    shape("ExpectationCard", "rect", { x: 60, y: 1520, width: 960, height: 250 }, card(S.expectation.bg, S.expectation.accent), 1),
    shape("ExpectationBadge", "pill", { x: 350, y: 1540, width: 380, height: 68 }, pill(S.expectation.accent), 2),
  ];
  // 주차 카드 (틴트 배경 + 번호 배지) — 2×2
  const weekPos = [{ x: 60, y: 830 }, { x: 560, y: 830 }, { x: 60, y: 1080 }, { x: 560, y: 1080 }];
  weekPos.forEach((p, i) => {
    const wc = T.weeks[i];
    shapes.push(shape(`Week${i + 1}Card`, "rect", { x: p.x, y: p.y, width: 460, height: 230 }, card(wc.tint, wc.accent, 28), 1));
    shapes.push(shape(`Week${i + 1}NumBadge`, "circle", { x: p.x + 24, y: p.y + 22, width: 56, height: 56 }, { fill: wc.accent, radius: 999 }, 2));
  });
  const shapeLayer: Layer = { id: "layer-shape", type: "shape", editable: true, movable: true, visible: true, children: shapes };

  // 놀이 흐름 주차 스티커 — 직전(288)의 80% = 230, 카드 우측 정렬·세로 중앙
  const WEEK_STICKER = Math.round(stickerSize("section").w * 1.8 * 0.8); // 160→288→230
  const weekSticker = (id: string, assetId: string, role: AssetSlot["assetRole"], i: number): AssetSlot => {
    const p = weekPos[i];
    return createAssetSlot({
      id, type: "sticker", assetId, assetRole: role,
      x: p.x + 460 - WEEK_STICKER,
      y: p.y + Math.round((230 - WEEK_STICKER) / 2),
      width: WEEK_STICKER, height: WEEK_STICKER,
    });
  };

  // ── sticker ── Hero Scene(Environment + Main Object) + 주차 + 아이콘(하단 풋터)
  const ICONS = ["exploration", "observation", "expression", "cooperation", "play", "safety"];
  const stickerSlots: AssetSlot[] = [
    ...hero.stickers,
    // 놀이 선정 이유 — 주제 연관 스티커 2개 (돋보기 소녀 좌 / 모래성 우)
    createAssetSlot({ id: "slot_reason_magnifier", type: "sticker", assetId: "summer_magnifier_girl", assetRole: "character", x: 56, y: 492, width: 190, height: 200 }),
    createAssetSlot({ id: "slot_reason_sandcastle", type: "sticker", assetId: "summer_sandcastle", assetRole: "object", x: 808, y: 512, width: 196, height: 168 }),
    // 주차별 대표 스티커 (각 카드 우측, 80% 축소)
    weekSticker("slot_week1_sun_sunglasses", "summer_sun_sunglasses", "object", 0),
    weekSticker("slot_week2_frog", "summer_frog", "character", 1),
    weekSticker("slot_week3_water_child", "summer_water_child", "character", 2),
    weekSticker("slot_week4_tent", "summer_tent", "object", 3),
    // 교사의 기대 — 수첩 든 교사(반신) 좌측·칸 하단, 120% 확대 (190→228, 214→257)
    createAssetSlot({ id: "slot_expectation_teacher", type: "sticker", assetId: "summer_teacher_notepad", assetRole: "character", x: 70, y: 1513, width: 228, height: 257 }),
    // 주요 놀이 요소 아이콘 — 하단 풋터로 이동 (작게, 한 줄)
    ...ICONS.map((k, i) =>
      createAssetSlot({ id: `slot_icon_${k}`, type: "sticker", assetId: `summer_icon_${k}`, assetRole: "icon", x: 70 + i * 158, y: 1800, width: 84, height: 84 })
    ),
  ];
  const stickerLayer: Layer = { id: "layer-sticker", type: "sticker", editable: true, movable: true, visible: true, children: stickerSlots };

  // ── decoration ── Hero Scene · Decorative 레이어 + 코너 장식
  const decorationSlots: AssetSlot[] = [
    ...hero.decorations,
    createAssetSlot({ id: "deco_flower", type: "decoration", assetId: "summer_flower", assetRole: "decoration", x: 950, y: 1470, width: 80, height: 80 }),
    createAssetSlot({ id: "deco_leaf", type: "decoration", assetId: "summer_leaf", assetRole: "decoration", x: 950, y: 1690, width: 80, height: 80 }),
  ];
  const decorationLayer: Layer = { id: "layer-decoration", type: "decoration", editable: true, movable: true, visible: true, children: decorationSlots };

  // ── text ── Hero Scene · Title Area + 섹션 텍스트
  const texts: TextElement[] = [
    ...hero.texts,
    // 놀이 선정 이유 (배지 + 본문)
    text("ReasonTitle", "play_reason", C.reasonTitle, { x: 350, y: 490, width: 380, height: 42 }, badgeTitle, 7, "sections.play_reason"),
    text("ReasonBody", "play_reason_body", C.reasonBody, { x: 256, y: 558, width: 536, height: 120 }, bodyStyle, 6, "rationale.summary"),
    // 이달의 놀이 흐름 (배지)
    text("FlowTitle", "weekly_flow", C.flowTitle, { x: 330, y: 730, width: 420, height: 44 }, badgeTitle, 7, "sections.weekly_flow"),
    // 이달의 행사 (배지 + 목록) — 축소
    text("EventsTitle", "events", C.eventsTitle, { x: 350, y: 1372, width: 380, height: 40 }, badgeTitle, 7, "sections.events"),
    text("EventsBody", "events_body", bullets(C.events), { x: 96, y: 1432, width: 820, height: 56 }, playStyle, 6, "events"),
    // 교사의 기대 (배지 + 목록) — 확대, 좌측 교사 캐릭터 공간 확보(본문 우측)
    text("ExpectationTitle", "teacher_expectations", C.expectationTitle, { x: 350, y: 1550, width: 380, height: 42 }, badgeTitle, 7, "sections.teacher_expectations"),
    text("ExpectationBody", "teacher_expectations_body", bullets(C.expectations), { x: 330, y: 1626, width: 680, height: 130 }, playStyle, 6, "teacher_expectations"),
  ];
  // 주차 번호 + 소주제 + 놀이명
  weekPos.forEach((p, i) => {
    const wc = T.weeks[i];
    const w = C.weeks[i] ?? DEFAULT_CONTENT.weeks[i];
    texts.push(text(`Week${i + 1}Num`, `week_${i + 1}_num`, `${i + 1}주`, { x: p.x + 24, y: p.y + 34, width: 56, height: 32 }, weekNumStyle, 8));
    texts.push(text(`Week${i + 1}Title`, `week_${i + 1}_title`, w.title, { x: p.x + 92, y: p.y + 28, width: 340, height: 44 }, { fontSize: 36, weight: 700, color: wc.accent, align: "left", fontFamily: SUBTITLE_FONT }, 8, `weekly_flow[${i}].sub_theme`));
    texts.push(text(`Week${i + 1}Plays`, `week_${i + 1}_plays`, bullets(w.plays), { x: p.x + 28, y: p.y + 92, width: 404, height: 124 }, playStyle, 8, `weekly_flow[${i}].plays`));
  });
  // 아이콘 라벨 (풋터)
  const ICON_LABEL: Record<string, string> = { exploration: "탐색", observation: "관찰", expression: "표현", cooperation: "협력", play: "놀이", safety: "안전" };
  ICONS.forEach((k, i) => {
    texts.push(text(`iconlbl_${k}`, `icon_${k}`, ICON_LABEL[k], { x: 56 + i * 158, y: 1888, width: 112, height: 28 }, iconLabel, 8));
  });
  const textLayer: Layer = { id: "layer-text", type: "text", editable: true, movable: true, visible: true, children: texts };

  return {
    styleFamily: recipe.styleFamily,
    canvas: { width: CANVAS_W, height: CANVAS_H, editable: true },
    layers: [background, shapeLayer, stickerLayer, decorationLayer, textLayer],
  };
}
