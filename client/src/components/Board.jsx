import { forwardRef, useEffect, useRef } from "react";
import { Minus, Plus, Maximize } from "lucide-react";
import BoardItem from "./BoardItem.jsx";

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

const Board = forwardRef(function Board(
  {
    items,
    viewport,
    setViewport,
    selectedId,
    onSelect,
    onUpdateItem,
    onUpdateItemData,
    onRemoveItem,
    onConvert,
  },
  ref
) {
  const panning = useRef(null);

  // 휠: 기본은 팬, Ctrl/⌘ + 휠은 커서 기준 줌
  const onWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const rect = e.currentTarget.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      setViewport((vp) => {
        const factor = Math.exp(-e.deltaY * 0.0015);
        const zoom = clamp(vp.zoom * factor, MIN_ZOOM, MAX_ZOOM);
        const k = zoom / vp.zoom;
        // 커서 아래 지점을 고정한 채 줌
        return {
          zoom,
          panX: mx - (mx - vp.panX) * k,
          panY: my - (my - vp.panY) * k,
        };
      });
    } else {
      setViewport((vp) => ({
        ...vp,
        panX: vp.panX - e.deltaX,
        panY: vp.panY - e.deltaY,
      }));
    }
  };

  // 빈 배경 드래그 → 팬
  const onPointerDown = (e) => {
    if (e.button !== 0) return;
    onSelect(null);
    panning.current = {
      startX: e.clientX,
      startY: e.clientY,
      panX: viewport.panX,
      panY: viewport.panY,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!panning.current) return;
    const dx = e.clientX - panning.current.startX;
    const dy = e.clientY - panning.current.startY;
    setViewport((vp) => ({
      ...vp,
      panX: panning.current.panX + dx,
      panY: panning.current.panY + dy,
    }));
  };

  const endPan = () => {
    panning.current = null;
  };

  // 선택된 아이템 Delete/Backspace 로 삭제
  useEffect(() => {
    const onKey = (e) => {
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedId &&
        !/^(INPUT|TEXTAREA)$/.test(e.target.tagName) &&
        !e.target.isContentEditable
      ) {
        onRemoveItem(selectedId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, onRemoveItem]);

  const resetView = () =>
    setViewport({ panX: 0, panY: 0, zoom: 1 });

  const zoomBy = (factor) =>
    setViewport((vp) => ({ ...vp, zoom: clamp(vp.zoom * factor, MIN_ZOOM, MAX_ZOOM) }));

  return (
    <div
      ref={ref}
      className={"board" + (panning.current ? " is-panning" : "")}
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPan}
      onPointerCancel={endPan}
    >
      <div
        className="board-surface"
        style={{
          transform: `translate(${viewport.panX}px, ${viewport.panY}px) scale(${viewport.zoom})`,
        }}
      >
        {items.map((item) => (
          <BoardItem
            key={item.id}
            item={item}
            zoom={viewport.zoom}
            selected={item.id === selectedId}
            onSelect={onSelect}
            onUpdate={onUpdateItem}
            onUpdateData={onUpdateItemData}
            onRemove={onRemoveItem}
            onConvert={onConvert}
          />
        ))}
      </div>

      {items.length === 0 && (
        <div className="board-empty">
          <div className="board-empty-card">
            <strong>빈 보드입니다</strong>
            <p>
              오른쪽 채팅창에 입력해 콘텐츠를 생성하세요.
              <br />예) "회의록 문서 만들어줘", "여름 세일 포스터 템플릿", "고양이 이미지"
            </p>
          </div>
        </div>
      )}

      <div className="board-controls" onPointerDown={(e) => e.stopPropagation()}>
        <button onClick={() => zoomBy(1 / 1.2)} title="축소"><Minus size={16} /></button>
        <span className="zoom-label">{Math.round(viewport.zoom * 100)}%</span>
        <button onClick={() => zoomBy(1.2)} title="확대"><Plus size={16} /></button>
        <button onClick={resetView} title="뷰 초기화"><Maximize size={15} /></button>
      </div>

      <div className="board-hint">
        스크롤=이동 · ⌘/Ctrl+스크롤=확대 · 빈 곳 드래그=이동 · Delete=삭제
      </div>
    </div>
  );
});

export default Board;
