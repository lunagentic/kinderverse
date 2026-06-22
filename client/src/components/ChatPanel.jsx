import { useEffect, useRef, useState } from "react";
import {
  Sparkles,
  LayoutGrid,
  Lightbulb,
  ClipboardList,
  CalendarDays,
  CalendarRange,
  FolderKanban,
  Target,
  Mail,
  AlertTriangle,
} from "lucide-react";
import Loader from "./Loader.jsx";

// 유치원 월별 놀이주제 (누리과정 기반 대표 주제)
const MONTHLY_PLAY_THEMES = {
  1: ["겨울 나라", "새해 소망", "동물의 겨울나기"],
  2: ["졸업과 헤어짐", "한 해를 돌아봐요", "추운 겨울"],
  3: ["새 친구", "유치원이 좋아요", "봄이 왔어요"],
  4: ["봄의 동식물", "씨앗과 새싹", "봄 소풍"],
  5: ["우리 가족", "고마운 마음", "봄 나들이"],
  6: ["여름이 왔어요", "건강한 몸", "곤충 친구들"],
  7: ["신나는 물놀이", "바다 여행", "여름 과일"],
  8: ["즐거운 여름방학", "안전한 생활", "시원한 여름"],
  9: ["가을이 왔어요", "풍성한 한가위", "우리나라"],
  10: ["알록달록 단풍", "가을 열매", "신나는 운동회"],
  11: ["김장하는 날", "나뭇잎 놀이", "가을에서 겨울로"],
  12: ["하얀 겨울", "즐거운 성탄절", "눈 오는 날"],
};

// 추천 버튼: 유치원 문서 7종. 현재 월/대표 주제를 프롬프트에 반영
const DOC_TYPES = [
  { label: "놀이 아이디어", Icon: Lightbulb, build: (m, t) => `${m}월 '${t}' 놀이 아이디어 만들어줘` },
  { label: "일안", Icon: ClipboardList, build: (m) => `${m}월 일일교육계획안(일안) 만들어줘` },
  { label: "월안", Icon: CalendarDays, build: (m, t) => `${m}월 '${t}' 월간교육계획안(월안) 만들어줘` },
  { label: "주안", Icon: CalendarRange, build: (m) => `${m}월 주간교육계획안(주안) 만들어줘` },
  { label: "프로젝트 계획", Icon: FolderKanban, build: (m, t) => `'${t}' 프로젝트 계획 만들어줘` },
  { label: "놀이미션", Icon: Target, build: (m, t) => `${m}월 '${t}' 놀이미션 만들어줘` },
  { label: "프로젝트 안내문", Icon: Mail, build: (m, t) => `'${t}' 프로젝트 안내문 만들어줘` },
];

function docSuggestions(month) {
  const theme = (MONTHLY_PLAY_THEMES[month] ?? [])[0] ?? "이달의 주제";
  return DOC_TYPES.map((d) => ({
    label: d.label,
    Icon: d.Icon,
    prompt: d.build(month, theme),
  }));
}

// ── plan payload → 채팅용 텍스트 (출력 구조 순서대로) ──
const arr = (v) => (Array.isArray(v) ? v.filter((x) => x != null && x !== "") : []);

function basicInfoLine(b = {}) {
  const period =
    b.period?.label || [b.period?.start_date, b.period?.end_date].filter(Boolean).join(" ~ ");
  return [
    b.age_band && `연령 ${b.age_band}`,
    b.class_name,
    b.theme && `주제 ${b.theme}`,
    b.sub_theme && `소주제 ${b.sub_theme}`,
    b.life_theme && `생활주제 ${b.life_theme}`,
    b.season,
    period,
  ]
    .filter(Boolean)
    .join(" · ");
}

function playIdeaToText(p) {
  return arr(p.ideas)
    .map((idea) =>
      [
        `[${idea.idea_type || "놀이"}] ${idea.title}`,
        arr(idea.learning_area).length && `배움영역: ${arr(idea.learning_area).join(" · ")}`,
        arr(idea.materials).length && `놀이재료: ${arr(idea.materials).join(", ")}`,
        idea.intro && `소개: ${idea.intro}`,
        arr(idea.method).length &&
          "놀이 방법:\n" + arr(idea.method).map((m, i) => `   ${i + 1}. ${m}`).join("\n"),
        arr(idea.tips).length && "놀이팁:\n" + arr(idea.tips).map((t) => `   - ${t}`).join("\n"),
      ]
        .filter(Boolean)
        .join("\n")
    )
    .join("\n\n");
}

function monthlyToText(p) {
  const S = [];
  const bi = basicInfoLine(p.basic_info);
  if (bi) S.push(`■ 기본정보\n${bi}`);
  if (p.rationale?.summary) S.push(`■ 선정 이유\n${p.rationale.summary}`);

  const exp = arr(p.teacher_expectations);
  if (exp.length)
    S.push("■ 교사 기대\n" + exp.map((e) => `· ${e.goal}${e.focus ? ` (${e.focus})` : ""}`).join("\n"));

  const cl = arr(p.curriculum_links);
  if (cl.length)
    S.push(
      "■ 교육과정 연계\n" +
        cl
          .map(
            (c) => `· [${c.area}]${c.category ? ` ${c.category}` : ""}${c.content ? ` ${c.content}` : ""}`
          )
          .join("\n")
    );

  const wf = arr(p.weekly_flow);
  if (wf.length)
    S.push(
      "■ 주차별 놀이 흐름\n" +
        wf
          .map((w) => {
            const head = `${w.week}주 [${w.flow_stage || ""}] ${w.sub_theme || ""}`.trim();
            const ideas = arr(w.play_ideas)
              .map((pi) => `   - ${pi.title}`)
              .join("\n");
            return ideas ? `${head}\n${ideas}` : head;
          })
          .join("\n")
    );

  const od = arr(p.outdoor_and_physical_play);
  if (od.length)
    S.push(
      "■ 바깥놀이·신체활동\n" +
        od.map((o) => `· ${o.week}주 ${o.activity_name || ""}${o.method ? ` — ${o.method}` : ""}`).join("\n")
    );

  const s = p.safety_education || {};
  const safety = [s.play_safety, s.tool_safety, s.life_safety].filter(Boolean);
  if (safety.length) S.push("■ 안전교육\n" + safety.map((x) => `· ${x}`).join("\n"));

  const c = p.character_education;
  if (c?.core_value)
    S.push(`■ 인성교육\n· ${c.core_value}${c.practice_context ? ` — ${c.practice_context}` : ""}`);

  const ev = arr(p.events).filter((e) => e.name && e.name !== "-");
  if (ev.length)
    S.push(
      "■ 행사\n" +
        ev.map((e) => `· ${e.name}${e.date ? ` (${e.date})` : ""}${e.connection ? ` — ${e.connection}` : ""}`).join("\n")
    );

  const h = p.home_connection || {};
  const home = [
    h.home_play && `놀이: ${h.home_play}`,
    h.parent_question && `질문: ${h.parent_question}`,
    h.recommended_picture_book && `추천도서: ${h.recommended_picture_book}`,
  ].filter(Boolean);
  if (home.length) S.push("■ 가정 연계\n" + home.map((x) => `· ${x}`).join("\n"));

  return S.join("\n\n");
}

// 그 외 plan 타입: payload 구조를 그대로 읽기 쉬운 텍스트로
function genericToText(v, depth = 0) {
  const pad = "  ".repeat(depth);
  if (v == null || v === "") return "";
  if (Array.isArray(v))
    return v
      .map((x) => (x && typeof x === "object" ? genericToText(x, depth) : `${pad}· ${x}`))
      .filter(Boolean)
      .join("\n");
  if (typeof v === "object")
    return Object.entries(v)
      .map(([k, val]) => {
        if (k === "output_type" || k === "plan_type" || k === "notice_type") return "";
        const inner = genericToText(val, depth + 1);
        if (!inner) return "";
        return val && typeof val === "object" ? `${pad}${k}:\n${inner}` : `${pad}${k}: ${val}`;
      })
      .filter(Boolean)
      .join("\n");
  return `${pad}${v}`;
}

function planToText(item) {
  const d = item?.data;
  if (!d) return "";
  const p = d.payload || {};
  if (d.feature_id === "monthly_plan") return monthlyToText(p);
  if (d.feature_id === "play_idea") return playIdeaToText(p);
  return genericToText(p);
}

export default function ChatPanel({ onGenerate }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "안녕하세요! 무엇을 만들어 드릴까요? 문서·이미지·디자인 템플릿을 보드에 생성해드려요.",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef(null);

  const month = new Date().getMonth() + 1; // 1~12
  const theme = (MONTHLY_PLAY_THEMES[month] ?? [])[0] ?? "이달의 주제";
  const suggestions = docSuggestions(month);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const send = async (text) => {
    const prompt = (text ?? input).trim();
    if (!prompt || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: prompt }]);
    setBusy(true);
    const attempt = () =>
      fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
        signal: AbortSignal.timeout(90000), // 90초 타임아웃
      });
    try {
      // dev 서버 재시작 등 일시 오류 대비 1회 재시도
      let res;
      try {
        res = await attempt();
      } catch {
        await new Promise((r) => setTimeout(r, 1200));
        res = await attempt();
      }
      if (!res.ok) throw new Error("생성 실패");
      const data = await res.json();
      const items = data.items || (data.type ? [data] : []);
      onGenerate(items);
      // 보드에는 카드로, 채팅에는 출력 구조 순서대로 텍스트만 보여준다.
      const detail = items
        .filter((it) => it?.type === "plan")
        .map(planToText)
        .filter(Boolean)
        .join("\n\n──────────\n\n");
      const text = detail ? `${data.reply}\n\n${detail}` : data.reply;
      setMessages((m) => [...m, { role: "assistant", text }]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: "assistant", error: true, text: "생성 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요." },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside className="chat">
      <header className="chat-head">
        <span className="chat-logo">
          <Sparkles size={18} strokeWidth={2.4} /> verse
        </span>
        <span className="chat-sub">채팅으로 보드를 채우세요</span>
      </header>

      <div className="chat-list" ref={listRef}>
        {messages.map((m, i) => (
          <div key={i} className={"msg msg-" + m.role + (m.error ? " msg-error" : "")}>
            {m.role === "assistant" && (
              <span className="msg-icon">
                {m.error ? <AlertTriangle size={14} /> : <Sparkles size={14} />}
              </span>
            )}
            <span>{m.text}</span>
          </div>
        ))}
        {busy && (
          <div className="msg msg-assistant msg-typing" style={{ alignItems: "center", gap: 6 }}>
            <Loader width={88} />
            <span>생성 중…</span>
          </div>
        )}
      </div>

      <div className="chat-suggest-label">
        <LayoutGrid size={13} /> 추천 주제 · {month}월 「{theme}」
      </div>
      <div className="chat-suggest">
        {suggestions.map((s) => (
          <button
            key={s.label}
            disabled={busy}
            onClick={() => send(s.prompt)}
            title={s.prompt}
          >
            <s.Icon size={14} strokeWidth={2} />
            {s.label}
          </button>
        ))}
      </div>

      <form
        className="chat-input"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="만들고 싶은 것을 입력하세요…"
          disabled={busy}
        />
        <button type="submit" disabled={busy || !input.trim()}>
          전송
        </button>
      </form>
    </aside>
  );
}
