import { useCallback, useEffect, useRef, useState } from "react";
import Board from "./components/Board.jsx";
import ChatPanel from "./components/ChatPanel.jsx";
import RendererPreview from "./components/RendererPreview.jsx";
import {
  renderMonthlyPlanTemplate,
  renderColorLabFromRaw,
  renderInfographicFromRaw,
} from "./renderer/pipeline";
import { toDesignDoc } from "./renderer/adapters/toDesignDoc";
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

let idCounter = 1;
// 카운터 + 랜덤 접미사 → HMR/리로드로 카운터가 리셋돼도 기존 아이템과 ID 충돌 방지
const nextId = () => `item-${idCounter++}-${Math.random().toString(36).slice(2, 7)}`;

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
  if (RENDER_PREVIEW) return <RendererPreview />;
  return <Workspace />;
}

function Workspace() {
  const [items, setItems] = useState([]);
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

      // 기존 카드와 겹치지 않는 위치 탐색 (중앙 기준 → 우/하단으로 밀기)
      const overlaps = (a, b) =>
        a.x < b.x + b.w + 24 && a.x + a.w + 24 > b.x && a.y < b.y + b.h + 24 && a.y + a.h + 24 > b.y;
      const freeSpot = (placed, w, h, x0, y0) => {
        let x = x0, y = y0, tries = 0;
        while (placed.some((it) => overlaps({ x, y, w, h }, it)) && tries < 400) {
          x += 60;
          if (x > x0 + 1400) { x = x0; y += 60; }
          tries++;
        }
        return { x, y };
      };
      setItems((prev) => {
        const placed = [...prev];
        const created = list.map((g) => {
          const size = g.size ?? { w: 300, h: 220 };
          const { x, y } = freeSpot(placed, size.w, size.h, cx - size.w / 2, cy - size.h / 2);
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
  const convertCard = useCallback(async (item, format) => {
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

    // 월안 "이미지": 인포그래픽 포스터 1장 (월안 → gpt-image → 이미지)
    if (format === "image" && item.data?.feature_id === "monthly_plan") {
      const payload = item.data?.payload;
      if (!payload) return;
      const W = 480;
      const h = Math.round((W * 297) / 210); // A4 세로 비율
      const id = nextId();
      // 1) 생성 중 카드 즉시 표시
      setItems((prev) => {
        const pos = rightOf(prev, W);
        return [
          ...prev,
          { id, type: "infographic", data: { payload, src: null, loading: true, title: item.data?.title || "인포그래픽" }, x: pos.x, y: pos.y, w: W, h },
        ];
      });
      setSelectedId(id);
      // 2) 포스터 이미지 생성 요청 → 도착 시 교체
      try {
        const res = await fetch("/api/infographic", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ payload }),
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
    const { title, content } = cardToContent(item);
    try {
      const res = await fetch("/api/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, title, content }),
        signal: AbortSignal.timeout(90000),
      });
      if (!res.ok) return;
      const data = await res.json();
      const list = data.items || [];
      setItems((prev) => {
        const created = list.map((g, i) => {
          const size = g.size ?? { w: 300, h: 220 };
          return {
            id: nextId(),
            type: g.type,
            data: g.data,
            x: item.x + item.w + 40 + i * (size.w + 20),
            y: item.y,
            w: size.w,
            h: size.h,
          };
        });
        return [...prev, ...created];
      });
    } catch {
      /* 변환 실패 시 무시 */
    }
  }, []);

  return (
    <div className={"layout" + (chatOpen ? " chat-open" : "")}>
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
      />
      <ChatPanel onGenerate={addGenerated} />
      {/* 모바일: 채팅 시트 열기/닫기 (데스크톱에선 숨김) */}
      <button
        className="mobile-chat-fab"
        onClick={() => setChatOpen((o) => !o)}
        aria-label={chatOpen ? "채팅 닫기" : "채팅 열기"}
      >
        {chatOpen ? "✕" : "💬 채팅"}
      </button>
      {chatOpen && <div className="mobile-chat-backdrop" onClick={() => setChatOpen(false)} />}
    </div>
  );
}
