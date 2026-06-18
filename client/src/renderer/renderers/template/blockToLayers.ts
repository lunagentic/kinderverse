// Block(IR) → Layer[] 변환 + 높이 산출. layout(index)가 세로로 스택한다.
import type { Block } from "../../types";
import type { Layer, LayerStyle, ThemeTokens, DataBinding } from "../../types";
import type { SectionId } from "../../types";

export interface BlockOpts {
  x: number;
  y: number;
  width: number;
  theme: ThemeTokens;
  sectionId: SectionId;
  sourcePath: string; // 예: "weeklyFlow.blocks[0]"
  idPrefix: string;
}

export interface BlockLayout {
  layers: Layer[];
  height: number;
}

// 한글 ≈ 전각 가정한 단순 높이 추정 (측정 불가한 순수 변환 단계용)
function estTextHeight(text: string, fontSize: number, width: number, lineHeight = 1.45): number {
  const charsPerLine = Math.max(1, Math.floor(width / (fontSize * 0.95)));
  const lines = Math.max(1, Math.ceil((text.length || 1) / charsPerLine));
  return Math.ceil(lines * fontSize * lineHeight);
}

function textLayer(
  id: string,
  text: string,
  frame: Layer["frame"],
  style: LayerStyle,
  binding?: DataBinding
): Layer {
  return { id, type: "text", text, frame, z: 0, style, binding };
}

function layoutKeyValue(
  items: { label: string; value: string }[],
  o: BlockOpts
): BlockLayout {
  const fs = o.theme.font.body;
  const rowH = Math.round(fs * 1.9);
  const layers = items.map((it, i) =>
    textLayer(
      `${o.idPrefix}-kv${i}`,
      `${it.label}   ${it.value}`,
      { x: o.x, y: o.y + i * rowH, w: o.width, h: rowH },
      { fontSize: fs, weight: o.theme.weight.normal, color: o.theme.ink, align: "left" },
      { sectionId: o.sectionId, path: `${o.sourcePath}.items[${i}].value` }
    )
  );
  return { layers, height: items.length * rowH };
}

function layoutTable(
  columns: string[],
  rows: string[][],
  o: BlockOpts
): BlockLayout {
  const n = columns.length;
  // 마지막 열(내용/놀이)에 가중치 부여
  const weights = columns.map((_, i) => (i === n - 1 ? 2.4 : 1));
  const wsum = weights.reduce((a, b) => a + b, 0);
  const colW = weights.map((w) => Math.floor((o.width * w) / wsum));
  const colX: number[] = [];
  colW.forEach((_, i) => {
    colX[i] = i === 0 ? o.x : colX[i - 1] + colW[i - 1];
  });

  const fs = o.theme.font.body;
  const padX = 8;
  const padY = 6;
  const layers: Layer[] = [];
  let y = o.y;
  const allRows = [columns, ...rows];

  allRows.forEach((row, ri) => {
    const isHeader = ri === 0;
    const cellH =
      Math.max(...row.map((c, ci) => estTextHeight(String(c), fs, colW[ci] - padX * 2))) +
      padY * 2;
    // 행 배경
    layers.push({
      id: `${o.idPrefix}-r${ri}bg`,
      type: "shape",
      z: 0,
      frame: { x: o.x, y, w: o.width, h: cellH },
      style: {
        bg: isHeader ? o.theme.accent : ri % 2 ? o.theme.rowAlt : o.theme.sectionBg,
        radius: 0,
      },
    });
    // 셀 텍스트
    row.forEach((cell, ci) => {
      layers.push(
        textLayer(
          `${o.idPrefix}-r${ri}c${ci}`,
          String(cell),
          { x: colX[ci] + padX, y: y + padY, w: colW[ci] - padX * 2, h: cellH - padY * 2 },
          {
            fontSize: fs,
            weight: isHeader ? o.theme.weight.bold : o.theme.weight.normal,
            color: isHeader ? "#ffffff" : o.theme.ink,
            align: "left",
          },
          isHeader
            ? undefined
            : { sectionId: o.sectionId, path: `${o.sourcePath}.rows[${ri - 1}][${ci}]` }
        )
      );
    });
    y += cellH;
  });

  return { layers, height: y - o.y };
}

function layoutParagraph(text: string, o: BlockOpts): BlockLayout {
  const fs = o.theme.font.body;
  const h = estTextHeight(text, fs, o.width);
  return {
    layers: [
      textLayer(
        `${o.idPrefix}-p`,
        text,
        { x: o.x, y: o.y, w: o.width, h },
        { fontSize: fs, weight: o.theme.weight.normal, color: o.theme.ink, align: "left" },
        { sectionId: o.sectionId, path: `${o.sourcePath}.text` }
      ),
    ],
    height: h,
  };
}

function layoutList(items: string[], ordered: boolean, o: BlockOpts): BlockLayout {
  const fs = o.theme.font.body;
  const rowH = Math.round(fs * 1.8);
  const layers = items.map((it, i) =>
    textLayer(
      `${o.idPrefix}-li${i}`,
      `${ordered ? `${i + 1}.` : "·"} ${it}`,
      { x: o.x, y: o.y + i * rowH, w: o.width, h: rowH },
      { fontSize: fs, weight: o.theme.weight.normal, color: o.theme.ink, align: "left" },
      { sectionId: o.sectionId, path: `${o.sourcePath}.items[${i}]` }
    )
  );
  return { layers, height: items.length * rowH };
}

function layoutTags(items: string[], o: BlockOpts): BlockLayout {
  const fs = o.theme.font.body;
  const h = Math.round(fs * 1.8);
  return {
    layers: [
      textLayer(
        `${o.idPrefix}-tags`,
        items.join("    "),
        { x: o.x, y: o.y, w: o.width, h },
        { fontSize: fs, weight: o.theme.weight.medium, color: o.theme.sub, align: "left" }
      ),
    ],
    height: h,
  };
}

export function layoutBlock(block: Block, o: BlockOpts): BlockLayout {
  switch (block.kind) {
    case "keyValue":
      return layoutKeyValue(block.items, o);
    case "table":
      return layoutTable(block.columns, block.rows, o);
    case "paragraph":
      return layoutParagraph(block.text, o);
    case "list":
      return layoutList(block.items, !!block.ordered, o);
    case "tags":
      return layoutTags(block.items, o);
    default:
      return { layers: [], height: 0 };
  }
}
