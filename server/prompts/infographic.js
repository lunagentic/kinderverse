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
// ▒▒ 버전 1 (기본) ▒▒
// 스펙 v1.0(_image_document_separated.md): 표 변환 금지, 주차 구조 유지,
//   각 주차 놀이명을 "대표 작품(결과물)" 중심으로 시각화, 실사 기반 교육 잡지 스타일.
export function buildPosterImagePromptV1(plan) {
  const b = plan?.basic_info || {};
  const theme = b.theme || "놀이 프로젝트";
  const life = b.life_theme || b.lifeTheme || "";
  const age = b.age_band || b.ageBand || "";
  const period = b.period?.label || [b.period?.start_date, b.period?.end_date].filter(Boolean).join(" ~ ") || "";
  const rationale = plan?.rationale?.summary || plan?.rationale?.text || "";

  const weeks = (plan?.weekly_flow || [])
    .slice(0, 5)
    .map((w, i) => {
      const sub = w.sub_theme || w.subTheme || `${i + 1}주차`;
      const plays = (w.play_ideas || w.plays || [])
        .map((p) => (typeof p === "string" ? p : p.title))
        .filter(Boolean)
        .join(", "); // 누락 없이 전부
      return `${i + 1}주 "${sub}"${plays ? ` — ${plays}` : ""}`;
    })
    .join("\n  ");

  const weekCount = (plan?.weekly_flow || []).slice(0, 5).length || 4;
  const headerInfo = [life && `생활주제 ${life}`, age && `연령 ${age}`, period && `기간 ${period}`]
    .filter(Boolean)
    .join(" · ");

  // 추가 섹션 데이터 (교사의 기대 / 바깥놀이 / 안전 / 인성)
  const expectations = (plan?.teacher_expectations || [])
    .map((e) => (typeof e === "string" ? e : e.goal || e.expectation || e.text))
    .filter(Boolean)
    .slice(0, 5)
    .join(" · ");
  const outdoor = (plan?.outdoor_and_physical_play || [])
    .map((o) => (typeof o === "string" ? o : o.activity_name || o.activityName || o.title))
    .filter(Boolean)
    .slice(0, 5)
    .join(", ");
  const se = plan?.safety_education || {};
  const safety = [se.play_safety, se.tool_safety, se.life_safety].filter(Boolean).join(" · ");
  const ce = plan?.character_education || {};
  const character = [ce.core_value, ce.practice_context].filter(Boolean).join(" — ");
  const events = (plan?.events || [])
    .map((e) => (typeof e === "string" ? e : [e.name, e.date].filter(Boolean).join(" ")))
    .filter((x) => x && x !== "-")
    .slice(0, 4)
    .join(", ");
  const hc = plan?.home_connection || {};
  const home = [
    hc.home_play && `놀이: ${hc.home_play}`,
    hc.parent_question && `질문: ${hc.parent_question}`,
    hc.recommended_picture_book && `추천도서: ${hc.recommended_picture_book}`,
  ]
    .filter(Boolean)
    .join(" · ");
  const curriculum = (plan?.curriculum_links || [])
    .map((c) => (typeof c === "string" ? c : c.area || c.category))
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 6)
    .join(", ");
  // 하단 푸터에 들어갈 보조 섹션(내용까지 — 누락/임의생성 방지). 가정연계·행사는 5주(빈칸 카드)면 제외.
  const footerItems = [
    curriculum && `교육과정 연계: ${curriculum}`,
    expectations && `교사의 기대: ${expectations}`,
    outdoor && `바깥놀이·신체활동: ${outdoor}`,
    safety && `안전교육: ${safety}`,
    character && `인성교육: ${character}`,
    weekCount !== 5 && home && `가정 연계: ${home}`,
    weekCount !== 5 && events && `이달의 행사: ${events}`,
  ].filter(Boolean);

  // gpt-image 용 "설명형" 프롬프트. 상단 히어로 + "예상 놀이 흐름" + 1~4주 2×2 그리드. 계획(예정) 어조.
  return [
    `Create ONE polished, vertical Korean kindergarten MONTHLY PLAN infographic poster — clean and modern, warm and friendly, soft pastel palette, rounded WHITE cards on a light background, generous whitespace. Premium preschool educational quality, suitable for classroom display and parent notices.`,
    `TOP HERO (one compact rounded card with a SOFT COLORED background fill — a warm theme-color tint, e.g. soft yellow/orange for a summer theme, NOT plain white): on the LEFT a SMALL friendly CUT-OUT clay 3D icon (cleanly isolated, NO frame/box, soft drop shadow) representing "${theme}" (e.g., a smiling sun mascot — keep it small); on the RIGHT a big bold rounded Korean title "${theme}" in a DEEPER accent color of that tint, below it a small subtitle "${headerInfo || "연령 · 기간"}", and one short friendly intro sentence (plan/upcoming tone)${rationale ? ` summarizing: "${rationale}"` : ""}.`,
    `Below the hero, a bold section heading "예상 놀이 흐름" with a small colorful accent (e.g. a short underline or leaf/sun motif beside it).`,
    `FINAL DESIGN polish (cohesive, premium, magazine-quality):`,
    `- HERO/title banner: a nicely balanced rounded colored banner with a subtle decorative frame or soft motif accents (tiny suns/leaves/dots in the theme color) around the edges; the title large, bold and clearly the focal point, well balanced with the cut-out mascot; gentle soft shadow.`,
    `- WEEK cards: consistent rounded corners + a subtle matching-color accent (thin border or a small top accent bar in that week's color) + soft drop shadow; small tasteful corner decorations (dots/sparkles/leaves) in each week's color; even spacing and aligned text.`,
    `- FOOTER: a cohesive row of compact chips/mini-cards sharing one style, each with a small rounded colored icon; aligned and tidy.`,
    `- OVERALL: one harmonious pastel palette, consistent corner radius and spacing, generous whitespace, balanced composition. Clean and premium — decorative but NOT cluttered.`,
    `Arrange the ${weekCount} weekly cards in a 2-COLUMN grid, filling left-to-right then top-to-bottom (4 weeks → 2x2; 5 weeks → 2x3 with the 5th card alone on its own bottom row). EACH weekly card has ITS OWN soft pastel BACKGROUND color — a DIFFERENT color family per week (1주 soft pink, 2주 mint green, 3주 lavender, 4주 peach, 5주 sky blue) — coordinated with its badge; TEXT IS THE FOCUS: (1) a SMALL CUT-OUT illustration depicting that week's PLAY activity AND the CHILDREN'S ARTWORK/creations from its play names (the things kids make & do: crafts, drawings, color cards, collages, simple cooking) — the subject is cleanly isolated with a soft drop shadow, NO rectangular frame/box/photo border, floating naturally like a sticker and may slightly overlap the card edge; keep it small/secondary (~1/4 of the card or less); (2) a small rounded PILL badge showing ONLY the short week label "1주"~"5주" (never "1주차"/"2주차") in that week's vivid color, next to a bold week TITLE (the theme text only) in a DEEPER shade of the SAME week color — do NOT repeat the week number in the title; (3) the FULL list of play names as the MAIN content — show EVERY play name with NONE omitted, each on its own line prefixed with a middot bullet "· " (e.g. "· 여름 날씨 캘린더 만들기"), WITHOUT any label such as "놀이명" or "놀이:" before it, in comfortably LARGE, bold, highly legible dark text. Give the play-name text area the most space in the card.`,
    `Weekly content (use these EXACT week titles and ALL play names — do not omit, shorten, merge, or invent any play name):`,
    `  ${weeks || "1주 여름의 시작 — 여름 날씨 알아보기, 여름의 색깔 찾기\n  2주 여름의 자연\n  3주 여름의 놀이\n  4주 여름의 예술"}`,
    weekCount === 5 &&
      `Because there are 5 weeks, the 2x3 grid has ONE empty cell next to the 5th week — fill that cell with a single rounded WHITE card (same style as the weekly cards) containing TWO compact stacked sections: (A) "가정 연계" (family connection) with a small home/heart icon and the text${home ? `: ${home}` : " (use the plan's home connection)"}; (B) "이달의 행사" (this month's events) with a small calendar/party icon and the text${events ? `: ${events}` : " (use the month's events)"}. Keep both tidy and clearly separated within the one card.`,
    footerItems.length &&
      `Below the grid, a compact footer area of small labeled cards/chips. Use EXACTLY this content for each label (do not omit any, do not invent):\n  ${footerItems.join("\n  ")}\nKeep the footer secondary and compact; the weekly grid stays the dominant visual.`,
    `WORDING: this is a PLAN for the upcoming month. All Korean copy (intro, week titles, play-name captions) must use plan/upcoming tone — e.g. "~해요", "~하기", "~해 볼까요?". Do NOT use past tense like "~했어요"/"~했습니다". Generate captions from the listed play names.`,
    `Style: soft warm pastel, rounded white container cards, cute tasteful illustrations centered on children's PLAY activities and the ARTWORK they create. ALL imagery is CUT-OUT / sticker style — subjects cleanly isolated with a soft drop shadow, NO rectangular photo frames or boxed images — placed to float and overlap naturally (not inside inner boxes). Soft natural lighting, clean GRID composition. Do NOT make it a plain table or spreadsheet.`,
    `IMPORTANT: render all Korean text accurately and clearly legible. Keep the hero + 2-column weekly grid layout exactly as described.`,
  ]
    .filter(Boolean)
    .join("\n");
}

// ── 월안 → 포스터 이미지 프롬프트 ──
// ▒▒ 버전 2 ▒▒
// 시작 시점에는 v1 과 동일한 복사본입니다. "이미지 v2" 버튼 결과만 이 함수가 만듭니다.
// 아래 내용을 자유롭게 수정해 v1 과 차이를 주세요. (v1 은 위 buildPosterImagePromptV1 그대로 유지)
export function buildPosterImagePromptV2(plan) {
  const b = plan?.basic_info || {};
  const theme = b.theme || "놀이 프로젝트";
  const life = b.life_theme || b.lifeTheme || "";
  const age = b.age_band || b.ageBand || "";
  const period = b.period?.label || [b.period?.start_date, b.period?.end_date].filter(Boolean).join(" ~ ") || "";
  const rationale = plan?.rationale?.summary || plan?.rationale?.text || "";

  const weeks = (plan?.weekly_flow || [])
    .slice(0, 5)
    .map((w, i) => {
      const sub = w.sub_theme || w.subTheme || `${i + 1}주차`;
      const plays = (w.play_ideas || w.plays || [])
        .map((p) => (typeof p === "string" ? p : p.title))
        .filter(Boolean)
        .join(", "); // 누락 없이 전부
      return `${i + 1}주 "${sub}"${plays ? ` — ${plays}` : ""}`;
    })
    .join("\n  ");

  const weekCount = (plan?.weekly_flow || []).slice(0, 5).length || 4;
  const headerInfo = [life && `생활주제 ${life}`, age && `연령 ${age}`, period && `기간 ${period}`]
    .filter(Boolean)
    .join(" · ");

  // 추가 섹션 데이터 (교사의 기대 / 바깥놀이 / 안전 / 인성)
  const expectations = (plan?.teacher_expectations || [])
    .map((e) => (typeof e === "string" ? e : e.goal || e.expectation || e.text))
    .filter(Boolean)
    .slice(0, 5)
    .join(" · ");
  const outdoor = (plan?.outdoor_and_physical_play || [])
    .map((o) => (typeof o === "string" ? o : o.activity_name || o.activityName || o.title))
    .filter(Boolean)
    .slice(0, 5)
    .join(", ");
  const se = plan?.safety_education || {};
  const safety = [se.play_safety, se.tool_safety, se.life_safety].filter(Boolean).join(" · ");
  const ce = plan?.character_education || {};
  const character = [ce.core_value, ce.practice_context].filter(Boolean).join(" — ");
  const events = (plan?.events || [])
    .map((e) => (typeof e === "string" ? e : [e.name, e.date].filter(Boolean).join(" ")))
    .filter((x) => x && x !== "-")
    .slice(0, 4)
    .join(", ");
  const hc = plan?.home_connection || {};
  const home = [
    hc.home_play && `놀이: ${hc.home_play}`,
    hc.parent_question && `질문: ${hc.parent_question}`,
    hc.recommended_picture_book && `추천도서: ${hc.recommended_picture_book}`,
  ]
    .filter(Boolean)
    .join(" · ");
  const curriculum = (plan?.curriculum_links || [])
    .map((c) => (typeof c === "string" ? c : c.area || c.category))
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 6)
    .join(", ");
  // 하단 푸터에 들어갈 보조 섹션(내용까지 — 누락/임의생성 방지). 가정연계·행사는 5주(빈칸 카드)면 제외.
  const footerItems = [
    curriculum && `교육과정 연계: ${curriculum}`,
    expectations && `교사의 기대: ${expectations}`,
    outdoor && `바깥놀이·신체활동: ${outdoor}`,
    safety && `안전교육: ${safety}`,
    character && `인성교육: ${character}`,
    weekCount !== 5 && home && `가정 연계: ${home}`,
    weekCount !== 5 && events && `이달의 행사: ${events}`,
  ].filter(Boolean);

  // gpt-image 용 "설명형" 프롬프트. 상단 히어로 + "예상 놀이 흐름" + 1~4주 2×2 그리드. 계획(예정) 어조.
  return [
    `Create ONE polished, vertical Korean kindergarten MONTHLY PLAN infographic poster — clean and modern, warm and friendly, soft pastel palette, rounded WHITE cards on a light background, generous whitespace. Premium preschool educational quality, suitable for classroom display and parent notices.`,
    `TOP HERO (one compact rounded card with a SOFT COLORED background fill — a warm theme-color tint, e.g. soft yellow/orange for a summer theme, NOT plain white): on the LEFT a SMALL friendly CUT-OUT clay 3D icon (cleanly isolated, NO frame/box, soft drop shadow) representing "${theme}" (e.g., a smiling sun mascot — keep it small); on the RIGHT a big bold rounded Korean title "${theme}" in a DEEPER accent color of that tint, below it a small subtitle "${headerInfo || "연령 · 기간"}", and one short friendly intro sentence (plan/upcoming tone)${rationale ? ` summarizing: "${rationale}"` : ""}.`,
    `Below the hero, a bold section heading "예상 놀이 흐름" with a small colorful accent (e.g. a short underline or leaf/sun motif beside it).`,
    `FINAL DESIGN polish (cohesive, premium, magazine-quality):`,
    `- HERO/title banner: a nicely balanced rounded colored banner with a subtle decorative frame or soft motif accents (tiny suns/leaves/dots in the theme color) around the edges; the title large, bold and clearly the focal point, well balanced with the cut-out mascot; gentle soft shadow.`,
    `- WEEK cards: consistent rounded corners + a subtle matching-color accent (thin border or a small top accent bar in that week's color) + soft drop shadow; small tasteful corner decorations (dots/sparkles/leaves) in each week's color; even spacing and aligned text.`,
    `- FOOTER: a cohesive row of compact chips/mini-cards sharing one style, each with a small rounded colored icon; aligned and tidy.`,
    `- OVERALL: one harmonious pastel palette, consistent corner radius and spacing, generous whitespace, balanced composition. Clean and premium — decorative but NOT cluttered.`,
    `Arrange the ${weekCount} weekly cards in a 2-COLUMN grid, filling left-to-right then top-to-bottom (4 weeks → 2x2; 5 weeks → 2x3 with the 5th card alone on its own bottom row). EACH weekly card has ITS OWN soft pastel BACKGROUND color — a DIFFERENT color family per week (1주 soft pink, 2주 mint green, 3주 lavender, 4주 peach, 5주 sky blue) — coordinated with its badge; TEXT IS THE FOCUS: (1) a SMALL CUT-OUT illustration depicting that week's PLAY activity AND the CHILDREN'S ARTWORK/creations from its play names (the things kids make & do: crafts, drawings, color cards, collages, simple cooking) — the subject is cleanly isolated with a soft drop shadow, NO rectangular frame/box/photo border, floating naturally like a sticker and may slightly overlap the card edge; keep it small/secondary (~1/4 of the card or less); (2) a small rounded PILL badge showing ONLY the short week label "1주"~"5주" (never "1주차"/"2주차") in that week's vivid color, next to a bold week TITLE (the theme text only) in a DEEPER shade of the SAME week color — do NOT repeat the week number in the title; (3) the FULL list of play names as the MAIN content — show EVERY play name with NONE omitted, each on its own line prefixed with a middot bullet "· " (e.g. "· 여름 날씨 캘린더 만들기"), WITHOUT any label such as "놀이명" or "놀이:" before it, in comfortably LARGE, bold, highly legible dark text. Give the play-name text area the most space in the card.`,
    `Weekly content (use these EXACT week titles and ALL play names — do not omit, shorten, merge, or invent any play name):`,
    `  ${weeks || "1주 여름의 시작 — 여름 날씨 알아보기, 여름의 색깔 찾기\n  2주 여름의 자연\n  3주 여름의 놀이\n  4주 여름의 예술"}`,
    weekCount === 5 &&
      `Because there are 5 weeks, the 2x3 grid has ONE empty cell next to the 5th week — fill that cell with a single rounded WHITE card (same style as the weekly cards) containing TWO compact stacked sections: (A) "가정 연계" (family connection) with a small home/heart icon and the text${home ? `: ${home}` : " (use the plan's home connection)"}; (B) "이달의 행사" (this month's events) with a small calendar/party icon and the text${events ? `: ${events}` : " (use the month's events)"}. Keep both tidy and clearly separated within the one card.`,
    footerItems.length &&
      `Below the grid, a compact footer area of small labeled cards/chips. Use EXACTLY this content for each label (do not omit any, do not invent):\n  ${footerItems.join("\n  ")}\nKeep the footer secondary and compact; the weekly grid stays the dominant visual.`,
    `WORDING: this is a PLAN for the upcoming month. All Korean copy (intro, week titles, play-name captions) must use plan/upcoming tone — e.g. "~해요", "~하기", "~해 볼까요?". Do NOT use past tense like "~했어요"/"~했습니다". Generate captions from the listed play names.`,
    `Style: soft warm pastel, rounded white container cards, cute tasteful illustrations centered on children's PLAY activities and the ARTWORK they create. ALL imagery is CUT-OUT / sticker style — subjects cleanly isolated with a soft drop shadow, NO rectangular photo frames or boxed images — placed to float and overlap naturally (not inside inner boxes). Soft natural lighting, clean GRID composition. Do NOT make it a plain table or spreadsheet.`,
    `IMPORTANT: render all Korean text accurately and clearly legible. Keep the hero + 2-column weekly grid layout exactly as described.`,
  ]
    .filter(Boolean)
    .join("\n");
}

// ── 버전 디스패처 ──
// version 2 → v2 프롬프트, 그 외(기본) → v1 프롬프트.
export function buildPosterImagePromptByVersion(plan, version = 1) {
  return Number(version) === 2 ? buildPosterImagePromptV2(plan) : buildPosterImagePromptV1(plan);
}

// 기존 호출부 호환용 별칭 (기본 = v1).
export function buildPosterImagePrompt(plan) {
  return buildPosterImagePromptV1(plan);
}
