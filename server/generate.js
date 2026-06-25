// 채팅 프롬프트 → 보드 아이템 생성기
//
// PROMPTS.md 하네스(server/prompts)를 단일 출처로 사용한다.
//  1) 교사 입력을 feature_id + 입력 컨텍스트로 매핑
//  2) buildPlanPrompt 로 L0~L3 프롬프트 조립
//  3) ANTHROPIC_API_KEY 있으면 LLM 호출, 없으면 출력 스키마 기반 목업
//  4) 보드 아이템(type=plan)으로 래핑

import {
  PLAN_FEATURES,
  buildPlanPrompt,
  mockFromSchema,
  callLLM,
  generateImage,
  buildInfographicPrompt,
  buildPosterImagePrompt,
  buildPosterImagePromptByVersion,
} from "./prompts/index.js";

// ── 컨텍스트 파서 ──
function parseAgeBand(p) {
  if (/0\s*-\s*2|0~2|영아|만\s*0|만\s*1|만\s*2/.test(p)) return "0-2세";
  const m = p.match(/([0-5])\s*세/);
  if (m) return `${m[1]}세`;
  if (/3\s*-\s*5|3~5|유아/.test(p)) return "3-5세";
  return "3-5세";
}
function parseMonth(p) {
  const m = p.match(/(\d{1,2})\s*월/);
  return m ? Number(m[1]) : null;
}
function parseTheme(p) {
  const m = p.match(/['"“”「」『』]([^'"“”「」『』]+)['"“”「」『』]/);
  return m ? m[1].trim() : null;
}
function seasonOf(month) {
  if (!month) return "";
  if (month >= 3 && month <= 5) return "봄";
  if (month >= 6 && month <= 8) return "여름";
  if (month >= 9 && month <= 11) return "가을";
  return "겨울";
}

function buildContext(prompt) {
  const month = parseMonth(prompt);
  return {
    teacher_input: prompt, // 교사 입력 원문 — LLM 이 최우선으로 반영
    age_band: parseAgeBand(prompt),
    theme: parseTheme(prompt) || null,
    month: month ? `${month}월` : "",
    season: seasonOf(month),
  };
}

// ── feature 라우팅 (구체적인 것 먼저) ──
function detectFeature(prompt) {
  const p = prompt.toLowerCase();
  const has = (...kw) => kw.some((k) => p.includes(k.toLowerCase()));

  if (has("놀이기록", "놀이 기록", "기록")) return "play_story";
  if (has("안내문", "가정통신문")) return "project_notice";
  if (has("미션", "놀이미션", "미션카드")) return "mission_card";
  if (has("주제망", "주제 그물", "주제그물", "주제 망")) return "topic_web";
  if (has("프로젝트")) return "project_plan";
  if (has("월안", "월간")) return "monthly_plan";
  if (has("주안", "주간")) return "weekly_plan";
  if (has("일안", "일일")) return "daily_plan";
  if (has("놀이 아이디어", "놀이아이디어", "아이디어", "놀이계획")) return "play_idea";
  return null; // plan feature 아님 → 일반 폴백
}

// ── 보드 아이템 제목 추출 ──
function titleOf(featureId, payload, ctx) {
  const bi = payload?.basic_info || {};
  return (
    payload?.header?.title ||
    payload?.topic_web?.main_topic ||
    bi.project_title ||
    payload?.play_name ||
    (bi.theme && bi.sub_theme && `${bi.theme} · ${bi.sub_theme}`) ||
    bi.theme ||
    `${ctx.theme || PLAN_FEATURES[featureId].label}`
  );
}

const PLAN_SIZES = {
  play_story: { w: 400, h: 480 }, // 내용 plan 카드(미리보기) — 🖼/🎨 버튼으로 결과물 생성

  play_idea: { w: 360, h: 360 },
  mission_card: { w: 320, h: 360 },
  monthly_plan: { w: 420, h: 460 },
  weekly_plan: { w: 420, h: 440 },
  daily_plan: { w: 420, h: 480 },
  project_plan: { w: 440, h: 500 },
  project_notice: { w: 400, h: 460 },
  topic_web: { w: 460, h: 560 },
};

const REPLY = {
  play_story: "놀이기록",
  play_idea: "놀이아이디어",
  mission_card: "놀이미션카드",
  monthly_plan: "월간 놀이계획(월안)",
  weekly_plan: "주간 놀이계획(주안)",
  daily_plan: "일일 놀이계획(일안)",
  project_plan: "프로젝트 계획안",
  project_notice: "프로젝트 안내문",
  topic_web: "놀이중심 주제망",
};

async function generatePlan(featureId, prompt, images = []) {
  const ctx = buildContext(prompt);
  const feature = PLAN_FEATURES[featureId];
  const { system, user } = buildPlanPrompt(featureId, ctx);

  // LLM 우선, 실패/미설정 시 스키마 기반 목업
  const llm = await callLLM({ system, user });
  const payload = llm || mockFromSchema(feature, ctx);
  const source = llm ? "llm" : "mock";
  const srcLabel = source === "llm" ? "AI" : "목업";

  // 놀이기록: 업로드한 사진(최대 20장)을 카드에 그대로 배치 (AI 분석 없음)
  if (featureId === "play_story" && Array.isArray(images) && images.length) {
    payload.photos = images.slice(0, 20);
  }

  // 놀이아이디어: 아이디어마다 개별 카드로 분리
  if (featureId === "play_idea" && Array.isArray(payload.ideas) && payload.ideas.length) {
    const items = payload.ideas.map((idea, i) => ({
      type: "plan",
      data: {
        feature_id: "play_idea",
        output_type: feature.output_type,
        title: idea.title || `놀이 ${i + 1}`,
        age_band: ctx.age_band,
        payload: { ideas: [idea] },
        source,
      },
      size: { w: 300, h: 320 },
    }));
    return {
      items,
      reply: `놀이아이디어 ${items.length}개를 각각 카드로 추가했어요 (${srcLabel}). 카드를 자유롭게 옮겨 배치하세요.`,
    };
  }

  const title = titleOf(featureId, payload, ctx);

  // 놀이기록: 내용 plan 카드로 생성 → 카드의 🖼(이미지)·🎨(편집 디자인) 버튼으로 결과물 생성
  if (featureId === "play_story") {
    return {
      items: [{
        type: "plan",
        data: { feature_id: featureId, output_type: feature.output_type, title, age_band: ctx.age_band, payload, source },
        size: PLAN_SIZES.play_story,
      }],
      reply: `놀이기록 "${title}" 생성 완료 (${srcLabel}). 카드의 🎨(편집 디자인)·🖼(이미지) 버튼으로 만들어 보세요.`,
    };
  }

  const item = {
    type: "plan",
    data: { feature_id: featureId, output_type: feature.output_type, title, age_band: ctx.age_band, payload, source },
    size: PLAN_SIZES[featureId] || { w: 400, h: 440 },
  };
  return {
    items: [item],
    reply: `${REPLY[featureId]} "${title}" 생성 완료 (${srcLabel}). 더블클릭으로 JSON 편집 가능.`,
  };
}

// ── 일반 폴백 (이미지/템플릿/문서) ──
function deriveTitle(prompt) {
  let t = prompt
    .replace(/만들어줘|만들어|생성해줘|생성|그려줘|그려|작성해줘|작성|해줘|좀|please|create|make|generate/gi, "")
    .replace(/[.!?~]+$/g, "")
    .trim();
  if (t.length > 40) t = t.slice(0, 40) + "…";
  return t || "새 항목";
}
// 이미지 묘사 추출 (명령어 제거, 유아 교육용 일러스트 힌트 부가)
function cleanImagePrompt(prompt) {
  let t = prompt
    .replace(/이미지|사진|그림|일러스트|image|photo|만들어줘|만들어|생성해줘|생성|그려줘|그려|해줘|좀/gi, "")
    .replace(/['"“”「」『』]/g, "")
    .replace(/[.!?~]+$/g, "")
    .trim();
  return t || "유아 교실 놀이 장면";
}

function svgMockImage(title) {
  const safe = title.replace(/[<&>]/g, "");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#D97757"/><stop offset="1" stop-color="#E8A87C"/>
  </linearGradient></defs>
  <rect width="400" height="300" fill="url(#g)"/>
  <text x="200" y="150" font-family="system-ui, sans-serif" font-size="22" fill="white"
        text-anchor="middle" dominant-baseline="middle" font-weight="600">${safe}</text>
  <text x="200" y="180" font-family="system-ui, sans-serif" font-size="12"
        fill="rgba(255,255,255,0.85)" text-anchor="middle">AI 생성 이미지 (목업)</text></svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

async function makeImage(prompt) {
  const desc = cleanImagePrompt(prompt);
  const title = deriveTitle(prompt);

  const img = await generateImage(desc);
  if (img) {
    return {
      items: [
        {
          type: "image",
          data: { src: img.dataUrl, alt: desc, source: "openai", model: img.model },
          size: { w: 320, h: 320 },
        },
      ],
      reply: `"${title}" 이미지를 GPT(${img.model})로 생성했어요.`,
    };
  }

  // 키 없음/실패 → SVG 목업
  return {
    items: [
      {
        type: "image",
        data: { src: svgMockImage(title), alt: title, source: "mock" },
        size: { w: 320, h: 240 },
      },
    ],
    reply: `"${title}" 이미지(목업)를 추가했어요. GPT 이미지 생성을 쓰려면 .env 에 OPENAI_API_KEY 를 설정하세요.`,
  };
}
function makeDocument(prompt) {
  const title = deriveTitle(prompt);
  const body = [
    `${title}에 대한 내용입니다.`,
    "",
    "• 더블클릭하면 편집할 수 있어요.",
    "• 유치원 문서는 '월안/주안/일안/놀이미션/프로젝트 계획·안내문/놀이 아이디어' 키워드로 생성하세요.",
  ].join("\n");
  return {
    items: [{ type: "document", data: { title, body }, size: { w: 320, h: 220 } }],
    reply: `"${title}" 문서를 추가했어요. 더블클릭하면 편집됩니다.`,
  };
}

// ── 카드 → 문서 / 이미지 / 편집 가능한 디자인 템플릿 변환 ──
const DESIGN_PALETTES = [
  { accent: "#d97757", bg: "#fbeee6" },
  { accent: "#c2613f", bg: "#f8e4d8" },
  { accent: "#b86b4b", bg: "#f6efe7" },
  { accent: "#cf8a3b", bg: "#fdf3e3" },
];
function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// ── 월안 → 인포그래픽 데이터(LLM 변환) ──
// 성공 시 MonthlyInfographicData JSON 반환, 키 없음/실패 시 null → 클라이언트가 결정적 빌더로 폴백.
export async function generateInfographic(plan) {
  if (!plan || typeof plan !== "object") return null;
  const { system, user } = buildInfographicPrompt(plan);
  const data = await callLLM({ system, user });
  if (data && data.title && Array.isArray(data.keyPlayIdeas)) return data;
  return null; // 형식 불충분 → 폴백
}

// 월안 → 완성 인포그래픽 포스터 이미지 1장 (gpt-image). 실패 시 null.
// version: 1(기본) | 2 — "이미지 v1"/"이미지 v2" 버튼이 전달.
export async function generateInfographicPoster(plan, version = 1) {
  if (!plan || typeof plan !== "object") return null;
  const prompt = buildPosterImagePromptByVersion(plan, version);
  const img = await generateImage(prompt, { size: "1024x1536" });
  if (!img) return null;
  return { src: img.dataUrl, model: img.model, prompt, version: Number(version) === 2 ? 2 : 1 };
}

// 놀이기록 이미지 유형별 레이아웃 스타일 (gpt-image 프롬프트용)
const IMAGE_VARIANT_STYLE = {
  card: "따뜻한 크림색 배경의 키즈 매거진형 인포그래픽 포스터. (1) 상단 가운데에 둥근 알약 모양 '우리반 놀이기록' 배지, 그 바로 아래 아주 큰 둥근 글씨 제목(핵심 단어 1개만 밝은 강조색으로 크게 강조), 이어서 2~3줄의 가운데 정렬 부제. (2) 제목 양옆과 포스터 네 모서리에 주제에 어울리는 귀엽고 아기자기한 일러스트 장식. (3) 본문은 둥근 모서리 크림색 카드들을 잡지처럼 크기를 다양하게 배치 — 맨 위 한두 개는 사진 2~3장이 들어가는 넓고 큰 카드, 그 아래는 사진 1~2장이 들어가는 3열의 중간 카드들. 각 카드 = 작은 컬러 아이콘 + 굵은 컬러 제목 + 둥근 모서리 프레임의 '사실적인 유아 활동 사진' 1~3장 + 그 아래 1~2줄 설명. 카드 사이 간격은 가지런하게. (4) 맨 아래에 둥근 패널 2개를 나란히: 왼쪽 '놀이 속 배움'(하트 불릿 항목 목록), 오른쪽 '교사의 지원'(체크 불릿 항목 목록). 하단 가장자리에도 주제 일러스트 장식. 전체적으로 사진은 사실적이고, 제목·장식만 일러스트.",
  canvas: "따뜻한 크림색 종이 질감 배경의 스크랩북/콜라주형 포스터. (1) 좌상단에 두 줄로 된 아주 큰 둥근 글씨 제목(첫 단어와 둘째 단어를 서로 다른 밝은 색으로), 옆에 주제 장식(예: 눈송이). 제목 아래 2~3줄의 소개 문단. (2) 본문은 실제 유아 활동 사진들을 스크랩북처럼 자유롭게 흩어 배치 — 각 사진은 흰 폴라로이드 테두리에 살짝 기울어지고, 노란 압정이나 마스킹테이프로 붙인 듯한 느낌, 크기도 다양하게. (3) 곳곳에 귀여운 픽사풍 3D 마스코트(주제에 맞는 계절 동물·아이 캐릭터 2~3개)와 자연 장식(솔방울·나뭇가지·눈송이·잎 등). (4) 맨 아래에는 둥근 패널 없이 크림 배경 위에 라벨 3개를 세로로 쌓아 배치 — 작은 컬러 알약 라벨('놀이의 흐름' · '놀이 속 배움' · '교사의 지원') + 각 1~2줄 설명 문단. 사진은 사실적이고, 마스코트·장식만 픽사풍 3D 일러스트.",
  story: "부드러운 민트그린 그라데이션 배경(하단엔 잔디·꽃, 곳곳에 구름·새싹)의 키즈 인포그래픽 포스터. (1) 좌상단에 새싹 단 귀여운 픽사풍 3D 지구 캐릭터, 그 옆에 아주 큰 둥근 글씨 제목(핵심 단어는 밝은 그라데이션으로 강조), 제목 아래 나무 판자 모양 '놀이기록' 배지. 우상단엔 초록 비니를 쓰고 화분을 든 귀여운 3D 아이 캐릭터. (2) 좌측에 정보 칩 4개(놀이기간·활동명·반이름·연령)를 작은 아이콘과 파스텔 배경으로 세로로 쌓아 배치. (3) 상단 가운데에 노란 압정으로 붙인 듯한 실제 활동 사진 3~4장 묶음. (4) 좌측에 '놀이의 흐름' 라벨 + 소개 문단(옆에 귀여운 재활용 쓰레기통 캐릭터·새싹). (5) 본문은 1번부터 번호가 매겨진 둥근(원형) 실제 유아 사진들이 지그재그로 흐른다. **가장 중요: 연속한 두 사진(1→2, 2→3, 3→4 …)을 빠짐없이 또렷한 색의 '곡선 점선 화살표'(끝에 분명한 화살촉)로 연결해, 1번부터 마지막 번호까지 진행 순서가 한눈에 보이게 한다.** 화살표는 노랑·민트·파랑·보라·주황·핑크처럼 칸마다 색을 달리하고, 줄이 바뀔 때도(우→좌, 아래로) 화살표로 자연스럽게 이어 흐름이 끊기지 않게 한다. 각 사진 아래에는 1~2줄 캡션. (6) 맨 아래에 둥근 패널 2개: 왼쪽 '놀이 속 배움'(별 불릿 목록), 오른쪽 '교사의 지원'(하트/체크 불릿 목록), 우측 하단엔 확성기를 든 귀여운 3D 아이 캐릭터. 사진은 사실적이고, 캐릭터·장식만 픽사풍 3D 일러스트.",
};

export async function convertItem({ format, title, content, variant }) {
  const t = (title || "변환 결과").trim();
  const text = (content || "").trim();

  if (format === "document") {
    return {
      items: [{ type: "document", data: { title: t, body: text }, size: { w: 340, h: 300 } }],
      reply: `"${t}" 내용을 문서로 만들었어요. 더블클릭하면 편집됩니다.`,
    };
  }

  if (format === "image") {
    // 주제망 — 마인드맵형 인포그래픽 (사진 없이 일러스트)
    if (variant === "topicweb") {
      const prompt = [
        `한국 유아교육용 '놀이중심 주제망(마인드맵)' 인포그래픽 포스터를 1장 디자인해줘.`,
        `대주제: "${t}".`,
        `주제망 내용(대주제 → 소주제 → 놀이 아이디어, 그리고 환경 구성·유아의 예상 질문):`,
        text.slice(0, 900),
        `레이아웃: 가운데에 큰 원형 노드(대주제 제목 + 귀여운 주제 일러스트). 그 둘레에 번호가 매겨진 소주제 원 5~6개를 방사형으로 배치하고, 각 소주제 원은 색이 서로 다르며(파랑·초록·핑크·보라·노랑) 작은 아이콘 일러스트와 1~2줄 설명을 담는다. 각 소주제 원은 가운데 대주제와 선으로 연결하고, 바로 옆에 같은 색 테두리의 둥근 '놀이 아이디어' 박스(불릿 목록)를 연결한다. 맨 아래에는 둥근 패널 2개: 왼쪽 '환경 구성'(집 아이콘 + 작은 아이콘이 붙은 항목을 2열로), 오른쪽 '유아의 예상 질문'(물음표 아이콘 + 질문을 2열로). 맨 아래 가운데에는 한 줄 요약 알약 배너(별·하트 장식).`,
        `스타일: 부드러운 파스텔 색감, 둥근 손글씨풍 한글, 귀엽고 깔끔한 유아 일러스트, 흰 배경, 마인드맵형 인포그래픽. 사진은 넣지 말고 전부 일러스트로. 세로형 포스터.`,
        `한국어 텍스트는 정확하고 읽기 쉽게.`,
      ].join("\n");
      const img = await generateImage(prompt, { size: "1024x1024" });
      if (img) {
        return {
          items: [{ type: "image", data: { src: img.dataUrl, alt: t, source: "openai", model: img.model }, size: { w: 460, h: 460 } }],
          reply: `주제망 "${t}" 이미지를 GPT(${img.model})로 만들었어요.`,
        };
      }
      return {
        items: [{ type: "image", data: { src: svgMockImage(t), alt: t, source: "mock" }, size: { w: 360, h: 360 } }],
        reply: `주제망 "${t}" 이미지(목업)를 만들었어요. .env 에 OPENAI_API_KEY 설정 시 실제 이미지 생성.`,
      };
    }
    const variantStyle = IMAGE_VARIANT_STYLE[variant];
    const prompt = [
      `한국 유아교육용 '놀이기록' 인포그래픽 포스터를 1장 디자인해줘.`,
      `제목: "${t}".`,
      `내용(이 항목들을 섹션/카드로 배치):`,
      text.slice(0, 700),
      variantStyle ? `레이아웃: ${variantStyle}` : "",
      `중요: 유아들의 활동 사진(사진 프레임)을 반드시 12장 포함해 풍성하게 구성한다. 4~5장만 넣지 말 것.`,
      `스타일: 부드러운 수채화풍 일러스트, 파스텔·따뜻한 색감, 둥근 모서리 섹션 카드, 귀여운 유아·자연·놀이 일러스트, 깔끔한 한국어 제목과 짧은 설명 텍스트, 잡지 같은 정돈된 레이아웃. 세로형 포스터.`,
      `한국어 텍스트는 정확하고 읽기 쉽게.`,
    ].filter(Boolean).join("\n");
    const img = await generateImage(prompt, { size: "1024x1536" });
    if (img) {
      return {
        items: [{ type: "image", data: { src: img.dataUrl, alt: t, source: "openai", model: img.model }, size: { w: 360, h: 540 } }],
        reply: `"${t}" 이미지를 GPT(${img.model})로 만들었어요.`,
      };
    }
    return {
      items: [{ type: "image", data: { src: svgMockImage(t), alt: t, source: "mock" }, size: { w: 320, h: 240 } }],
      reply: `"${t}" 이미지(목업)를 만들었어요. .env 에 OPENAI_API_KEY 설정 시 실제 이미지 생성.`,
    };
  }

  // design: element 기반 DesignDoc (텍스트·이미지·도형이 개별 편집 단위로 분리)
  const lines = text.split("\n").map((s) => s.trim()).filter(Boolean);
  const doc = buildDesignDoc(t, lines);
  const ratio = doc.frame.h / doc.frame.w;
  return {
    items: [
      {
        type: "designdoc",
        data: doc,
        size: { w: 320, h: Math.round(320 * ratio) },
      },
    ],
    reply: `"${t}" 편집 가능한 디자인으로 만들었어요. 텍스트·이미지·도형이 각각 분리되어 있어요(편집 기능은 다음 단계).`,
  };
}

// 콘텐츠 → DesignDoc (포스터 템플릿: 헤더/대표이미지/항목 카드)
function buildDesignDoc(title, lines) {
  const W = 960;
  const palette = DESIGN_PALETTES[hashStr(title) % DESIGN_PALETTES.length];
  const subtitle = lines[0] || "";
  const items = lines.slice(1, 6); // 항목 카드 최대 5개
  const startY = 600;
  const rowH = 130;
  const H = startY + items.length * rowH + 40;

  const els = [
    // 헤더 배경 + 제목
    { id: "hdr", type: "shape", x: 40, y: 40, w: W - 80, h: 150,
      style: { bg: palette.bg, radius: 24 } },
    { id: "title", type: "text", x: 70, y: 70, w: W - 140, h: 92,
      text: title,
      style: { fontSize: 52, weight: 800, color: palette.accent, align: "center" } },
    // 대표 이미지 슬롯(AI 생성용) + 부제
    { id: "hero", type: "image", x: 40, y: 210, w: W - 80, h: 300,
      src: null, prompt: `${title} 대표 일러스트, 수채화풍`, fit: "cover" },
    { id: "sub", type: "text", x: 70, y: 525, w: W - 140, h: 56,
      text: subtitle || "부제목을 입력하세요",
      style: { fontSize: 24, weight: 600, color: "#5c5249", align: "center" } },
  ];

  // 항목 카드(도형 + 번호 + 텍스트)
  items.forEach((line, i) => {
    const y = startY + i * rowH;
    els.push(
      { id: `card${i}`, type: "shape", x: 40, y, w: W - 80, h: rowH - 20,
        style: { bg: "#ffffff", radius: 16 } },
      { id: `num${i}`, type: "shape", x: 64, y: y + 24, w: 56, h: 56,
        style: { bg: palette.accent, radius: 28 } },
      { id: `txt${i}`, type: "text", x: 140, y: y + 18, w: W - 200, h: rowH - 50,
        text: line,
        style: { fontSize: 22, weight: 500, color: "#3f3833", align: "left" } }
    );
  });

  return {
    output_type: "DesignDoc",
    title,
    frame: { w: W, h: H, bg: "#fbf7f0" },
    elements: els,
  };
}

export async function generateItem(prompt, images = []) {
  const featureId = detectFeature(prompt);
  if (featureId) return generatePlan(featureId, prompt, images);

  const p = prompt.toLowerCase();
  if (/이미지|사진|그림|image|photo|일러스트/.test(p)) return await makeImage(prompt);
  return makeDocument(prompt);
}
