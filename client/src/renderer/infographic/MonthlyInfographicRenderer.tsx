// 인포그래픽 Preview 컴포넌트.
// 입력: MonthlyInfographicData (또는 raw → 내부 변환). 실제 이미지 생성 X →
// 이미지 자리는 프롬프트/스타일 플레이스홀더로 표시한다.
import "./MonthlyInfographic.css";
import type { MonthlyPlanRawData } from "../types";
import { normalizeMonthlyPlan } from "../normalize/monthlyPlan";
import { buildInfographicData } from "./buildInfographicData";
import { STYLE_LABEL, PURPOSE_LABEL } from "./imagePrompt";
import type { MonthlyInfographicData, InfographicImagePrompt } from "./types";

const PURPOSE_ICON: Record<string, string> = {
  hero: "🌈",
  idea: "🎨",
  activity: "🧩",
  background: "🌿",
  decoration: "✨",
};

function ImageSlot({ prompt, className }: { prompt?: InfographicImagePrompt; className: string }) {
  if (!prompt) return <div className={className + " ig-imgslot"} />;
  return (
    <div className={className + " ig-imgslot"} title={prompt.prompt}>
      <span className="ig-imgslot-icon">{PURPOSE_ICON[prompt.purpose] || "🖼️"}</span>
      <span className="ig-imgslot-style">{STYLE_LABEL[prompt.style]}</span>
      <span className="ig-imgslot-subj">{prompt.subject}</span>
    </div>
  );
}

export function MonthlyInfographicRenderer({ data }: { data: MonthlyInfographicData }) {
  return (
    <div className="ig">
      {/* Hero */}
      <div className="ig-hero">
        <div className="ig-hero-title">{data.title}</div>
        {data.subtitle && <div className="ig-hero-sub">{data.subtitle}</div>}
        <div className="ig-hero-msg">{data.heroMessage}</div>
        <ImageSlot prompt={data.heroImagePrompt} className="ig-hero-img" />
      </div>

      {/* 핵심 놀이아이디어 */}
      {data.keyPlayIdeas.length > 0 && (
        <div className="ig-sec">
          <div className="ig-sec-title">🎨 핵심 놀이아이디어</div>
          <div className="ig-ideas">
            {data.keyPlayIdeas.map((idea, i) => (
              <div key={i} className="ig-idea">
                <ImageSlot prompt={idea.imagePrompt} className="ig-idea-img" />
                <div className="ig-idea-title">{idea.title}</div>
                <div className="ig-idea-desc">{idea.shortDescription}</div>
                {idea.tags.length > 0 && (
                  <div className="ig-tags">
                    {idea.tags.map((t, j) => (
                      <span key={j} className="ig-tag">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 주차별 흐름 */}
      {data.weeklyFlow.length > 0 && (
        <div className="ig-sec">
          <div className="ig-sec-title">📅 주차별 놀이 흐름</div>
          <div className="ig-weeks">
            {data.weeklyFlow.map((w, i) => (
              <div key={i} className="ig-week">
                <span className="ig-week-no">{w.week}</span>
                <ImageSlot prompt={w.imagePrompt} className="ig-week-img" />
                <div className="ig-week-title">{w.title}</div>
                {w.shortSummary && <div className="ig-week-sum">{w.shortSummary}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 교육과정 하이라이트 */}
      {data.curriculumHighlights.length > 0 && (
        <div className="ig-sec">
          <div className="ig-sec-title">🌱 교육과정 연계</div>
          <div className="ig-curr">
            {data.curriculumHighlights.map((c, i) => (
              <div key={i} className="ig-curr-chip">
                <span className="ig-curr-area">{c.area}</span>
                {c.summary && <span className="ig-curr-sum"> · {c.summary}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 가정 연계 */}
      <div className="ig-sec">
        <div className="ig-sec-title">🏡 가정 연계</div>
        <div className="ig-family">
          <ImageSlot prompt={data.familyConnection.imagePrompt} className="ig-family-img" />
          <div>
            <div className="ig-family-title">{data.familyConnection.title}</div>
            <div className="ig-family-msg">{data.familyConnection.message}</div>
          </div>
        </div>
      </div>

      {/* 이미지 프롬프트 목록 (실제 생성 전 — 검토용) */}
      {data.imagePrompts.length > 0 && (
        <details className="ig-prompts">
          <summary>🖼️ 이미지 프롬프트 {data.imagePrompts.length}개 (실제 생성 전)</summary>
          {data.imagePrompts.map((p, i) => (
            <div key={i} className="ig-prompt-item">
              <div className="ig-prompt-head">
                [{PURPOSE_LABEL[p.purpose]} · {STYLE_LABEL[p.style]}] {p.subject}
              </div>
              <div className="ig-prompt-body">{p.prompt}</div>
              <div className="ig-prompt-neg">제외: {p.negativePrompt}</div>
            </div>
          ))}
        </details>
      )}
    </div>
  );
}

// 보드/인스펙터용: raw payload → 내부 변환 → Preview
export function MonthlyInfographicFromRaw({ raw }: { raw: MonthlyPlanRawData }) {
  return <MonthlyInfographicRenderer data={buildInfographicData(normalizeMonthlyPlan(raw))} />;
}

export default MonthlyInfographicRenderer;
