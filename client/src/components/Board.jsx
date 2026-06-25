import { forwardRef, useEffect, useRef, useState } from "react";
import { Minus, Plus, Maximize, ImagePlus } from "lucide-react";
import BoardItem from "./BoardItem.jsx";
import { extractImageBlobs, filesToDataUrls, MAX_PHOTOS } from "../utils/imageInput";

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

const Board = forwardRef(function Board(
  {
    items,
    viewport,
    setViewport,
    selectedIds,
    onSelect,
    onUpdateItem,
    onUpdateItemData,
    onRemoveItem,
    onMoveSelected,
    onConvert,
    onEditCard,
    onMakeWeekCard,
    onAddImages,
  },
  ref
) {
  const panning = useRef(null);
  const innerRef = useRef(null);
  const fileRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  // 포워드 ref + 내부 ref 동시 연결 (좌표 계산용)
  const setRefs = (node) => {
    innerRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  };

  // 화면 좌표 → 보드 좌표
  const toBoardPoint = (clientX, clientY) => {
    const rect = innerRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left - viewport.panX) / viewport.zoom,
      y: (clientY - rect.top - viewport.panY) / viewport.zoom,
    };
  };
  const centerPoint = () => {
    const rect = innerRef.current.getBoundingClientRect();
    return {
      x: (rect.width / 2 - viewport.panX) / viewport.zoom,
      y: (rect.height / 2 - viewport.panY) / viewport.zoom,
    };
  };

  // 버튼(파일 선택) → 보드 중앙에 추가
  const pickFiles = async (files) => {
    const blobs = extractImageBlobs(null, files);
    if (!blobs.length) return;
    const srcs = await filesToDataUrls(blobs, MAX_PHOTOS);
    onAddImages?.(srcs, centerPoint());
  };

  // 드래그드롭 → 떨군 위치에 추가
  const onDragOverBoard = (e) => {
    if ([...(e.dataTransfer?.types || [])].includes("Files")) {
      e.preventDefault();
      setDragOver(true);
    }
  };
  const onDragLeaveBoard = (e) => {
    if (e.target === e.currentTarget) setDragOver(false);
  };
  const onDropBoard = async (e) => {
    const blobs = extractImageBlobs(e.dataTransfer?.items, e.dataTransfer?.files);
    setDragOver(false);
    if (!blobs.length) return;
    e.preventDefault();
    const pt = toBoardPoint(e.clientX, e.clientY);
    const srcs = await filesToDataUrls(blobs, MAX_PHOTOS);
    onAddImages?.(srcs, pt);
  };

  // 휠: 기본은 팬, Ctrl/⌘ + 휠은 커서 기준 줌
  const onWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const rect = e.currentTarget.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      setViewport((vp) => {
        const factor = Math.exp(-(e.deltaY || 0) * 0.0015);
        const z = clamp(vp.zoom * factor, MIN_ZOOM, MAX_ZOOM);
        const zoom = Number.isFinite(z) ? z : vp.zoom;
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

  // 키보드 단축키(삭제·복사·붙여넣기 등)는 App 에서 전역 처리

  const resetView = () =>
    setViewport({ panX: 0, panY: 0, zoom: 1 });

  const zoomBy = (factor) =>
    setViewport((vp) => ({ ...vp, zoom: clamp(vp.zoom * factor, MIN_ZOOM, MAX_ZOOM) }));

  return (
    <div
      ref={setRefs}
      className={"board" + (panning.current ? " is-panning" : "") + (dragOver ? " is-dragover" : "")}
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPan}
      onPointerCancel={endPan}
      onDragOver={onDragOverBoard}
      onDragLeave={onDragLeaveBoard}
      onDrop={onDropBoard}
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
            selected={selectedIds.includes(item.id)}
            selectedCount={selectedIds.length}
            onSelect={onSelect}
            onUpdate={onUpdateItem}
            onUpdateData={onUpdateItemData}
            onRemove={onRemoveItem}
            onMoveSelected={(dx, dy) => onMoveSelected(selectedIds, dx, dy)}
            onConvert={onConvert}
            onEditCard={onEditCard}
            onMakeWeekCard={onMakeWeekCard}
            onAddImages={onAddImages}
          />
        ))}
      </div>

      {items.length === 0 && (
        <div className="board-empty">
          <div className="board-empty-card">
            <strong>킨더보드를 빛나는 영감으로 채워주세요 ✨</strong>
            <p>
              채팅창에 떠오르는 놀이를 입력하면 보드가 채워져요.
              <br />예) "6월 '여름이 왔어요' 월간계획안", "물놀이 놀이 아이디어", "여름 프로젝트 안내문"
            </p>
          </div>
        </div>
      )}

      <div className="board-controls" onPointerDown={(e) => e.stopPropagation()}>
        <button onClick={() => zoomBy(1 / 1.2)} title="축소"><Minus size={16} /></button>
        <span className="zoom-label">{Math.round((Number.isFinite(viewport.zoom) ? viewport.zoom : 1) * 100)}%</span>
        <button onClick={() => zoomBy(1.2)} title="확대"><Plus size={16} /></button>
        <button onClick={resetView} title="뷰 초기화"><Maximize size={15} /></button>
        <span className="board-ctrl-div" />
        <button onClick={() => fileRef.current?.click()} title="이미지 추가 (드래그드롭도 가능)"><ImagePlus size={16} /></button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => { pickFiles(e.target.files); e.target.value = ""; }}
        />
      </div>

      {dragOver && <div className="board-drop-overlay">여기에 이미지를 놓으면 보드에 추가돼요</div>}

      <div className="board-hint">
        스크롤=이동 · ⌘/Ctrl+스크롤=확대 · 빈 곳 드래그=이동 · Delete=삭제
      </div>
    </div>
  );
});

export default Board;
