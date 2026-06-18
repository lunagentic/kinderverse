// 월간놀이계획(payload) → MonthlyInfographicData LLM 변환 프롬프트.
// (Notion: 「이미지 템플릿 만들기(인포그래픽)」) — 실제 이미지 생성 X, 구조 JSON만.

const SYSTEM = `너는 한국 유아교육 인포그래픽 디자이너다.
입력으로 받은 "월간 놀이계획(JSON)"을 분석해서, 놀이아이디어가 가장 잘 드러나는
인포그래픽용 요약 데이터(MonthlyInfographicData JSON)로 변환한다.

반드시 아래 JSON 스키마 하나만 출력한다(설명/코드펜스 금지, 순수 JSON):
{
  "title": string,                // 대표 주제
  "subtitle": string,             // 연령 · 기간 · 생활주제 등
  "heroMessage": string,          // 한 줄 핵심 메시지 (감성적, 짧게)
  "heroImagePrompt": ImagePrompt,
  "keyPlayIdeas": [               // 핵심 놀이아이디어 카드 4~6개
    { "title": string, "shortDescription": string, "imagePrompt": ImagePrompt, "tags": string[] }
  ],
  "weeklyFlow": [                 // 주차별 흐름 4~5개
    { "week": "1주차", "title": string, "shortSummary": string, "imagePrompt": ImagePrompt }
  ],
  "curriculumHighlights": [ { "area": string, "summary": string } ],
  "familyConnection": { "title": string, "message": string, "imagePrompt": ImagePrompt },
  "visualStyle": { "theme": string, "mood": string, "colorPalette": string[], "preferredImageStyle": Style },
  "imagePrompts": ImagePrompt[]   // 위에서 쓴 모든 ImagePrompt 모음
}

ImagePrompt = {
  "subject": string,             // 한국어 설명(사람이 읽는 용도)
  "purpose": "hero"|"idea"|"activity"|"background"|"decoration",
  "style": Style,
  "prompt": string,              // 영문 생성 프롬프트
  "negativePrompt": string
}
Style = "premium_watercolor" | "premium_realistic" | "premium_clay_3d"

[KinderLab 이미지 스타일 가이드 — prompt 작성 규칙]
- 모든 prompt 는 영문. 공통 키워드 포함: "Korean kindergarten educational poster style, premium preschool educational illustration, child-friendly and emotionally warm, safe and gentle visual mood, soft natural lighting, clean composition, warm pastel color palette, premium children's book quality".
- 스타일별 키워드:
  premium_watercolor → "premium watercolor children's book illustration, soft watercolor texture, delicate hand-painted details".
  premium_realistic → "high-end educational photography style, realistic preschool classroom activity, warm natural light, safe kindergarten environment".
  premium_clay_3d → "premium clay 3D educational asset, soft rounded shapes, gentle toy-like material, clean transparent background".
- 용도별 권장 스타일: hero=premium_realistic, idea=premium_clay_3d, activity=premium_realistic, background/decoration=premium_watercolor.
- negativePrompt 공통: "cheap clipart, low-quality stock image, flat emoji style, meme style, anime style, pixel art, overly childish cartoon, scary expression, violent scene, unsafe classroom action, messy background".

규칙:
1. 놀이아이디어는 카드형으로 짧고 시각적으로.
2. 주차별 흐름은 4~5개.
3. 이미지 프롬프트는 유아 친화적·감성적·고급·안전.
4. 실제 이미지는 만들지 않는다(프롬프트 텍스트만).
5. 모든 텍스트는 한국어(prompt/negativePrompt 의 영문 제외).`;

export function buildInfographicPrompt(plan) {
  const user = `다음 월간 놀이계획을 인포그래픽용 MonthlyInfographicData JSON 으로 변환해줘.\n\n${JSON.stringify(
    plan,
    null,
    2
  )}`;
  return { system: SYSTEM, user };
}

// ── 월안 → "놀이중심 포스터 이미지 한 장"용 이미지 생성 프롬프트 (gpt-image) ──
// 스펙 v1.0(_image_document_separated.md): 표 변환 금지, 주차 구조 유지,
//   각 주차 놀이명을 "대표 작품(결과물)" 중심으로 시각화, 실사 기반 교육 잡지 스타일.
export function buildPosterImagePrompt(plan) {
  const b = plan?.basic_info || {};
  const theme = b.theme || "놀이 프로젝트";
  const life = b.life_theme || b.lifeTheme || "";
  const age = b.age_band || b.ageBand || "";
  const period = b.period?.label || [b.period?.start_date, b.period?.end_date].filter(Boolean).join(" ~ ") || "";

  const weeks = (plan?.weekly_flow || [])
    .slice(0, 5)
    .map((w, i) => {
      const sub = w.sub_theme || w.subTheme || `${i + 1}주차`;
      const plays = (w.play_ideas || w.plays || [])
        .slice(0, 4)
        .map((p) => (typeof p === "string" ? p : p.title))
        .filter(Boolean)
        .join(", ");
      return `${i + 1}주차 "${sub}"${plays ? ` — 놀이명: ${plays}` : ""}`;
    })
    .join("\n  ");

  const weekCount = (plan?.weekly_flow || []).slice(0, 5).length || 4;
  const headerInfo = [life && `생활주제 ${life}`, age && `연령 ${age}`, period && `기간 ${period}`]
    .filter(Boolean)
    .join(" · ");

  // gpt-image 용 "설명형" 프롬프트 (지시문 아님). 주차 구조 유지 + 작품(결과물) 중심.
  return [
    `Create ONE polished, vertical (portrait) Korean kindergarten play-based MONTHLY PLAN POSTER — magazine / editorial style, warm, friendly and cohesive, suitable for classroom display and parent notices.`,
    `Big colorful rounded Korean title at the top center: "${theme}".`,
    headerInfo && `A small header info ribbon below the title: "${headerInfo}", plus one short friendly intro sentence.`,
    `Show ${weekCount} weekly cards arranged neatly, each card with: a week badge, the play names, and especially a representative ARTIFACT/RESULT image — the things children actually make and create that week (crafts, drawings, color cards, collages, simple cooking results), plus a short caption.`,
    `Weekly content:`,
    `  ${weeks || "1주차 탐색 / 2주차 표현 / 3주차 요리 / 4주차 나눔"}`,
    `Also include small bottom sections: 주요 놀이자료(materials), 가정 연계(family connection), 교사 TIP.`,
    `Style: soft warm pastel palette, rounded section cards, cute but tasteful illustrations of children's play artifacts and gentle nature decorations, soft natural lighting, clean composition with generous whitespace, premium children's educational quality.`,
    `Emphasize the play artifacts/results rather than only play scenes. Do NOT make it a plain table or spreadsheet.`,
    `IMPORTANT: render all Korean text accurately, cleanly and clearly legible.`,
  ]
    .filter(Boolean)
    .join("\n");
}
