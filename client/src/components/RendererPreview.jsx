// 개발용 스테이지 인스펙터: 월안 Template Renderer 파이프라인을 단계별로 확인.
// URL ?render=monthly. 탭: Section Tree / Layer Tree / Layout.
import { Component, useMemo, useRef, useState } from "react";
import { DesignFrame } from "./BoardItem.jsx";
import {
  buildTemplateFromRaw,
  buildLayerTreeFromRaw,
  renderMonthlyPlanTemplate,
  renderColorLabFromRaw,
  renderInfographicFromRaw,
} from "../renderer/pipeline";
import { toDesignDoc } from "../renderer/adapters/toDesignDoc";
import { normalizeMonthlyPlan } from "../renderer/normalize/monthlyPlan";
import MonthlyDocumentRenderer from "../renderer/document/MonthlyDocumentRenderer";
import { MonthlyInfographicRenderer } from "../renderer/infographic/MonthlyInfographicRenderer";
import { buildInfographicData } from "../renderer/infographic/buildInfographicData";
import { buildWeekCard, STYLE_PACKS, toInfographicStructure } from "../renderer/weekly/buildWeeklyTemplate";
import { toPng } from "html-to-image";
import sample from "../renderer/__fixtures__/monthlyPlan.sample.json";
// 새 파이프라인: 색채연구소 데이터 → 변환 → 설계도 → 편집 템플릿 → 에디터
import WeekCardEditor from "./WeekCardEditor";
import LayerPanel from "./LayerPanel";
import PropertyPanel from "./PropertyPanel";
import { sampleMonthlyPlan } from "../data/sampleMonthlyPlan";
import { transformMonthlyPlanToInfographic } from "../transformers/monthlyToInfographic";
import { buildWeekCardBlueprint } from "../blueprints/buildWeekCardBlueprint";
import { buildEditableWeekCardTemplate } from "../templates/buildEditableWeekCardTemplate";
import { buildWeekCardImagePrompt } from "../prompts/buildImagePrompt";
import { STYLE_PACKS as INFOGRAPHIC_PACKS, DEFAULT_STYLE_PACK } from "../styles/stylePacks";
import { exportNodeToPng } from "../utils/exportToPng";

// 편집(react-rnd) 경로 크래시 격리
class Boundary extends Component {
  constructor(p) {
    super(p);
    this.state = { err: null };
  }
  static getDerivedStateFromError(err) {
    return { err };
  }
  render() {
    if (this.state.err)
      return (
        <div style={{ padding: 16, color: "#b4452f", fontSize: 13 }}>
          렌더 오류: {String(this.state.err.message || this.state.err)}
        </div>
      );
    return this.props.children;
  }
}

const KIND_COLOR = {
  group: "#3f7d5f",
  text: "#3a6ea5",
  image: "#b06a36",
  shape: "#8a5aa0",
};

function Tag({ children, color = "#8a8078" }) {
  return (
    <span
      style={{
        background: color,
        color: "#fff",
        fontSize: 10,
        fontWeight: 700,
        borderRadius: 4,
        padding: "1px 6px",
        marginRight: 6,
      }}
    >
      {children}
    </span>
  );
}

// ── Layer Tree 아웃라인 (재귀, 클릭 → 선택) ──
function LayerNodeView({ node, depth, sel, onSelect }) {
  let brief = "";
  if (node.kind === "text") brief = JSON.stringify(node.text);
  else if (node.kind === "image")
    brief = `slot:${node.slot.role}/${node.slot.status}` + (node.slot.overlays ? ` · overlays ${node.slot.overlays.length}` : "");
  else if (node.kind === "shape") brief = node.shape || "";
  else if (node.kind === "group")
    brief = `${node.role || ""} ${node.direction || ""} · ${node.children.length} children`;
  if (brief.length > 64) brief = brief.slice(0, 64) + "…";

  const selected = sel === node.id;
  return (
    <div>
      <div
        onClick={() => onSelect(node.id)}
        style={{
          paddingLeft: 6 + depth * 18,
          fontFamily: "ui-monospace, monospace",
          fontSize: 12,
          lineHeight: 1.9,
          color: "#3f3833",
          whiteSpace: "nowrap",
          cursor: "pointer",
          borderRadius: 4,
          background: selected ? "#f1e3d6" : node.kind === "image" ? "#fbf1e8" : "transparent",
        }}
      >
        <Tag color={KIND_COLOR[node.kind]}>{node.kind}</Tag>
        <span style={{ color: "#a99", marginRight: 6 }}>{node.id}</span>
        <span style={{ color: "#6a6058" }}>{brief}</span>
      </div>
      {node.kind === "group" &&
        node.children.map((c) => (
          <LayerNodeView key={c.id} node={c} depth={depth + 1} sel={sel} onSelect={onSelect} />
        ))}
    </div>
  );
}

function findNode(node, id) {
  if (node.id === id) return node;
  if (node.kind === "group") {
    for (const c of node.children) {
      const f = findNode(c, id);
      if (f) return f;
    }
  }
  return null;
}

function Row({ k, v }) {
  if (v == null || v === "") return null;
  return (
    <div style={{ display: "flex", gap: 8, fontSize: 12, lineHeight: 1.7 }}>
      <span style={{ color: "#a99", minWidth: 84 }}>{k}</span>
      <span style={{ color: "#3f3833", wordBreak: "break-word" }}>{v}</span>
    </div>
  );
}

// ImageSlot 상세 — overlays 포함
function ImageSlotDetail({ slot }) {
  const ar = slot.aspectRatio;
  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
        🖼 ImageSlot <span style={{ color: "#a99", fontFamily: "monospace" }}>{slot.id}</span>
      </div>
      <Row k="role" v={slot.role} />
      <Row k="visualType" v={slot.visualType} />
      <Row k="status" v={slot.status} />
      <Row k="source" v={slot.source} />
      <Row k="style" v={slot.style} />
      <Row k="aspectRatio" v={ar ? `${ar.w}:${ar.h}${ar.preset ? ` (${ar.preset})` : ""}` : null} />
      <Row k="asset" v={slot.asset ? slot.asset.url : "없음 (미생성)"} />
      <Row k="placeholder" v={slot.placeholder?.label} />
      {slot.prompt && (
        <div style={{ marginTop: 8 }}>
          <div style={{ color: "#a99", fontSize: 12 }}>prompt</div>
          <div style={{ fontSize: 12, color: "#3f3833", background: "#faf7f2", padding: 8, borderRadius: 6 }}>
            “{slot.prompt.text}”
            <div style={{ color: "#8a8078", marginTop: 4 }}>
              style:{slot.prompt.style} · origin:{slot.prompt.origin}
            </div>
          </div>
        </div>
      )}
      <div style={{ marginTop: 10 }}>
        <div style={{ color: "#a99", fontSize: 12, marginBottom: 4 }}>
          overlays {slot.overlays ? `(${slot.overlays.length})` : "(없음)"}
        </div>
        {(slot.overlays || []).map((o) => (
          <div
            key={o.id}
            style={{
              fontSize: 12,
              fontFamily: "monospace",
              background: "#fff",
              border: "1px solid #e6ddd2",
              borderRadius: 6,
              padding: "5px 8px",
              marginBottom: 4,
            }}
          >
            <Tag color="#b06a36">{o.kind}</Tag>
            {o.kind === "text" && <span>“{o.text}”</span>}
            {o.kind === "icon" && <span>{o.icon}</span>}
            {o.kind === "shape" && <span>{o.shape}</span>}
            <span style={{ color: "#a99" }}>
              {" "}
              @ {o.anchor}
              {o.opacity != null ? ` · opacity ${o.opacity}` : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NodeDetail({ node }) {
  if (!node) return <div style={{ color: "#a99", fontSize: 13 }}>노드를 클릭하면 상세가 보여요</div>;
  if (node.kind === "image") return <ImageSlotDetail slot={node.slot} />;
  const { children, ...rest } = node;
  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
        <Tag color={KIND_COLOR[node.kind]}>{node.kind}</Tag>
        <span style={{ color: "#a99", fontFamily: "monospace" }}>{node.id}</span>
      </div>
      <pre style={{ margin: 0, fontSize: 11.5, lineHeight: 1.5, color: "#4a423b", whiteSpace: "pre-wrap" }}>
        {JSON.stringify(rest, null, 2)}
      </pre>
    </div>
  );
}

function LayerTreeView({ root }) {
  const [sel, setSel] = useState("basic_info-img0"); // 기본: hero 이미지 노드 선택
  const node = sel ? findNode(root, sel) : null;
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
      <div
        style={{
          flex: 1,
          minWidth: 0,
          background: "#fff",
          border: "1px solid #e6ddd2",
          borderRadius: 10,
          padding: "10px 8px",
          overflow: "auto",
          maxHeight: "70vh",
        }}
      >
        <LayerNodeView node={root} depth={0} sel={sel} onSelect={setSel} />
      </div>
      <div
        style={{
          width: 290,
          flexShrink: 0,
          background: "#fff",
          border: "1px solid #e6ddd2",
          borderRadius: 10,
          padding: 12,
          position: "sticky",
          top: 0,
          maxHeight: "70vh",
          overflow: "auto",
        }}
      >
        <NodeDetail node={node} />
      </div>
    </div>
  );
}

// ── Section Tree 뷰 ──
function SectionTreeView({ tree }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {tree.sections.map((n) => (
        <div
          key={n.id}
          style={{
            background: "#fff",
            border: "1px solid #e6ddd2",
            borderRadius: 10,
            padding: "10px 12px",
          }}
        >
          <div style={{ fontSize: 13, marginBottom: 6 }}>
            <Tag color="#d97757">{n.kind}</Tag>
            <b>{n.title}</b>{" "}
            <span style={{ color: "#a99", fontFamily: "monospace", fontSize: 11 }}>
              {n.id} · {n.role}
            </span>
          </div>
          <pre
            style={{
              margin: 0,
              maxHeight: 180,
              overflow: "auto",
              background: "#faf7f2",
              borderRadius: 6,
              padding: 8,
              fontSize: 11,
              lineHeight: 1.5,
              color: "#4a423b",
            }}
          >
            {JSON.stringify(n.section, null, 2)}
          </pre>
        </div>
      ))}
    </div>
  );
}

// 추천 테마(배경 프레임) 목록
const FRAME_LIST = [
  "/assets/frames/default.png",
  ...Array.from({ length: 13 }, (_, i) => `/assets/frames/bg-${String(i + 1).padStart(2, "0")}.png`),
];

// ── Layout 뷰 (DesignFrame + 템플릿 전환 + 편집/추천테마) ──
function LayoutView({ docs }) {
  const [tpl, setTpl] = useState("colorlab");
  const [edit, setEdit] = useState(true); // 편집 기본 ON
  const [edited, setEdited] = useState({}); // tpl 별 편집본
  const [saved, setSaved] = useState(false);
  const doc = edited[tpl] || docs[tpl];
  const onChange = (patch) => setEdited((p) => ({ ...p, [tpl]: { ...doc, ...patch } }));
  const save = () => {
    const a = document.activeElement;
    if (a && typeof a.blur === "function") a.blur();
    // 편집본 확정 (없으면 현재 doc 을 편집본으로 저장)
    setEdited((p) => ({ ...p, [tpl]: p[tpl] || doc }));
    setSaved(true);
    setTimeout(() => setSaved(false), 1400);
  };

  const hasFrame = doc.elements.some((e) => e.id === "page-frame");
  const cycleTheme = () => {
    const cur = doc.elements.find((e) => e.id === "page-frame")?.src;
    const idx = Math.max(0, FRAME_LIST.indexOf(cur));
    const next = FRAME_LIST[(idx + 1) % FRAME_LIST.length];
    onChange({ elements: doc.elements.map((e) => (e.id === "page-frame" ? { ...e, src: next } : e)) });
  };

  const STAGE_W = 720;
  const scale = STAGE_W / doc.frame.w;
  const stageH = Math.ceil(doc.frame.h * scale);
  const btn = (active) => ({
    padding: "5px 12px",
    borderRadius: 8,
    border: "1px solid #d8c9bb",
    background: active ? "#d97757" : "#fff",
    color: active ? "#fff" : "#3f3833",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  });
  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center", flexWrap: "wrap" }}>
        {[
          { k: "default", label: "기본" },
          { k: "colorlab", label: "킨더랩" },
          { k: "infographic", label: "이미지(인포그래픽)" },
        ].map((o) => (
          <button key={o.k} onClick={() => setTpl(o.k)} style={btn(tpl === o.k)}>
            {o.label}
          </button>
        ))}
        {hasFrame && (
          <button onClick={cycleTheme} style={{ ...btn(false), border: "1px solid #c9a26a", background: "#fff7ec" }}>
            🎨 추천 테마
          </button>
        )}
        <span style={{ color: "#a99", fontSize: 11 }}>
          {doc.frame.w}×{doc.frame.h} · elements {doc.elements.length}
        </span>
        <button
          onClick={save}
          style={{ ...btn(false), marginLeft: "auto", border: "none", background: saved ? "#4f9d69" : "#d97757", color: "#fff" }}
        >
          {saved ? "저장됨 ✓" : "저장"}
        </button>
        <button onClick={() => setEdit((v) => !v)} style={{ ...btn(false), background: edit ? "#3f3833" : "#fff", color: edit ? "#fff" : "#3f3833" }}>
          {edit ? "편집 ON" : "편집 켜기"}
        </button>
      </div>
      <div
        style={{
          width: STAGE_W,
          height: stageH,
          background: "#fff",
          borderRadius: 12,
          boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
          overflow: "visible",
        }}
      >
        <Boundary key={tpl + (edit ? "-edit" : "")}>
          <DesignFrame data={doc} selected={edit} zoom={1} onChange={onChange} />
        </Boundary>
      </div>
    </div>
  );
}

// ── 문서 뷰 (전통 표 양식 + 영역별 인라인 편집) ──
function DocumentView({ sample }) {
  const [edit, setEdit] = useState(true); // 편집 기본 ON
  const [edits, setEdits] = useState({});
  const [saved, setSaved] = useState(false);
  const vm = useMemo(() => normalizeMonthlyPlan(sample), [sample]);
  const save = () => {
    const a = document.activeElement;
    if (a && typeof a.blur === "function") a.blur();
    setSaved(true);
    setTimeout(() => setSaved(false), 1400);
  };
  const btn = {
    padding: "5px 12px",
    borderRadius: 8,
    border: "1px solid #d8c9bb",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  };
  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
        <span style={{ color: "#a99", fontSize: 11 }}>
          편집을 켜면 각 칸을 클릭해 영역별로 수정할 수 있어요
        </span>
        <button
          onClick={save}
          style={{ ...btn, marginLeft: "auto", border: "none", background: saved ? "#4f9d69" : "#d97757", color: "#fff" }}
        >
          {saved ? "저장됨 ✓" : "저장"}
        </button>
        <button
          onClick={() => setEdit((v) => !v)}
          style={{ ...btn, background: edit ? "#3f3833" : "#fff", color: edit ? "#fff" : "#3f3833" }}
        >
          {edit ? "편집 ON" : "편집 켜기"}
        </button>
      </div>
      <div style={{ background: "#fff", padding: 16, overflow: "auto", borderRadius: 10 }}>
        <MonthlyDocumentRenderer
          vm={vm}
          editable={edit}
          edits={edits}
          onEditField={(field, value) => setEdits((p) => ({ ...p, [field]: value }))}
        />
      </div>
    </div>
  );
}

// ── 인포그래픽 Preview 뷰 (월안 → MonthlyInfographicData → Preview) ──
function InfographicView({ sample }) {
  const data = useMemo(() => buildInfographicData(normalizeMonthlyPlan(sample)), [sample]);
  return (
    <div style={{ background: "#fff", padding: 16, overflow: "auto", borderRadius: 10 }}>
      <MonthlyInfographicRenderer data={data} />
    </div>
  );
}

// ── WeekCard 편집 (월안 → InfographicStructure → StylePack → 편집 → PNG Export) ──
function WeeklyTemplateView({ sample }) {
  const vm = useMemo(() => normalizeMonthlyPlan(sample), [sample]);
  const ig = useMemo(() => toInfographicStructure(vm), [vm]); // InfographicStructure
  const weeks = ig.weeklyFlow.length || 4;
  const [week, setWeek] = useState(0);
  const [packId, setPackId] = useState(STYLE_PACKS[0].id);
  const [edited, setEdited] = useState({});
  const [exporting, setExporting] = useState(false);
  const [saved, setSaved] = useState(false);
  const stageRef = useRef(null);

  const pack = STYLE_PACKS.find((p) => p.id === packId) || STYLE_PACKS[0];
  const editKey = week + "-" + packId;
  const baseDoc = useMemo(() => buildWeekCard(ig, week, pack), [ig, week, pack]);
  const doc = edited[editKey] || baseDoc;
  const onChange = (patch) => setEdited((p) => ({ ...p, [editKey]: { ...doc, ...patch } }));

  // 배경색 수정 (페이지 배경 element + frame.bg 동시 변경)
  const setBg = (color) =>
    onChange({
      frame: { ...doc.frame, bg: color },
      elements: doc.elements.map((e) => (e.id === "page" ? { ...e, style: { ...e.style, bg: color } } : e)),
    });
  const BG_SWATCHES = ["#FBF7FB", "#F1FAF5", "#F2F4FF", "#FFFBF0", "#FFF6F2", "#EAF6FF", "#FFF0F4", "#F4F0FA"];

  const STAGE_W = 540;
  const scale = STAGE_W / doc.frame.w;
  const stageH = Math.ceil(doc.frame.h * scale);

  const exportPng = async () => {
    setExporting(true);
    // 편집 핸들/외곽선 없이(static) 캡처되도록 한 프레임 대기
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const node = stageRef.current?.querySelector(".dframe");
    if (!node) { setExporting(false); return; }
    try {
      const url = await toPng(node, {
        style: { transform: "none", transformOrigin: "top left", margin: "0" },
        width: doc.frame.w,
        height: doc.frame.h,
        pixelRatio: 2,
        backgroundColor: doc.frame.bg,
        cacheBust: true,
        skipFonts: true, // 외부(Google) 폰트 임베드 시도 → cross-origin 에러 방지
      });
      const a = document.createElement("a");
      a.href = url;
      a.download = `${doc.title || "주간템플릿"}.png`;
      a.click();
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (e) {
      console.warn("PNG export 실패:", e);
    }
    setExporting(false);
  };

  const btn = (active) => ({
    padding: "5px 12px",
    borderRadius: 8,
    border: "1px solid #d8c9bb",
    background: active ? "#d97757" : "#fff",
    color: active ? "#fff" : "#3f3833",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  });

  return (
    <div>
      {/* 주차 선택 */}
      <div style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "center", flexWrap: "wrap" }}>
        {Array.from({ length: weeks }, (_, i) => (
          <button key={i} onClick={() => setWeek(i)} style={btn(week === i)}>
            {ig.weeklyFlow[i]?.week || `${i + 1}주차`}
          </button>
        ))}
        <button
          onClick={exportPng}
          disabled={exporting}
          style={{ ...btn(false), marginLeft: "auto", border: "none", background: saved ? "#4f9d69" : "#6a5acd", color: "#fff" }}
        >
          {exporting ? "내보내는 중…" : saved ? "저장됨 ✓" : "PNG 내보내기 ↓"}
        </button>
      </div>
      {/* StylePack 선택 */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ color: "#a99", fontSize: 11 }}>스타일팩</span>
        {STYLE_PACKS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPackId(p.id)}
            style={{ ...btn(packId === p.id), background: packId === p.id ? p.ink : "#fff", borderColor: p.ink, color: packId === p.id ? "#fff" : p.ink }}
          >
            {p.name}
          </button>
        ))}
      </div>
      {/* 배경색 수정 */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ color: "#a99", fontSize: 11 }}>배경색</span>
        {BG_SWATCHES.map((c) => (
          <button
            key={c}
            onClick={() => setBg(c)}
            title={c}
            style={{ width: 22, height: 22, borderRadius: 6, border: doc.frame.bg === c ? "2px solid #d97757" : "1px solid #ddd", background: c, cursor: "pointer", padding: 0 }}
          />
        ))}
        <span style={{ color: "#a99", fontSize: 11, marginLeft: 4 }}>· 텍스트=더블클릭, 이미지=클릭→패널 갤러리, 도형=클릭→색상</span>
      </div>
      <div
        ref={stageRef}
        style={{ width: STAGE_W, height: stageH, background: "#fff", borderRadius: 12, boxShadow: "0 4px 24px rgba(0,0,0,0.08)", overflow: "visible" }}
      >
        <Boundary key={editKey + (exporting ? "-x" : "")}>
          <DesignFrame data={doc} selected={!exporting} zoom={1} onChange={onChange} />
        </Boundary>
      </div>
    </div>
  );
}

// ── 카드 에디터 뷰 (색채연구소 → 편집 템플릿 → LayerPanel + Canvas + PropertyPanel) ──
function CardEditorView() {
  const build = (packId) => {
    const ig = transformMonthlyPlanToInfographic(sampleMonthlyPlan);
    const pack = INFOGRAPHIC_PACKS.find((p) => p.id === packId) || DEFAULT_STYLE_PACK;
    const week = ig.weeks[0];
    const bp = buildWeekCardBlueprint(week, pack);
    return { tpl: buildEditableWeekCardTemplate(bp, week), prompt: buildWeekCardImagePrompt(bp, week) };
  };
  const [packId, setPackId] = useState(DEFAULT_STYLE_PACK.id);
  const [built, setBuilt] = useState(() => build(DEFAULT_STYLE_PACK.id));
  const [layers, setLayers] = useState(() => built.tpl.layers);
  const [selectedId, setSelectedId] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [exporting, setExporting] = useState(false);
  const stageRef = useRef(null);

  const exportPng = async () => {
    if (!stageRef.current) return;
    setExporting(true);
    setSelectedId(null); // 편집 chrome(아웃라인/입력창) 제거 후 캡처
    // 선택 해제 반영을 위해 두 프레임 대기
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    try {
      await exportNodeToPng(stageRef.current, {
        fileName: built.tpl.name,
        width: 1200,
        backgroundColor: template.background.color,
      });
    } catch (e) {
      console.warn("PNG 저장 실패:", e);
    }
    setExporting(false);
  };

  const choosePack = (id) => {
    setPackId(id);
    const b = build(id);
    setBuilt(b);
    setLayers(b.tpl.layers);
    setSelectedId(null);
  };
  const updateLayer = (id, patch) =>
    setLayers((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const template = { ...built.tpl, layers };
  const selected = layers.find((l) => l.id === selectedId) || null;

  const btn = (active) => ({
    padding: "5px 12px",
    borderRadius: 8,
    border: "1px solid #d8c9bb",
    background: active ? "#d97757" : "#fff",
    color: active ? "#fff" : "#3f3833",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  });

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 12, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ color: "#a99", fontSize: 11 }}>스타일팩</span>
        {INFOGRAPHIC_PACKS.map((p) => (
          <button key={p.id} onClick={() => choosePack(p.id)} style={btn(packId === p.id)}>
            {p.name}
          </button>
        ))}
        <button onClick={() => setShowPrompt((v) => !v)} style={{ ...btn(showPrompt), marginLeft: "auto" }}>
          {showPrompt ? "프롬프트 숨기기" : "이미지 프롬프트 보기"}
        </button>
        <button onClick={exportPng} disabled={exporting} style={{ ...btn(false), border: "none", background: "#6a5acd", color: "#fff" }}>
          {exporting ? "저장 중…" : "PNG로 저장 ↓"}
        </button>
      </div>
      {showPrompt && (
        <pre style={{ whiteSpace: "pre-wrap", background: "#fff", border: "1px solid #e6ddd2", borderRadius: 8, padding: 12, fontSize: 12, lineHeight: 1.6, color: "#4a423b", marginBottom: 12 }}>
          {built.prompt}
        </pre>
      )}
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div style={{ width: 210, flexShrink: 0 }}>
          <LayerPanel layers={layers} selectedId={selectedId} onSelect={setSelectedId} />
        </div>
        <WeekCardEditor
          ref={stageRef}
          template={template}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onUpdateLayer={updateLayer}
          width={460}
        />
        <div style={{ width: 230, flexShrink: 0 }}>
          <PropertyPanel layer={selected} onUpdateLayer={updateLayer} />
        </div>
      </div>
    </div>
  );
}

const TABS = [
  { key: "section", label: "① Section Tree" },
  { key: "layer", label: "② Layer Tree" },
  { key: "layout", label: "③ Layout" },
  { key: "document", label: "④ 문서" },
  { key: "infographic", label: "⑤ 인포그래픽" },
  { key: "weekly", label: "⑥ 주간 템플릿" },
  { key: "editor", label: "⑦ 카드 에디터" },
];

export default function RendererPreview() {
  const { tree, layerTree, docs, stats } = useMemo(() => {
    const tree = buildTemplateFromRaw(sample);
    const layerTree = buildLayerTreeFromRaw(sample);
    const docs = {
      default: toDesignDoc(renderMonthlyPlanTemplate(sample), "월간 놀이계획"),
      colorlab: toDesignDoc(renderColorLabFromRaw(sample), "킨더랩 월안"),
      infographic: toDesignDoc(renderInfographicFromRaw(sample), "인포그래픽 월안"),
    };
    const counts = { text: 0, image: 0, shape: 0, group: 0 };
    const walk = (n) => {
      counts[n.kind]++;
      if (n.kind === "group") n.children.forEach(walk);
    };
    walk(layerTree.root);
    return {
      tree,
      layerTree,
      docs,
      stats: { sections: tree.sections.length, elements: docs.default.elements.length, counts },
    };
  }, []);

  const [tab, setTab] = useState("section");

  return (
    <div
      style={{
        height: "100vh",
        overflow: "auto",
        background: "#efe9e0",
        padding: 28,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth: tab === "editor" ? 980 : 760, margin: "0 auto" }}>
        <h2 style={{ margin: "0 0 4px", color: "#3f3833", fontSize: 18 }}>
          월안 Template Renderer — 스테이지 인스펙터
        </h2>
        <p style={{ margin: "0 0 14px", color: "#8a8078", fontSize: 12.5 }}>
          normalize → <b>buildMonthlyTemplate</b>(Section {stats.sections}) →{" "}
          <b>buildLayerTree</b>(text {stats.counts.text}·image {stats.counts.image}·shape{" "}
          {stats.counts.shape}·group {stats.counts.group}) → <b>layoutTemplate</b>(elements{" "}
          {stats.elements})
        </p>

        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: "6px 14px",
                borderRadius: 8,
                border: "1px solid #d8c9bb",
                background: tab === t.key ? "#3f3833" : "#fff",
                color: tab === t.key ? "#fff" : "#3f3833",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "section" && <SectionTreeView tree={tree} />}
        {tab === "layer" && <LayerTreeView root={layerTree.root} />}
        {tab === "layout" && <LayoutView docs={docs} />}
        {tab === "document" && (
          <Boundary>
            <DocumentView sample={sample} />
          </Boundary>
        )}
        {tab === "infographic" && (
          <Boundary>
            <InfographicView sample={sample} />
          </Boundary>
        )}
        {tab === "weekly" && (
          <Boundary>
            <WeeklyTemplateView sample={sample} />
          </Boundary>
        )}
        {tab === "editor" && (
          <Boundary>
            <CardEditorView />
          </Boundary>
        )}
      </div>
    </div>
  );
}
