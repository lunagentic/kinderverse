// EditableWeekCardTemplate 를 canvas 에 렌더링하는 편집기.
// - layer 클릭 → 선택, 선택 layer 는 파란색 outline
// - text: 직접 인라인 수정 / image: URL 교체 / shape: 배경색 수정
// - 위치/크기는 이번 테스트에서 고정 (드래그/리사이즈 없음)
import { forwardRef, useState } from "react";
import type {
  EditableLayer,
  EditableWeekCardTemplate,
} from "../templates/buildEditableWeekCardTemplate";

const SELECT_COLOR = "#2D7DF6";

const ICON_EMOJI: Record<string, string> = {
  palette: "🎨",
  paint: "🖌️",
  "color-chip": "🔳",
  sun: "☀️",
  cloud: "☁️",
  wave: "🌊",
  rainbow: "🌈",
  tree: "🌳",
  shell: "🐚",
  sandcastle: "🏖️",
  ball: "⚽",
  music: "🎵",
  book: "📖",
  star: "⭐",
  fish: "🐠",
  flower: "🌸",
};

export interface WeekCardEditorProps {
  template: EditableWeekCardTemplate;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  onUpdateLayer?: (id: string, patch: Partial<EditableLayer>) => void;
  width?: number; // 표시 너비 (캔버스는 비율 유지하여 스케일)
}

const WeekCardEditor = forwardRef(function WeekCardEditor(
  { template, selectedId = null, onSelect, onUpdateLayer, width = 540 }: WeekCardEditorProps,
  ref: React.Ref<HTMLDivElement>
) {
  const scale = width / template.canvas.w;
  const height = template.canvas.h * scale;

  const update = (id: string, patch: Partial<EditableLayer>) =>
    onUpdateLayer && onUpdateLayer(id, patch);
  const setStyle = (layer: EditableLayer, patch: Record<string, unknown>) =>
    update(layer.id, { style: { ...layer.style, ...patch } });

  const [editingId, setEditingId] = useState(null as string | null); // 더블클릭 편집 중인 텍스트
  const select = (id: string | null) => onSelect && onSelect(id);
  const selectLayer = (id: string | null) => { setEditingId(null); select(id); }; // 선택 시 편집 종료
  const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();

  // 드래그 이동 (텍스트 제외 — 텍스트는 인라인 편집/속성패널 사용)
  const beginDrag = (e: React.MouseEvent, layer: EditableLayer) => {
    if (layer.locked) return;
    e.stopPropagation();
    selectLayer(layer.id);
    const startX = e.clientX, startY = e.clientY, ox = layer.x, oy = layer.y;
    let moved = false;
    const move = (ev: MouseEvent) => {
      const dx = (ev.clientX - startX) / scale;
      const dy = (ev.clientY - startY) / scale;
      if (Math.abs(dx) + Math.abs(dy) > 1) moved = true;
      if (moved) update(layer.id, { x: Math.round(ox + dx), y: Math.round(oy + dy) });
    };
    const up = () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };
  // 리사이즈 (우하단 핸들)
  const beginResize = (e: React.MouseEvent, layer: EditableLayer) => {
    e.stopPropagation();
    const startX = e.clientX, startY = e.clientY, ow = layer.width, oh = layer.height;
    const move = (ev: MouseEvent) => {
      const nw = Math.max(20, Math.round(ow + (ev.clientX - startX) / scale));
      const nh = Math.max(20, Math.round(oh + (ev.clientY - startY) / scale));
      update(layer.id, { width: nw, height: nh });
    };
    const up = () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };
  const resizeHandle = (layer: EditableLayer) =>
    layer.id === selectedId && !layer.locked ? (
      <div onMouseDown={(e) => beginResize(e, layer)} title="크기 조절" style={{ position: "absolute", right: -6, bottom: -6, width: 13, height: 13, background: SELECT_COLOR, border: "2px solid #fff", borderRadius: 3, cursor: "nwse-resize", zIndex: 20 }} />
    ) : null;

  function renderLayer(layer: EditableLayer) {
    const s = layer.style || {};
    const sel = layer.id === selectedId;
    const box: React.CSSProperties = {
      position: "absolute",
      left: layer.x * scale,
      top: layer.y * scale,
      width: layer.width * scale,
      height: layer.height * scale,
      boxSizing: "border-box",
      cursor: "pointer",
      // 선택 outline. shape(특히 전체 배경)은 z-index 를 올리지 않는다 — 올리면 불투명 배경이 다른 레이어를 덮음.
      ...(sel
        ? { boxShadow: `inset 0 0 0 2px ${SELECT_COLOR}`, ...(layer.type !== "shape" ? { zIndex: 5 } : null) }
        : null),
    };
    const onClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      selectLayer(layer.id);
    };
    const onMouseDown = (e: React.MouseEvent) => e.stopPropagation();

    // 그림자(soft/bright) + 선택 outline 을 합쳐 boxShadow 문자열로
    const dropShadow =
      s.shadow === "soft" ? "0 8px 20px rgba(0,0,0,0.14)" : s.shadow === "bright" ? "0 8px 20px rgba(232,134,43,0.28)" : null;
    const composedShadow = [sel ? `inset 0 0 0 2px ${SELECT_COLOR}` : null, dropShadow].filter(Boolean).join(", ") || undefined;

    // ── SHAPE ──
    if (layer.type === "shape") {
      return (
        <div
          key={layer.id}
          onClick={onClick}
          onMouseDown={(e) => beginDrag(e, layer)}
          style={{
            ...box,
            background: (s.fill as string) || (s.backgroundColor as string) || "#eee",
            border: s.border ? `${((s.borderWidth as number) || 2) * scale}px solid ${s.border as string}` : undefined,
            borderRadius: (s.radius || 0) * scale,
            opacity: s.opacity ?? 1,
            boxShadow: composedShadow,
          }}
        >
          {sel && layer.editable && (
            <input
              type="color"
              value={(s.fill as string) || "#ffffff"}
              onChange={(e) => setStyle(layer, { fill: e.target.value, backgroundColor: e.target.value })}
              onClick={stop}
              onMouseDown={stop}
              title="배경색"
              style={{ position: "absolute", left: 4, top: 4, width: 30, height: 24, border: "none", padding: 0, cursor: "pointer", background: "none" }}
            />
          )}
          {resizeHandle(layer)}
        </div>
      );
    }

    // ── TEXT ──
    if (layer.type === "text") {
      const textStyle: React.CSSProperties = {
        fontSize: (s.fontSize || 16) * scale,
        fontWeight: (s.fontWeight as number) || 400,
        color: (s.color as string) || "#333",
        textAlign: (s.align as React.CSSProperties["textAlign"]) || "left",
        fontFamily: (s.fontFamily as string) || "inherit",
        lineHeight: 1.25,
        background: (s.backgroundColor as string) || "transparent",
        borderRadius: (s.radius || 0) * scale,
      };
      if (editingId === layer.id && layer.editable) {
        return (
          <textarea
            key={layer.id}
            autoFocus
            value={layer.content || ""}
            onChange={(e) => update(layer.id, { content: e.target.value })}
            onBlur={() => setEditingId(null)}
            onClick={stop}
            onMouseDown={stop}
            style={{
              ...box,
              ...textStyle,
              border: "none",
              outline: `2px solid ${SELECT_COLOR}`,
              resize: "none",
              padding: s.backgroundColor ? `0 ${8 * scale}px` : 0,
              overflow: "hidden",
            }}
          />
        );
      }
      const justify =
        s.align === "center" ? "center" : s.align === "right" ? "flex-end" : "flex-start";
      return (
        <div
          key={layer.id}
          onClick={onClick}
          onDoubleClick={(e) => { e.stopPropagation(); select(layer.id); setEditingId(layer.id); }}
          onMouseDown={(e) => beginDrag(e, layer)}
          title="더블클릭하면 글자 편집"
          style={{
            ...box,
            ...textStyle,
            display: "flex",
            alignItems: "center",
            justifyContent: justify,
            padding: s.backgroundColor ? `0 ${8 * scale}px` : 0,
            overflow: "hidden",
          }}
        >
          <span
            style={
              s.lineClamp
                ? { display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: s.lineClamp, overflow: "hidden", whiteSpace: "pre-wrap" }
                : { whiteSpace: "pre-wrap" }
            }
          >
            {layer.content}
          </span>
          {resizeHandle(layer)}
        </div>
      );
    }

    // ── IMAGE ──
    if (layer.type === "image") {
      const isCard = s.frame === "card"; // 흰 액자(스크랩북) 프레임
      const pad = isCard ? 7 * scale : 0;
      const innerRadius = Math.max((s.radius || 0) - (isCard ? 6 : 0), 0) * scale;
      return (
        <div
          key={layer.id}
          onClick={onClick}
          onMouseDown={(e) => beginDrag(e, layer)}
          style={{ ...box, borderRadius: (s.radius || 0) * scale, overflow: "hidden", background: isCard ? "#ffffff" : ((s.background as string) || "#f0ece6"), padding: pad, boxShadow: composedShadow }}
        >
          {layer.src ? (
            <img
              src={layer.src}
              alt={layer.content || ""}
              style={{ width: "100%", height: "100%", objectFit: (s.fit as React.CSSProperties["objectFit"]) || "cover", display: "block", borderRadius: innerRadius }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: "#a99",
                fontSize: 12 * scale,
                textAlign: "center",
                padding: 8,
                border: `${Math.max(2 * scale, 1)}px dashed #cbb`,
                boxSizing: "border-box",
              }}
            >
              <div style={{ fontSize: 28 * scale }}>🖼</div>
              <div>{layer.content || "이미지"}</div>
            </div>
          )}
          {sel && layer.editable && (
            <input
              value={layer.src || ""}
              placeholder="이미지 URL 붙여넣기"
              onChange={(e) => update(layer.id, { src: e.target.value })}
              onClick={stop}
              onMouseDown={stop}
              style={{ position: "absolute", left: 4, right: 4, bottom: 4, fontSize: 11, padding: "3px 6px", border: `1px solid ${SELECT_COLOR}`, borderRadius: 4, background: "rgba(255,255,255,0.95)", boxSizing: "border-box" }}
            />
          )}
          {resizeHandle(layer)}
        </div>
      );
    }

    // ── ICON ──
    const dots = (s.colors as string[]) || (s.color ? [s.color as string] : []);
    return (
      <div
        key={layer.id}
        onClick={onClick}
        onMouseDown={onMouseDown}
        style={{ ...box, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 * scale }}
      >
        <span style={{ fontSize: ((s.size as number) || 56) * scale, color: (s.color as string) || undefined, lineHeight: 1 }}>
          {ICON_EMOJI[layer.content || (s.iconKind as string) || ""] || "✦"}
        </span>
        {dots.length > 0 && (
          <span style={{ display: "flex", gap: 3 * scale }}>
            {dots.map((c, i) => (
              <span key={i} style={{ width: 10 * scale, height: 10 * scale, borderRadius: "50%", background: c, display: "inline-block" }} />
            ))}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      onMouseDown={() => selectLayer(null)}
      style={{
        position: "relative",
        width,
        height,
        background: template.background.color,
        borderRadius: template.background.radius * scale,
        overflow: "hidden",
        boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
        userSelect: "none",
        flexShrink: 0,
      }}
    >
      {template.layers.map(renderLayer)}
    </div>
  );
});

export default WeekCardEditor;
