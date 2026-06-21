// WeekCardStructure + StylePack → WeekCardBlueprint(설계도).
// 이 설계도 하나를 "이미지 포스터 렌더러" 와 "편집 가능한 템플릿" 이 공유한다.
// 좌표/슬롯/스타일을 선언적으로 기술하며, 실제 이미지 생성·렌더링은 하지 않는다.
import type { WeekCardStructure, ImagePrompt } from "../transformers/monthlyToInfographic";
import type { StylePack, DecorationKind } from "../styles/stylePacks";

// 장식 종류는 StylePack 정본에서 가져온다 (재-export 로 기존 importer 호환).
export type { DecorationKind } from "../styles/stylePacks";

// ── 설계도 타입 ──
export type BlueprintLayoutId = "week-card-left-text-right-images";
export type BlueprintImageLayout = "hero-2-small";

export interface BlueprintFrame {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface BlueprintTextStyle {
  fontSize: number;
  weight: number;
  color: string;
  align: "left" | "center" | "right";
  lineClamp?: number;
}

export type TextRole = "weekLabel" | "phase" | "title" | "play";

export interface BlueprintTextSlot {
  id: string;
  role: TextRole;
  text: string;
  frame: BlueprintFrame;
  style: BlueprintTextStyle;
  box?: { bg: string; radius: number }; // 배지/칩 배경 (weekLabel·phase 등)
  fontFamily?: string;
  editable: boolean;
}

export type ImageRole = "main" | "sub";

export interface BlueprintImageSlot {
  id: string;
  role: ImageRole;
  frame: BlueprintFrame;
  radius: number;
  fit: "cover";
  caption: string; // 슬롯 의미(편집 패널 라벨/대체 텍스트)
  prompt: ImagePrompt; // 결정적 이미지 프롬프트 (생성 X)
  src?: string; // 렌더/편집 단계에서 채움
  editable: boolean;
}

export interface BlueprintBackground {
  kind: "rounded-card";
  frame: BlueprintFrame;
  color: string;
  radius: number;
  padding: number;
}

export interface BlueprintDecoration {
  kind: DecorationKind;
  frame: BlueprintFrame;
  colors: string[];
}

export interface WeekCardBlueprint {
  layoutId: BlueprintLayoutId;
  imageLayout: BlueprintImageLayout;
  canvas: { w: number; h: number };
  background: BlueprintBackground;
  columns: { left: BlueprintFrame; right: BlueprintFrame };
  textSlots: BlueprintTextSlot[];
  imageSlots: BlueprintImageSlot[];
  decoration: BlueprintDecoration;
  stylePack: StylePack; // 다운스트림 재적용용 참조
  meta: { weekNumber: number; weekLabel: string; phase: string; title: string };
}

// ── 레이아웃 상수 (1080² 정사각 포스터) ──
const CANVAS = 1080;
const PAD = 56;
const GAP = 40;
const CONTENT_W = CANVAS - PAD * 2; // 968
const CONTENT_BOTTOM = CANVAS - PAD; // 1024
const LEFT_W = 430;
const RIGHT_X = PAD + LEFT_W + GAP; // 526
const RIGHT_W = CANVAS - PAD - RIGHT_X; // 498

const PLAY_Y0 = 376;
const PLAY_H = 56;
const PLAY_STEP = 64;

const MAIN_H = 556;
const SUB_GAP = 24;

// 장식 종류: StylePack 이 제공하는 장식 집합에서 주차별로 결정적 선택.
function pickDecoration(stylePack: StylePack, week: WeekCardStructure): DecorationKind {
  const list: DecorationKind[] =
    stylePack.decorations && stylePack.decorations.length
      ? stylePack.decorations
      : ["palette", "paint", "color-chip"];
  return list[(week.weekNumber - 1) % list.length];
}

// 주차 대표 프롬프트를 바탕으로 sub 이미지용 프롬프트 파생 (LLM 호출 없음)
function deriveSubPrompt(base: ImagePrompt, subject: string): ImagePrompt {
  return {
    subject,
    prompt: `Close-up detail of "${subject}". ${base.prompt}`,
    negativePrompt: base.negativePrompt,
    style: base.style,
  };
}

/**
 * WeekCardStructure + StylePack → 공유 설계도(WeekCardBlueprint).
 * 이미지 포스터와 편집 템플릿이 동일한 슬롯/좌표/스타일을 공유하도록 한다.
 */
export function buildWeekCardBlueprint(
  week: WeekCardStructure,
  stylePack: StylePack
): WeekCardBlueprint {
  const fontFamily = stylePack.font;

  // 배경: rounded card (캔버스 전체)
  const background: BlueprintBackground = {
    kind: "rounded-card",
    frame: { x: 0, y: 0, w: CANVAS, h: CANVAS },
    color: stylePack.bg,
    radius: Math.max(stylePack.radius * 1.6, 36),
    padding: PAD,
  };

  const columns = {
    left: { x: PAD, y: PAD, w: LEFT_W, h: CONTENT_BOTTOM - PAD },
    right: { x: RIGHT_X, y: PAD, w: RIGHT_W, h: CONTENT_BOTTOM - PAD },
  };

  // ── 좌측 텍스트 슬롯: 주차 · phase · title · playNames ──
  const textSlots: BlueprintTextSlot[] = [
    {
      id: "week-label",
      role: "weekLabel",
      text: week.weekLabel,
      frame: { x: PAD, y: PAD, w: 168, h: 56 },
      style: { fontSize: 24, weight: 800, color: stylePack.ink, align: "center" },
      box: { bg: stylePack.soft, radius: 28 },
      fontFamily,
      editable: true,
    },
    {
      id: "phase",
      role: "phase",
      text: week.phase,
      frame: { x: PAD + 184, y: PAD + 6, w: 150, h: 44 },
      style: { fontSize: 20, weight: 700, color: "#FFFFFF", align: "center" },
      box: { bg: week.accentColor, radius: 22 },
      fontFamily,
      editable: true,
    },
    {
      id: "title",
      role: "title",
      text: week.title,
      frame: { x: PAD, y: 200, w: LEFT_W, h: 150 },
      style: { fontSize: 56, weight: 800, color: stylePack.ink, align: "left", lineClamp: 2 },
      fontFamily,
      editable: true,
    },
    ...week.playNames.map((name, i) => ({
      id: `play-${i + 1}`,
      role: "play" as const,
      text: name,
      frame: { x: PAD, y: PLAY_Y0 + i * PLAY_STEP, w: LEFT_W, h: PLAY_H },
      style: { fontSize: 26, weight: 600, color: stylePack.body, align: "left" as const, lineClamp: 1 },
      fontFamily,
      editable: true,
    })),
  ];

  // ── 우측 이미지 슬롯: main 1 + sub 2 (hero-2-small) ──
  const subW = (RIGHT_W - SUB_GAP) / 2;
  const subY = PAD + MAIN_H + SUB_GAP;
  const subH = CONTENT_BOTTOM - subY;
  const subRadius = Math.max(stylePack.radius, 18);

  const artifacts = week.artifacts;
  const imageSlots: BlueprintImageSlot[] = [
    {
      id: "image-main",
      role: "main",
      frame: { x: RIGHT_X, y: PAD, w: RIGHT_W, h: MAIN_H },
      radius: Math.max(stylePack.radius * 1.2, 24),
      fit: "cover",
      caption: week.title,
      prompt: week.imagePrompt,
      editable: true,
    },
    {
      id: "image-sub-1",
      role: "sub",
      frame: { x: RIGHT_X, y: subY, w: subW, h: subH },
      radius: subRadius,
      fit: "cover",
      caption: artifacts[0] || `${week.title} 1`,
      prompt: deriveSubPrompt(week.imagePrompt, artifacts[0] || week.title),
      editable: true,
    },
    {
      id: "image-sub-2",
      role: "sub",
      frame: { x: RIGHT_X + subW + SUB_GAP, y: subY, w: subW, h: subH },
      radius: subRadius,
      fit: "cover",
      caption: artifacts[1] || `${week.title} 2`,
      prompt: deriveSubPrompt(week.imagePrompt, artifacts[1] || week.title),
      editable: true,
    },
  ];

  // ── 장식: palette / paint / color-chip 중 선택 ──
  const decoration: BlueprintDecoration = {
    kind: pickDecoration(stylePack, week),
    frame: { x: CANVAS - 220, y: 28, w: 184, h: 120 },
    colors: [week.accentColor, ...(stylePack.palette || []).slice(0, 2)],
  };

  return {
    layoutId: "week-card-left-text-right-images",
    imageLayout: "hero-2-small",
    canvas: { w: CANVAS, h: CANVAS },
    background,
    columns,
    textSlots,
    imageSlots,
    decoration,
    stylePack,
    meta: {
      weekNumber: week.weekNumber,
      weekLabel: week.weekLabel,
      phase: week.phase,
      title: week.title,
    },
  };
}
