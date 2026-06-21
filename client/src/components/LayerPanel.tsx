// 레이어 목록 패널 — 이름 표시 / 클릭 선택 / 잠금 표시.
import type { EditableLayer } from "../templates/buildEditableWeekCardTemplate";

const TYPE_ICON: Record<string, string> = {
  text: "T",
  image: "🖼",
  shape: "◻",
  icon: "✦",
};

const TYPE_COLOR: Record<string, string> = {
  text: "#3a6ea5",
  image: "#b06a36",
  shape: "#8a5aa0",
  icon: "#3f7d5f",
};

export interface LayerPanelProps {
  layers: EditableLayer[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}

export default function LayerPanel({ layers, selectedId = null, onSelect }: LayerPanelProps) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e6ddd2", borderRadius: 10, padding: 8, fontFamily: "system-ui, sans-serif" }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#8a8078", padding: "4px 6px 8px" }}>
        레이어 ({layers.length})
      </div>
      {layers.map((l) => {
        const selected = l.id === selectedId;
        return (
          <div
            key={l.id}
            onClick={() => onSelect && onSelect(l.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 8px",
              borderRadius: 6,
              cursor: "pointer",
              background: selected ? "#e7f0ff" : "transparent",
              boxShadow: selected ? "inset 0 0 0 1px #2D7DF6" : "none",
            }}
          >
            <span
              style={{
                width: 20,
                height: 20,
                flexShrink: 0,
                borderRadius: 4,
                background: TYPE_COLOR[l.type] || "#888",
                color: "#fff",
                fontSize: 12,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {TYPE_ICON[l.type] || "?"}
            </span>
            <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: "#3f3833", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {l.name}
            </span>
            {l.locked && (
              <span title="잠김 (위치/크기 고정)" style={{ fontSize: 12, color: "#a99", flexShrink: 0 }}>
                🔒
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
