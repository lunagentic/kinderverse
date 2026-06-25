import { useCallback, useEffect, useRef, useState } from "react";
import Board from "./components/Board.jsx";
import ChatPanel from "./components/ChatPanel.jsx";
import RendererPreview from "./components/RendererPreview.jsx";
import WeekCardBlueprintTest from "./pages/WeekCardBlueprintTest";
import { buildPosterWeekCard, weekOverridesFromMonthly, RICH_W, RICH_H } from "./templates/buildPosterWeekCard";
import { getAsset, getAssetSmart, descriptorFor } from "./utils/assetLibrary";
import {
  renderMonthlyPlanTemplate,
  renderColorLabFromRaw,
  renderInfographicFromRaw,
} from "./renderer/pipeline";
import { toDesignDoc } from "./renderer/adapters/toDesignDoc";
import { CanvasEditor } from "./editor/CanvasEditor";
import { editorDocToDesignDoc } from "./editor/blueprintToDoc";
import "./board.css";

// 여러 디자인 문서를 가로로 나란히 합쳐 하나의 DesignDoc 으로 (한번에 보기)
function combineDocs(docs, labels) {
  const GAP = 60;
  const LABEL_H = 44;
  const elements = [];
  let x = 0;
  let maxH = 0;
  docs.forEach((dd, i) => {
    elements.push({
      id: `lbl${i}`, type: "text", x, y: 4, w: dd.frame.w, h: 32,
      text: labels[i], style: { fontSize: 24, weight: 800, color: "#3f3833", align: "center" },
    });
    elements.push({
      id: `bg${i}`, type: "shape", x, y: LABEL_H, w: dd.frame.w, h: dd.frame.h,
      style: { bg: dd.frame.bg, radius: 12 },
    });
    dd.elements.forEach((el) => {
      elements.push({ ...el, id: `c${i}-${el.id}`, x: el.x + x, y: el.y + LABEL_H });
    });
    x += dd.frame.w + GAP;
    maxH = Math.max(maxH, dd.frame.h);
  });
  return {
    output_type: "DesignDoc",
    title: "월안 한번에 보기",
    frame: { w: x - GAP, h: maxH + LABEL_H, bg: "#EFE9E0" },
    elements,
  };
}

// 개발용 진입점: ?render=monthly → 월안 Template Renderer 미리보기
const RENDER_PREVIEW =
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("render") === "monthly";

// 개발용 진입점: ?render=weekcard → 1주차 WeekCard 설계도 테스트 페이지
const WEEKCARD_TEST =
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("render") === "weekcard";

// Phase 4: ?editor=1 → 캔버스 디자인 에디터 (monthly_plan_v1 / 여름이 왔어요)
const EDITOR_MODE =
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).has("editor");

let idCounter = 1;
// 카운터 + 랜덤 접미사 → HMR/리로드로 카운터가 리셋돼도 기존 아이템과 ID 충돌 방지
const nextId = () => `item-${idCounter++}-${Math.random().toString(36).slice(2, 7)}`;

// 기존 카드와 겹치지 않는 빈 위치 탐색 (시작점 → 우/하단으로 밀기)
const rectsOverlap = (a, b) =>
  a.x < b.x + b.w + 24 && a.x + a.w + 24 > b.x && a.y < b.y + b.h + 24 && a.y + a.h + 24 > b.y;
function findFreeSpot(placed, w, h, x0, y0) {
  let x = x0, y = y0, tries = 0;
  while (placed.some((it) => rectsOverlap({ x, y, w, h }, it)) && tries < 600) {
    x += 60;
    if (x > x0 + 1400) { x = x0; y += 60; }
    tries++;
  }
  return { x, y };
}

// 객체/배열 → 읽기 좋은 텍스트 (변환 입력용)
const SKIP_KEYS = new Set([
  "output_type",
  "feature_id",
  "plan_type",
  "notice_type",
  "audience",
  "source",
  "handoff",
]);
function valueToText(v, depth = 0) {
  const pad = "  ".repeat(depth);
  if (v == null || v === "") return "";
  if (Array.isArray(v)) {
    return v
      .map((x) =>
        x && typeof x === "object" ? valueToText(x, depth) : `${pad}- ${x}`
      )
      .filter(Boolean)
      .join("\n");
  }
  if (typeof v === "object") {
    return Object.entries(v)
      .filter(([k, val]) => !SKIP_KEYS.has(k) && val != null && val !== "")
      .map(([k, val]) => {
        const inner = valueToText(val, depth + 1);
        if (!inner) return "";
        return typeof val === "object"
          ? `${pad}${k}:\n${inner}`
          : `${pad}${k}: ${val}`;
      })
      .filter(Boolean)
      .join("\n");
  }
  return `${pad}${v}`;
}

// 보드 카드 → { title, content } (변환 요청용)
function cardToContent(item) {
  const d = item.data || {};
  if (item.type === "document") return { title: d.title || "문서", content: d.body || "" };
  if (item.type === "image") return { title: d.alt || "이미지", content: d.alt || "" };
  if (item.type === "design")
    return { title: d.title || "디자인", content: [d.subtitle, ...(d.points || [])].filter(Boolean).join("\n") };
  if (item.type === "designdoc") {
    const texts = (d.elements || []).filter((e) => e.type === "text").map((e) => e.text);
    return { title: d.title || texts[0] || "디자인", content: texts.join("\n") };
  }
  if (item.type === "plan") {
    const p = d.payload || {};
    // 놀이기록: 이미지(포스터) 생성용 깔끔한 텍스트 (제목·소개·놀이흐름·배움·지원)
    if (d.feature_id === "play_story") {
      const acts = (p.activities || [])
        .map((a) => `- ${a.title || ""}${a.summary ? `: ${a.summary}` : ""}`.trim())
        .filter((x) => x !== "-");
      const content = [
        p.introduction?.text,
        acts.length ? `놀이 흐름:\n${acts.join("\n")}` : "",
        p.learning?.text ? `놀이 속 배움: ${p.learning.text}` : "",
        p.teacherSupport?.text ? `교사의 지원: ${p.teacherSupport.text}` : "",
      ].filter(Boolean).join("\n");
      return { title: d.title || p.header?.title || "놀이기록", content };
    }
    // 놀이아이디어는 깔끔한 문장으로 추출
    if (Array.isArray(p.ideas) && p.ideas[0]) {
      const idea = p.ideas[0];
      const lines = [
        idea.intro,
        (idea.materials || []).length ? `놀이재료: ${idea.materials.join(", ")}` : "",
        ...(idea.method || []),
        ...(idea.tips || []),
      ].filter(Boolean);
      return { title: idea.title || d.title || "놀이", content: lines.join("\n") };
    }
    return { title: d.title || "계획", content: valueToText(p) };
  }
  return { title: d.title || "카드", content: "" };
}

export default function App() {
  if (WEEKCARD_TEST) return <WeekCardBlueprintTest />;
  if (RENDER_PREVIEW) return <RendererPreview />;
  if (EDITOR_MODE)
    return (
      <CanvasEditor
        input={{ type: "monthly_plan", theme: "여름이 왔어요", age: "3~5세", month: "6월" }}
        onClose={() => { window.location.search = ""; }}
      />
    );
  return <Workspace />;
}

// 보드 영속화 — items 를 localStorage 에 저장/복원 (새로고침·재방문 후에도 유지)
const BOARD_KEY = "verse:board";
function loadBoard() {
  try {
    const raw = localStorage.getItem(BOARD_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function Workspace() {
  const [items, setItems] = useState(loadBoard);

  // items 변경 시마다 자동 저장. 사진 dataURL 이 커서 용량 초과할 수 있으므로 실패는 경고만.
  useEffect(() => {
    try {
      localStorage.setItem(BOARD_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn("보드 저장 실패(브라우저 저장 용량 초과 가능):", e);
    }
  }, [items]);
  const [editorInput, setEditorInput] = useState(null); // 캔버스 디자인 에디터(Phase 4/5) 입력
  const [selectedIds, setSelectedIds] = useState([]); // 복수 선택
  const setSelectedId = (id) => setSelectedIds(id == null ? [] : [id]);
  // Shift 등으로 추가 선택 토글
  const selectItem = useCallback((id, additive) => {
    if (id == null) return setSelectedIds([]);
    setSelectedIds((prev) =>
      additive ? (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]) : [id]
    );
  }, []);
  const clipboard = useRef([]);
  const [chatOpen, setChatOpen] = useState(false); // 모바일 채팅 시트 토글
  const [cardEditorOpen, setCardEditorOpen] = useState(false); // 주간 카드 편집기 인앱 오버레이
  const [editorRich, setEditorRich] = useState(false); // ✏️ 리치 편집: 월안 1주차를 똑같이 재현(편집 가능)
  const [editingItemId, setEditingItemId] = useState(null); // 편집 중인 weekcard 보드 아이템
  const [editorInitial, setEditorInitial] = useState(null); // 편집기 초기 template (보드 아이템에서 열 때)
  // 화면 좌표 = 보드 좌표 * zoom + pan
  const [viewport, setViewport] = useState({ panX: 0, panY: 0, zoom: 1 });
  const boardRef = useRef(null);

  // 현재 보이는 화면 중앙의 보드 좌표
  const viewCenter = useCallback(() => {
    const el = boardRef.current;
    const rect = el?.getBoundingClientRect() ?? { width: 900, height: 700 };
    return {
      cx: (rect.width / 2 - viewport.panX) / viewport.zoom,
      cy: (rect.height / 2 - viewport.panY) / viewport.zoom,
    };
  }, [viewport]);

  const toItem = (g, x, y) => {
    const size = g.size ?? { w: 300, h: 220 };
    return {
      id: nextId(),
      type: g.type,
      data: g.data,
      x: x - size.w / 2,
      y: y - size.h / 2,
      w: size.w,
      h: size.h,
    };
  };

  // 생성 결과(배열) 배치 — 1개면 중앙 계단식, 여러 개면 격자로 나눠서 배치
  const addGenerated = useCallback(
    (generatedList) => {
      const list = Array.isArray(generatedList) ? generatedList : [generatedList];
      if (!list.length) return;
      const { cx, cy } = viewCenter();

      setItems((prev) => {
        const placed = [...prev];
        const created = list.map((g) => {
          const size = g.size ?? { w: 300, h: 220 };
          const { x, y } = findFreeSpot(placed, size.w, size.h, cx - size.w / 2, cy - size.h / 2);
          const it = { id: nextId(), type: g.type, data: g.data, x, y, w: size.w, h: size.h };
          placed.push(it);
          return it;
        });
        return [...prev, ...created];
      });
      setSelectedId(null);
      setChatOpen(false); // 모바일: 생성 후 보드로 돌아가기
    },
    [viewCenter]
  );

  const updateItem = useCallback((id, patch) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...patch } : it))
    );
  }, []);

  const updateItemData = useCallback((id, dataPatch) => {
    setItems((prev) =>
      prev.map((it) =>
        it.id === id ? { ...it, data: { ...it.data, ...dataPatch } } : it
      )
    );
  }, []);

  const removeItem = useCallback((id) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
    setSelectedIds((prev) => prev.filter((x) => x !== id));
  }, []);

  // 🧩 → 그 월안의 1·2주 카드 생성. 각 카드 그림 = 놀이명들을 "한 장면으로 조합한" LLM 그림(포스터 스타일 레퍼런스).
  const placeWeekCardsFrom = useCallback(async (monthly) => {
    const overrides = monthly ? weekOverridesFromMonthly(monthly.data) : [];
    const weeks = (overrides.length ? overrides : [null]).slice(0, 2); // 1주 & 2주
    const w = 360, h = Math.round((360 * RICH_H) / RICH_W);
    const baseX = monthly ? monthly.x + monthly.w + 32 : 80;
    const baseY = monthly ? monthly.y : 80;
    const ref = (itemsRef.current.find((it) => it.type === "infographic" && it.data?.src)?.data?.src) || null;
    const created = weeks.map((ov, i) => ({
      id: nextId(), type: "weekcard",
      data: { weekIndex: i, override: ov || null, template: buildPosterWeekCard(i, ov || undefined) },
      x: baseX + i * (w + 24), y: baseY, w, h,
    }));
    setItems((prev) => [...prev, ...created]);
    for (let i = 0; i < weeks.length; i++) {
      const ov = weeks[i];
      const decoKind = (ov && ov.decoKind) || "corner-sparkle";
      try {
        if (ov) {
          // 놀이명들을 조합한 LLM 그림 1개
          const cacheId = String(ov.title || `week${i}`).replace(/\s+/g, "").slice(0, 24);
          const { src } = await getAssetSmart(cacheId, ov.title, ov.playNames || [], ref);
          await getAsset(descriptorFor("decoration", decoKind));
          updateItemData(created[i].id, { template: buildPosterWeekCard(i, { ...ov, illoSrc: src }) });
        } else {
          await getAsset(descriptorFor("illustration", "sun"));
          updateItemData(created[i].id, { template: buildPosterWeekCard(i, undefined) });
        }
      } catch (e) {
        // LLM/생성 실패 → 키워드 kind 폴백
        try {
          const k = (ov && ov.illos && ov.illos[0]) || "sun";
          await getAsset(descriptorFor("illustration", k));
          await getAsset(descriptorFor("decoration", decoKind));
          updateItemData(created[i].id, { template: buildPosterWeekCard(i, ov || undefined) });
        } catch (e2) { /* skip */ }
      }
    }
  }, [updateItemData]);

  // weekcard 아이템 "편집하기" → 편집기를 그 아이템의 template/주차로 열기
  const editCard = useCallback((item) => {
    setEditingItemId(item.id);
    setEditorInitial({ template: item.data?.template || null, week: item.data?.weekIndex || 0, override: item.data?.override || null });
    setEditorRich(true);
    setCardEditorOpen(true);
  }, []);

  // 최신 items / selectedIds 를 ref 로 추적 (키보드 핸들러용)
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const selRef = useRef(selectedIds);
  selRef.current = selectedIds;

  const removeSelected = useCallback(() => {
    const sel = selRef.current;
    if (!sel.length) return;
    setItems((prev) => prev.filter((it) => !sel.includes(it.id)));
    setSelectedIds([]);
  }, []);

  // 선택 아이템 전체를 delta 만큼 이동(그룹 드래그용)
  const moveSelectedBy = useCallback((ids, dx, dy) => {
    setItems((prev) => prev.map((it) => (ids.includes(it.id) ? { ...it, x: it.x + dx, y: it.y + dy } : it)));
  }, []);

  const copySelected = useCallback(() => {
    const sel = selRef.current;
    clipboard.current = itemsRef.current.filter((it) => sel.includes(it.id)).map((it) => ({ ...it }));
  }, []);

  const pasteClipboard = useCallback(() => {
    const buf = clipboard.current;
    if (!buf || !buf.length) return;
    const created = buf.map((it) => ({ ...it, id: nextId(), x: it.x + 28, y: it.y + 28 }));
    setItems((prev) => [...prev, ...created]);
    setSelectedIds(created.map((c) => c.id));
    clipboard.current = created.map((c) => ({ ...c })); // 연속 붙여넣기 시 누적 오프셋
  }, []);

  const duplicateSelected = useCallback(() => {
    const sel = selRef.current;
    const created = itemsRef.current
      .filter((it) => sel.includes(it.id))
      .map((it) => ({ ...it, id: nextId(), x: it.x + 28, y: it.y + 28 }));
    if (!created.length) return;
    setItems((prev) => [...prev, ...created]);
    setSelectedIds(created.map((c) => c.id));
  }, []);

  // 전역 단축키: 복사(⌘/Ctrl+C) · 붙여넣기(V) · 복제(D) · 삭제(Delete/Backspace)
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      if (/^(INPUT|TEXTAREA)$/.test(t.tagName) || t.isContentEditable) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "c") { copySelected(); }
      else if (mod && e.key.toLowerCase() === "v") { e.preventDefault(); pasteClipboard(); }
      else if (mod && e.key.toLowerCase() === "d") { e.preventDefault(); duplicateSelected(); }
      else if (e.key === "Delete" || e.key === "Backspace") { removeSelected(); }
      else if (e.key === "Escape") { setSelectedIds([]); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [copySelected, pasteClipboard, duplicateSelected, removeSelected]);

  // 카드 → 문서/이미지/디자인 템플릿 변환 (원본 옆에 배치)
  const convertCard = useCallback(async (item, format, opts = {}) => {
    // 월안 → 디자인 문서(클라이언트 렌더). 생성 즉시 선택 → 편집 가능.
    // 새 카드는 기존 카드들의 가장 오른쪽 끝 다음에 배치(겹치지 않게)
    const rightOf = (prev, W) => {
      const right = prev.reduce((m, it) => Math.max(m, it.x + it.w), item.x + item.w);
      return { x: right + 40, y: item.y, w: W };
    };

    const addDesignDoc = (designDoc, W) => {
      const h = Math.round((W * designDoc.frame.h) / designDoc.frame.w);
      const id = nextId();
      setItems((prev) => {
        const pos = rightOf(prev, W);
        return [...prev, { id, type: "designdoc", data: designDoc, x: pos.x, y: pos.y, w: W, h }];
      });
      setSelectedId(id);
    };

    // 월안 "문서": 전통적 표 형식 A4 문서 (클라이언트 렌더, monthlydoc 카드)
    if (format === "document" && item.data?.feature_id === "monthly_plan") {
      const payload = item.data?.payload;
      if (!payload) return;
      const W = 480;
      const h = Math.round((W * 297) / 210); // A4 세로 비율
      const id = nextId();
      setItems((prev) => {
        const pos = rightOf(prev, W);
        return [
          ...prev,
          {
            id,
            type: "monthlydoc",
            data: { payload, title: item.data?.title || "월간계획안" },
            x: pos.x,
            y: pos.y,
            w: W,
            h,
          },
        ];
      });
      setSelectedId(id);
      return;
    }

    // 월안 "편집 템플릿"(Phase 5): 실제 월안 JSON → DesignRecipe → Blueprint → 보드 위 편집 가능 카드
    if (format === "editTemplate" && item.data?.feature_id === "monthly_plan") {
      const payload = item.data?.payload;
      const b = payload?.basic_info || {};
      const designDoc = editorDocToDesignDoc({
        type: "monthly_plan",
        theme: b.theme || item.data?.title || "월간 놀이계획",
        age: b.age_band || "",
        month: b.period?.label || "",
        payload,
      });
      addDesignDoc(designDoc, 480); // 보드에 편집 가능한 카드로 배치 (요소별 클릭 편집)
      return;
    }

    // 월안 "이미지": 인포그래픽 포스터 1장 (월안 → gpt-image → 이미지)
    // format "image" = v1, "imageV2" = v2 (프롬프트 버전만 다름)
    if ((format === "image" || format === "imageV2") && item.data?.feature_id === "monthly_plan") {
      const payload = item.data?.payload;
      if (!payload) return;
      const version = format === "imageV2" ? 2 : 1;
      const W = 480;
      const h = Math.round((W * 297) / 210); // A4 세로 비율
      const id = nextId();
      // 1) 생성 중 카드 즉시 표시
      setItems((prev) => {
        const pos = rightOf(prev, W);
        return [
          ...prev,
          { id, type: "infographic", data: { payload, version, src: null, loading: true, title: `${item.data?.title || "인포그래픽"} v${version}` }, x: pos.x, y: pos.y, w: W, h },
        ];
      });
      setSelectedId(id);
      // 2) 포스터 이미지 생성 요청 → 도착 시 교체
      try {
        const res = await fetch("/api/infographic", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ payload, version }),
          signal: AbortSignal.timeout(300000),
        });
        const { src } = res.ok ? await res.json() : { src: null };
        setItems((prev) =>
          prev.map((it) => (it.id === id ? { ...it, data: { ...it.data, src: src || null, loading: false } } : it))
        );
      } catch {
        setItems((prev) =>
          prev.map((it) => (it.id === id ? { ...it, data: { ...it.data, loading: false } } : it))
        );
      }
      return;
    }

    // 킨더랩 단독 (편집 가능)
    if (format === "kinderlab" || format === "colorlab") {
      const payload = item.data?.payload;
      if (!payload) return;
      addDesignDoc(toDesignDoc(renderColorLabFromRaw(payload), "킨더랩 월안"), 480);
      return;
    }

    // 한번에 보기 (기본 · 킨더랩 · 이미지 나란히)
    if (format === "compareall") {
      const payload = item.data?.payload;
      if (!payload) return;
      const combined = combineDocs(
        [
          toDesignDoc(renderMonthlyPlanTemplate(payload)),
          toDesignDoc(renderColorLabFromRaw(payload)),
          toDesignDoc(renderInfographicFromRaw(payload)),
        ],
        ["기본", "킨더랩", "이미지"]
      );
      addDesignDoc(combined, 960);
      return;
    }

    // 놀이기록 "팔레트(편집 디자인)": 이미지 생성 없이 편집 캔버스(playrecord) 즉시 생성
    if (format === "design" && item.data?.feature_id === "play_story") {
      const d = item.data;
      const W = 500, H = 707; // A4 비율 캔버스
      const id = nextId();
      setItems((prev) => {
        const pos = rightOf(prev, W);
        return [
          ...prev,
          {
            id,
            type: "playrecord",
            data: {
              feature_id: "play_story", output_type: d.output_type, title: d.title,
              age_band: d.age_band, payload: d.payload, source: d.source,
              variant: "card", page: 0, docs: {},
            },
            x: pos.x, y: pos.y, w: W, h: H,
          },
        ];
      });
      setSelectedId(id);
      return;
    }

    const { title, content } = cardToContent(item);
    try {
      const res = await fetch("/api/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, title, content, variant: opts.variant }),
        signal: AbortSignal.timeout(180000), // 카드형 이미지는 복잡해 ~70s+ 소요
      });
      if (!res.ok) return;
      const data = await res.json();
      const list = data.items || [];
      setItems((prev) => {
        const placed = [...prev];
        const created = list.map((g) => {
          const size = g.size ?? { w: 300, h: 220 };
          const { x, y } = findFreeSpot(placed, size.w, size.h, item.x + item.w + 40, item.y);
          const it = { id: nextId(), type: g.type, data: g.data, x, y, w: size.w, h: size.h };
          placed.push(it);
          return it;
        });
        return [...prev, ...created];
      });
    } catch {
      /* 변환 실패 시 무시 */
    }
  }, []);

  // 보드에 이미지 직접 추가 (버튼·드래그드롭) — point 는 보드 좌표
  const addImagesAt = useCallback((srcs, point) => {
    if (!srcs?.length) return;
    const baseX = point?.x ?? 0, baseY = point?.y ?? 0;
    srcs.forEach((src, i) => {
      const place = (w, h) => {
        const id = nextId();
        setItems((prev) => {
          const { x, y } = findFreeSpot(prev, w, h, Math.round(baseX - w / 2), Math.round(baseY - h / 2));
          if (i === 0) setSelectedId(id);
          return [...prev, { id, type: "image", data: { src, alt: "이미지", source: "upload" }, x, y, w, h }];
        });
      };
      const img = new Image();
      img.onload = () => {
        const W = 280;
        const ratio = img.naturalWidth ? img.naturalHeight / img.naturalWidth : 0.75;
        place(W, Math.max(80, Math.round(W * ratio)));
      };
      img.onerror = () => place(240, 200);
      img.src = src;
    });
  }, []);

  return (
    <div className={"layout" + (chatOpen ? " chat-open" : "")}>
      {/* 편집 디자인 에디터 — 보드 위에 오버레이로 표시 (보드는 뒤에 유지) */}
      {editorInput && <CanvasEditor input={editorInput} onClose={() => setEditorInput(null)} />}
      <Board
        ref={boardRef}
        items={items}
        viewport={viewport}
        setViewport={setViewport}
        selectedIds={selectedIds}
        onSelect={selectItem}
        onUpdateItem={updateItem}
        onUpdateItemData={updateItemData}
        onRemoveItem={removeItem}
        onMoveSelected={moveSelectedBy}
        onConvert={convertCard}
        onEditCard={editCard}
        onMakeWeekCard={placeWeekCardsFrom}
        onAddImages={addImagesAt}
      />
      <ChatPanel onGenerate={addGenerated} />
      {/* 주차 카드는 월안 카드의 🧩 버튼으로 생성합니다 (좌상단 런처 제거) */}
      {/* 모바일: 채팅 시트 열기/닫기 (데스크톱에선 숨김) */}
      <button
        className="mobile-chat-fab"
        onClick={() => setChatOpen((o) => !o)}
        aria-label={chatOpen ? "채팅 닫기" : "채팅 열기"}
      >
        {chatOpen ? "✕" : "💬 채팅"}
      </button>
      {chatOpen && <div className="mobile-chat-backdrop" onClick={() => setChatOpen(false)} />}

      {/* 주간 카드 편집기 — 보드 위 모달 (딤 배경 + 중앙 카드형 박스) */}
      {cardEditorOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(40,36,32,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ position: "relative", width: "min(920px, 80vw)", height: "min(76vh, 760px)", background: "#efe9e0", borderRadius: 16, overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.35)" }}>
            <button
              onClick={() => setCardEditorOpen(false)}
              style={{
                position: "absolute",
                right: 14,
                top: 12,
                zIndex: 1,
                padding: "8px 14px",
                borderRadius: 10,
                border: "none",
                background: "#3f3833",
                color: "#fff",
                fontSize: 13,
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(0,0,0,0.2)",
              }}
            >
              ← 보드로
            </button>
            <WeekCardBlueprintTest
              embedded
              richEdit={editorRich}
              initialTemplate={editorInitial?.template || null}
              initialWeek={editorInitial?.week || 0}
              initialOverride={editorInitial?.override || null}
              posterSrc={[...items].reverse().find((it) => it.type === "infographic" && it.data?.src)?.data?.src || null}
              onApply={editingItemId ? (template) => {
                updateItemData(editingItemId, { template });
                // 템플릿 비율(예: 블루프린트 1080²)에 맞춰 보드 카드 높이 보정
                const it = itemsRef.current.find((x) => x.id === editingItemId);
                const cv = template?.canvas;
                if (it && cv && cv.w) updateItem(editingItemId, { h: Math.round(it.w * cv.h / cv.w) });
                setCardEditorOpen(false);
                setEditingItemId(null);
                setEditorInitial(null);
              } : undefined}
              onPlaceOnBoard={(src, size) => {
                addGenerated({ type: "image", data: { src, alt: "주차 카드" }, size });
                setCardEditorOpen(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
