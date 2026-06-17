import { useLayoutEffect, useRef, useState } from "react";
import { X, FileText, Image as ImageIcon, Palette } from "lucide-react";
import PlanView from "./PlanView.jsx";

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

      {selected && onConvert && (
        <div className="node-actions" onPointerDown={(e) => e.stopPropagation()}>
          <button onClick={() => onConvert(item, "document")} title="문서로 만들기">
            <FileText size={13} />
          </button>
          <button onClick={() => onConvert(item, "image")} title="이미지로 만들기">
            <ImageIcon size={13} />
          </button>
          <button onClick={() => onConvert(item, "design")} title="편집 가능한 디자인 템플릿으로 만들기">
            <Palette size={13} />
          </button>
        </div>
      )}

      <NodeContent
        item={item}
        editing={editing}
        setEditing={setEditing}
        onUpdateData={onUpdateData}
      />

      {selected && (
        <div className="node-resize" onPointerDown={startResize} />
      )}
    </div>
  );
}

function NodeContent({ item, editing, setEditing, onUpdateData }) {
  const { type, data } = item;
  const stop = (e) => e.stopPropagation();

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
    return <DesignFrame data={data} />;
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

// ── DesignDoc: element 기반 디자인 (Phase 1: 읽기전용 렌더) ──
function DesignFrame({ data }) {
  const { frame, elements = [] } = data;
  const wrapRef = useRef(null);
  const [scale, setScale] = useState(0.33);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / frame.w);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [frame.w]);

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
        {elements.map((el) => (
          <DesignEl key={el.id} el={el} />
        ))}
      </div>
    </div>
  );
}

function DesignEl({ el }) {
  const base = {
    position: "absolute",
    left: el.x,
    top: el.y,
    width: el.w,
    height: el.h,
  };
  const s = el.style || {};

  if (el.type === "shape") {
    return <div style={{ ...base, background: s.bg, borderRadius: s.radius || 0 }} />;
  }
  if (el.type === "text") {
    const justify =
      s.align === "center" ? "center" : s.align === "right" ? "flex-end" : "flex-start";
    return (
      <div
        style={{
          ...base,
          display: "flex",
          alignItems: "center",
          justifyContent: justify,
          textAlign: s.align || "left",
          fontSize: s.fontSize,
          fontWeight: s.weight,
          color: s.color,
          lineHeight: 1.3,
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
          style={{ ...base, objectFit: el.fit || "cover", borderRadius: 12 }}
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
        {!editing && (
          <button className="plan-edit" onPointerDown={stop} onClick={startEdit}>
            JSON 편집
          </button>
        )}
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
