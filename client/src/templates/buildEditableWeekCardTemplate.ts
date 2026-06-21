// WeekCardBlueprint → 편집 가능한 레이어 JSON(EditableWeekCardTemplate).
// 설계도의 슬롯/좌표/스타일을 편집기가 다룰 수 있는 평면 레이어 배열로 변환한다.
import type {
  WeekCardBlueprint,
  BlueprintTextSlot,
  BlueprintImageSlot,
} from "../blueprints/buildWeekCardBlueprint";
import type { WeekCardStructure } from "../transformers/monthlyToInfographic";

export type LayerType = "text" | "image" | "shape" | "icon";

export interface EditableLayerStyle {
  // text
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  align?: "left" | "center" | "right";
  lineClamp?: number;
  fontFamily?: string;
  // box / shape
  backgroundColor?: string;
  radius?: number;
  fill?: string;
  opacity?: number;
  shadow?: "soft" | "bright" | "none";
  // image
  fit?: "cover" | "contain";
  frame?: "rounded" | "square";
  // icon / decoration
  colors?: string[];
  iconKind?: string;
  size?: number;
}

export interface EditableLayer {
  id: string;
  type: LayerType;
  name: string;
  editable: boolean;
  locked: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string; // 텍스트 내용 / 아이콘 종류
  src?: string; // 이미지 소스 (없으면 placeholder)
  style: EditableLayerStyle;
}

export interface EditableWeekCardTemplate {
  id: string;
  name: string;
  layoutId: string;
  imageLayout: string;
  canvas: { w: number; h: number };
  background: { color: string; radius: number };
  stylePackId: string;
  layers: EditableLayer[];
  meta: { weekNumber: number; weekLabel: string; phase: string; title: string };
}

// 공통 레이어 팩토리 — content/src 속성을 항상 포함한다.
function layer(p: {
  id: string;
  type: LayerType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  editable?: boolean;
  locked?: boolean;
  content?: string;
  src?: string;
  style?: EditableLayerStyle;
}): EditableLayer {
  return {
    id: p.id,
    type: p.type,
    name: p.name,
    editable: p.editable ?? true,
    locked: p.locked ?? false,
    x: p.x,
    y: p.y,
    width: p.width,
    height: p.height,
    content: p.content,
    src: p.src,
    style: p.style ?? {},
  };
}

// 텍스트 슬롯 → 텍스트 레이어 스타일 변환
function textStyle(slot: BlueprintTextSlot, shadow: EditableLayerStyle["shadow"]): EditableLayerStyle {
  return {
    fontSize: slot.style.fontSize,
    fontWeight: slot.style.weight,
    color: slot.style.color,
    align: slot.style.align,
    lineClamp: slot.style.lineClamp,
    fontFamily: slot.fontFamily,
    backgroundColor: slot.box?.bg,
    radius: slot.box?.radius,
    shadow: slot.box ? shadow : "none",
  };
}

// 이미지 슬롯 → 이미지 레이어 변환
function imageLayer(
  slot: BlueprintImageSlot,
  name: string,
  pack: WeekCardBlueprint["stylePack"]
): EditableLayer {
  return layer({
    id: slot.id,
    type: "image",
    name,
    x: slot.frame.x,
    y: slot.frame.y,
    width: slot.frame.w,
    height: slot.frame.h,
    content: slot.caption,
    src: slot.src,
    style: {
      radius: slot.radius,
      fit: slot.fit,
      frame: pack.imageFrame,
      shadow: pack.shadow,
    },
  });
}

/**
 * WeekCardBlueprint → 편집 가능한 레이어 JSON.
 * 필수 레이어: background / week badge / phase / title / playNames / description /
 *              main image / sub image 1 / sub image 2 / decoration icon / (optional) pattern.
 */
export function buildEditableWeekCardTemplate(
  blueprint: WeekCardBlueprint,
  week: WeekCardStructure
): EditableWeekCardTemplate {
  const pack = blueprint.stylePack;
  const bg = blueprint.background;
  const layers: EditableLayer[] = [];

  const find = (id: string) => blueprint.textSlots.find((s) => s.id === id);
  const playSlots = blueprint.textSlots.filter((s) => s.role === "play");
  const weekLabelSlot = find("week-label");
  const phaseSlot = find("phase");
  const titleSlot = find("title");
  const mainSlot = blueprint.imageSlots.find((s) => s.role === "main")!;
  const subSlots = blueprint.imageSlots.filter((s) => s.role === "sub");

  // 1) background shape — 이동/리사이즈 잠금, 색상은 편집 가능
  layers.push(
    layer({
      id: "background",
      type: "shape",
      name: "배경",
      x: bg.frame.x,
      y: bg.frame.y,
      width: bg.frame.w,
      height: bg.frame.h,
      locked: true,
      editable: true,
      style: { fill: bg.color, backgroundColor: bg.color, radius: bg.radius, shadow: pack.shadow },
    })
  );

  // 2) week badge text
  if (weekLabelSlot) {
    layers.push(
      layer({
        id: "week-badge",
        type: "text",
        name: "주차 배지",
        x: weekLabelSlot.frame.x,
        y: weekLabelSlot.frame.y,
        width: weekLabelSlot.frame.w,
        height: weekLabelSlot.frame.h,
        content: weekLabelSlot.text,
        style: textStyle(weekLabelSlot, pack.shadow),
      })
    );
  }

  // 3) phase text
  if (phaseSlot) {
    layers.push(
      layer({
        id: "phase",
        type: "text",
        name: "단계",
        x: phaseSlot.frame.x,
        y: phaseSlot.frame.y,
        width: phaseSlot.frame.w,
        height: phaseSlot.frame.h,
        content: phaseSlot.text,
        style: textStyle(phaseSlot, pack.shadow),
      })
    );
  }

  // 4) title text
  if (titleSlot) {
    layers.push(
      layer({
        id: "title",
        type: "text",
        name: "제목",
        x: titleSlot.frame.x,
        y: titleSlot.frame.y,
        width: titleSlot.frame.w,
        height: titleSlot.frame.h,
        content: titleSlot.text,
        style: textStyle(titleSlot, pack.shadow),
      })
    );
  }

  // 5) playNames text — 놀이명들을 한 개의 글머리 목록 레이어로 합침
  const firstPlay = playSlots[0];
  const lastPlay = playSlots[playSlots.length - 1];
  const playY = firstPlay ? firstPlay.frame.y : 376;
  const playH = firstPlay && lastPlay ? lastPlay.frame.y + lastPlay.frame.h - firstPlay.frame.y : 184;
  layers.push(
    layer({
      id: "play-names",
      type: "text",
      name: "놀이 목록",
      x: firstPlay ? firstPlay.frame.x : 56,
      y: playY,
      width: firstPlay ? firstPlay.frame.w : 430,
      height: playH,
      content: week.playNames.map((p) => `· ${p}`).join("\n"),
      style: {
        fontSize: firstPlay?.style.fontSize ?? 26,
        fontWeight: firstPlay?.style.weight ?? 600,
        color: firstPlay?.style.color ?? pack.body,
        align: "left",
        fontFamily: firstPlay?.fontFamily,
        shadow: "none",
      },
    })
  );

  // 6) description text — 좌측 놀이 목록 아래
  const descY = playY + playH + 24;
  layers.push(
    layer({
      id: "description",
      type: "text",
      name: "설명",
      x: firstPlay ? firstPlay.frame.x : 56,
      y: descY,
      width: firstPlay ? firstPlay.frame.w : 430,
      height: Math.max(blueprint.canvas.h - bg.padding - descY, 100),
      content: week.description,
      style: {
        fontSize: 22,
        fontWeight: 400,
        color: pack.body,
        align: "left",
        lineClamp: 4,
        fontFamily: pack.font,
        shadow: "none",
      },
    })
  );

  // 7~9) main image + sub image 1 + sub image 2
  layers.push(imageLayer(mainSlot, "대표 이미지", pack));
  if (subSlots[0]) layers.push(imageLayer(subSlots[0], "서브 이미지 1", pack));
  if (subSlots[1]) layers.push(imageLayer(subSlots[1], "서브 이미지 2", pack));

  // 10) decoration icon
  layers.push(
    layer({
      id: "decoration",
      type: "icon",
      name: "장식 아이콘",
      x: blueprint.decoration.frame.x,
      y: blueprint.decoration.frame.y,
      width: blueprint.decoration.frame.w,
      height: blueprint.decoration.frame.h,
      content: blueprint.decoration.kind,
      style: { iconKind: blueprint.decoration.kind, colors: blueprint.decoration.colors },
    })
  );

  // 11) optional pattern/shape — 좌하단 은은한 장식 (잠금, 색만 편집)
  layers.push(
    layer({
      id: "pattern",
      type: "shape",
      name: "장식 패턴(선택)",
      x: bg.padding - 16,
      y: blueprint.canvas.h - 196,
      width: 168,
      height: 168,
      locked: true,
      editable: true,
      style: { fill: pack.band, radius: 84, opacity: 0.5, shadow: "none" },
    })
  );

  return {
    id: `editable-week-card-${week.weekNumber}`,
    name: `${week.weekLabel} 편집 템플릿`,
    layoutId: blueprint.layoutId,
    imageLayout: blueprint.imageLayout,
    canvas: blueprint.canvas,
    background: { color: bg.color, radius: bg.radius },
    stylePackId: pack.id,
    layers,
    meta: blueprint.meta,
  };
}
