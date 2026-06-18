// 개발용 스테이지 인스펙터: 월안 Template Renderer 파이프라인을 단계별로 확인.
// URL ?render=monthly. 탭: Section Tree / Layer Tree / Layout.
import { Component, useMemo, useState } from "react";
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
import sample from "../renderer/__fixtures__/monthlyPlan.sample.json";

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

const TABS = [
  { key: "section", label: "① Section Tree" },
  { key: "layer", label: "② Layer Tree" },
  { key: "layout", label: "③ Layout" },
  { key: "document", label: "④ 문서" },
  { key: "infographic", label: "⑤ 인포그래픽" },
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
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
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
      </div>
    </div>
  );
}
