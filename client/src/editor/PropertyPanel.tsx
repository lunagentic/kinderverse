// =============================================================================
// Property Panel (우측) — 선택 노드 속성 편집.
// =============================================================================
import type { EditorNode } from "./types";

const row: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, margin: "6px 0", fontSize: 12 };
const lab: React.CSSProperties = { width: 56, color: "#8a8078" };

export interface PropertyPanelProps {
  node: EditorNode | null;
  onChange: (patch: Partial<EditorNode>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onReorder: (dir: "front" | "back") => void;
}

export function PropertyPanel({ node, onChange, onDelete, onDuplicate, onReorder }: PropertyPanelProps) {
  return (
    <div style={{ width: 240, flex: "0 0 240px", borderLeft: "1px solid #e6ddd0", overflowY: "auto", background: "#fbf7f0", padding: 12 }}>
      <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 8, color: "#3f3833" }}>속성</div>
      {!node && <div style={{ fontSize: 12, color: "#8a8078" }}>요소를 선택하세요</div>}
      {node && (
        <>
          <div style={{ fontSize: 11, color: "#b3a89a", marginBottom: 8 }}>{node.kind} · {node.layerType} · {node.id}</div>

          <div style={row}><span style={lab}>X</span><input type="number" value={Math.round(node.x)} onChange={(e) => onChange({ x: +e.target.value })} style={{ width: 60 }} /><span style={lab}>Y</span><input type="number" value={Math.round(node.y)} onChange={(e) => onChange({ y: +e.target.value })} style={{ width: 60 }} /></div>
          <div style={row}><span style={lab}>W</span><input type="number" value={Math.round(node.w)} onChange={(e) => onChange({ w: +e.target.value })} style={{ width: 60 }} /><span style={lab}>H</span><input type="number" value={Math.round(node.h)} onChange={(e) => onChange({ h: +e.target.value })} style={{ width: 60 }} /></div>

          {node.kind === "text" && (
            <>
              <div style={row}><span style={lab}>텍스트</span></div>
              <textarea value={node.text ?? ""} onChange={(e) => onChange({ text: e.target.value })} style={{ width: "100%", height: 54 }} />
              <div style={row}><span style={lab}>크기</span><input type="number" value={node.fontSize ?? 32} onChange={(e) => onChange({ fontSize: +e.target.value })} style={{ width: 60 }} /></div>
              <div style={row}><span style={lab}>색상</span><input type="color" value={node.color ?? "#3f3833"} onChange={(e) => onChange({ color: e.target.value })} /></div>
              <div style={row}><span style={lab}>굵기</span>
                <select value={node.weight ?? 700} onChange={(e) => onChange({ weight: +e.target.value })}>
                  <option value={400}>보통</option><option value={600}>중간</option><option value={700}>굵게</option><option value={800}>매우굵게</option>
                </select>
              </div>
              <div style={row}><span style={lab}>정렬</span>
                <select value={node.align ?? "left"} onChange={(e) => onChange({ align: e.target.value })}>
                  <option value="left">왼쪽</option><option value="center">가운데</option><option value="right">오른쪽</option>
                </select>
              </div>
            </>
          )}

          {node.kind === "shape" && (
            <>
              <div style={row}><span style={lab}>배경색</span><input type="color" value={node.fill ?? "#ffffff"} onChange={(e) => onChange({ fill: e.target.value })} /></div>
              <div style={row}><span style={lab}>라운드</span><input type="number" value={node.radius ?? 0} onChange={(e) => onChange({ radius: +e.target.value })} style={{ width: 60 }} /></div>
              <div style={row}><span style={lab}>투명도</span><input type="range" min={0} max={1} step={0.05} value={node.opacity ?? 1} onChange={(e) => onChange({ opacity: +e.target.value })} /></div>
            </>
          )}

          {node.kind === "image" && (
            <>
              <div style={row}><span style={lab}>에셋</span><span style={{ fontSize: 11 }}>{node.assetId}</span></div>
              <div style={{ fontSize: 11, color: "#8a8078", margin: "4px 0" }}>좌측 라이브러리에서 클릭 → 교체</div>
            </>
          )}

          <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
            <button onClick={onDuplicate}>복제</button>
            <button onClick={() => onReorder("front")}>앞으로</button>
            <button onClick={() => onReorder("back")}>뒤로</button>
            <button onClick={onDelete} style={{ color: "#c0392b" }}>삭제</button>
          </div>
        </>
      )}
    </div>
  );
}
