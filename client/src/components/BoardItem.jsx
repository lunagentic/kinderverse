import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Rnd } from "react-rnd";
import { cutout as runCutout } from "../editor/cutout";
import { X, FileText, Image as ImageIcon, Palette, ImagePlus, Download, Copy, FlipHorizontal, RotateCw, Bookmark, BookmarkCheck } from "lucide-react";
import { toPng } from "html-to-image";
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
import { VARIANTS, buildVariant, buildVariantPages, blankPage, makePhotoSlot, LAYOUT_VERSION, saveStoryStickers, themeKeyOf } from "../playrecord/layouts";
import { resolveSticker, payloadDecoAssets } from "../playrecord/stickerAssets";

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
  onAddImages,
}) {
  const [editing, setEditing] = useState(false);
  const [imgMenu, setImgMenu] = useState(false); // 놀이기록 이미지 유형 선택 메뉴
  const drag = useRef(null);
  const resize = useRef(null);

  // 놀이기록 plan 카드(팝업): 내용 높이에 맞춰 자동 고정(잘림 방지). 편집·저장으로 내용이 바뀌면 다시 맞춤.
  const nodeRef = useRef(null);
  const isStoryPlan = item.type === "plan" && item.data?.feature_id === "play_story";
  useLayoutEffect(() => {
    if (!isStoryPlan || item.manualResized) return; // 사용자가 직접 크기를 바꿨으면 자동 맞춤 중지
    const el = nodeRef.current;
    if (!el) return;
    // .plan-body 가 내부 스크롤(overflow:auto)이므로 넘치는 양만큼 노드 높이를 키워 내용을 모두 노출.
    const body = el.querySelector(".plan-body");
    const extra = body ? body.scrollHeight - body.clientHeight : 0;
    if (extra > 6) onUpdate(item.id, { h: Math.round(item.h + extra + 4) }); // extra≈0 되면 안정(루프 없음)
  }, [isStoryPlan, item.h, item.data, item.manualResized, onUpdate, item.id]);

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
      // 놀이기록 plan 카드: 사용자가 직접 크기를 바꾸면 자동 높이 맞춤이 덮어쓰지 않도록 플래그.
      onUpdate(item.id, { w: newW, h: Math.round(newW * ratio), ...(isStoryPlan ? { manualResized: true } : {}) });
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
      ref={nodeRef}
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
        // 놀이기록(plan)은 더블클릭 편집(메모/JSON 박스) 비활성화
        if (item.type === "plan" && item.data?.feature_id === "play_story") return;
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

      {item.type === "plan" && onConvert && item.data?.feature_id !== "play_idea" && (
        <div className="node-actions" onPointerDown={(e) => e.stopPropagation()}>
          {/* 놀이기록·주제망은 문서 버튼 숨김 (이미지·편집 디자인만) */}
          {!["play_story", "topic_web"].includes(item.data?.feature_id) && (
            <button onClick={() => onConvert(item, "document")} title="문서">
              <FileText size={13} />
            </button>
          )}
          {item.type === "plan" && item.data?.feature_id === "monthly_plan" ? (
            <>
              <button onClick={() => onConvert(item, "image")} title="이미지">
                <ImageIcon size={13} />
              </button>
              <button onClick={() => onConvert(item, "kinderlab")} title="킨더랩">
                <Palette size={13} />
              </button>
              <button onClick={() => onConvert(item, "editTemplate")} title="편집 디자인 템플릿 (이 월안으로)">
                🎨
              </button>
            </>
          ) : item.data?.feature_id === "play_story" ? (
            <>
              <span className="node-imgmenu-wrap">
                <button onClick={() => setImgMenu((v) => !v)} title="이미지 (유형 선택)">
                  <ImageIcon size={13} />
                </button>
                {imgMenu && (
                  <div className="node-imgmenu" onPointerDown={(e) => e.stopPropagation()}>
                    <div className="node-imgmenu-title">이미지로 만들 유형</div>
                    {[["card", "카드형"], ["canvas", "캔버스형"], ["story", "스토리형"]].map(([v, label]) => (
                      <button
                        key={v}
                        onClick={() => { setImgMenu(false); onConvert(item, "image", { variant: v }); }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </span>
              <button onClick={() => onConvert(item, "design")} title="편집 디자인 (캔버스)">
                <Palette size={13} />
              </button>
            </>
          ) : item.data?.feature_id === "topic_web" ? (
            <>
              <button onClick={() => onConvert(item, "image", { variant: "topicweb" })} title="이미지 (주제망)">
                <ImageIcon size={13} />
              </button>
              <button onClick={() => onConvert(item, "design")} title="편집 디자인">
                <Palette size={13} />
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
        onAddImages={onAddImages}
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

function NodeContent({ item, editing, setEditing, onUpdate, onUpdateData, selected, zoom, onEditCard, onAddImages }) {
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

  if (type === "playrecord") {
    return (
      <PlayRecordEditor
        item={item}
        data={data}
        selected={selected}
        zoom={zoom}
        onUpdate={onUpdate}
        onUpdateData={onUpdateData}
        onAddImages={onAddImages}
      />
    );
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
export function DesignFrame({ data, selected, zoom = 1, onChange, photos, decoAssets }) {
  const { frame, elements = [] } = data;
  const wrapRef = useRef(null);
  const [scale, setScale] = useState(0.33);
  const [activeId, setActiveId] = useState(null);
  const [editId, setEditId] = useState(null);
  const [lightboxSrc, setLightboxSrc] = useState(null); // 사진 크게보기
  const [selIds, setSelIds] = useState([]); // 복수 선택(shift/cmd 클릭)
  const histRef = useRef([]); // 실행취소 스택(요소 배열 스냅샷, 무제한)

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / frame.w);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [frame.w]);

  // 모든 요소 변경의 단일 통로 — 변경 직전 스냅샷을 실행취소 스택에 push(무제한)
  const commit = (nextElements) => {
    histRef.current.push(elements);
    onChange?.({ elements: nextElements });
  };
  const undo = () => {
    if (!histRef.current.length) return;
    onChange?.({ elements: histRef.current.pop() });
  };
  const updateEl = (id, patch) =>
    commit(elements.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  const removeEl = (id) => commit(elements.filter((e) => e.id !== id));
  const removeMany = (ids) => commit(elements.filter((e) => !ids.includes(e.id)));
  // 요소 이동 — 복수 선택 시 선택된 요소들을 같은 델타로 함께 이동
  const moveEl = (id, x, y) => {
    const el = elements.find((e) => e.id === id);
    if (!el) return;
    if (selIds.length > 1 && selIds.includes(id)) {
      const dx = Math.round(x) - el.x, dy = Math.round(y) - el.y;
      commit(elements.map((e) => (selIds.includes(e.id) && !e.locked ? { ...e, x: e.x + dx, y: e.y + dy } : e)));
    } else {
      commit(elements.map((e) => (e.id === id ? { ...e, x: Math.round(x), y: Math.round(y) } : e)));
    }
  };
  // 선택 — shift/cmd/ctrl 시 복수 토글, 아니면 단일
  const selectEl = (id, e) => {
    if (e && (e.shiftKey || e.metaKey || e.ctrlKey)) {
      setSelIds((prev) => {
        const base = prev.length ? prev : (activeId ? [activeId] : []);
        return base.includes(id) ? base.filter((x) => x !== id) : [...base, id];
      });
    } else {
      setSelIds([id]);
    }
    setActiveId(id);
  };
  const duplicateEl = (id) => {
    const src = elements.find((e) => e.id === id);
    if (!src) return;
    const copy = JSON.parse(JSON.stringify(src));
    copy.id = `el_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    copy.x = Math.round((copy.x || 0) + 18);
    copy.y = Math.round((copy.y || 0) + 18);
    commit([...elements, copy]);
    setActiveId(copy.id); setSelIds([copy.id]);
  };
  // 빈 공간 선택(아무 요소도 선택 안 됨) 상태에서 꾸미기 그림을 누르면 새 스티커로 추가
  const addDecoEl = (url) => {
    const W = 130, n = elements.length, off = (n % 6) * 16 - 40;
    const el = {
      id: `el_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      type: "image", src: url, fit: "contain", cutout: false, sticker: true,
      x: Math.round(frame.w / 2 - W / 2 + off), y: Math.round(frame.h / 2 - W / 2 + off),
      w: W, h: W, rotation: 0, style: { radius: 0 },
    };
    commit([...elements, el]);
    setActiveId(el.id); setSelIds([el.id]);
  };
  const deselect = () => { setActiveId(null); setSelIds([]); setEditId(null); };

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
    setActiveId(next.id); setSelIds([next.id]);
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
    commit([...rest.slice(0, at), cur, ...rest.slice(at)]);
  };

  const rndScale = scale * (zoom || 1);
  const activeEl = selected ? elements.find((e) => e.id === activeId && !e.locked) : null;

  // 요소 복사/붙여넣기/복제 (편집 디자인 내부). 보드 단축키와 충돌 않게 stopPropagation.
  const outerRef = useRef(null);
  const elClip = useRef(null);
  const pasteEl = () => {
    const src = elClip.current;
    if (!src) return;
    const copy = JSON.parse(JSON.stringify(src));
    copy.id = `el_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    copy.x = Math.round((copy.x || 0) + 18);
    copy.y = Math.round((copy.y || 0) + 18);
    elClip.current = JSON.parse(JSON.stringify(copy)); // 연속 붙여넣기 누적 오프셋
    commit([...elements, copy]);
    setActiveId(copy.id); setSelIds([copy.id]);
  };
  const onFrameKey = (e) => {
    if (editId) return; // 텍스트 편집 중엔 무시
    const mod = e.metaKey || e.ctrlKey;
    const cur = elements.find((el) => el.id === activeId && !el.locked);
    const k = e.key.toLowerCase();
    if (mod && k === "z" && !e.shiftKey) { e.stopPropagation(); e.preventDefault(); undo(); }
    else if (mod && k === "c" && cur) { e.stopPropagation(); elClip.current = JSON.parse(JSON.stringify(cur)); }
    else if (mod && k === "v" && elClip.current) { e.stopPropagation(); e.preventDefault(); pasteEl(); }
    else if (mod && k === "d" && cur) { e.stopPropagation(); e.preventDefault(); elClip.current = JSON.parse(JSON.stringify(cur)); pasteEl(); }
    else if (e.key === "Delete" || e.key === "Backspace") {
      const ids = (selIds.length ? selIds : (cur ? [cur.id] : [])).filter((id) => { const el = elements.find((x) => x.id === id); return el && !el.locked; });
      if (ids.length) { e.stopPropagation(); removeMany(ids); setActiveId(null); setSelIds([]); }
    }
    else if (e.key === "Escape") { setActiveId(null); setSelIds([]); }
  };
  // 요소 선택 시 프레임에 포커스 → 단축키가 프레임에서 처리(보드 핸들러로 새지 않게)
  useEffect(() => {
    if (selected && activeId && !editId) outerRef.current?.focus({ preventScroll: true });
  }, [activeId, editId, selected]);

  return (
    <div className="dframe-outer" ref={outerRef} tabIndex={-1} onKeyDown={onFrameKey} style={{ outline: "none" }}>
      <div className="dframe-wrap" ref={wrapRef}>
        <div
          className="dframe"
          onMouseDown={(e) => { if (selected && !e.target.closest(".del")) deselect(); }}
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
                active={selIds.includes(el.id)}
                editing={editId === el.id}
                onSelect={(e) => selectEl(el.id, e)}
                onCycle={() => cycleSelect(el.id)}
                onEdit={() => setEditId(el.id)}
                onEndEdit={() => setEditId(null)}
                onEnlarge={(src) => src && setLightboxSrc(src)}
                onChange={(p) => updateEl(el.id, p)}
                onMove={(x, y) => moveEl(el.id, x, y)}
                onDuplicate={() => duplicateEl(el.id)}
                onDelete={() => { removeEl(el.id); setActiveId(null); setSelIds([]); }}
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
          photos={photos}
          decoAssets={decoAssets}
          onChange={(p) => updateEl(activeEl.id, p)}
          onReorder={(where) => reorder(activeEl.id, where)}
          onEnlarge={(src) => src && setLightboxSrc(src)}
          onRemove={() => {
            removeEl(activeEl.id);
            setActiveId(null); setSelIds([]);
          }}
          onClose={() => { setActiveId(null); setSelIds([]); }}
        />
      )}
      {/* 아무 요소도 선택 안 된 상태 → 꾸미기 그림 갤러리(누르면 새 스티커 추가) */}
      {selected && !activeEl && Array.isArray(decoAssets) && decoAssets.length > 0 && (
        <div className="dpanel" onPointerDown={(e) => e.stopPropagation()}>
          <div className="dpanel-label">꾸미기 그림 추가</div>
          <div className="dpanel-sublabel">그림을 누르면 캔버스에 추가돼요</div>
          <div className="dpanel-gallery">
            {decoAssets.map((g) => (
              <button key={g.url} className="dpanel-thumb" title={g.label} onClick={() => addDecoEl(g.url)}>
                <img src={g.url} alt={g.label} draggable={false} />
              </button>
            ))}
          </div>
        </div>
      )}
      <PhotoLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </div>
  );
}

// 사진 크게보기 라이트박스 (pv-lightbox 스타일 재사용)
function PhotoLightbox({ src, onClose }) {
  useEffect(() => {
    if (!src) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [src, onClose]);
  if (!src) return null;
  return createPortal(
    <div className="pv-lightbox" onClick={onClose} role="dialog" aria-modal="true">
      <button className="pv-lb-x" onClick={onClose} aria-label="닫기"><X size={22} /></button>
      <img src={src} alt="확대 사진" onClick={(e) => e.stopPropagation()} draggable={false} />
    </div>,
    document.body
  );
}

// ── 우측 고정 컨트롤 패널 (선택된 요소 1개를 한 곳에서 편집) ──
function ControlPanel({ el, onChange, onReorder, onRemove, onClose, photos, decoAssets, onEnlarge }) {
  const s = el.style || {};
  const isText = el.type === "text";
  const isImage = el.type === "image" || el.type === "photo";
  const onUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange({ src: reader.result });
    reader.readAsDataURL(file);
    e.target.value = "";
  };
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
          {/* 텍스트 외곽선(stroke) */}
          <div className="dpanel-sec">
            <div className="dpanel-label">외곽선</div>
            <div className="dpanel-btn-row">
              <button
                className={"dpanel-size" + (s.stroke ? "" : " on")}
                onClick={() => setStyle({ stroke: undefined, strokeWidth: undefined })}
              >없음</button>
              <button
                className={"dpanel-size" + (s.stroke ? " on" : "")}
                onClick={() => setStyle({ stroke: s.stroke || "#FFFFFF", strokeWidth: s.strokeWidth ?? 3 })}
              >켜기</button>
            </div>
            {s.stroke && (
              <>
                <div className="dpanel-btn-row" style={{ marginTop: 6 }}>
                  <button className={"dpanel-size" + ((s.strokeWidth ?? 3) <= 2 ? " on" : "")} onClick={() => setStyle({ strokeWidth: 2 })}>얇게</button>
                  <button className={"dpanel-size" + ((s.strokeWidth ?? 3) === 3 ? " on" : "")} onClick={() => setStyle({ strokeWidth: 3 })}>보통</button>
                  <button className={"dpanel-size" + ((s.strokeWidth ?? 3) >= 5 ? " on" : "")} onClick={() => setStyle({ strokeWidth: 5 })}>두껍게</button>
                </div>
                <div className="dpanel-eyedrop" style={{ marginTop: 6 }}>
                  <input
                    type="color"
                    className="dpanel-color-input"
                    value={typeof s.stroke === "string" && /^#[0-9a-fA-F]{6}$/.test(s.stroke) ? s.stroke : "#ffffff"}
                    onInput={(e) => setStyle({ stroke: e.target.value })}
                    title="외곽선 색"
                  />
                  <span className="dpanel-eyedrop-label">외곽선 색</span>
                </div>
                <div className="dpanel-sw-row" style={{ marginTop: 6 }}>
                  {["#FFFFFF", "#000000", "#5B53A8", "#E0791A", "#3E72A8", "#B05A82"].map((c) => (
                    <button key={c} className="del-sw" style={{ background: c }} title={c} onClick={() => setStyle({ stroke: c })} />
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* 이미지/사진: 직접 업로드 · 첨부 사진 선택 · 비우기 · 꾸미기 그림 */}
      {isImage && (
        <div className="dpanel-sec">
          {el.src && (
            <button
              className="dpanel-upload"
              style={{ marginBottom: 8, background: "#5B53A8", color: "#fff", borderColor: "#5B53A8" }}
              title="사진 크게 보기 (더블클릭으로도 가능)"
              onClick={() => onEnlarge?.(el.src)}
            >
              🔍 크게 보기
            </button>
          )}
          <div className="dpanel-label">사진 넣기</div>
          <label className="dpanel-upload" title="내 기기에서 사진 업로드">
            <input type="file" accept="image/*" hidden onChange={onUpload} />
            ⬆ 직접 업로드
          </label>
          {Array.isArray(photos) && photos.length > 0 && (
            <>
              <div className="dpanel-sublabel">첨부한 사진</div>
              <div className="dpanel-gallery">
                {photos.map((src, i) => (
                  <button
                    key={i}
                    className={"dpanel-thumb" + (el.src === src ? " on" : "")}
                    title={`사진 ${i + 1}`}
                    onClick={() => onChange({ src })}
                  >
                    <img src={src} alt={`사진 ${i + 1}`} draggable={false} />
                  </button>
                ))}
              </div>
            </>
          )}
          {el.src && (
            <button className="dpanel-size" style={{ marginTop: 6 }} onClick={() => onChange({ src: null })}>
              사진 자리 비우기
            </button>
          )}
          {Array.isArray(decoAssets) && decoAssets.length > 0 && (
            <>
              <div className="dpanel-sublabel">주제 그림</div>
              <div className="dpanel-gallery">
                {decoAssets.map((g) => (
                  <button
                    key={g.url}
                    className={"dpanel-thumb" + (el.src === g.url ? " on" : "")}
                    title={g.label}
                    onClick={() => onChange({ src: g.url, cutout: false })}
                  >
                    <img src={g.url} alt={g.label} draggable={false} />
                  </button>
                ))}
              </div>
            </>
          )}
          <div className="dpanel-sublabel">꾸미기 그림</div>
          <div className="dpanel-gallery">
            {DECO_IMAGES.map((g) => (
              <button
                key={g.url}
                className={"dpanel-thumb" + (el.src === g.url ? " on" : "")}
                title={g.label}
                onClick={() => onChange({ src: g.url, cutout: true })}
              >
                <img src={g.url} alt={g.label} draggable={false} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 사진 프레임: 비율 가이드 + 테두리 두께 · 색 */}
      {isImage && (
        <div className="dpanel-sec">
          <div className="dpanel-label">사진 비율 (가로:세로)</div>
          <div className="dpanel-btn-row">
            {[["4:3", 4 / 3], ["3:4", 3 / 4], ["1:1", 1], ["16:9", 16 / 9]].map(([lbl, r]) => (
              <button
                key={lbl}
                className="dpanel-size"
                title={`${lbl} 비율로 맞춤`}
                onClick={() => onChange({ h: Math.max(40, Math.round(el.w / r)) })}
              >
                {lbl}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 10, color: "#9b8b7d", marginTop: 4 }}>크기 조절 시 비율이 유지돼요 (모서리 드래그)</div>

          <div className="dpanel-label" style={{ marginTop: 10 }}>테두리 두께 <span style={{ color: "#9b8b7d", fontWeight: 400 }}>{s.strokeWidth || 0}px</span></div>
          <input
            type="range"
            min="0"
            max="40"
            value={s.strokeWidth || 0}
            onChange={(e) => setStyle({ stroke: s.stroke || "#ffffff", strokeWidth: Number(e.target.value) })}
          />

          <div className="dpanel-label" style={{ marginTop: 8 }}>테두리 색</div>
          <div className="dpanel-eyedrop">
            <input
              type="color"
              className="dpanel-color-input"
              value={typeof s.stroke === "string" && /^#[0-9a-fA-F]{6}$/.test(s.stroke) ? s.stroke : "#ffffff"}
              onInput={(e) => setStyle({ stroke: e.target.value, strokeWidth: s.strokeWidth || 12 })}
              title="스포이드 / 직접 색 선택"
            />
            <span className="dpanel-eyedrop-label">스포이드 / 직접 선택</span>
          </div>
          {COLOR_GROUPS.filter((g) => g.name !== "그라데이션").map((g) => (
            <div key={g.name} className="dpanel-grp">
              <div className="dpanel-grp-name">{g.name}</div>
              <div className="dpanel-sw-row">
                {g.colors.map((c, i) => (
                  <button
                    key={i}
                    className="del-sw"
                    style={{ background: c }}
                    title={c}
                    onClick={() => setStyle({ stroke: c, strokeWidth: s.strokeWidth || 12 })}
                  />
                ))}
              </div>
            </div>
          ))}
          <div className="dpanel-grp">
            <div className="dpanel-grp-name">기본</div>
            <div className="dpanel-sw-row">
              {["#ffffff", "#223160", "#000000", "#e07a5f", "#f2c14e", "#3fae6a", "#3b82d6"].map((c, i) => (
                <button key={i} className="del-sw" style={{ background: c }} title={c} onClick={() => setStyle({ stroke: c, strokeWidth: s.strokeWidth || 12 })} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 회전 — 직접 각도 입력 + 버튼 + 슬라이더 */}
      <div className="dpanel-sec">
        <div className="dpanel-label">회전</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <input
            type="number"
            min="-360"
            max="360"
            step="1"
            value={Math.round(el.rotation || 0)}
            onPointerDown={(e) => e.stopPropagation()}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "" || v === "-") return; // 입력 중
              onChange({ rotation: Math.max(-360, Math.min(360, Math.round(Number(v) || 0))) });
            }}
            style={{ width: 64, textAlign: "center", border: "1px solid var(--border,#ddd)", borderRadius: 7, padding: "5px 6px", fontSize: 12 }}
          />
          <span style={{ color: "#9b8b7d", fontSize: 12 }}>도(°)</span>
        </div>
        <div className="dpanel-btn-row">
          <button className="dpanel-size" title="왼쪽으로 15°" onClick={() => onChange({ rotation: Math.round((el.rotation || 0) - 15) })}>↺ -15°</button>
          <button className="dpanel-size" title="오른쪽으로 15°" onClick={() => onChange({ rotation: Math.round((el.rotation || 0) + 15) })}>↻ +15°</button>
          <button className="dpanel-size" title="회전 초기화" onClick={() => onChange({ rotation: 0 })}>초기화</button>
        </div>
        <input
          type="range"
          min="-180"
          max="180"
          value={Math.round(el.rotation || 0)}
          onChange={(e) => onChange({ rotation: Number(e.target.value) })}
        />
      </div>

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
  { name: "손글씨·또렷(나눔펜)", css: "'Nanum Pen Script', cursive" },
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

function EditableEl({ el, scale, active, editing, onSelect, onCycle, onEdit, onEndEdit, onEnlarge, onChange, onMove, onDuplicate, onDelete }) {
  const s = el.style || {};
  const fill = { width: "100%", height: "100%", boxSizing: "border-box" };
  const isImage = el.type === "image" || el.type === "photo";
  const draggedRef = useRef(false);
  const clickTimer = useRef(null);

  // 회전 핸들 드래그 → 상자 중심 기준으로 기울임(피그마식). shift=15° 스냅.
  const onRotateStart = (e) => {
    e.stopPropagation();
    e.preventDefault();
    const rnd = e.currentTarget.closest(".del");
    if (!rnd) return;
    const rect = rnd.getBoundingClientRect();
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2; // 회전 중심(회전해도 불변)
    const startA = Math.atan2(e.clientY - cy, e.clientX - cx);
    const startRot = el.rotation || 0;
    const move = (ev) => {
      const a = Math.atan2(ev.clientY - cy, ev.clientX - cx);
      let deg = startRot + (a - startA) * 180 / Math.PI;
      deg = ((Math.round(deg) % 360) + 360) % 360;
      if (deg > 180) deg -= 360;
      if (ev.shiftKey) deg = Math.round(deg / 15) * 15;
      onChange({ rotation: deg });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const imgRadius = isImage ? (s.radius ?? 12) : 12;
  const imgBorder = s.stroke && s.strokeWidth ? `${s.strokeWidth}px solid ${s.stroke}` : undefined;
  let inner;
  if (el.type === "shape") {
    inner = <div style={{ ...fill, background: s.bg, borderRadius: s.radius || 0, border: s.stroke && s.strokeWidth ? `${s.strokeWidth}px solid ${s.stroke}` : undefined, boxShadow: s.shadow }} />;
  } else if (isImage) {
    inner = el.src ? (
      el.cutout ? (
        <CutoutImg src={el.src} fit={el.fit || "contain"} style={{ ...fill, borderRadius: imgRadius }} />
      ) : (
        <img
          src={el.src}
          alt=""
          draggable={false}
          style={{ ...fill, boxSizing: "border-box", objectFit: el.fit || "contain", borderRadius: imgRadius, border: imgBorder }}
          onError={(e) => { e.currentTarget.style.visibility = "hidden"; }}
          onLoad={(e) => { e.currentTarget.style.visibility = "visible"; }}
        />
      )
    ) : (
      <div className="dframe-imgph" style={{ ...fill, borderRadius: imgRadius, border: imgBorder }}>
        <ImageIcon size={Math.max(18, Math.min(56, Math.round(Math.min(el.w, el.h) * 0.4)))} strokeWidth={1.6} />
      </div>
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
      bounds={el.sticker ? undefined : "parent"}
      lockAspectRatio={isImage}
      disableDragging={editing}
      enableResizing={active && !editing}
      onMouseDown={onSelect}
      onPointerDown={(e) => e.stopPropagation()}
      onDragStart={() => { draggedRef.current = false; }}
      onDrag={() => { draggedRef.current = true; }}
      onDragStop={(e, d) => {
        // 클릭(실제 드래그 아님)이면 위치를 갱신하지 않음 → 선택만 했는데 배열이 틀어지는 문제 방지
        if (!draggedRef.current) return;
        if (onMove) onMove(d.x, d.y);
        else onChange({ x: Math.round(d.x), y: Math.round(d.y) });
      }}
      onResizeStop={(e, dir, ref, delta, pos) => {
        const nw = Math.round(parseFloat(ref.style.width));
        const nh = Math.round(parseFloat(ref.style.height));
        const patch = { w: nw, h: nh, x: Math.round(pos.x), y: Math.round(pos.y) };
        // 텍스트 박스를 드래그로 확대/축소하면 글자도 함께 스케일(상자만 커지지 않게)
        if (el.type === "text" && el.h && el.w) {
          const ratio = el.sticker ? nh / el.h : (nw / el.w + nh / el.h) / 2;
          const base = s.fontSize || 14;
          patch.style = { ...s, fontSize: Math.max(8, Math.round(base * ratio)) };
        }
        onChange(patch);
      }}
      className={"del" + (active ? " del-active" : "")}
      // 도형은 선택해도 z-순서를 올리지 않음(z=1 유지) → 위에 놓인 사진·텍스트를 가리지 않고 함께 보며 편집(Canva 식)
      // 회전은 Rnd 박스 자체에 CSS rotate 로 적용 → 선택 상자(아웃라인)도 함께 기울어짐(피그마식). translate(위치)와 독립 속성이라 충돌 없음.
      style={{ zIndex: active ? (el.type === "shape" ? 1 : 20) : 1, rotate: el.rotation ? `${el.rotation}deg` : undefined }}
    >
      {active && !editing && (
        <div
          className="del-fbar"
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            position: "absolute", left: "50%", bottom: "100%", marginBottom: 8,
            transform: `translateX(-50%) rotate(${-(el.rotation || 0)}deg) scale(${1 / (scale || 1)})`,
            transformOrigin: "bottom center",
          }}
        >
          {onDuplicate && <button title="복사" onClick={onDuplicate}><Copy size={13} /></button>}
          {isImage && <button title="좌우반전" onClick={() => onChange({ flipH: !el.flipH })}><FlipHorizontal size={13} /></button>}
          <button title="회전 +15°" onClick={() => onChange({ rotation: Math.round((el.rotation || 0) + 15) })}><RotateCw size={13} /></button>
          {onDelete && <button title="삭제" className="del-fbar-x" onClick={onDelete}><X size={13} /></button>}
        </div>
      )}
      {active && !editing && (
        <div
          className="del-rotate"
          onPointerDown={onRotateStart}
          onMouseDown={(e) => e.stopPropagation()}
          title="드래그하여 회전 (Shift=15° 단위)"
          style={{
            position: "absolute", left: "50%", top: "100%", marginTop: 10,
            transform: `translateX(-50%) rotate(${-(el.rotation || 0)}deg) scale(${1 / (scale || 1)})`,
            transformOrigin: "top center",
          }}
        >
          <RotateCw size={12} />
        </div>
      )}
      <div
        className="del-inner"
        style={{
          opacity: el.hidden ? 0.25 : s.opacity ?? 1,
          outline: el.hidden ? "1.5px dashed var(--accent)" : undefined,
          background: isImage ? s.bg : undefined,
          borderRadius: isImage ? imgRadius : 12,
          boxShadow: isImage ? s.shadow : undefined,
          transform: el.flipH ? "scaleX(-1)" : undefined,
        }}
        onDoubleClick={
          el.type === "text"
            ? () => {
                clearTimeout(clickTimer.current); // 더블클릭은 순서변경 취소하고 편집
                onEdit();
              }
            : isImage && el.src
              ? () => { clearTimeout(clickTimer.current); onEnlarge?.(el.src); } // 사진 더블클릭 = 크게보기
              : undefined
        }
        /* 클릭 = 그 요소를 '선택만'. 사진 더블클릭 = 크게보기. */
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
    transform: [el.rotation ? `rotate(${el.rotation}deg)` : "", el.flipH ? "scaleX(-1)" : ""].filter(Boolean).join(" ") || undefined,
  };
  const s = el.style || {};

  // 곡선 점선 화살표 커넥터 (스토리형 흐름) — 여러 색 세그먼트를 한 SVG로
  if (el.type === "connector") {
    return (
      <svg
        style={{ position: "absolute", left: el.x, top: el.y, overflow: "visible", pointerEvents: "none", opacity: s.opacity ?? 1 }}
        width={el.w}
        height={el.h}
      >
        {(el.segments || []).map((seg, i) => (
          <g key={i}>
            <path d={seg.d} fill="none" stroke={seg.color} strokeWidth={seg.sw || 3.5} strokeDasharray={seg.dash || "1.5 9"} strokeLinecap="round" />
            {seg.head && <path d={seg.head} fill={seg.color} />}
          </g>
        ))}
      </svg>
    );
  }

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
    const radius = s.radius ?? 12;
    const border = s.stroke && s.strokeWidth ? `${s.strokeWidth}px solid ${s.stroke}` : undefined;
    if (el.src) {
      if (el.cutout) {
        return <CutoutImg src={el.src} fit={el.fit || "contain"} style={{ ...base, borderRadius: radius, opacity: s.opacity ?? 1, boxShadow: s.shadow }} />;
      }
      return (
        <img
          src={el.src}
          alt=""
          draggable={false}
          style={{ ...base, boxSizing: "border-box", objectFit: el.fit || "cover", borderRadius: radius, border, boxShadow: s.shadow, opacity: s.opacity ?? 1 }}
          onError={(e) => { e.currentTarget.style.visibility = "hidden"; }}
          onLoad={(e) => { e.currentTarget.style.visibility = "visible"; }}
        />
      );
    }
    return (
      <div className="dframe-imgph" style={{ ...base, boxSizing: "border-box", borderRadius: radius, border, boxShadow: s.shadow }}>
        <ImageIcon size={Math.max(18, Math.min(56, Math.round(Math.min(el.w, el.h) * 0.4)))} strokeWidth={1.6} />
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

// ── 놀이기록 편집기: 3유형 토글 + A4 페이지 + 자유 캔버스(DesignFrame) ──
function PlayRecordEditor({ item, data, selected, zoom, onUpdateData, onAddImages }) {
  const variant = data.variant || "card";
  const docs = data.docs || {};
  const pages = docs[variant];
  const page = Math.min(data.page || 0, pages ? pages.length - 1 : 0);

  // 활성 유형 문서가 없으면 빌드해 저장. 레이아웃 버전이 바뀌면 전체 재생성(최신 디자인 반영).
  useEffect(() => {
    if (data.docsVersion !== LAYOUT_VERSION) {
      onUpdateData(item.id, {
        docs: { [variant]: buildVariantPages(variant, data.payload) },
        docsVersion: LAYOUT_VERSION,
        page: 0,
      });
      return;
    }
    if (!docs[variant]) {
      onUpdateData(item.id, {
        docs: { ...docs, [variant]: buildVariantPages(variant, data.payload) },
        page: 0,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant]);

  // 주제 스티커(이모지 폴백)를 기존 에셋 재사용 또는 생성으로 이미지 교체.
  // dataRef 로 최신 docs 에 머지해 사용자 편집을 덮어쓰지 않는다. resolvingRef 로 중복 호출 방지.
  const dataRef = useRef(data);
  dataRef.current = data;
  const resolvingRef = useRef(new Set());
  useEffect(() => {
    if (!pages) return;
    const pageEls = pages[page]?.elements || [];
    const targets = pageEls.filter(
      (e) => e.stickerAsset && !e.src && !resolvingRef.current.has(e.id)
    );
    if (!targets.length) return;
    targets.forEach((e) => resolvingRef.current.add(e.id));
    let cancelled = false;
    (async () => {
      const resolved = await Promise.all(
        targets.map(async (el) => {
          try {
            return [el.id, await resolveSticker(el.stickerAsset)];
          } catch {
            return [el.id, null];
          }
        })
      );
      if (cancelled) return;
      const map = new Map(resolved.filter(([, r]) => r && r.src));
      if (!map.size) return;
      const d = dataRef.current;
      const curPages = d.docs?.[variant];
      if (!curPages || !curPages[page]) return;
      onUpdateData(item.id, {
        docs: {
          ...d.docs,
          [variant]: curPages.map((pg, i) =>
            i === page
              ? {
                  ...pg,
                  elements: pg.elements.map((e) =>
                    map.has(e.id)
                      ? { ...e, type: "image", src: map.get(e.id).src, cutout: map.get(e.id).cutout, fit: "contain", text: undefined, style: { ...(e.style || {}), radius: 0 } }
                      : e
                  ),
                }
              : pg
          ),
        },
      });
    })();
    return () => {
      cancelled = true;
      // 취소(예: StrictMode 이중호출/재렌더) 시 잠금 해제 → 다음 실행에서 재해석 가능
      targets.forEach((e) => resolvingRef.current.delete(e.id));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant, page, pages]);

  const setVariant = (v) => onUpdateData(item.id, { variant: v, page: 0 });
  const updatePage = (patch) => {
    if (!pages) return;
    const next = pages.map((p, i) => (i === page ? { ...p, ...patch } : p));
    onUpdateData(item.id, { docs: { ...docs, [variant]: next } });
  };
  const canvasRef = useRef(null);
  // 놀이기록 → PNG 저장(현재 페이지 캔버스). 미리보기 스케일 무시하고 A4 원본 해상도로 캡처.
  const saveImage = async () => {
    const node = canvasRef.current?.querySelector(".dframe");
    if (!node) return;
    const fr = pages?.[page]?.frame || { w: 794, h: 1123 };
    const fileName = `${(data.title || "놀이기록").replace(/[\\/:*?"<>|]/g, "_")}-${variant}-${page + 1}.png`;
    const opt = { width: fr.w, height: fr.h, pixelRatio: 2, cacheBust: false, style: { transform: "scale(1)", transformOrigin: "top left", margin: "0" } };
    let dataUrl;
    try { dataUrl = await toPng(node, { ...opt, skipFonts: false }); }
    catch (e) { dataUrl = await toPng(node, { ...opt, skipFonts: true }); }
    // 1) 파일로 다운로드
    const a = document.createElement("a");
    a.href = dataUrl; a.download = fileName; a.click();
    // 2) 보드에도 저장 — 렌더된 PNG를 카드 오른쪽에 이미지 아이템으로 추가
    onAddImages?.([dataUrl], { x: item.x + item.w + 180, y: item.y + 150 });
  };
  // 현재 페이지 스티커 배치를 그 주제의 스토리 디폴트로 "찜" 저장
  const [presetSaved, setPresetSaved] = useState(false);
  const saveStickerPreset = () => {
    if (!pages) return;
    const els = pages[page]?.elements || [];
    const stickers = els
      .filter((e) => e.type === "image" && (e.sticker || /generated-assets|\/deco\//.test(e.src || "")))
      .map((e) => ({
        src: (e.src || "").replace(/^https?:\/\/[^/]+/, ""),
        x: Math.round(e.x), y: Math.round(e.y), w: Math.round(e.w), h: Math.round(e.h),
        rot: Math.round(e.rotation || 0), flip: !!e.flipH,
      }));
    if (!stickers.length) return;
    saveStoryStickers(themeKeyOf(data.payload), stickers);
    setPresetSaved(true);
    setTimeout(() => setPresetSaved(false), 1600);
  };
  const addPage = () => {
    const next = [...(pages || []), blankPage(data.payload)];
    onUpdateData(item.id, { docs: { ...docs, [variant]: next }, page: next.length - 1 });
  };
  const addPhotoSlot = () => {
    if (!pages) return;
    const slot = makePhotoSlot();
    const next = pages.map((p, i) => (i === page ? { ...p, elements: [...p.elements, slot] } : p));
    onUpdateData(item.id, { docs: { ...docs, [variant]: next } });
  };
  const removePage = () => {
    if (!pages || pages.length <= 1) return;
    onUpdateData(item.id, {
      docs: { ...docs, [variant]: pages.filter((_, i) => i !== page) },
      page: Math.max(0, page - 1),
    });
  };
  const goPage = (delta) =>
    pages && onUpdateData(item.id, { page: Math.max(0, Math.min(pages.length - 1, page + delta)) });

  const stop = (e) => e.stopPropagation();
  const activeDoc = pages && pages[page];

  return (
    <div className="prdoc">
      {selected && (
        <div className="prdoc-bar" onPointerDown={stop} onMouseDown={stop} onDoubleClick={stop}>
          <div className="prdoc-tabs">
            {VARIANTS.map((v) => (
              <button
                key={v.key}
                className={"prdoc-tab" + (v.key === variant ? " on" : "")}
                onClick={() => setVariant(v.key)}
              >
                {v.label}
              </button>
            ))}
          </div>
          <div className="prdoc-pages">
            <button onClick={saveImage} title="이미지로 저장 (PNG)" style={{ width: "auto", padding: "0 9px", display: "inline-flex", alignItems: "center" }}><Download size={15} /></button>
            {variant === "story" && (
              <button onClick={saveStickerPreset} title={presetSaved ? "스티커 배치 저장됨 ✓" : "현재 스티커 배치를 이 주제의 기본값으로 찜(저장)"} style={{ width: "auto", padding: "0 9px", display: "inline-flex", alignItems: "center", color: presetSaved ? "#3fae6a" : undefined }}>
                {presetSaved ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
              </button>
            )}
            <button onClick={addPhotoSlot} title="사진 자리 추가" style={{ width: "auto", padding: "0 9px", display: "inline-flex", alignItems: "center" }}><ImagePlus size={16} /></button>
            <span className="prdoc-bar-div" />
            <button onClick={() => goPage(-1)} disabled={page <= 0} title="이전 페이지">‹</button>
            <span className="prdoc-pageno">{page + 1} / {pages ? pages.length : 1}</span>
            <button onClick={() => goPage(1)} disabled={!pages || page >= pages.length - 1} title="다음 페이지">›</button>
            <button onClick={addPage} title="페이지 추가">＋</button>
            {pages && pages.length > 1 && (
              <button onClick={removePage} title="이 페이지 삭제">🗑</button>
            )}
          </div>
        </div>
      )}
      <div className="prdoc-canvas" ref={canvasRef}>
        {activeDoc ? (
          <DesignFrame key={`${variant}-${page}`} data={activeDoc} selected={selected} zoom={zoom} onChange={updatePage} photos={data.payload?.photos} decoAssets={payloadDecoAssets(data.payload)} />
        ) : (
          <div className="prdoc-loading">불러오는 중…</div>
        )}
      </div>
    </div>
  );
}

// ── KinderVerse 계획 카드 (구조화 JSON 렌더 + JSON 편집) ──
const FEATURE_LABEL = {
  play_story: "놀이기록",
  play_idea: "놀이아이디어",
  mission_card: "놀이미션카드",
  monthly_plan: "월간 놀이계획",
  weekly_plan: "주간 놀이계획",
  daily_plan: "일일 놀이계획",
  project_plan: "프로젝트 계획안",
  project_notice: "프로젝트 안내문",
  topic_web: "놀이중심 주제망",
};

// 유형별 배지 색상 (아이디어 vs 월안 등 한눈에 구분)
const FEATURE_BADGE_COLOR = {
  play_story: "#4a90b8", // 파랑(놀이기록)
  topic_web: "#c2613f", // 테라코타(주제망)
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
  const isStory = data.feature_id === "play_story";
  const [draft, setDraft] = useState("");

  const startJsonEdit = () => {
    setDraft(JSON.stringify(data.payload, null, 2));
    setEditing(true);
  };
  const commitJson = () => {
    try {
      onUpdateData(item.id, { payload: JSON.parse(draft) });
    } catch {
      /* JSON 오류 시 변경 취소 */
    }
    setEditing(false);
  };
  const saveStory = (payload) => {
    onUpdateData(item.id, { payload, title: payload?.header?.title || data.title });
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
        {!editing && (
          <button
            className="plan-edit"
            onPointerDown={stop}
            onClick={(e) => { e.stopPropagation(); isStory ? setEditing(true) : startJsonEdit(); }}
            title="내용 편집"
          >
            ✏️ 편집
          </button>
        )}
      </div>
      <div className="plan-title">{data.title}</div>

      {editing ? (
        isStory ? (
          <StoryPlanEditor payload={data.payload} onSave={saveStory} onCancel={() => setEditing(false)} stop={stop} />
        ) : (
          <div className="plan-editor" onPointerDown={stop}>
            <textarea value={draft} onChange={(e) => setDraft(e.target.value)} spellCheck={false} />
            <div className="plan-editor-actions">
              <button onClick={commitJson}>저장</button>
              <button onClick={() => setEditing(false)}>취소</button>
            </div>
          </div>
        )
      ) : (
        <div className="plan-body" onWheel={stop}>
          <PlanView featureId={data.feature_id} payload={data.payload} />
        </div>
      )}
    </div>
  );
}

// 놀이기록(play_story) plan 카드 구조화 편집기 — 제목·소개·활동·배움·지원을 폼으로 수정 후 저장.
function StoryPlanEditor({ payload, onSave, onCancel, stop }) {
  const [p, setP] = useState(() => JSON.parse(JSON.stringify(payload || {})));
  const upd = (fn) => setP((prev) => { const n = JSON.parse(JSON.stringify(prev)); fn(n); return n; });
  const acts = Array.isArray(p.activities) ? p.activities : [];
  const lbl = { fontSize: 11, fontWeight: 700, color: "#6f6149", marginTop: 6 };
  const inp = { width: "100%", boxSizing: "border-box", border: "1px solid var(--border, #ddd)", borderRadius: 7, padding: "5px 7px", fontSize: 12, fontFamily: "inherit" };
  const ta = { ...inp, resize: "vertical", lineHeight: 1.5 };
  const btn = { border: "1px solid var(--border, #ddd)", borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", background: "#fff" };
  return (
    <div
      className="plan-editor2"
      onPointerDown={stop}
      onWheel={stop}
      onDoubleClick={stop}
      style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: 4, paddingRight: 2 }}
    >
      <div style={lbl}>제목</div>
      <input style={inp} value={p.header?.title || ""} onChange={(e) => upd((n) => { n.header = n.header || {}; n.header.title = e.target.value; })} />
      <div style={lbl}>놀이 이야기(소개)</div>
      <textarea style={ta} rows={3} value={p.introduction?.text || ""} onChange={(e) => upd((n) => { n.introduction = n.introduction || {}; n.introduction.text = e.target.value; })} />
      <div style={lbl}>활동</div>
      {acts.map((a, i) => (
        <div key={i} style={{ border: "1px solid #eee", borderRadius: 8, padding: 6, display: "flex", flexDirection: "column", gap: 4 }}>
          <input style={inp} placeholder={`활동 ${i + 1} 제목`} value={a.title || ""} onChange={(e) => upd((n) => { n.activities[i].title = e.target.value; })} />
          <textarea style={ta} rows={2} placeholder="활동 내용" value={a.summary || ""} onChange={(e) => upd((n) => { n.activities[i].summary = e.target.value; })} />
        </div>
      ))}
      <div style={lbl}>놀이 속 배움</div>
      <textarea style={ta} rows={3} value={p.learning?.text || ""} onChange={(e) => upd((n) => { n.learning = n.learning || {}; n.learning.text = e.target.value; })} />
      <div style={lbl}>교사의 지원</div>
      <textarea style={ta} rows={3} value={p.teacherSupport?.text || ""} onChange={(e) => upd((n) => { n.teacherSupport = n.teacherSupport || {}; n.teacherSupport.text = e.target.value; })} />
      <div style={{ display: "flex", gap: 6, marginTop: 8, position: "sticky", bottom: 0, background: "#fff", paddingTop: 4 }}>
        <button style={{ ...btn, background: "#5B53A8", color: "#fff", border: "none", flex: 1 }} onClick={() => onSave(p)}>저장</button>
        <button style={btn} onClick={onCancel}>취소</button>
      </div>
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
