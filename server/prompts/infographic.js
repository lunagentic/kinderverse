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

  return [
    `너는 유치원·어린이집 교사를 위한 "놀이중심 월안 포스터" 디자이너다.`,
    `아래 월간 놀이계획을 교실 게시·학부모 안내·전시에 쓸 세로형 포스터 1장으로 디자인해라.`,
    ``,
    `[핵심 원칙]`,
    `- 월안을 표(table)로 그대로 옮기지 마라. 표/엑셀/일정표 스타일 금지.`,
    `- 주차 구조(1주~)는 유지한다.`,
    `- 각 주차의 "놀이명"을 중심으로, 그 놀이의 "대표 작품·결과물(artifact)"을 추론해 시각화한다.`,
    `  (예: "무지개 만들기"→무지개 창문 작품/색상표, "색 섞기 놀이"→색 배합 레시피 카드/컬러칩)`,
    `- 교사가 한눈에 "이번 주 아이들이 무엇을 만들고 표현하는가"를 알 수 있어야 한다.`,
    ``,
    `[이미지 비중] 놀이 작품·결과물 70% · 놀이 과정 20% · 설명 텍스트 10%.`,
    `[이미지 우선순위] 1) 완성 작품  2) 놀이 결과물  3) 놀이 재료  4) 놀이 장면.`,
    ``,
    `[스타일] 실사 기반(realistic). 실제 유치원 교실 분위기, 자연광, 따뜻한 색감,`,
    `  고급 교육 잡지 스타일, 깔끔한 인쇄용 품질, 실제 교구·전시 보드 느낌.`,
    `  금지: 과도한 캐릭터 일러스트, 아이콘만 나열, 주차별 텍스트만 배치, 놀이 장면만 크게.`,
    ``,
    `[레이아웃]`,
    `- 상단 Hero: 놀이주제 "${theme}"${life ? `, 생활주제 "${life}"` : ""}${age ? `, 연령 ${age}` : ""}${period ? `, 기간 ${period}` : ""}, 짧은 소개 문구.`,
    `- 본문: 주차별 카드(주차 제목 + 대표 작품 이미지 + 놀이명 2~4개 + 작품 설명):`,
    `  ${weeks || "1주 탐색 / 2주 표현 / 3주 요리 / 4주 나눔"}`,
    `- 하단: 주요 놀이자료, 가정연계, 교사 TIP.`,
    ``,
    `[중요] 모든 한국어 텍스트는 정확하고 또렷하게. 포스터는 "월안 설명 문서"가 아니라 "놀이를 시각화한 결과물"이다.`,
  ].join("\n");
}
