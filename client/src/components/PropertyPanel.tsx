// 속성 패널 — 선택된 layer type 에 따라 수정 UI 제공.
//  text:  content / fontSize / color / fontWeight
//  image: src / objectFit / borderRadius
//  shape: backgroundColor / borderRadius
//  icon:  iconName / color / size
import type { EditableLayer } from "../templates/buildEditableWeekCardTemplate";

export interface PropertyPanelProps {
  layer: EditableLayer | null;
  onUpdateLayer?: (id: string, patch: Partial<EditableLayer>) => void;
  // image 레이어 AI 생성(gpt-image). 슬롯 프롬프트가 있는 레이어에만 전달됨.
  onGenerateImage?: (layerId: string, force: boolean) => void;
  genState?: { loading: boolean; error: string; cached: boolean };
  // image 레이어 누끼(배경 제거).
  onRemoveBackground?: (layerId: string) => void;
  nukiBusy?: boolean;
  // 이 요소를 컴포넌트로 저장 (사용자가 원할 때만).
  onSaveAsset?: (layerId: string) => void;
}

const ICON_NAMES = ["palette", "paint", "color-chip", "sun", "cloud", "wave", "rainbow", "tree", "shell", "sandcastle", "ball", "music", "book", "star", "fish", "flower"];

const wrap: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e6ddd2",
  borderRadius: 10,
  padding: 12,
  fontFamily: "system-ui, sans-serif",
  fontSize: 13,
  color: "#3f3833",
};
const labelStyle: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 700, color: "#8a8078", margin: "10px 0 4px" };
const inputStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "6px 8px", border: "1px solid #d8c9bb", borderRadius: 6, fontSize: 13, background: "#fff" };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

export default function PropertyPanel({ layer, onUpdateLayer, onGenerateImage, genState, onRemoveBackground, nukiBusy, onSaveAsset }: PropertyPanelProps) {
  if (!layer) {
    return <div style={{ ...wrap, color: "#a99" }}>레이어를 선택하면 속성이 표시됩니다.</div>;
  }

  const update = (patch: Partial<EditableLayer>) => onUpdateLayer && onUpdateLayer(layer.id, patch);
  const setStyle = (patch: Record<string, unknown>) => update({ style: { ...layer.style, ...patch } });
  const s = layer.style || {};
  const disabled = !layer.editable;

  return (
    <div style={wrap}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{layer.name}</div>
      <div style={{ fontSize: 11, color: "#a99", fontFamily: "monospace" }}>
        {layer.type} · {layer.id}
        {layer.locked ? " · 🔒" : ""}
      </div>

      {/* 위치·크기 — 원본 배치에 맞추기 */}
      {!layer.locked && (
        <>
          <Field label="위치 (X · Y)">
            <div style={{ display: "flex", gap: 6 }}>
              <input type="number" value={Math.round(layer.x)} onChange={(e) => update({ x: Number(e.target.value) })} style={inputStyle} />
              <input type="number" value={Math.round(layer.y)} onChange={(e) => update({ y: Number(e.target.value) })} style={inputStyle} />
            </div>
          </Field>
          <Field label="크기 (W · H)">
            <div style={{ display: "flex", gap: 6 }}>
              <input type="number" value={Math.round(layer.width)} onChange={(e) => update({ width: Number(e.target.value) })} style={inputStyle} />
              <input type="number" value={Math.round(layer.height)} onChange={(e) => update({ height: Number(e.target.value) })} style={inputStyle} />
            </div>
          </Field>
        </>
      )}

      {/* ── TEXT ── */}
      {layer.type === "text" && (
        <>
          <Field label="내용 (content)">
            <textarea
              value={layer.content || ""}
              disabled={disabled}
              onChange={(e) => update({ content: e.target.value })}
              style={{ ...inputStyle, minHeight: 64, resize: "vertical" }}
            />
          </Field>
          <Field label="글자 크기 (fontSize)">
            <input
              type="number"
              value={s.fontSize ?? 16}
              disabled={disabled}
              onChange={(e) => setStyle({ fontSize: Number(e.target.value) })}
              style={inputStyle}
            />
          </Field>
          <Field label="색상 (color)">
            <input
              type="color"
              value={(s.color as string) || "#000000"}
              disabled={disabled}
              onChange={(e) => setStyle({ color: e.target.value })}
              style={{ ...inputStyle, height: 34, padding: 2 }}
            />
          </Field>
          <Field label="굵기 (fontWeight)">
            <select
              value={s.fontWeight ?? 400}
              disabled={disabled}
              onChange={(e) => setStyle({ fontWeight: Number(e.target.value) })}
              style={inputStyle}
            >
              {[300, 400, 500, 600, 700, 800, 900].map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </Field>
        </>
      )}

      {/* ── IMAGE ── */}
      {layer.type === "image" && (
        <>
          {onGenerateImage && (
            <Field label="AI 이미지 (gpt-image)">
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={() => onGenerateImage(layer.id, false)}
                  disabled={genState?.loading}
                  title="이 슬롯 이미지를 생성(캐시 우선 · 같은 내용이면 무료)"
                  style={{ flex: 1, padding: "6px 8px", borderRadius: 6, border: "1px solid #5B53A8", background: genState?.loading ? "#cfc9ec" : "#5B53A8", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                >
                  {genState?.loading ? "생성 중…" : "🤖 AI 생성"}
                </button>
                <button
                  onClick={() => onGenerateImage(layer.id, true)}
                  disabled={genState?.loading}
                  title="캐시 무시하고 새로 생성 (gpt-image 과금)"
                  style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #d8c9bb", background: "#fff", color: "#3f3833", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                >
                  ↻ 재생성
                </button>
              </div>
              {genState?.cached && <div style={{ fontSize: 11, color: "#4f9d69", marginTop: 4 }}>캐시됨 · 과금 없음</div>}
              {genState?.error && <div style={{ fontSize: 11, color: "#b4452f", marginTop: 4 }}>{genState.error}</div>}
            </Field>
          )}
          {onRemoveBackground && layer.src && (
            <Field label="누끼 (배경 제거)">
              <button
                onClick={() => onRemoveBackground(layer.id)}
                disabled={nukiBusy}
                title="가장자리 배경을 투명하게 — 평면 그림에서 피사체만 남깁니다"
                style={{ width: "100%", padding: "7px 8px", borderRadius: 6, border: "1px solid #4f9d69", background: nukiBusy ? "#bfe0cc" : "#4f9d69", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
              >
                {nukiBusy ? "처리 중…" : "🪄 배경 제거(누끼)"}
              </button>
            </Field>
          )}
          {onSaveAsset && layer.src && (
            <Field label="컴포넌트로 저장">
              <button
                onClick={() => onSaveAsset(layer.id)}
                title="이 요소(그림/꾸밈)를 컴포넌트로 저장 — 다른 카드에서 재사용"
                style={{ width: "100%", padding: "7px 8px", borderRadius: 6, border: "1px solid #5B53A8", background: "#5B53A8", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
              >
                💾 이 요소 컴포넌트로 저장
              </button>
            </Field>
          )}
          <Field label="이미지 URL (src)">
            <input
              value={layer.src || ""}
              disabled={disabled}
              placeholder="https://…"
              onChange={(e) => update({ src: e.target.value })}
              style={inputStyle}
            />
          </Field>
          <Field label="맞춤 (objectFit)">
            <select
              value={(s.fit as string) || "cover"}
              disabled={disabled}
              onChange={(e) => setStyle({ fit: e.target.value })}
              style={inputStyle}
            >
              <option value="cover">cover</option>
              <option value="contain">contain</option>
            </select>
          </Field>
          <Field label="모서리 둥글기 (borderRadius)">
            <input
              type="number"
              value={s.radius ?? 0}
              disabled={disabled}
              onChange={(e) => setStyle({ radius: Number(e.target.value) })}
              style={inputStyle}
            />
          </Field>
        </>
      )}

      {/* ── SHAPE ── */}
      {layer.type === "shape" && (
        <>
          <Field label="배경색 (backgroundColor)">
            <input
              type="color"
              value={(s.fill as string) || (s.backgroundColor as string) || "#ffffff"}
              disabled={disabled}
              onChange={(e) => setStyle({ fill: e.target.value, backgroundColor: e.target.value })}
              style={{ ...inputStyle, height: 34, padding: 2 }}
            />
          </Field>
          <Field label="모서리 둥글기 (borderRadius)">
            <input
              type="number"
              value={s.radius ?? 0}
              disabled={disabled}
              onChange={(e) => setStyle({ radius: Number(e.target.value) })}
              style={inputStyle}
            />
          </Field>
        </>
      )}

      {/* ── ICON ── */}
      {layer.type === "icon" && (
        <>
          <Field label="아이콘 (iconName)">
            <select
              value={layer.content || (s.iconKind as string) || ""}
              disabled={disabled}
              onChange={(e) => update({ content: e.target.value, style: { ...layer.style, iconKind: e.target.value } })}
              style={inputStyle}
            >
              {ICON_NAMES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </Field>
          <Field label="색상 (color)">
            <input
              type="color"
              value={(s.color as string) || ((s.colors as string[]) || [])[0] || "#000000"}
              disabled={disabled}
              onChange={(e) => setStyle({ color: e.target.value })}
              style={{ ...inputStyle, height: 34, padding: 2 }}
            />
          </Field>
          <Field label="크기 (size)">
            <input
              type="number"
              value={s.size ?? 56}
              disabled={disabled}
              onChange={(e) => setStyle({ size: Number(e.target.value) })}
              style={inputStyle}
            />
          </Field>
        </>
      )}
    </div>
  );
}
