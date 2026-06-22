// =============================================================================
// Canvas Design Editor (Phase 4 MVP) — Blueprint 을 편집 가능한 캔버스로.
// 선택 · 이동 · 크기 · 삭제 · 복제 · 레이어순서 · 텍스트편집 · 에셋교체/추가 · Undo/Redo.
// =============================================================================
import { useEffect, useMemo, useState } from "react";
import { Rnd } from "react-rnd";
import type { DesignRecipeInput } from "../design-recipe";
import { buildEditorDoc } from "./blueprintToDoc";
import { useEditor } from "./useEditor";
import { AssetLibrary } from "./AssetLibrary";
import { PropertyPanel } from "./PropertyPanel";
import { cutout } from "./cutout";
import type { EditorNode } from "./types";

function NodeView({ node }: { node: EditorNode }) {
  const [err, setErr] = useState(false);
  const [src, setSrc] = useState<string>(node.imageUrl ?? "");

  useEffect(() => {
    let alive = true;
    setErr(false);
    const url = node.imageUrl ?? "";
    setSrc(url);
    // 배경 에셋은 누끼 제외, 나머지(스티커/캐릭터/아이콘/장식)는 누끼 처리
    if (url && node.assetRole !== "background") {
      cutout(url).then((out) => { if (alive) setSrc(out); }).catch(() => {});
    }
    return () => { alive = false; };
  }, [node.imageUrl, node.assetRole]);

  if (node.kind === "shape") {
    return <div style={{ width: "100%", height: "100%", background: node.fill, borderRadius: node.radius, opacity: node.opacity ?? 1 }} />;
  }
  if (node.kind === "text") {
    return (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: node.align === "center" ? "center" : node.align === "right" ? "flex-end" : "flex-start", color: node.color, fontSize: node.fontSize, fontWeight: node.weight as number, fontFamily: node.fontFamily, textAlign: node.align as "left", lineHeight: 1.2, overflow: "hidden", wordBreak: "break-word" }}>
        {node.text}
      </div>
    );
  }
  // image
  return (
    <div style={{ width: "100%", height: "100%", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {err && <div style={{ position: "absolute", inset: 0, border: "1px dashed #c9c0b4", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#b3a89a" }}>{node.assetId?.replace(/^summer_/, "")}</div>}
      {!err && <img src={src} alt={node.assetId} style={{ width: "100%", height: "100%", objectFit: node.assetRole === "background" ? "cover" : "contain" }} onError={() => setErr(true)} draggable={false} />}
    </div>
  );
}

export function CanvasEditor({ input, onClose }: { input: DesignRecipeInput; onClose?: () => void }) {
  const initial = useMemo(() => buildEditorDoc(input), [input]);
  const ed = useEditor(initial);
  const [scale, setScale] = useState(0.42);

  useEffect(() => {
    const fit = () => setScale(Math.min(0.6, Math.max(0.22, (window.innerHeight - 140) / ed.doc.canvas.height)));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [ed.doc.canvas.height]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) ed.redo(); else ed.undo();
      } else if ((e.key === "Delete" || e.key === "Backspace") && ed.selectedId) {
        e.preventDefault(); ed.removeNode(ed.selectedId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ed]);

  const nodes = [...ed.doc.nodes].sort((a, b) => a.z - b.z);
  const cw = ed.doc.canvas.width, ch = ed.doc.canvas.height;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 5000, background: "#efe9e0", display: "flex", flexDirection: "column" }}>
      {/* 툴바 */}
      <div style={{ height: 48, flex: "0 0 48px", display: "flex", alignItems: "center", gap: 8, padding: "0 12px", background: "#fff", borderBottom: "1px solid #e6ddd0" }}>
        <b style={{ color: "#3f3833" }}>🎨 디자인 에디터</b>
        <span style={{ fontSize: 12, color: "#8a8078" }}>monthly_plan_v1 · {input.theme}</span>
        <div style={{ flex: 1 }} />
        <button onClick={ed.undo} disabled={!ed.canUndo}>↶ 실행취소</button>
        <button onClick={ed.redo} disabled={!ed.canRedo}>↷ 다시실행</button>
        {onClose && <button onClick={onClose}>✕ 닫기</button>}
      </div>

      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <AssetLibrary onPick={(p) => {
          if (ed.selected && ed.selected.kind === "image") ed.swapAsset(ed.selected.id, p.assetId, p.family, p.imageUrl);
          else ed.addAsset(p.assetId, p.family, p.imageUrl, p.role);
        }} />

        {/* 캔버스 */}
        <div style={{ flex: 1, overflow: "auto", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 20 }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) ed.setSelectedId(null); }}>
          <div style={{ width: cw * scale, height: ch * scale, flex: "0 0 auto", boxShadow: "0 10px 40px rgba(0,0,0,0.2)" }}>
            <div style={{ width: cw, height: ch, transform: `scale(${scale})`, transformOrigin: "top left", position: "relative", background: "#fff", overflow: "hidden" }}>
              {nodes.map((n) => {
                const sel = ed.selectedId === n.id;
                return (
                  <Rnd
                    key={n.id}
                    scale={scale}
                    size={{ width: n.w, height: n.h }}
                    position={{ x: n.x, y: n.y }}
                    bounds="parent"
                    disableDragging={!!n.locked}
                    enableResizing={sel && !n.locked}
                    onMouseDown={() => ed.setSelectedId(n.id)}
                    onDragStop={(_e, d) => ed.patchNode(n.id, { x: d.x, y: d.y })}
                    onResizeStop={(_e, _dir, ref, _delta, pos) => ed.patchNode(n.id, { w: parseFloat(ref.style.width), h: parseFloat(ref.style.height), x: pos.x, y: pos.y })}
                    style={{ outline: sel ? "2px solid #4F9BE0" : "none", outlineOffset: 1, cursor: n.locked ? "default" : "move" }}
                  >
                    <NodeView node={n} />
                  </Rnd>
                );
              })}
            </div>
          </div>
        </div>

        <PropertyPanel
          node={ed.selected}
          onChange={(patch) => ed.selectedId && ed.patchNode(ed.selectedId, patch)}
          onDelete={() => ed.selectedId && ed.removeNode(ed.selectedId)}
          onDuplicate={() => ed.selectedId && ed.duplicateNode(ed.selectedId)}
          onReorder={(dir) => ed.selectedId && ed.reorder(ed.selectedId, dir)}
        />
      </div>
    </div>
  );
}
