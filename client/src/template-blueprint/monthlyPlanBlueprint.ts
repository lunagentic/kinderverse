// =============================================================================
// monthly_plan_v1 Template Blueprint — "여름이 왔어요" 디자인.
// Theme Design System 기반(팔레트·배지·주차색·타이포그래피) + Sticker size-tier.
//
//   Hero → 놀이 선정 이유 → 이달의 놀이 흐름(Week1~4) → 교사의 기대 → 주요 놀이 요소
//
// 각 섹션: Badge(색상 pill) → Content → Sticker 구조. 제목=ONE Mobile POP 계열, 본문=SUIT.
// =============================================================================
import type { DesignRecipe } from "../design-recipe";
import { createAssetSlot } from "./assetSlot";
import {
  getTheme,
  stickerSize,
  TITLE_FONT,
  BODY_FONT,
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

const CONTENT = {
  title: "여름이 왔어요",
  age: "연령 3~5세",
  month: "6월",
  theme: "생활주제 : 여름",
  reasonTitle: "놀이 선정 이유",
  flowTitle: "이달의 놀이 흐름",
  weeks: ["여름과 날씨", "여름의 생물", "물과 얼음 놀이", "여름의 즐거움"],
  expectationTitle: "교사의 기대",
  elementTitle: "주요 놀이 요소",
};

function shape(id: string, kind: ShapeElement["shape"], frame: Frame, style: ShapeStyle, z: number): ShapeElement {
  return { id, kind: "shape", shape: kind, frame, editable: true, movable: true, resizable: true, visible: true, z, style };
}
function text(id: string, role: string, value: string, frame: Frame, style: TextStyle, z: number, binding?: string): TextElement {
  return { id, kind: "text", role, text: value, frame, editable: true, movable: true, resizable: true, visible: true, z, style, binding };
}
// tier 기준 정규화 크기로 스티커 슬롯 생성
function sticker(id: string, assetId: string, role: AssetSlot["assetRole"], tier: StickerTier, x: number, y: number, aspect = 1): AssetSlot {
  const { w, h } = stickerSize(tier, aspect);
  return createAssetSlot({ id, type: "sticker", assetId, assetRole: role, x, y, width: w, height: h });
}

export function buildMonthlyPlanBlueprint(recipe: DesignRecipe): TemplateBlueprint {
  const T = getTheme(recipe.themeFamily);
  const card: ShapeStyle = { fill: T.card, radius: 32, opacity: 1 };
  const pill = (fill: string): ShapeStyle => ({ fill, radius: 999 });

  // 타이포 토큰
  const heroTitleStyle: TextStyle = { fontSize: 96, weight: 800, color: T.heroTitle, align: "center", fontFamily: TITLE_FONT };
  const badgeChip: TextStyle = { fontSize: 32, weight: 800, color: "#FFFFFF", align: "center", fontFamily: BODY_FONT };
  const badgeTitle: TextStyle = { fontSize: 38, weight: 800, color: "#FFFFFF", align: "center", fontFamily: TITLE_FONT };
  const weekNumStyle: TextStyle = { fontSize: 30, weight: 800, color: "#FFFFFF", align: "center", fontFamily: TITLE_FONT };

  // ── background ──
  const background: Layer = {
    id: "layer-background", type: "background", editable: true, movable: false, visible: true,
    children: [shape("Background", "rect", { x: 0, y: 0, width: CANVAS_W, height: CANVAS_H }, { fill: T.bg }, 0)],
  };

  // ── shape (카드 / 배지) ──
  const shapes: ShapeElement[] = [
    // Hero
    shape("HeroCard", "rect", { x: 60, y: 60, width: 960, height: 360 }, { fill: T.heroBg, radius: 40 }, 1),
    shape("AgeBadge", "pill", { x: 330, y: 296, width: 220, height: 64 }, pill(T.heroAccent), 2),
    shape("ThemeBadge", "pill", { x: 560, y: 296, width: 300, height: 64 }, pill(T.badges.expectation.fill), 2),
    // 섹션 배지
    shape("ReasonCard", "rect", { x: 60, y: 460, width: 960, height: 230 }, card, 1),
    shape("ReasonBadge", "pill", { x: 350, y: 476, width: 380, height: 70 }, pill(T.badges.reason.fill), 2),
    shape("FlowTitleBadge", "pill", { x: 330, y: 716, width: 420, height: 74 }, pill(T.badges.flow.fill), 2),
    shape("ExpectationCard", "rect", { x: 60, y: 1350, width: 960, height: 250 }, card, 1),
    shape("ExpectationBadge", "pill", { x: 350, y: 1366, width: 380, height: 70 }, pill(T.badges.expectation.fill), 2),
    shape("ElementCard", "rect", { x: 60, y: 1630, width: 960, height: 230 }, card, 1),
    shape("ElementBadge", "pill", { x: 350, y: 1646, width: 380, height: 66 }, pill(T.badges.element.fill), 2),
  ];
  // 주차 카드 (틴트 배경 + 번호 배지) — 2×2
  const weekPos = [
    { x: 60, y: 830 }, { x: 560, y: 830 }, { x: 60, y: 1080 }, { x: 560, y: 1080 },
  ];
  weekPos.forEach((p, i) => {
    const wc = T.weeks[i];
    shapes.push(shape(`Week${i + 1}Card`, "rect", { x: p.x, y: p.y, width: 460, height: 230 }, { fill: wc.tint, radius: 28 }, 1));
    shapes.push(shape(`Week${i + 1}NumBadge`, "circle", { x: p.x + 24, y: p.y + 22, width: 64, height: 64 }, { fill: wc.accent, radius: 999 }, 2));
  });
  const shapeLayer: Layer = { id: "layer-shape", type: "shape", editable: true, movable: true, visible: true, children: shapes };

  // ── sticker (캐릭터·오브젝트 + 학습요소 아이콘) — size-tier 정규화 ──
  const ICONS = ["exploration", "observation", "expression", "cooperation", "play", "safety"];
  const stickerSlots: AssetSlot[] = [
    // Hero (hero tier 캐릭터 + section tier 오브젝트)
    sticker("slot_hero_child_girl", "summer_child_girl", "character", "hero", 70, 150, 1.15),
    sticker("slot_hero_sun", "summer_sun", "object", "section", 860, 80),
    sticker("slot_hero_cloud", "summer_cloud", "object", "section", 720, 110, 0.8),
    // Play Reason
    sticker("slot_reason_magnifier_girl", "summer_magnifier_girl", "character", "section", 80, 500, 1.15),
    sticker("slot_reason_sandcastle", "summer_sandcastle", "object", "section", 840, 520),
    sticker("slot_reason_beach_ball", "summer_beach_ball", "object", "section", 690, 540, 0.9),
    // Week 1~4 (각 카드 우측 하단, section tier)
    sticker("slot_week1_sun_sunglasses", "summer_sun_sunglasses", "object", "section", 360, 900),
    sticker("slot_week2_frog", "summer_frog", "character", "section", 860, 900),
    sticker("slot_week2_dragonfly", "summer_dragonfly", "object", "section", 740, 910, 0.8),
    sticker("slot_week3_water_child", "summer_water_child", "character", "section", 360, 1150, 1.1),
    sticker("slot_week3_ice_cube", "summer_ice_cube", "object", "section", 250, 1170),
    sticker("slot_week4_tent", "summer_tent", "object", "section", 860, 1150),
    sticker("slot_week4_watermelon", "summer_watermelon", "object", "section", 740, 1170, 0.9),
    // Teacher Expectation
    sticker("slot_expectation_teacher", "summer_teacher", "character", "section", 90, 1400, 1.15),
    // Learning Elements — 아이콘 (section tier 보다 작게: 학습요소 6칸)
    ...ICONS.map((k, i) =>
      createAssetSlot({ id: `slot_element_icon_${k}`, type: "sticker", assetId: `summer_icon_${k}`, assetRole: "icon", x: 110 + i * 150, y: 1716, width: 96, height: 96 })
    ),
  ];
  const stickerLayer: Layer = { id: "layer-sticker", type: "sticker", editable: true, movable: true, visible: true, children: stickerSlots };

  // ── decoration (꾸밈 asset) ──
  const decorationSlots: AssetSlot[] = [
    createAssetSlot({ id: "slot_expectation_flower", type: "decoration", assetId: "summer_flower", assetRole: "decoration", x: 790, y: 1400, width: 90, height: 90 }),
    createAssetSlot({ id: "slot_expectation_leaf", type: "decoration", assetId: "summer_leaf", assetRole: "decoration", x: 890, y: 1400, width: 90, height: 90 }),
    createAssetSlot({ id: "slot_corner_frog", type: "decoration", assetId: "summer_frog", assetRole: "decoration", x: 70, y: 1760, width: 110, height: 110 }),
  ];
  const decorationLayer: Layer = { id: "layer-decoration", type: "decoration", editable: true, movable: true, visible: true, children: decorationSlots };

  // ── text ──
  const texts: TextElement[] = [
    text("Title", "hero", CONTENT.title, { x: 100, y: 110, width: 880, height: 140 }, heroTitleStyle, 5, "meta.title"),
    text("Age", "hero_age", CONTENT.age, { x: 330, y: 312, width: 220, height: 36 }, badgeChip, 6, "basic_info.age"),
    text("Theme", "hero_theme", CONTENT.theme, { x: 560, y: 312, width: 300, height: 36 }, badgeChip, 6, "basic_info.theme"),
    text("ReasonTitle", "play_reason", CONTENT.reasonTitle, { x: 350, y: 490, width: 380, height: 42 }, badgeTitle, 7, "sections.play_reason"),
    text("FlowTitle", "weekly_flow", CONTENT.flowTitle, { x: 330, y: 730, width: 420, height: 44 }, badgeTitle, 7, "sections.weekly_flow"),
    text("ExpectationTitle", "teacher_expectation", CONTENT.expectationTitle, { x: 350, y: 1380, width: 380, height: 42 }, badgeTitle, 7, "sections.teacher_expectation"),
    text("ElementTitle", "learning_elements", CONTENT.elementTitle, { x: 350, y: 1660, width: 380, height: 40 }, badgeTitle, 7, "sections.learning_elements"),
  ];
  // 주차 번호 + 제목 (번호배지 옆, 주차색 제목)
  weekPos.forEach((p, i) => {
    const wc = T.weeks[i];
    texts.push(text(`Week${i + 1}Num`, `week_${i + 1}_num`, `${i + 1}주`, { x: p.x + 24, y: p.y + 36, width: 64, height: 36 }, weekNumStyle, 8));
    texts.push(text(`Week${i + 1}Title`, `week_${i + 1}`, CONTENT.weeks[i], { x: p.x + 100, y: p.y + 30, width: 340, height: 48 }, { fontSize: 40, weight: 800, color: wc.accent, align: "left", fontFamily: TITLE_FONT }, 8, `weekly_flow[${i}].title`));
  });
  const textLayer: Layer = { id: "layer-text", type: "text", editable: true, movable: true, visible: true, children: texts };

  return {
    styleFamily: recipe.styleFamily,
    canvas: { width: CANVAS_W, height: CANVAS_H, editable: true },
    layers: [background, shapeLayer, stickerLayer, decorationLayer, textLayer],
  };
}
