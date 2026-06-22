import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Rnd } from "react-rnd";
import { cutout as runCutout } from "../editor/cutout";
import { X, FileText, Image as ImageIcon, Palette, LayoutGrid } from "lucide-react";
import PlanView from "./PlanView.jsx";
import Loader from "./Loader.jsx";
import {
  renderMonthlyPlanTemplate,
  renderColorLabFromRaw,
  renderInfographicFromRaw,
} from "../renderer/pipeline";
import { toDesignDoc } from "../renderer/adapters/toDesignDoc";
import { MonthlyDocumentFromRaw } from "../renderer/document/MonthlyDocumentRenderer";
import {
  MonthlyInfographicRenderer,
  MonthlyInfographicFromRaw,
} from "../renderer/infographic/MonthlyInfographicRenderer";
import { DECO_IMAGES } from "../renderer/image/assetManifest";
import WeekCardEditor from "./WeekCardEditor";
import { buildPosterWeekCard } from "../templates/buildPosterWeekCard";

export default function BoardItem({
  item,
  zoom,
  selected,
  selectedCount = 1,
  onSelect,
  onUpdate,
  onUpdateData,
  onRemove,
  onMoveSelected,
  onConvert,
  onEditCard,
  onMakeWeekCard,
}) {
  const [editing, setEditing] = useState(false);
  const drag = useRef(null);
  const resize = useRef(null);

  // 아이템 드래그 이동 (Shift = 복수 선택 토글, 복수 선택 시 그룹 이동)
  const onPointerDown = (e) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    if (e.shiftKey) onSelect(item.id, true); // 추가/해제
    else if (!selected) onSelect(item.id, false); // 단일 선택
    // 이미 선택 + Shift 아님 → 선택 유지(그룹 드래그)
    if (editing) return;
    const group = selected && selectedCount > 1 && !e.shiftKey;
    drag.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: item.x,
      origY: item.y,
      lastDx: 0,
      lastDy: 0,
      group,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (resize.current) {
      // 정책: 모서리 드래그 = 비율 고정 확대/축소 (A4·포스터 등 원래 비율 유지)
      const dx = (e.clientX - resize.current.startX) / zoom;
      const dy = (e.clientY - resize.current.startY) / zoom;
      const ratio = resize.current.origH / resize.current.origW || 1;
      const delta = Math.max(dx, dy / ratio); // 가로/세로 드래그 모두 반영
      const newW = Math.max(200, Math.round(resize.current.origW + delta));
      onUpdate(item.id, { w: newW, h: Math.round(newW * ratio) });
      return;
    }
    if (!drag.current) return;
    const dx = (e.clientX - drag.current.startX) / zoom;
    const dy = (e.clientY - drag.current.startY) / zoom;
    if (drag.current.group && onMoveSelected) {
      // 선택된 카드 전체를 증분만큼 이동
      onMoveSelected(dx - drag.current.lastDx, dy - drag.current.lastDy);
      drag.current.lastDx = dx;
      drag.current.lastDy = dy;
    } else {
      onUpdate(item.id, { x: drag.current.origX + dx, y: drag.current.origY + dy });
    }
  };

  const endDrag = (e) => {
    drag.current = null;
    resize.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  };

  const startResize = (e) => {
    e.stopPropagation();
    e.preventDefault();
    resize.current = {
      startX: e.clientX,
      startY: e.clientY,
      origW: item.w,
      origH: item.h,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  return (
    <div
      className={
        "node node-" + item.type + (selected ? " is-selected" : "")
      }
      style={{ left: item.x, top: item.y, width: item.w, height: item.h }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
    >
      {selected && (
        <button
          className="node-delete"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onRemove(item.id)}
          title="삭제"
        >
          <X size={13} />
        </button>
      )}

      {(item.type === "designdoc" || item.type === "monthlydoc" || item.type === "template" || item.type === "infographic") && (
        <span className="node-badge" onPointerDown={(e) => e.stopPropagation()}>
          월간 계획안
        </span>
      )}

      {item.type === "plan" && onConvert && (
        <div className="node-actions" onPointerDown={(e) => e.stopPropagation()}>
          <button onClick={() => onConvert(item, "document")} title="문서">
            <FileText size={13} />
          </button>
          {item.type === "plan" && item.data?.feature_id === "monthly_plan" ? (
            <>
              <button
                onClick={() => onConvert(item, "image")}
                title="이미지 v1 (인포그래픽 프롬프트 버전 1)"
                style={{ display: "inline-flex", alignItems: "center", gap: 1 }}
              >
                <ImageIcon size={13} />
                <span style={{ fontSize: 9, fontWeight: 700, lineHeight: 1 }}>1</span>
              </button>
              <button
                onClick={() => onConvert(item, "imageV2")}
                title="이미지 v2 (인포그래픽 프롬프트 버전 2)"
                style={{ display: "inline-flex", alignItems: "center", gap: 1 }}
              >
                <ImageIcon size={13} />
                <span style={{ fontSize: 9, fontWeight: 700, lineHeight: 1 }}>2</span>
              </button>
              <button onClick={() => onConvert(item, "kinderlab")} title="킨더랩">
                <Palette size={13} />
              </button>
              <button onClick={() => onConvert(item, "compareall")} title="한번에 보기">
                <LayoutGrid size={13} />
              </button>
              {onMakeWeekCard && (
                <button onClick={() => onMakeWeekCard(item)} title="이 월안으로 주차 카드 만들기">
                  🧩
                </button>
              )}
              <button onClick={() => onConvert(item, "editTemplate")} title="편집 디자인 템플릿 (이 월안으로)">
                🎨
              </button>
            </>
          ) : (
            <>
              <button onClick={() => onConvert(item, "image")} title="이미지">
                <ImageIcon size={13} />
              </button>
              <button onClick={() => onConvert(item, "design")} title="디자인 템플릿">
                <Palette size={13} />
              </button>
            </>
          )}
        </div>
      )}

      <NodeContent
        item={item}
        editing={editing}
        setEditing={setEditing}
        onUpdate={onUpdate}
        onUpdateData={onUpdateData}
        selected={selected}
        zoom={zoom}
        onEditCard={onEditCard}
      />

      {selected && (
        <div className="node-resize" onPointerDown={startResize} />
      )}
    </div>
  );
}

// 주차 카드 라이브 미리보기 (보드 위) — PNG 아님, HTML 렌더라 Jua 폰트 그대로 적용.
function WeekCardPreview({ item, data, onEditCard }) {
  const template = useMemo(() => {
    const base = (data && data.template && data.template.layers) ? data.template : buildPosterWeekCard((data && data.weekIndex) || 0);
    return {
      name: "주차 카드",
      canvas: base.canvas,
      layers: base.layers,
      background: base.background || { color: "#ffffff", radius: 28 },
    };
  }, [data]);
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", borderRadius: 14 }}>
      <WeekCardEditor template={template} width={item.w} readOnly />
      <button
        className="weekcard-edit-btn"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onEditCard && onEditCard(item); }}
        title="이 카드를 편집"
        style={{ position: "absolute", right: 36, top: 6, zIndex: 5, padding: "4px 10px", borderRadius: 8, border: "none", background: "#5B53A8", color: "#fff", fontSize: 12, fontWeight: 800, cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.25)" }}
      >
        ✏️ 편집하기
      </button>
    </div>
  );
}

function NodeContent({ item, editing, setEditing, onUpdate, onUpdateData, selected, zoom, onEditCard }) {
  const { type, data } = item;
  const stop = (e) => e.stopPropagation();

  if (type === "weekcard") {
    return <WeekCardPreview item={item} data={data} onEditCard={onEditCard} />;
  }

  if (type === "template") {
    return <TemplateCard item={item} data={data} selected={selected} zoom={zoom} onUpdate={onUpdate} onUpdateData={onUpdateData} stop={stop} />;
  }

  if (type === "monthlydoc") {
    return <MonthlyDocCard item={item} data={data} onUpdate={onUpdate} onUpdateData={onUpdateData} />;
  }

  if (type === "infographic") {
    return <InfographicCard item={item} data={data} selected={selected} zoom={zoom} onUpdateData={onUpdateData} />;
  }

  if (type === "plan") {
    return (
      <PlanCard
        item={item}
        data={data}
        editing={editing}
        setEditing={setEditing}
        onUpdateData={onUpdateData}
        stop={stop}
      />
    );
  }

  if (type === "designdoc") {
    return (
      <DesignFrame
        data={data}
        selected={selected}
        zoom={zoom}
        onChange={(patch) => onUpdateData(item.id, patch)}
      />
    );
  }

  if (type === "design") {
    return (
      <DesignCard
        item={item}
        data={data}
        editing={editing}
        setEditing={setEditing}
        onUpdateData={onUpdateData}
        stop={stop}
      />
    );
  }

  if (type === "image") {
    return (
      <img className="node-img" src={data.src} alt={data.alt} draggable={false} />
    );
  }

  if (type === "template") {
    return (
      <div
        className="tpl"
        style={{ background: data.bg, borderColor: data.accent }}
      >
        <span className="tpl-tag" style={{ background: data.accent }}>
          {data.tag}
        </span>
        {editing ? (
          <>
            <input
              className="tpl-heading-input"
              value={data.heading}
              autoFocus
              onPointerDown={stop}
              onChange={(e) => onUpdateData(item.id, { heading: e.target.value })}
              onBlur={() => setEditing(false)}
            />
            <input
              className="tpl-sub-input"
              value={data.subtext}
              onPointerDown={stop}
              onChange={(e) => onUpdateData(item.id, { subtext: e.target.value })}
              onBlur={() => setEditing(false)}
            />
          </>
        ) : (
          <>
            <h3 className="tpl-heading" style={{ color: data.accent }}>
              {data.heading}
            </h3>
            <p className="tpl-sub">{data.subtext}</p>
          </>
        )}
        <div className="tpl-foot" style={{ background: data.accent }} />
      </div>
    );
  }

  // document
  return (
    <div className="doc">
      {editing ? (
        <input
          className="doc-title-input"
          value={data.title}
          autoFocus
          onPointerDown={stop}
          onChange={(e) => onUpdateData(item.id, { title: e.target.value })}
        />
      ) : (
        <h3 className="doc-title">{data.title}</h3>
      )}
      {editing ? (
        <textarea
          className="doc-body-input"
          value={data.body}
          onPointerDown={stop}
          onChange={(e) => onUpdateData(item.id, { body: e.target.value })}
          onBlur={() => setEditing(false)}
        />
      ) : (
        <pre className="doc-body">{data.body}</pre>
      )}
    </div>
  );
}

// ── 월간계획안 문서 카드 (A4 표, 영역별 인라인 편집 · 기본 편집 ON · 저장 버튼) ──
function MonthlyDocCard({ item, data, onUpdate, onUpdateData }) {
  const A4_W = 794; // 210mm @96dpi
  const scale = item.w / A4_W;
  const innerRef = useRef(null);
  const [saved, setSaved] = useState(false);

  // 실제 콘텐츠 높이에 맞춰 카드 높이 동기화 → 하단 표가 잘리지 않게
  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const sync = () => {
      // 올림 + 여유 2px → 마지막 표 행이 미세하게 잘리지 않게
      const target = Math.ceil(el.offsetHeight * scale) + 2;
      if (target > 40 && Math.abs(target - item.h) > 2) onUpdate(item.id, { h: target });
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [scale, item.h, item.id, onUpdate]);

  const save = () => {
    const a = document.activeElement;
    if (a && typeof a.blur === "function") a.blur();
    setSaved(true);
    setTimeout(() => setSaved(false), 1400);
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", background: "#fff", borderRadius: 8 }}>
      <div style={{ width: A4_W, transform: `scale(${scale})`, transformOrigin: "top left" }}>
        <div ref={innerRef}>
          <MonthlyDocumentFromRaw
            raw={data.payload}
            editable
            edits={data.edits}
            onEditField={(field, value) =>
              onUpdateData(item.id, { edits: { ...(data.edits || {}), [field]: value } })
            }
          />
        </div>
      </div>
      <button
        className={"mdoc-save-btn" + (saved ? " is-saved" : "")}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={save}
        title="편집 내용 저장"
      >
        {saved ? "저장됨 ✓" : "저장"}
      </button>
    </div>
  );
}

// ── 인포그래픽 카드 (이미지 포스터 ↔ 레이어 편집 토글) ──
function InfographicCard({ item, data, selected, zoom, onUpdateData }) {
  const wrap = { position: "relative", width: "100%", height: "100%", overflow: "hidden", background: "#fff", borderRadius: 8 };
  const stop = (e) => e.stopPropagation();
  const layerMode = !!data.layerMode;

  // 레이어 편집용 DesignDoc (인포그래픽 레이아웃 — 사진/이미지/텍스트 레이어 분리)
  const designDoc = useMemo(
    () => data.infoEdited || toDesignDoc(renderInfographicFromRaw(data.payload), "인포그래픽 레이어"),
    [data.infoEdited, data.payload]
  );

  const ToggleBtn = ({ to, label }) => (
    <button
      className="ig-toggle-btn"
      onPointerDown={stop}
      onClick={() => onUpdateData(item.id, { layerMode: to })}
    >
      {label}
    </button>
  );

  // 레이어 편집 모드 (사진·이미지·텍스트 레이어 분리 편집)
  if (layerMode) {
    return (
      <div style={wrap}>
        <DesignFrame
          data={designDoc}
          selected={selected}
          zoom={zoom}
          onChange={(p) => onUpdateData(item.id, { infoEdited: { ...designDoc, ...p } })}
        />
        <ToggleBtn to={false} label="이미지" />
      </div>
    );
  }

  // 생성된 포스터 이미지
  if (data.src) {
    return (
      <div style={wrap}>
        <img src={data.src} alt={data.title || "인포그래픽"} draggable={false} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
      </div>
    );
  }

  // 생성 중 (귀여운 Lottie 로딩)
  if (data.loading) {
    return (
      <div
        style={{
          ...wrap,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(180deg,#fff8fb,#f4f8ff)",
          padding: 16,
        }}
      >
        <Loader width={160} label="인포그래픽 생성 중…" sub="AI가 포스터를 그리고 있어요 (1~3분)" />
      </div>
    );
  }

  // 실패 → 안내 (레이어 편집으로 대체 가능)
  return (
    <div style={{ ...wrap, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, color: "#9a8fa6", textAlign: "center", padding: 16 }}>
      <div style={{ fontSize: 26 }}>🖼️</div>
      <div style={{ fontSize: 12.5 }}>이미지 생성에 실패했어요.<br />"레이어"로 편집하거나 다시 시도하세요.</div>
      {data.payload && <ToggleBtn to={true} label="레이어" />}
    </div>
  );
}

// ── DesignDoc: element 기반 디자인 (클릭 → 이동·리사이즈·텍스트 편집) ──
export function DesignFrame({ data, selected, zoom = 1, onChange }) {
  const { frame, elements = [] } = data;
  const wrapRef = useRef(null);
  const [scale, setScale] = useState(0.33);
  const [activeId, setActiveId] = useState(null);
  const [editId, setEditId] = useState(null);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / frame.w);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [frame.w]);

  const updateEl = (id, patch) =>
    onChange?.({ elements: elements.map((e) => (e.id === id ? { ...e, ...patch } : e)) });
  const removeEl = (id) => onChange?.({ elements: elements.filter((e) => e.id !== id) });

  // 두 사각형이 겹치는지
  const overlaps = (a, b) =>
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  // 겹친 레이어 위에서 클릭(드래그 아님) → 순서는 그대로 두고 "아래 겹친 요소"를 선택만 (비파괴)
  const cycleSelect = (id) => {
    const cur = elements.find((e) => e.id === id);
    if (!cur) return;
    // 겹치고 잠금 아닌 요소들을 배열(시각 아래→위) 순서로. cur 포함.
    const stack = elements.filter((e) => !e.locked && overlaps(e, cur));
    if (stack.length <= 1) return; // 겹친 게 없으면 선택 유지
    const idx = stack.findIndex((e) => e.id === id);
    const next = stack[(idx - 1 + stack.length) % stack.length]; // 시각적으로 바로 아래로 순환
    setActiveId(next.id);
  };

  // 명시적 z-순서 변경 (잠금 배경은 항상 최하단 유지)
  const reorder = (id, where) => {
    const cur = elements.find((e) => e.id === id);
    if (!cur || cur.locked) return;
    const rest = elements.filter((e) => e.id !== id);
    let lo = 0; // 잠금(배경) 레이어 개수 = 이동 가능한 하한
    while (lo < rest.length && rest[lo].locked) lo++;
    const curIdx = elements.findIndex((e) => e.id === id);
    let at;
    if (where === "front") at = rest.length;
    else if (where === "back") at = lo;
    else if (where === "forward") at = Math.min(rest.length, curIdx + 1);
    else at = Math.max(lo, curIdx - 1); // backward
    onChange?.({ elements: [...rest.slice(0, at), cur, ...rest.slice(at)] });
  };

  const rndScale = scale * (zoom || 1);
  const activeEl = selected ? elements.find((e) => e.id === activeId && !e.locked) : null;

  return (
    <div className="dframe-outer">
      <div className="dframe-wrap" ref={wrapRef}>
        <div
          className="dframe"
          style={{
            width: frame.w,
            height: frame.h,
            background: frame.bg,
            transform: `scale(${scale})`,
          }}
        >
          {elements.map((el) =>
            selected && !el.locked ? (
              <EditableEl
                key={el.id}
                el={el}
                scale={rndScale}
                active={activeId === el.id}
                editing={editId === el.id}
                onSelect={() => setActiveId(el.id)}
                onCycle={() => cycleSelect(el.id)}
                onEdit={() => setEditId(el.id)}
                onEndEdit={() => setEditId(null)}
                onChange={(p) => updateEl(el.id, p)}
              />
            ) : (
              <DesignEl key={el.id} el={el} />
            )
          )}
        </div>
      </div>

      {/* 컨트롤 패널 — 카드 바깥(오른쪽)에 띄워 내용을 가리지 않음 */}
      {activeEl && (
        <ControlPanel
          el={activeEl}
          onChange={(p) => updateEl(activeEl.id, p)}
          onReorder={(where) => reorder(activeEl.id, where)}
          onRemove={() => {
            removeEl(activeEl.id);
            setActiveId(null);
          }}
          onClose={() => setActiveId(null)}
        />
      )}
    </div>
  );
}

// ── 우측 고정 컨트롤 패널 (선택된 요소 1개를 한 곳에서 편집) ──
function ControlPanel({ el, onChange, onReorder, onRemove, onClose }) {
  const s = el.style || {};
  const isText = el.type === "text";
  const isImage = el.type === "image" || el.type === "photo";
  const setStyle = (patch) => onChange({ style: { ...s, ...patch } });
  const baseFs = s._basefs ?? s.fontSize ?? 14;
  const setSize = (mult) => setStyle({ _basefs: baseFs, fontSize: Math.round(baseFs * mult) });
  const stop = (e) => e.stopPropagation();

  // 텍스트 레이어 분류 (TitleTextLayer / ContentTextLayer)
  const isTitle = el.textRole === "title";
  // 역할별 스타일 프리셋 (한 번의 onChange 로 textRole + style 동시 변경)
  const applyPreset = (role) =>
    role === "title"
      ? onChange({ textRole: "title", style: { ...s, weight: 800, stroke: "#FFFFFF", strokeWidth: 3 } })
      : onChange({ textRole: "content", style: { ...s, weight: 400, stroke: undefined, strokeWidth: undefined } });

  // 통합 편집 패널 — 타입은 칩으로만 표시(도형/텍스트/이미지 공통 도구)
  const typeChip = isText ? (isTitle ? "제목" : "본문") : isImage ? "이미지" : "도형";

  return (
    <div
      className="dpanel"
      onPointerDown={stop}
      onMouseDown={stop}
      onWheel={stop}
      onDoubleClick={stop}
    >
      <div className="dpanel-head">
        <span>
          편집 <span className="dpanel-chip">{typeChip}</span>
        </span>
        <button className="dpanel-x" onClick={onClose} title="닫기">
          <X size={13} />
        </button>
      </div>

      {/* 투명도 */}
      <div className="dpanel-sec">
        <div className="dpanel-label">투명도</div>
        <input
          type="range"
          min="0"
          max="100"
          value={Math.round((s.opacity ?? 1) * 100)}
          onChange={(e) => setStyle({ opacity: Number(e.target.value) / 100 })}
        />
      </div>

      {/* 색상 (텍스트=글자색 / 도형=배경) */}
      {!isImage && (
        <div className="dpanel-sec">
          <div className="dpanel-label">색상</div>
          {/* 스포이드/직접 선택 (네이티브 컬러 피커) */}
          <div className="dpanel-eyedrop">
            <input
              type="color"
              className="dpanel-color-input"
              value={(() => {
                const c = isText ? s.color : s.bg;
                return typeof c === "string" && /^#[0-9a-fA-F]{6}$/.test(c) ? c : "#ffffff";
              })()}
              onInput={(e) => setStyle(isText ? { color: e.target.value } : { bg: e.target.value })}
              title="스포이드 / 직접 색 선택"
            />
            <span className="dpanel-eyedrop-label">스포이드 / 직접 선택</span>
          </div>
          {COLOR_GROUPS.map((g) => (
            <div key={g.name} className="dpanel-grp">
              <div className="dpanel-grp-name">{g.name}</div>
              <div className="dpanel-sw-row">
                {g.colors.map((c, i) => (
                  <button
                    key={i}
                    className="del-sw"
                    style={{ background: c }}
                    title={c}
                    onClick={() => setStyle(isText ? { color: c } : { bg: c })}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 텍스트: 레이어 종류(제목/본문) 프리셋 */}
      {isText && (
        <div className="dpanel-sec">
          <div className="dpanel-label">텍스트 종류</div>
          <div className="dpanel-btn-row">
            <button
              className={"dpanel-size" + (isTitle ? " on" : "")}
              onClick={() => applyPreset("title")}
            >
              제목
            </button>
            <button
              className={"dpanel-size" + (!isTitle ? " on" : "")}
              onClick={() => applyPreset("content")}
            >
              본문
            </button>
          </div>
        </div>
      )}

      {/* 텍스트: 폰트 + 크기 */}
      {isText && (
        <>
          <div className="dpanel-sec">
            <div className="dpanel-label">글꼴</div>
            <div className="dpanel-btn-row">
              {FONTS.map((f) => (
                <button
                  key={f.name}
                  className={"del-font" + (s.fontFamily === f.css ? " on" : "")}
                  style={{ fontFamily: f.css }}
                  onClick={() => setStyle({ fontFamily: f.css })}
                  title={f.name}
                >
                  가
                </button>
              ))}
            </div>
          </div>
          <div className="dpanel-sec">
            <div className="dpanel-label">크기</div>
            <div className="dpanel-btn-row">
              <button className="dpanel-size" onClick={() => setSize(0.82)}>작게</button>
              <button className="dpanel-size" onClick={() => setSize(1)}>중간</button>
              <button className="dpanel-size" onClick={() => setSize(1.4)}>크게</button>
            </div>
          </div>
        </>
      )}

      {/* 이미지: 갤러리에서 클릭해 교체 */}
      {isImage && (
        <div className="dpanel-sec">
          <div className="dpanel-label">이미지 변경</div>
          <div className="dpanel-gallery">
            {DECO_IMAGES.map((g) => (
              <button
                key={g.url}
                className={"dpanel-thumb" + (el.src === g.url ? " on" : "")}
                title={g.label}
                onClick={() => onChange({ src: g.url })}
              >
                <img src={g.url} alt={g.label} draggable={false} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 레이어 순서 (z-order) */}
      {onReorder && (
        <div className="dpanel-sec">
          <div className="dpanel-label">레이어 순서</div>
          <div className="dpanel-btn-row">
            <button className="dpanel-size" title="맨 앞으로" onClick={() => onReorder("front")}>⤒ 맨 앞</button>
            <button className="dpanel-size" title="앞으로" onClick={() => onReorder("forward")}>↑ 앞</button>
            <button className="dpanel-size" title="뒤로" onClick={() => onReorder("backward")}>↓ 뒤</button>
            <button className="dpanel-size" title="맨 뒤로" onClick={() => onReorder("back")}>⤓ 맨 뒤</button>
          </div>
        </div>
      )}

      <div className="dpanel-btn-row" style={{ marginTop: "auto" }}>
        <button
          className={"dpanel-size" + (el.hidden ? " on" : "")}
          onClick={() => onChange({ hidden: !el.hidden })}
        >
          {el.hidden ? "보이기" : "숨기기"}
        </button>
        <button className="dpanel-del" style={{ marginTop: 0, flex: 1 }} onClick={onRemove}>
          <X size={12} /> 삭제
        </button>
      </div>
    </div>
  );
}

function elTextStyle(s = {}) {
  const valign =
    s.valign === "top" ? "flex-start" : s.valign === "bottom" ? "flex-end" : "center";
  const st = {
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    justifyContent: valign,
    textAlign: s.align || "left",
    whiteSpace: "pre-line",
    fontSize: s.fontSize,
    fontWeight: s.weight,
    fontFamily: s.fontFamily,
    color: s.color,
    lineHeight: 1.35,
  };
  if (s.stroke) {
    // 외곽선: stroke 를 글자 뒤에 먼저 그려(paintOrder) 본문이 또렷하게
    st.WebkitTextStrokeWidth = (s.strokeWidth ?? 3) + "px";
    st.WebkitTextStrokeColor = s.stroke;
    st.paintOrder = "stroke fill";
  }
  return st;
}

// 유아 친화 대표 폰트 (index.html / index.css 에서 로드)
const FONTS = [
  { name: "팝(ONE Mobile POP)", css: "'ONE Mobile POP', sans-serif" },
  { name: "둥근(Cafe24)", css: "'Cafe24Ssurround', sans-serif" },
  { name: "동글(Jua)", css: "'Jua', sans-serif" },
  { name: "굵은둥근(Black Han Sans)", css: "'Black Han Sans', sans-serif" },
  { name: "본문(SUIT)", css: "'SUIT', sans-serif" },
  { name: "손글씨(Gaegu)", css: "'Gaegu', cursive" },
  { name: "굵은(Do Hyeon)", css: "'Do Hyeon', sans-serif" },
];

// 색상 팔레트 (파스텔 / 그라데이션 / 팬톤)
const COLOR_GROUPS = [
  {
    name: "파스텔",
    colors: ["#FFD1DC", "#FFE5B4", "#FFFAC8", "#D6F5D6", "#CDE7F0", "#D7CCF0", "#FBE4E7", "#E2F0CB", "#FADADD", "#C7CEEA"],
  },
  {
    name: "그라데이션",
    colors: [
      "linear-gradient(135deg,#FBC2EB,#A6C1EE)",
      "linear-gradient(135deg,#FDCBF1,#E6DEE9)",
      "linear-gradient(135deg,#A1C4FD,#C2E9FB)",
      "linear-gradient(135deg,#D4FC79,#96E6A1)",
      "linear-gradient(135deg,#FFECD2,#FCB69F)",
      "linear-gradient(135deg,#FFF1EB,#ACE0F9)",
      "linear-gradient(135deg,#FAD0C4,#FFD1FF)",
      "linear-gradient(135deg,#A18CD1,#FBC2EB)",
    ],
  },
  {
    // 한 컬러(따뜻한 베이지 계열)의 채도 변화 — 옅은 톤부터 진한 톤까지
    name: "채도",
    colors: [
      "hsl(28, 30%, 92%)",
      "hsl(28, 35%, 87%)",
      "hsl(28, 40%, 82%)",
      "hsl(28, 44%, 76%)",
      "hsl(28, 47%, 70%)",
      "hsl(28, 50%, 63%)",
      "hsl(28, 52%, 56%)",
      "hsl(28, 54%, 49%)",
      "hsl(28, 55%, 42%)",
      "hsl(28, 56%, 35%)",
      "hsl(28, 57%, 28%)",
      "hsl(28, 58%, 22%)",
    ],
  },
];

// 누끼(배경 제거) 이미지 — el.cutout 일 때만 사용. 브라우저 flood-fill 결과를 캐시.
function CutoutImg({ src, fit, style }) {
  const [shown, setShown] = useState(src);
  useEffect(() => {
    let alive = true;
    setShown(src);
    if (src) runCutout(src).then((out) => { if (alive) setShown(out); }).catch(() => {});
    return () => { alive = false; };
  }, [src]);
  return (
    <img
      src={shown}
      alt=""
      draggable={false}
      style={{ ...style, objectFit: fit }}
      onError={(e) => { e.currentTarget.style.visibility = "hidden"; }}
      onLoad={(e) => { e.currentTarget.style.visibility = "visible"; }}
    />
  );
}

function EditableEl({ el, scale, active, editing, onSelect, onCycle, onEdit, onEndEdit, onChange }) {
  const s = el.style || {};
  const fill = { width: "100%", height: "100%", boxSizing: "border-box" };
  const isImage = el.type === "image" || el.type === "photo";
  const draggedRef = useRef(false);
  const clickTimer = useRef(null);

  let inner;
  if (el.type === "shape") {
    inner = <div style={{ ...fill, background: s.bg, borderRadius: s.radius || 0, border: s.stroke && s.strokeWidth ? `${s.strokeWidth}px solid ${s.stroke}` : undefined, boxShadow: s.shadow }} />;
  } else if (isImage) {
    inner = el.src ? (
      el.cutout ? (
        <CutoutImg src={el.src} fit={el.fit || "contain"} style={{ ...fill, borderRadius: 12 }} />
      ) : (
        <img
          src={el.src}
          alt=""
          draggable={false}
          style={{ ...fill, objectFit: el.fit || "contain", borderRadius: 12 }}
          onError={(e) => { e.currentTarget.style.visibility = "hidden"; }}
          onLoad={(e) => { e.currentTarget.style.visibility = "visible"; }}
        />
      )
    ) : (
      <div className="dframe-imgph" style={fill}>{el.type === "photo" ? "사진 자리" : "이미지 자리"}</div>
    );
  } else if (el.type === "text") {
    inner = editing ? (
      <textarea
        className="del-text-input"
        ref={(node) => {
          // autoFocus 대신 preventScroll 로 포커스 → transform 보드에서 화면 점프 방지
          if (node && document.activeElement !== node) node.focus({ preventScroll: true });
        }}
        value={el.text}
        style={{ ...fill, ...elTextStyle(s), display: "block", textAlign: s.align || "left" }}
        onChange={(e) => onChange({ text: e.target.value })}
        onBlur={onEndEdit}
        onPointerDown={(e) => e.stopPropagation()}
      />
    ) : (
      <div style={{ ...fill, ...elTextStyle(s), overflow: "hidden" }}>{el.text}</div>
    );
  }

  return (
    <Rnd
      size={{ width: el.w, height: el.h }}
      position={{ x: el.x, y: el.y }}
      scale={scale}
      bounds="parent"
      disableDragging={editing}
      enableResizing={active && !editing}
      onMouseDown={onSelect}
      onPointerDown={(e) => e.stopPropagation()}
      onDragStart={() => { draggedRef.current = false; }}
      onDrag={() => { draggedRef.current = true; }}
      onDragStop={(e, d) => onChange({ x: Math.round(d.x), y: Math.round(d.y) })}
      onResizeStop={(e, dir, ref, delta, pos) =>
        onChange({
          w: Math.round(parseFloat(ref.style.width)),
          h: Math.round(parseFloat(ref.style.height)),
          x: Math.round(pos.x),
          y: Math.round(pos.y),
        })
      }
      className={"del" + (active ? " del-active" : "")}
      style={{ zIndex: active ? 20 : 1 }}
    >
      <div
        className="del-inner"
        style={{
          opacity: el.hidden ? 0.25 : s.opacity ?? 1,
          outline: el.hidden ? "1.5px dashed var(--accent)" : undefined,
          background: isImage ? s.bg : undefined,
          borderRadius: 12,
        }}
        onDoubleClick={
          el.type === "text"
            ? () => {
                clearTimeout(clickTimer.current); // 더블클릭은 순서변경 취소하고 편집
                onEdit();
              }
            : undefined
        }
        /* 클릭 = 그 요소를 '선택만' (레이어 순서·순환 변경 없음). 순서 변경은 패널의 레이어 버튼으로만. */
      >
        {inner}
      </div>
    </Rnd>
  );
}

function DesignEl({ el }) {
  if (el.hidden) return null; // 숨긴 레이어 → 정적/최종 출력에서 제외
  const base = {
    position: "absolute",
    left: el.x,
    top: el.y,
    width: el.w,
    height: el.h,
  };
  const s = el.style || {};

  if (el.type === "shape") {
    return <div style={{ ...base, boxSizing: "border-box", background: s.bg, borderRadius: s.radius || 0, opacity: s.opacity ?? 1, border: s.stroke && s.strokeWidth ? `${s.strokeWidth}px solid ${s.stroke}` : undefined, boxShadow: s.shadow }} />;
  }
  if (el.type === "text") {
    return (
      <div
        style={{
          ...base,
          ...elTextStyle(s),
          opacity: s.opacity ?? 1,
          overflow: "hidden",
        }}
      >
        {el.text}
      </div>
    );
  }
  if (el.type === "image" || el.type === "photo") {
    if (el.src) {
      if (el.cutout) {
        return <CutoutImg src={el.src} fit={el.fit || "contain"} style={{ ...base, borderRadius: 12, opacity: s.opacity ?? 1 }} />;
      }
      return (
        <img
          src={el.src}
          alt=""
          draggable={false}
          style={{ ...base, objectFit: el.fit || "cover", borderRadius: 12, opacity: s.opacity ?? 1 }}
          onError={(e) => { e.currentTarget.style.visibility = "hidden"; }}
          onLoad={(e) => { e.currentTarget.style.visibility = "visible"; }}
        />
      );
    }
    return (
      <div className="dframe-imgph" style={{ ...base }}>
        {el.type === "photo" ? "사진 자리" : "이미지 자리"}
      </div>
    );
  }
  return null;
}

// ── 편집 가능한 디자인 템플릿 (구버전 단순 카드) ──
const DESIGN_COLORS = ["#d97757", "#c2613f", "#cf8a3b", "#b86b4b", "#7c8a4b", "#4b7c8a"];

function DesignCard({ item, data, editing, setEditing, onUpdateData, stop }) {
  return (
    <div className="design" style={{ background: data.bg, borderColor: data.accent }}>
      <div className="design-bar" style={{ background: data.accent }} />
      {editing ? (
        <>
          <input
            className="design-title-input"
            value={data.title}
            autoFocus
            style={{ color: data.accent }}
            onPointerDown={stop}
            onChange={(e) => onUpdateData(item.id, { title: e.target.value })}
          />
          <input
            className="design-sub-input"
            value={data.subtitle}
            onPointerDown={stop}
            onChange={(e) => onUpdateData(item.id, { subtitle: e.target.value })}
          />
          <textarea
            className="design-points-input"
            value={(data.points || []).join("\n")}
            onPointerDown={stop}
            onChange={(e) =>
              onUpdateData(item.id, { points: e.target.value.split("\n") })
            }
          />
          <div className="design-colors">
            {DESIGN_COLORS.map((c) => (
              <button
                key={c}
                style={{ background: c }}
                onPointerDown={stop}
                onClick={() => onUpdateData(item.id, { accent: c })}
                title={c}
              />
            ))}
            <button className="design-done" onPointerDown={stop} onClick={() => setEditing(false)}>
              완료
            </button>
          </div>
        </>
      ) : (
        <>
          <h3 className="design-title" style={{ color: data.accent }}>
            {data.title}
          </h3>
          <p className="design-sub">{data.subtitle}</p>
          <ul className="design-points">
            {(data.points || [])
              .filter((p) => p && p.trim())
              .map((p, i) => (
                <li key={i}>
                  <span className="design-dot" style={{ background: data.accent }} />
                  {p}
                </li>
              ))}
          </ul>
        </>
      )}
    </div>
  );
}

// ── KinderVerse 계획 카드 (구조화 JSON 렌더 + JSON 편집) ──
const FEATURE_LABEL = {
  play_idea: "놀이아이디어",
  mission_card: "놀이미션카드",
  monthly_plan: "월간 놀이계획",
  weekly_plan: "주간 놀이계획",
  daily_plan: "일일 놀이계획",
  project_plan: "프로젝트 계획안",
  project_notice: "프로젝트 안내문",
};

// 유형별 배지 색상 (아이디어 vs 월안 등 한눈에 구분)
const FEATURE_BADGE_COLOR = {
  play_idea: "#2fa6a0", // 청록
  mission_card: "#e07a5f", // 코랄
  monthly_plan: "#d97757", // 주황(월안)
  weekly_plan: "#7a5aa0", // 보라
  daily_plan: "#3e8e72", // 초록
  project_plan: "#5a5bb0", // 남보라
  project_notice: "#b08a3e", // 황토
};

// ── 월안 템플릿 뷰어 (기본 / 컬러랩 / 이미지 토글) ──
const TPL_RENDER = {
  default: renderMonthlyPlanTemplate,
  colorlab: renderColorLabFromRaw,
  infographic: renderInfographicFromRaw,
};
const TPL_TABS = [
  ["default", "기본"],
  ["colorlab", "킨더랩"],
  ["infographic", "이미지"],
];
const TPL_TABS_H = 30;

function TemplateCard({ item, data, selected, zoom, onUpdate, onUpdateData, stop }) {
  const [tpl, setTpl] = useState(data.template || "colorlab");
  const [saved, setSaved] = useState(false);

  // 편집 내용 저장 — 편집 결과는 이미 data.edited 에 자동 보존됨. 이 버튼은 확정 + 피드백.
  const save = () => {
    const a = document.activeElement;
    if (a && typeof a.blur === "function") a.blur();
    setSaved(true);
    setTimeout(() => setSaved(false), 1400);
  };

  // 편집본(data.edited[tpl])이 있으면 우선, 없으면 템플릿에서 렌더
  const designDoc = useMemo(() => {
    const edited = data.edited && data.edited[tpl];
    if (edited) return edited;
    return toDesignDoc((TPL_RENDER[tpl] || renderColorLabFromRaw)(data.payload), data.title || "월안");
  }, [tpl, data.edited, data.payload, data.title]);

  const switchTpl = (k) => {
    setTpl(k);
    onUpdateData(item.id, { template: k });
    const dd =
      (data.edited && data.edited[k]) ||
      toDesignDoc((TPL_RENDER[k] || renderColorLabFromRaw)(data.payload));
    onUpdate(item.id, { h: Math.round(TPL_TABS_H + (item.w * dd.frame.h) / dd.frame.w) });
  };

  // 편집 결과를 템플릿별로 보존 (토글해도 유지)
  const onChange = (patch) => {
    onUpdateData(item.id, {
      edited: { ...(data.edited || {}), [tpl]: { ...designDoc, ...patch } },
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <div
        onPointerDown={stop}
        style={{ display: "flex", gap: 4, padding: "4px 6px", background: "#fff", borderBottom: "1px solid #eee", flexShrink: 0 }}
      >
        {TPL_TABS.map(([k, label]) => (
          <button
            key={k}
            onClick={() => switchTpl(k)}
            style={{
              flex: 1,
              fontSize: 11,
              padding: "3px 0",
              borderRadius: 6,
              border: "1px solid #e0d6cb",
              cursor: "pointer",
              fontWeight: 600,
              background: tpl === k ? "#d97757" : "#fff",
              color: tpl === k ? "#fff" : "#5a5249",
            }}
          >
            {label}
          </button>
        ))}
        <button
          onClick={save}
          style={{
            fontSize: 11,
            padding: "3px 10px",
            borderRadius: 6,
            border: "none",
            cursor: "pointer",
            fontWeight: 700,
            color: "#fff",
            background: saved ? "#4f9d69" : "#d97757",
          }}
        >
          {saved ? "저장됨 ✓" : "저장"}
        </button>
      </div>
      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
        <DesignFrame data={designDoc} selected={selected} zoom={zoom} onChange={onChange} />
      </div>
    </div>
  );
}

function PlanCard({ item, data, editing, setEditing, onUpdateData, stop }) {
  const [draft, setDraft] = useState("");

  const startEdit = () => {
    setDraft(JSON.stringify(data.payload, null, 2));
    setEditing(true);
  };

  const commit = () => {
    try {
      const payload = JSON.parse(draft);
      onUpdateData(item.id, { payload });
    } catch {
      /* JSON 오류 시 변경 취소 */
    }
    setEditing(false);
  };

  return (
    <div className="plan">
      <div className="plan-head">
        <span className="plan-badge" style={{ background: FEATURE_BADGE_COLOR[data.feature_id] }}>
          {FEATURE_LABEL[data.feature_id] || data.output_type}
        </span>
        <span className="plan-age">{data.age_band}</span>
        {data.source === "mock" && <span className="plan-mock">목업</span>}
        {/* JSON 편집 버튼 숨김 */}
      </div>
      <div className="plan-title">{data.title}</div>

      {editing ? (
        <div className="plan-editor" onPointerDown={stop}>
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} spellCheck={false} />
          <div className="plan-editor-actions">
            <button onClick={commit}>저장</button>
            <button onClick={() => setEditing(false)}>취소</button>
          </div>
        </div>
      ) : (
        <div className="plan-body" onWheel={stop}>
          <PlanView featureId={data.feature_id} payload={data.payload} />
        </div>
      )}
    </div>
  );
}

const prettyKey = (k) =>
  String(k).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function StructuredView({ value, depth = 0 }) {
  if (value === null || value === undefined) return <span className="sv-empty">—</span>;

  if (Array.isArray(value)) {
    return (
      <ul className="sv-list">
        {value.map((v, i) => (
          <li key={i}>
            {typeof v === "object" && v !== null ? (
              <StructuredView value={v} depth={depth + 1} />
            ) : (
              <span className="sv-val">{String(v)}</span>
            )}
          </li>
        ))}
      </ul>
    );
  }

  if (typeof value === "object") {
    return (
      <div className={"sv-obj" + (depth > 0 ? " sv-nested" : "")}>
        {Object.entries(value).map(([k, v]) => (
          <div className="sv-row" key={k}>
            <div className="sv-key">{prettyKey(k)}</div>
            <div className="sv-value">
              {typeof v === "object" && v !== null ? (
                <StructuredView value={v} depth={depth + 1} />
              ) : (
                <span className="sv-val">{String(v)}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return <span className="sv-val">{String(value)}</span>;
}
