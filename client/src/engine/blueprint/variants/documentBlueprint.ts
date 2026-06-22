// =============================================================================
// Monthly Plan Template Family — "document" 변형.
// DesignRecipe → A4 세로 문서형 TemplateBlueprint.
//
// 핵심 재사용: layoutBlock(블록 IR → 좌표/높이/바인딩 계산)과 defaultTheme.
// 텍스트 줄바꿈·표 레이아웃·역동기화 바인딩 같은 어려운 부분을 그대로 활용하고,
// 결과 Layer 를 "편집 가능 슬롯(BlueprintSlot)"으로 재구성한다.
// =============================================================================
import { layoutBlock } from "../../../renderer/renderers/template/blockToLayers";
import { defaultTheme } from "../../../renderer/renderers/template/theme";
import type { Layer, Rect } from "../../../renderer/types";
import type { DesignRecipe } from "../../recipe/types";
import type {
  BlueprintBlock,
  BlueprintSlot,
  TemplateBlueprint,
} from "../types";

// A4 세로 (96dpi 근사) — 기존 ColorLab 템플릿과 동일 규격.
const CANVAS_W = 794;
const CANVAS_H = 1123;
const PAGE_PAD = defaultTheme.space.page; // 40
const SECTION_GAP = defaultTheme.space.section; // 20
const TITLE_H = Math.round(defaultTheme.font.heading * 1.8);
const TITLE_GAP = 8;

/** 기존 Layer(평탄형) → 편집 가능 BlueprintSlot 으로 재구성 */
function layerToSlot(layer: Layer): BlueprintSlot {
  const common = {
    id: layer.id,
    frame: layer.frame,
    z: layer.z ?? 0,
    binding: layer.binding,
    style: layer.style,
  };
  if (layer.type === "image") {
    return {
      ...common,
      kind: "image",
      role: layer.role || "image",
      editable: true,
      subject: layer.prompt,
    };
  }
  if (layer.type === "shape") {
    // 배경/구분 도형 — 구조 요소이므로 기본 비편집.
    return { ...common, kind: "shape", role: layer.role || "rowBg", editable: false };
  }
  // text — 데이터 바인딩이 있으면 편집 대상(역동기화 가능).
  return {
    ...common,
    kind: "text",
    role: layer.role || "content",
    editable: true,
    text: layer.text ?? "",
  };
}

function boundingFrame(slots: BlueprintSlot[], fallback: Rect): Rect {
  if (!slots.length) return fallback;
  const x = Math.min(...slots.map((s) => s.frame.x));
  const y = Math.min(...slots.map((s) => s.frame.y));
  const right = Math.max(...slots.map((s) => s.frame.x + s.frame.w));
  const bottom = Math.max(...slots.map((s) => s.frame.y + s.frame.h));
  return { x, y, w: right - x, h: bottom - y };
}

/**
 * DesignRecipe → document 변형 TemplateBlueprint.
 * 세로 스택: [섹션 제목] → [블록 슬롯들] 을 페이지 패딩 안에 차례로 배치.
 */
export function layoutDocumentBlueprint(recipe: DesignRecipe): TemplateBlueprint {
  const contentW = CANVAS_W - PAGE_PAD * 2;
  let cursorY = PAGE_PAD;

  const blocks: BlueprintBlock[] = recipe.sections.map((section) => {
    const slots: BlueprintSlot[] = [];

    // 1) 섹션 제목 슬롯 (편집 가능, 데이터 경로는 없으므로 binding 생략)
    slots.push({
      id: `${section.id}-title`,
      kind: "text",
      role: "sectionTitle",
      frame: { x: PAGE_PAD, y: cursorY, w: contentW, h: TITLE_H },
      z: 1,
      editable: true,
      text: section.title,
      style: {
        fontSize: defaultTheme.font.heading,
        weight: defaultTheme.weight.bold,
        color: defaultTheme.accent,
        align: "left",
      },
    });
    cursorY += TITLE_H + TITLE_GAP;

    // 2) 블록 콘텐츠 슬롯 — 기존 layoutBlock 재사용(좌표/높이/바인딩 계산)
    section.blocks.forEach((block, bi) => {
      const { layers, height } = layoutBlock(block, {
        x: PAGE_PAD,
        y: cursorY,
        width: contentW,
        theme: defaultTheme,
        sectionId: section.id,
        sourcePath: `${section.id}.blocks[${bi}]`,
        idPrefix: `${section.id}-b${bi}`,
      });
      layers.forEach((l) => slots.push(layerToSlot(l)));
      cursorY += height + defaultTheme.space.gap;
    });

    const blockFrameFallback: Rect = { x: PAGE_PAD, y: cursorY, w: contentW, h: 0 };
    const frame = boundingFrame(slots, blockFrameFallback);

    cursorY += SECTION_GAP;

    return {
      id: section.id,
      sectionId: section.id,
      role: section.role,
      title: section.title,
      emphasis: section.emphasis,
      frame,
      slots,
    };
  });

  const contentHeight = cursorY - PAGE_PAD + PAGE_PAD; // 상단+하단 패딩 포함 근사

  return {
    version: 1,
    family: "monthly_plan",
    variant: "document",
    canvas: { w: CANVAS_W, h: CANVAS_H, bg: defaultTheme.pageBg },
    meta: { title: recipe.meta.title, subtitle: recipe.meta.subtitle },
    blocks,
    overflow: contentHeight > CANVAS_H,
    contentHeight,
  };
}
