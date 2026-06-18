// TemplateDocument(Section Tree) → LayoutDocument. 세로 플로우 레이아웃 + 섹션 박스.
// 좌표를 부여하는 Layout 단계. (구조는 buildMonthlyTemplate 가 이미 만들었다.)
import type { TemplateDocument, LayoutDocument, LayoutSection, Layer } from "../../types";
import type { Rect } from "../../types";
import { defaultTheme } from "./theme";
import { layoutBlock } from "./blockToLayers";
import { sectionToBlocks } from "./sectionToBlocks";

const CANVAS_W = 960;

export function layoutTemplate(doc: TemplateDocument): LayoutDocument {
  const theme = defaultTheme;
  const pad = theme.space.page; // 40
  const sideInset = pad - 12; // 섹션 박스 좌우 여백
  const contentX = pad;
  const contentW = CANVAS_W - pad * 2;
  const titleH = Math.round(theme.font.heading * 1.6);

  const tSections: LayoutSection[] = [];
  let y = pad;

  for (const node of doc.sections) {
    const def = { id: node.id, title: node.title };
    const section = node.section;
    const secTop = y;
    const inner: Layer[] = [];

    // 섹션 제목
    inner.push({
      id: `${def.id}-title`,
      type: "text",
      z: 0,
      text: def.title,
      frame: { x: contentX, y: secTop + 14, w: contentW, h: titleH },
      style: {
        fontSize: theme.font.heading,
        weight: theme.weight.bold,
        color: theme.accent,
        align: "left",
      },
    });

    // 타입드 섹션 → blocks → 세로 스택
    const blocks = sectionToBlocks(section);
    let cy = secTop + 14 + titleH + theme.space.gap;
    blocks.forEach((block, bi) => {
      const { layers, height } = layoutBlock(block, {
        x: contentX,
        y: cy,
        width: contentW,
        theme,
        sectionId: def.id,
        sourcePath: `${def.id}.blocks[${bi}]`,
        idPrefix: `${def.id}-b${bi}`,
      });
      inner.push(...layers);
      cy += height + theme.space.gap;
    });

    const innerBottom = cy - theme.space.gap + 14; // 마지막 gap 제거 + 하단 패딩
    const secH = innerBottom - secTop;
    const frame: Rect = { x: sideInset, y: secTop, w: CANVAS_W - sideInset * 2, h: secH };

    // 섹션 배경 (콘텐츠보다 먼저 = 뒤에 깔림)
    const bg: Layer = {
      id: `${def.id}-bg`,
      type: "shape",
      z: 0,
      frame,
      style: { bg: theme.sectionBg, radius: 16 },
      role: "sectionBg",
    };

    tSections.push({ id: def.id, title: def.title, frame, layers: [bg, ...inner] });
    y = secTop + secH + theme.space.section;
  }

  // z 재할당: 배열 순서 = paint 순서 (배경 → 텍스트)
  let zc = 0;
  for (const s of tSections) for (const l of s.layers) l.z = zc++;

  const height = (tSections.length ? y - theme.space.section : pad) + pad;

  return {
    version: "1.0",
    planType: doc.planType,
    output: doc.output,
    canvas: { width: CANVAS_W, height, background: theme.pageBg, padding: pad },
    theme,
    sections: tSections,
  };
}
