// TemplateDocument(Section Tree) → LayerTree.
// 지원 노드: text / image / shape / group. 구조만 — 좌표(x/y) 없음, 렌더 없음.
import type {
  TemplateDocument,
  TemplateSectionNode,
  LayerTree,
  LayerNode,
  GroupLayerNode,
  Block,
  MonthlySection,
  ImageSlot,
  SectionId,
} from "./types";
import { sectionToBlocks } from "./renderers/template/sectionToBlocks";

// 섹션이 보유한 이미지 슬롯들 (header hero / 주차별 이미지)
function sectionImageSlots(s: MonthlySection): ImageSlot[] {
  if (s.kind === "header" && s.hero) return [s.hero];
  if (s.kind === "weeklyFlow" && s.weekImages) return s.weekImages.map((w) => w.image);
  return [];
}

// Block → LayerNode[] (구조만)
function blockToLayerNodes(block: Block, sectionId: SectionId, prefix: string): LayerNode[] {
  switch (block.kind) {
    case "keyValue":
      return block.items.map(
        (it, i): LayerNode => ({
          kind: "text",
          id: `${prefix}-kv${i}`,
          text: `${it.label}  ${it.value}`,
          binding: { sectionId, path: `${prefix}.items[${i}]` },
        })
      );
    case "paragraph":
      return [
        {
          kind: "text",
          id: `${prefix}-p`,
          text: block.text,
          binding: { sectionId, path: `${prefix}.text` },
        },
      ];
    case "list":
      return block.items.map(
        (t, i): LayerNode => ({
          kind: "text",
          id: `${prefix}-li${i}`,
          text: `${block.ordered ? `${i + 1}.` : "·"} ${t}`,
          binding: { sectionId, path: `${prefix}.items[${i}]` },
        })
      );
    case "tags":
      return [{ kind: "text", id: `${prefix}-tags`, text: block.items.join("   ") }];
    case "table": {
      const rows = [block.columns, ...block.rows];
      const rowGroups = rows.map((row, ri): LayerNode => {
        const isHeader = ri === 0;
        const children: LayerNode[] = [
          // 행 배경(shape)
          { kind: "shape", id: `${prefix}-r${ri}-bg`, shape: "rect", role: isHeader ? "table-header-bg" : "row-bg" },
          // 셀(text)
          ...row.map(
            (cell, ci): LayerNode => ({
              kind: "text",
              id: `${prefix}-r${ri}c${ci}`,
              text: String(cell),
              binding: isHeader ? undefined : { sectionId, path: `${prefix}.rows[${ri - 1}][${ci}]` },
            })
          ),
        ];
        return {
          kind: "group",
          id: `${prefix}-r${ri}`,
          role: isHeader ? "table-header" : "row",
          direction: "horizontal",
          children,
        };
      });
      return [
        { kind: "group", id: `${prefix}-table`, role: "table", direction: "vertical", children: rowGroups },
      ];
    }
    case "image":
      return [{ kind: "image", id: `${prefix}-img`, slot: block.slot }];
    default:
      return [];
  }
}

// 섹션 노드 → 섹션 그룹(LayerNode)
function sectionNodeToGroup(node: TemplateSectionNode): GroupLayerNode {
  const children: LayerNode[] = [
    // 섹션 배경(shape)
    { kind: "shape", id: `${node.id}-bg`, shape: "roundRect", role: "sectionBg" },
    // 섹션 제목(text)
    { kind: "text", id: `${node.id}-title`, text: node.title, role: "title", style: { fontSize: 18, weight: 700 } } as LayerNode,
  ];

  // 섹션 이미지 슬롯(image) — header hero 등
  sectionImageSlots(node.section).forEach((slot, i) => {
    children.push({ kind: "image", id: `${node.id}-img${i}`, slot });
  });

  // 콘텐츠 블록 → 레이어 노드
  sectionToBlocks(node.section).forEach((block, bi) => {
    children.push(...blockToLayerNodes(block, node.id, `${node.id}-b${bi}`));
  });

  return { kind: "group", id: node.id, role: "section", direction: "vertical", children };
}

export function buildLayerTree(doc: TemplateDocument): LayerTree {
  const root: GroupLayerNode = {
    kind: "group",
    id: "root",
    role: "document",
    direction: "vertical",
    children: doc.sections.map(sectionNodeToGroup),
  };
  return { version: "1.0", planType: doc.planType, root };
}
