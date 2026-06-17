import { useCallback, useRef, useState } from "react";
import Board from "./components/Board.jsx";
import ChatPanel from "./components/ChatPanel.jsx";
import "./board.css";

let idCounter = 1;
const nextId = () => `item-${idCounter++}`;

// 객체/배열 → 읽기 좋은 텍스트 (변환 입력용)
const SKIP_KEYS = new Set([
  "output_type",
  "feature_id",
  "plan_type",
  "notice_type",
  "audience",
  "source",
  "handoff",
]);
function valueToText(v, depth = 0) {
  const pad = "  ".repeat(depth);
  if (v == null || v === "") return "";
  if (Array.isArray(v)) {
    return v
      .map((x) =>
        x && typeof x === "object" ? valueToText(x, depth) : `${pad}- ${x}`
      )
      .filter(Boolean)
      .join("\n");
  }
  if (typeof v === "object") {
    return Object.entries(v)
      .filter(([k, val]) => !SKIP_KEYS.has(k) && val != null && val !== "")
      .map(([k, val]) => {
        const inner = valueToText(val, depth + 1);
        if (!inner) return "";
        return typeof val === "object"
          ? `${pad}${k}:\n${inner}`
          : `${pad}${k}: ${val}`;
      })
      .filter(Boolean)
      .join("\n");
  }
  return `${pad}${v}`;
}

// 보드 카드 → { title, content } (변환 요청용)
function cardToContent(item) {
  const d = item.data || {};
  if (item.type === "document") return { title: d.title || "문서", content: d.body || "" };
  if (item.type === "image") return { title: d.alt || "이미지", content: d.alt || "" };
  if (item.type === "design")
    return { title: d.title || "디자인", content: [d.subtitle, ...(d.points || [])].filter(Boolean).join("\n") };
  if (item.type === "designdoc") {
    const texts = (d.elements || []).filter((e) => e.type === "text").map((e) => e.text);
    return { title: d.title || texts[0] || "디자인", content: texts.join("\n") };
  }
  if (item.type === "plan") {
    const p = d.payload || {};
    // 놀이아이디어는 깔끔한 문장으로 추출
    if (Array.isArray(p.ideas) && p.ideas[0]) {
      const idea = p.ideas[0];
      const lines = [
        idea.intro,
        (idea.materials || []).length ? `놀이재료: ${idea.materials.join(", ")}` : "",
        ...(idea.method || []),
        ...(idea.tips || []),
      ].filter(Boolean);
      return { title: idea.title || d.title || "놀이", content: lines.join("\n") };
    }
    return { title: d.title || "계획", content: valueToText(p) };
  }
  return { title: d.title || "카드", content: "" };
}

export default function App() {
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  // 화면 좌표 = 보드 좌표 * zoom + pan
  const [viewport, setViewport] = useState({ panX: 0, panY: 0, zoom: 1 });
  const boardRef = useRef(null);

  // 현재 보이는 화면 중앙의 보드 좌표
  const viewCenter = useCallback(() => {
    const el = boardRef.current;
    const rect = el?.getBoundingClientRect() ?? { width: 900, height: 700 };
    return {
      cx: (rect.width / 2 - viewport.panX) / viewport.zoom,
      cy: (rect.height / 2 - viewport.panY) / viewport.zoom,
    };
  }, [viewport]);

  const toItem = (g, x, y) => {
    const size = g.size ?? { w: 300, h: 220 };
    return {
      id: nextId(),
      type: g.type,
      data: g.data,
      x: x - size.w / 2,
      y: y - size.h / 2,
      w: size.w,
      h: size.h,
    };
  };

  // 생성 결과(배열) 배치 — 1개면 중앙 계단식, 여러 개면 격자로 나눠서 배치
  const addGenerated = useCallback(
    (generatedList) => {
      const list = Array.isArray(generatedList) ? generatedList : [generatedList];
      if (!list.length) return;
      const { cx, cy } = viewCenter();

      setItems((prev) => {
        if (list.length === 1) {
          const step = prev.length % 8;
          const offX = (step - 3.5) * 60 + (Math.random() - 0.5) * 24;
          const offY = (step % 4) * 40 + (Math.random() - 0.5) * 24;
          return [...prev, toItem(list[0], cx + offX, cy + offY)];
        }
        // 격자 배치 (최대 3열)
        const cols = Math.min(list.length, 3);
        const gapX = 340;
        const gapY = 360;
        const startX = cx - ((cols - 1) * gapX) / 2;
        const startY = cy - 120;
        const created = list.map((g, i) => {
          const r = Math.floor(i / cols);
          const c = i % cols;
          const size = g.size ?? { w: 300, h: 220 };
          return toItem(g, startX + c * gapX, startY + r * gapY + size.h / 2);
        });
        return [...prev, ...created];
      });
      setSelectedId(null);
    },
    [viewCenter]
  );

  const updateItem = useCallback((id, patch) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...patch } : it))
    );
  }, []);

  const updateItemData = useCallback((id, dataPatch) => {
    setItems((prev) =>
      prev.map((it) =>
        it.id === id ? { ...it, data: { ...it.data, ...dataPatch } } : it
      )
    );
  }, []);

  const removeItem = useCallback((id) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
    setSelectedId((cur) => (cur === id ? null : cur));
  }, []);

  // 카드 → 문서/이미지/디자인 템플릿 변환 (원본 옆에 배치)
  const convertCard = useCallback(async (item, format) => {
    const { title, content } = cardToContent(item);
    try {
      const res = await fetch("/api/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, title, content }),
        signal: AbortSignal.timeout(90000),
      });
      if (!res.ok) return;
      const data = await res.json();
      const list = data.items || [];
      setItems((prev) => {
        const created = list.map((g, i) => {
          const size = g.size ?? { w: 300, h: 220 };
          return {
            id: nextId(),
            type: g.type,
            data: g.data,
            x: item.x + item.w + 40 + i * (size.w + 20),
            y: item.y,
            w: size.w,
            h: size.h,
          };
        });
        return [...prev, ...created];
      });
    } catch {
      /* 변환 실패 시 무시 */
    }
  }, []);

  return (
    <div className="layout">
      <Board
        ref={boardRef}
        items={items}
        viewport={viewport}
        setViewport={setViewport}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onUpdateItem={updateItem}
        onUpdateItemData={updateItemData}
        onRemoveItem={removeItem}
        onConvert={convertCard}
      />
      <ChatPanel onGenerate={addGenerated} />
    </div>
  );
}
