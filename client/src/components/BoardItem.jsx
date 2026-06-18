import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Rnd } from "react-rnd";
import { X, FileText, Image as ImageIcon, Palette, LayoutGrid } from "lucide-react";
import PlanView from "./PlanView.jsx";
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

export default function BoardItem({
  item,
  zoom,
  selected,
  onSelect,
  onUpdate,
  onUpdateData,
  onRemove,
  onConvert,
}) {
  const [editing, setEditing] = useState(false);
  const drag = useRef(null);
  const resize = useRef(null);

  // 아이템 드래그 이동
  const onPointerDown = (e) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    onSelect(item.id);
    if (editing) return;
    drag.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: item.x,
      origY: item.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (resize.current) {
      const dx = (e.clientX - resize.current.startX) / zoom;
      const dy = (e.clientY - resize.current.startY) / zoom;
      onUpdate(item.id, {
        w: Math.max(160, resize.current.origW + dx),
        h: Math.max(120, resize.current.origH + dy),
      });
      return;
    }
    if (!drag.current) return;
    const dx = (e.clientX - drag.current.startX) / zoom;
    const dy = (e.clientY - drag.current.startY) / zoom;
    onUpdate(item.id, { x: drag.current.origX + dx, y: drag.current.origY + dy });
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
          <button onClick={() => onConvert(item, "image")} title="이미지">
            <ImageIcon size={13} />
          </button>
          {item.type === "plan" && item.data?.feature_id === "monthly_plan" ? (
            <>
              <button onClick={() => onConvert(item, "kinderlab")} title="킨더랩">
                <Palette size={13} />
              </button>
              <button onClick={() => onConvert(item, "compareall")} title="한번에 보기">
                <LayoutGrid size={13} />
              </button>
            </>
          ) : (
            <button onClick={() => onConvert(item, "design")} title="디자인 템플릿">
              <Palette size={13} />
            </button>
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
      />

      {selected && (
        <div className="node-resize" onPointerDown={startResize} />
      )}
    </div>
  );
}

function NodeContent({ item, editing, setEditing, onUpdate, onUpdateData, selected, zoom }) {
  const { type, data } = item;
  const stop = (e) => e.stopPropagation();

  if (type === "template") {
    return <TemplateCard item={item} data={data} selected={selected} zoom={zoom} onUpdate={onUpdate} onUpdateData={onUpdateData} stop={stop} />;
  }

  if (type === "monthlydoc") {
    return <MonthlyDocCard item={item} data={data} onUpdate={onUpdate} onUpdateData={onUpdateData} />;
  }

  if (type === "infographic") {
    return <InfographicCard item={item} data={data} onUpdate={onUpdate} />;
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

// ── 인포그래픽 카드 (월안 → gpt-image 포스터 1장) ──
function InfographicCard({ item, data }) {
  const wrap = { position: "relative", width: "100%", height: "100%", overflow: "hidden", background: "#fff", borderRadius: 8 };

  // 생성된 포스터 이미지
  if (data.src) {
    return (
      <div style={wrap}>
        <img src={data.src} alt={data.title || "인포그래픽"} draggable={false} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
      </div>
    );
  }

  // 생성 중
  if (data.loading) {
    return (
      <div
        style={{
          ...wrap,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          background: "linear-gradient(180deg,#fff8fb,#f4f8ff)",
          color: "#a24e6b",
          textAlign: "center",
          padding: 16,
        }}
      >
        <div style={{ fontSize: 30 }}>🎨</div>
        <div style={{ fontWeight: 800, fontSize: 14 }}>인포그래픽 이미지 생성 중…</div>
        <div style={{ fontSize: 11, color: "#8a8392" }}>AI가 포스터를 그리고 있어요 (1~3분)</div>
      </div>
    );
  }

  // 실패 → 안내
  return (
    <div style={{ ...wrap, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, color: "#9a8fa6", textAlign: "center", padding: 16 }}>
      <div style={{ fontSize: 26 }}>🖼️</div>
      <div style={{ fontSize: 12.5 }}>이미지 생성에 실패했어요.<br />다시 "이미지" 버튼을 눌러보세요.</div>
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

  // 겹친 레이어 위에서 클릭(드래그 아님) → 현재 레이어를 뒤로 보내고 아래 레이어 선택
  const cycleStack = (id) => {
    const cur = elements.find((e) => e.id === id);
    if (!cur) return;
    const peers = elements.filter((e) => e.id !== id && !e.locked && overlaps(e, cur));
    if (!peers.length) return; // 겹친 레이어 없음 → 순서 그대로
    const next = peers[peers.length - 1]; // 배열상 가장 위(시각적 최상단) 겹친 레이어
    const without = elements.filter((e) => e.id !== id);
    let at = 0;
    while (at < without.length && without[at].locked) at++; // 배경(잠금) 레이어 위로
    onChange?.({ elements: [...without.slice(0, at), cur, ...without.slice(at)] });
    setActiveId(next.id);
  };

  const rndScale = scale * (zoom || 1);
  const activeEl = selected ? elements.find((e) => e.id === activeId && !e.locked) : null;

  return (
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
              onCycle={() => cycleStack(el.id)}
              onEdit={() => setEditId(el.id)}
              onEndEdit={() => setEditId(null)}
              onChange={(p) => updateEl(el.id, p)}
            />
          ) : (
            <DesignEl key={el.id} el={el} />
          )
        )}
      </div>

      {activeEl && (
        <ControlPanel
          el={activeEl}
          onChange={(p) => updateEl(activeEl.id, p)}
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
function ControlPanel({ el, onChange, onRemove, onClose }) {
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

  const typeLabel = isText
    ? isTitle
      ? "제목 텍스트"
      : "본문 텍스트"
    : isImage
    ? "이미지"
    : "도형";

  return (
    <div
      className="dpanel"
      onPointerDown={stop}
      onMouseDown={stop}
      onWheel={stop}
      onDoubleClick={stop}
    >
      <div className="dpanel-head">
        <span>{typeLabel} 편집</span>
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

// 유아 친화 대표 폰트 3종 (index.html 에서 로드)
const FONTS = [
  { name: "동글(Jua)", css: "'Jua', sans-serif" },
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

function EditableEl({ el, scale, active, editing, onSelect, onCycle, onEdit, onEndEdit, onChange }) {
  const s = el.style || {};
  const fill = { width: "100%", height: "100%", boxSizing: "border-box" };
  const isImage = el.type === "image" || el.type === "photo";
  const draggedRef = useRef(false);
  const clickTimer = useRef(null);

  let inner;
  if (el.type === "shape") {
    inner = <div style={{ ...fill, background: s.bg, borderRadius: s.radius || 0 }} />;
  } else if (isImage) {
    inner = el.src ? (
      <img
        src={el.src}
        alt=""
        draggable={false}
        style={{ ...fill, objectFit: el.fit || "contain", borderRadius: 12 }}
        onError={(e) => { e.currentTarget.style.visibility = "hidden"; }}
        onLoad={(e) => { e.currentTarget.style.visibility = "visible"; }}
      />
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
        onClick={() => {
          // 드래그가 아닌 '제자리 클릭'이고 이미 선택된 상태일 때만 → 겹친 레이어 순서 변경
          if (!active || draggedRef.current) return;
          if (el.type === "text") {
            // 더블클릭(편집)과 구분: 잠깐 대기 후 단일 클릭이면 순서 변경
            clearTimeout(clickTimer.current);
            clickTimer.current = setTimeout(() => onCycle?.(), 230);
          } else {
            onCycle?.();
          }
        }}
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
    return <div style={{ ...base, background: s.bg, borderRadius: s.radius || 0, opacity: s.opacity ?? 1 }} />;
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
        <span className="plan-badge">{FEATURE_LABEL[data.feature_id] || data.output_type}</span>
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
