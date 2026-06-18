import { useCallback, useRef, useState } from "react";
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
  const [selectedId, setSelectedId] = useState(null);
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
        if (list.length === 1) {
          const step = prev.length % 8;
          const offX = (step - 3.5) * 60 + (Math.random() - 0.5) * 24;
          const offY = (step % 4) * 40 + (Math.random() - 0.5) * 24;
          return [...prev, toItem(list[0], cx + offX, cy + offY)];
        }
        // 격자 배치 (최대 3열)
        const cols = Math.min(list.length, 3);
        const gapX = 340;
        const gapY = 360;
        const startX = cx - ((cols - 1) * gapX) / 2;
        const startY = cy - 120;
        const created = list.map((g, i) => {
          const r = Math.floor(i / cols);
          const c = i % cols;
          const size = g.size ?? { w: 300, h: 220 };
          return toItem(g, startX + c * gapX, startY + r * gapY + size.h / 2);
        });
        return [...prev, ...created];
      });
      setSelectedId(null);
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
    setSelectedId((cur) => (cur === id ? null : cur));
  }, []);

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
      const h = Math.round(W * 1.5); // 세로 포스터(1024x1536) 비율
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
    <div className="layout">
      <Board
        ref={boardRef}
        items={items}
        viewport={viewport}
        setViewport={setViewport}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onUpdateItem={updateItem}
        onUpdateItemData={updateItemData}
        onRemoveItem={removeItem}
        onConvert={convertCard}
      />
      <ChatPanel onGenerate={addGenerated} />
    </div>
  );
}
