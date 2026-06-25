// PROMPTS.md 출력 형식에 맞춰 plan payload 를 사람이 읽기 좋게 렌더링.
// feature_id 별 전용 레이아웃. 알 수 없는 형태는 generic 으로 폴백.
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Dot,
  Target,
  HelpCircle,
  MessageCircle,
  Home,
  AlertTriangle,
  Palette,
  X,
} from "lucide-react";

const arr = (v) => (Array.isArray(v) ? v.filter((x) => x != null && x !== "") : []);
const has = (v) => v != null && v !== "" && !(Array.isArray(v) && v.length === 0);

// 사진 확대 라이트박스 — 카드의 transform 영향을 안 받도록 body 로 portal 렌더.
// 여러 장이면 ◀/▶ 로 넘기고, 배경/✕/Esc 로 닫는다.
function Lightbox({ photos, index, onClose, onNav }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") onNav(1);
      else if (e.key === "ArrowLeft") onNav(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onNav]);
  if (index == null || !photos?.[index]) return null;
  const many = photos.length > 1;
  return createPortal(
    <div className="pv-lightbox" onClick={onClose} role="dialog" aria-modal="true">
      <button className="pv-lb-x" onClick={onClose} aria-label="닫기"><X size={22} /></button>
      {many && (
        <button
          className="pv-lb-nav pv-lb-prev"
          onClick={(e) => { e.stopPropagation(); onNav(-1); }}
          aria-label="이전"
        >‹</button>
      )}
      <img src={photos[index]} alt="확대 사진" onClick={(e) => e.stopPropagation()} />
      {many && (
        <button
          className="pv-lb-nav pv-lb-next"
          onClick={(e) => { e.stopPropagation(); onNav(1); }}
          aria-label="다음"
        >›</button>
      )}
      {many && <div className="pv-lb-count">{index + 1} / {photos.length}</div>}
    </div>,
    document.body
  );
}

function Section({ title, children }) {
  return (
    <section className="pv-sec">
      {title && <h4 className="pv-sec-title">{title}</h4>}
      {children}
    </section>
  );
}

function Field({ label, value }) {
  if (!has(value)) return null;
  return (
    <div className="pv-field">
      <span className="pv-label">{label}</span>
      <span className="pv-text">{value}</span>
    </div>
  );
}

function Para({ label, text }) {
  if (!has(text)) return null;
  return (
    <div className="pv-para">
      {label && <span className="pv-label">{label}</span>}
      <p className="pv-text">{text}</p>
    </div>
  );
}

function Bullets({ label, items, Icon }) {
  const list = arr(items);
  if (!list.length) return null;
  return (
    <div className="pv-para">
      {label && <span className="pv-label">{label}</span>}
      <ul className="pv-ul">
        {list.map((it, i) => (
          <li key={i}>
            <span className="pv-mk">
              {Icon ? <Icon size={13} /> : <Dot size={14} />}
            </span>
            {String(it)}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Steps({ label, items }) {
  const list = arr(items);
  if (!list.length) return null;
  return (
    <div className="pv-para">
      {label && <span className="pv-label">{label}</span>}
      <ol className="pv-ol">
        {list.map((it, i) => (
          <li key={i}>{String(it)}</li>
        ))}
      </ol>
    </div>
  );
}

const areaText = (a) => arr(a).join(" · ");

function BasicInfo({ b }) {
  if (!b) return null;
  const period = b.period?.label || [b.period?.start_date, b.period?.end_date].filter(Boolean).join(" ~ ");
  const meta = [
    b.age_band && `연령 ${b.age_band}`,
    b.class_name,
    b.theme && `주제: ${b.theme}`,
    b.sub_theme && `소주제: ${b.sub_theme}`,
    b.life_theme && `생활주제: ${b.life_theme}`,
    b.season,
    has(b.week_number) && `${b.week_number}주차`,
    b.day && (String(b.day).endsWith("요일") ? String(b.day) : `${b.day}요일`),
    b.date,
    period,
    b.project_type,
  ].filter(Boolean);
  if (!meta.length) return null;
  return (
    <div className="pv-meta">
      {meta.map((m, i) => (
        <span key={i} className="pv-chip">{m}</span>
      ))}
    </div>
  );
}

function CurriculumLinks({ links }) {
  const list = arr(links);
  if (!list.length) return null;
  return (
    <Section title="교육과정 연계">
      {list.map((c, i) => (
        <div key={i} className="pv-item">
          <span className="pv-tag">{c.area}</span>
          {has(c.category) && <span className="pv-tag pv-tag-soft">{c.category}</span>}
          {has(c.content) && <span className="pv-text"> {c.content}</span>}
          {has(c.expected_experience) && (
            <div className="pv-sub">↳ {c.expected_experience}</div>
          )}
        </div>
      ))}
    </Section>
  );
}

function Expectations({ items }) {
  const list = arr(items);
  if (!list.length) return null;
  return (
    <Section title="교사 기대">
      {list.map((e, i) => (
        <div key={i} className="pv-item">
          <span className="pv-text">{e.goal}</span>
          {has(e.focus) && <span className="pv-tag pv-tag-soft">{e.focus}</span>}
        </div>
      ))}
    </Section>
  );
}

function PlayIdeasInline({ ideas }) {
  const list = arr(ideas);
  if (!list.length) return null;
  return (
    <ul className="pv-ul pv-tight">
      {list.map((p, i) => (
        <li key={i}>
          <span className="pv-mk"><Dot size={14} /></span>
          <b>{p.title}</b>
          {has(areaText(p.learning_area)) && <span className="pv-dim"> ({areaText(p.learning_area)})</span>}
          {has(p.core_experience) && <div className="pv-sub">{p.core_experience}</div>}
        </li>
      ))}
    </ul>
  );
}

// ── feature 별 렌더러 ──

function PlayIdeaView({ d }) {
  const ideas = arr(d.ideas);
  if (!ideas.length) return <Generic value={d} />;
  return (
    <div>
      {ideas.map((idea, i) => (
        <div className="pv-idea" key={i}>
          <div className="pv-idea-head">
            {has(idea.idea_type) && (
              <span className="pv-tag pv-tag-soft">{idea.idea_type}</span>
            )}
            <span className="pv-idea-title">{idea.title}</span>
          </div>
          <Field label="배움영역" value={areaText(idea.learning_area)} />
          <Field label="놀이재료" value={arr(idea.materials).join(", ")} />
          <Para label="놀이 소개" text={idea.intro} />
          <Steps label="놀이 방법" items={idea.method} />
          <Bullets label="놀이팁" items={idea.tips} />
        </div>
      ))}
    </div>
  );
}

function MissionCardView({ d }) {
  return (
    <div className="pv-mission">
      <BasicInfo b={{ age_band: d.age, theme: d.theme, sub_theme: d.sub_theme }} />
      <Field label="놀이명" value={d.play_name} />
      <Para label="미션 문구" text={d.mission_title} />
      <Bullets label="놀이 미션" items={d.mission_text} Icon={Target} />
      <Field label="놀이 팁" value={d.learning_tip} />
      <Field label="배움 영역" value={areaText(d.learning_area)} />
      {has(d.image_prompt) && (
        <div className="pv-sub pv-inline">
          <Palette size={13} /> 일러스트: {d.image_prompt}
        </div>
      )}
    </div>
  );
}

function MonthlyView({ d }) {
  return (
    <div>
      <BasicInfo b={d.basic_info} />
      <Para label="선정 이유" text={d.rationale?.summary} />
      <Expectations items={d.teacher_expectations} />
      <CurriculumLinks links={d.curriculum_links} />
      <Section title="주차별 놀이 흐름">
        {arr(d.weekly_flow).map((w, i) => (
          <div className="pv-week" key={i}>
            <div className="pv-week-head">
              <span className="pv-week-no">{w.week}주</span>
              <span className="pv-tag pv-tag-soft">{w.flow_stage}</span>
              {has(w.sub_theme) && <span className="pv-text">{w.sub_theme}</span>}
            </div>
            <PlayIdeasInline ideas={w.play_ideas} />
          </div>
        ))}
      </Section>
      <OutdoorList items={d.outdoor_and_physical_play} keyName="week" />
      <SafetyCharacter d={d} />
      <EventsHome d={d} />
    </div>
  );
}

function WeeklyView({ d }) {
  return (
    <div>
      <BasicInfo b={d.basic_info} />
      <Para label="이번 주 의미" text={d.rationale?.summary || d.rationale?.meaning_of_this_week} />
      <Expectations items={d.teacher_expectations} />
      <CurriculumLinks links={d.curriculum_links} />
      <Section title="요일별 놀이 흐름">
        {arr(d.daily_flow).map((day, i) => (
          <div className="pv-week" key={i}>
            <div className="pv-week-head">
              <span className="pv-week-no">{day.day}</span>
              <span className="pv-tag pv-tag-soft">{day.flow_stage}</span>
            </div>
            <PlayIdeasInline ideas={day.play_ideas} />
          </div>
        ))}
      </Section>
      <OutdoorList items={d.outdoor_and_physical_play} keyName="day" />
      <SafetyCharacter d={d} />
      <EventsHome d={d} />
    </div>
  );
}

function DailyView({ d }) {
  return (
    <div>
      <BasicInfo b={d.basic_info} />
      <Expectations items={d.teacher_expectations} />
      <CurriculumLinks links={d.curriculum_links} />
      {(has(d.materials?.teacher_materials) || has(d.materials?.children_materials)) && (
        <Section title="준비물">
          <Bullets label="교사 준비물" items={d.materials?.teacher_materials} />
          <Bullets label="유아 자료" items={d.materials?.children_materials} />
        </Section>
      )}
      {d.introduction && (
        <Section title="도입">
          <Field label="흥미 유발" value={d.introduction.interest_trigger} />
          <Bullets label="교사 발문" items={d.introduction.conversation?.teacher_questions} Icon={HelpCircle} />
        </Section>
      )}
      {arr(d.development_activities).length > 0 && (
        <Section title="전개 활동">
          {arr(d.development_activities).map((a, i) => (
            <div className="pv-week" key={i}>
              <div className="pv-idea-title">{a.activity_name}</div>
              <Field label="목표" value={a.activity_goal} />
              <Steps label="놀이 방법" items={a.activity_method} />
              <Bullets label="교사 발문" items={a.teacher_questions} Icon={HelpCircle} />
            </div>
          ))}
        </Section>
      )}
      {d.closing && (
        <Section title="마무리">
          <Field label="경험 나누기" value={d.closing.experience_sharing} />
          <Bullets label="회고 질문" items={d.closing.reflection_questions} Icon={HelpCircle} />
        </Section>
      )}
      {d.assessment && (
        <Section title="평가">
          <Bullets label="관찰 포인트" items={d.assessment.observation_points} />
        </Section>
      )}
      <HomeConnection h={d.home_connection} />
    </div>
  );
}

function ProjectPlanView({ d }) {
  return (
    <div>
      <BasicInfo b={d.basic_info} />
      <Para label="선정 이유" text={d.rationale?.summary} />
      {arr(d.project_goals).length > 0 && (
        <Section title="프로젝트 목표">
          {arr(d.project_goals).map((g, i) => (
            <div className="pv-item" key={i}>
              <span className="pv-text">{g.goal}</span>
              {has(g.focus) && <span className="pv-tag pv-tag-soft">{g.focus}</span>}
            </div>
          ))}
        </Section>
      )}
      <CurriculumLinks links={d.curriculum_links} />
      <Section title="프로젝트 흐름">
        {arr(d.project_flow).map((s, i) => (
          <div className="pv-week" key={i}>
            <div className="pv-week-head">
              <span className="pv-tag">{s.stage}</span>
              {has(s.purpose) && <span className="pv-dim">{s.purpose}</span>}
            </div>
            <Bullets items={s.key_questions} Icon={HelpCircle} />
            {arr(s.main_activities).map((a, j) => (
              <div className="pv-sub" key={j}>• {a.title}{has(a.description) ? ` — ${a.description}` : ""}</div>
            ))}
          </div>
        ))}
      </Section>
      {arr(d.weekly_operation_plan).length > 0 && (
        <Section title="주차별 운영">
          {arr(d.weekly_operation_plan).map((w, i) => (
            <div className="pv-week" key={i}>
              <div className="pv-week-head">
                <span className="pv-week-no">{w.week}주</span>
                <span className="pv-tag pv-tag-soft">{w.stage}</span>
                {has(w.sub_theme) && <span className="pv-text">{w.sub_theme}</span>}
              </div>
              <Bullets items={w.main_activities} />
            </div>
          ))}
        </Section>
      )}
      <HomeConnection h={d.home_connection} />
    </div>
  );
}

function ProjectNoticeView({ d }) {
  return (
    <div className="pv-notice">
      {d.header && (
        <div className="pv-notice-head">
          <div className="pv-idea-title">{d.header.title}</div>
          {has(d.header.subtitle) && <div className="pv-dim">{d.header.subtitle}</div>}
        </div>
      )}
      <BasicInfo b={d.basic_info} />
      <Para text={d.greeting?.opening_message} />
      <Para label="프로젝트 소개" text={d.greeting?.project_intro} />
      <Para label="프로젝트 의미" text={d.greeting?.project_meaning} />
      {arr(d.project_goals_for_parents).length > 0 && (
        <Section title="이런 걸 배워요">
          {arr(d.project_goals_for_parents).map((g, i) => (
            <div className="pv-item" key={i}>
              {has(g.area) && <span className="pv-tag pv-tag-soft">{g.area}</span>}
              <span className="pv-text">{g.goal}</span>
            </div>
          ))}
        </Section>
      )}
      {arr(d.weekly_flow_summary).length > 0 && (
        <Section title="주차별 진행">
          {arr(d.weekly_flow_summary).map((w, i) => (
            <div className="pv-week" key={i}>
              <div className="pv-week-head">
                <span className="pv-week-no">{w.week}주</span>
                {has(w.sub_theme) && <span className="pv-text">{w.sub_theme}</span>}
              </div>
              {has(w.parent_friendly_description) && <div className="pv-sub">{w.parent_friendly_description}</div>}
            </div>
          ))}
        </Section>
      )}
      {d.home_connection && (
        <Section title="가정 연계">
          <Bullets label="대화 질문" items={d.home_connection.conversation_questions} Icon={MessageCircle} />
          <Bullets label="집에서 함께" items={d.home_connection.home_activities} />
        </Section>
      )}
      {d.materials_request && (
        <Bullets
          label="준비물 안내"
          items={[
            ...arr(d.materials_request.picture_books),
            ...arr(d.materials_request.natural_materials),
            ...arr(d.materials_request.experience_materials),
            ...arr(d.materials_request.etc),
          ]}
        />
      )}
      {d.teacher_message && (
        <Section title="담임교사 메시지">
          <Para text={d.teacher_message.closing_message} />
          <Para text={d.teacher_message.request_for_support} />
          <Para text={d.teacher_message.thanks} />
        </Section>
      )}
    </div>
  );
}

// 놀이기록 (play_story / PlayRecordTemplate)
function PlayStoryView({ d }) {
  const photos = arr(d.photos);
  const [zoom, setZoom] = useState(null); // 확대 중인 사진 인덱스
  const navZoom = (delta) =>
    setZoom((i) => (i == null ? i : (i + delta + photos.length) % photos.length));
  return (
    <div>
      {d.header && has(d.header.subtitle) && <Para text={d.header.subtitle} />}
      <Para label="놀이 이야기" text={d.introduction?.text} />
      {arr(d.activities).length > 0 && (
        <Section title="놀이 흐름">
          {arr(d.activities).map((a, i) => (
            <div className="pv-week" key={i}>
              <div className="pv-week-head">
                {has(a.order) && <span className="pv-week-no">{a.order}</span>}
                {has(a.title) && <b className="pv-text">{a.title}</b>}
                {has(a.photoSlots) && <span className="pv-tag pv-tag-soft">사진 {a.photoSlots}</span>}
              </div>
              {has(a.summary) && <div className="pv-sub">{a.summary}</div>}
              {arr(a.childQuotes).length > 0 && (
                <Bullets
                  items={arr(a.childQuotes).map((q) => `“${String(q).replace(/^["“”]|["“”]$/g, "")}”`)}
                  Icon={MessageCircle}
                />
              )}
            </div>
          ))}
        </Section>
      )}
      {photos.length > 0 && (
        <Section title={`사진 (${photos.length})`}>
          <div className="pv-photos">
            {photos.map((src, i) => (
              <img
                className="pv-photo"
                key={i}
                src={src}
                alt={`놀이 사진 ${i + 1}`}
                loading="lazy"
                onClick={(e) => { e.stopPropagation(); setZoom(i); }}
                title="클릭하면 크게 보기"
              />
            ))}
          </div>
        </Section>
      )}
      <Para label={d.learning?.title || "놀이 속 배움"} text={d.learning?.text} />
      <Para label={d.teacherSupport?.title || "교사의 지원"} text={d.teacherSupport?.text} />
      <Lightbox photos={photos} index={zoom} onClose={() => setZoom(null)} onNav={navZoom} />
    </div>
  );
}

// 공통 보조 섹션
function OutdoorList({ items, keyName }) {
  const list = arr(items);
  if (!list.length) return null;
  return (
    <Section title="바깥놀이·신체활동">
      {list.map((o, i) => (
        <div className="pv-item" key={i}>
          <span className="pv-week-no">{o[keyName]}{keyName === "week" ? "주" : ""}</span>
          <b>{o.activity_name}</b>
          {has(o.method) && <div className="pv-sub">{o.method}</div>}
        </div>
      ))}
    </Section>
  );
}

function SafetyCharacter({ d }) {
  const s = d.safety_education;
  const c = d.character_education;
  const safety = s && [s.play_safety, s.tool_safety, s.life_safety, s.weekly_safety_focus, s.teacher_guidance].filter(has);
  if ((!safety || !safety.length) && !c) return null;
  return (
    <Section title="안전·인성">
      {safety && <Bullets label="안전교육" items={safety} Icon={AlertTriangle} />}
      {c && has(c.core_value) && <Field label="인성(핵심가치)" value={`${c.core_value}${c.practice_context ? " — " + c.practice_context : ""}`} />}
    </Section>
  );
}

function EventsHome({ d }) {
  const events = arr(d.events).filter((e) => has(e.name) && e.name !== "-");
  return (
    <>
      {events.length > 0 && (
        <Section title="행사">
          {events.map((e, i) => (
            <div className="pv-item" key={i}>
              <b>{e.name}</b> {has(e.date) && <span className="pv-dim">{e.date}</span>}
              {has(e.connection) && <div className="pv-sub">{e.connection}</div>}
            </div>
          ))}
        </Section>
      )}
      <HomeConnection h={d.home_connection} />
    </>
  );
}

function HomeConnection({ h }) {
  if (!h) return null;
  const items = [
    h.home_play && `놀이: ${h.home_play}`,
    h.try_at_home && `집에서: ${h.try_at_home}`,
    h.conversation_topic && `대화: ${h.conversation_topic}`,
    h.parent_question && `질문: ${h.parent_question}`,
    h.observation_point && `관찰: ${h.observation_point}`,
    h.recommended_picture_book && `추천도서: ${h.recommended_picture_book}`,
    h.follow_up_play && `후속놀이: ${h.follow_up_play}`,
  ].filter(Boolean);
  if (!items.length) return null;
  return (
    <Section title="가정 연계">
      <Bullets items={items} Icon={Home} />
    </Section>
  );
}

// generic 폴백 (알 수 없는 형태)
function Generic({ value, depth = 0 }) {
  if (value == null) return <span className="pv-dim">—</span>;
  if (Array.isArray(value))
    return (
      <ul className="pv-ul">
        {value.map((v, i) => (
          <li key={i}>{typeof v === "object" ? <Generic value={v} depth={depth + 1} /> : String(v)}</li>
        ))}
      </ul>
    );
  if (typeof value === "object")
    return (
      <div className="pv-generic">
        {Object.entries(value).map(([k, v]) => (
          <div className="pv-field" key={k}>
            <span className="pv-label">{k}</span>
            {typeof v === "object" ? <Generic value={v} depth={depth + 1} /> : <span className="pv-text">{String(v)}</span>}
          </div>
        ))}
      </div>
    );
  return <span className="pv-text">{String(value)}</span>;
}

// 놀이중심 주제망 (topic_web / TopicWeb)
function TopicWebView({ d }) {
  const web = d.topic_web || {};
  const subs = arr(web.subtopics);
  const palette = ["#2f6df6", "#34a853", "#e0791a", "#9b51e0", "#e91e8c", "#0aa1d6", "#3fae6a", "#ef8e6a"];
  return (
    <div>
      <div className="pv-web-main">{web.main_topic || d.theme || "주제망"}</div>
      <Section title="소주제 · 놀이">
        {subs.map((s, i) => (
          <div className="pv-web-branch" key={i} style={{ borderLeftColor: palette[i % palette.length] }}>
            <div className="pv-web-sub" style={{ color: palette[i % palette.length] }}>{s.subtopic}</div>
            <div className="pv-web-ideas">
              {arr(s.play_ideas).map((p, j) => (
                <span className="pv-web-idea" key={j}>{String(p)}</span>
              ))}
            </div>
          </div>
        ))}
      </Section>
      <Bullets label="환경 구성" items={d.environment_setup} Icon={Home} />
      <Bullets label="유아의 예상 질문" items={d.children_expected_questions} Icon={HelpCircle} />
    </div>
  );
}

const RENDERERS = {
  topic_web: TopicWebView,
  play_story: PlayStoryView,
  play_idea: PlayIdeaView,
  mission_card: MissionCardView,
  monthly_plan: MonthlyView,
  weekly_plan: WeeklyView,
  daily_plan: DailyView,
  project_plan: ProjectPlanView,
  project_notice: ProjectNoticeView,
};

export default function PlanView({ featureId, payload }) {
  if (!payload || typeof payload !== "object") return <Generic value={payload} />;
  const R = RENDERERS[featureId];
  return <div className="pv">{R ? <R d={payload} /> : <Generic value={payload} />}</div>;
}
