import { useCallback, useRef, useState } from "react";
import Board from "./components/Board.jsx";
import ChatPanel from "./components/ChatPanel.jsx";
import "./board.css";

let idCounter = 1;
const nextId = () => `item-${idCounter++}`;

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
      />
      <ChatPanel onGenerate={addGenerated} />
    </div>
  );
}
