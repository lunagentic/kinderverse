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

  if (has("안내문", "가정통신문")) return "project_notice";
  if (has("미션", "놀이미션", "미션카드")) return "mission_card";
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
    bi.project_title ||
    payload?.play_name ||
    (bi.theme && bi.sub_theme && `${bi.theme} · ${bi.sub_theme}`) ||
    bi.theme ||
    `${ctx.theme || PLAN_FEATURES[featureId].label}`
  );
}

const PLAN_SIZES = {
  play_idea: { w: 360, h: 360 },
  mission_card: { w: 320, h: 360 },
  monthly_plan: { w: 420, h: 460 },
  weekly_plan: { w: 420, h: 440 },
  daily_plan: { w: 420, h: 480 },
  project_plan: { w: 440, h: 500 },
  project_notice: { w: 400, h: 460 },
};

const REPLY = {
  play_idea: "놀이아이디어",
  mission_card: "놀이미션카드",
  monthly_plan: "월간 놀이계획(월안)",
  weekly_plan: "주간 놀이계획(주안)",
  daily_plan: "일일 놀이계획(일안)",
  project_plan: "프로젝트 계획안",
  project_notice: "프로젝트 안내문",
};

async function generatePlan(featureId, prompt) {
  const ctx = buildContext(prompt);
  const feature = PLAN_FEATURES[featureId];
  const { system, user } = buildPlanPrompt(featureId, ctx);

  // LLM 우선, 실패/미설정 시 스키마 기반 목업
  const llm = await callLLM({ system, user });
  const payload = llm || mockFromSchema(feature, ctx);
  const source = llm ? "llm" : "mock";
  const srcLabel = source === "llm" ? "AI" : "목업";

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

export async function generateItem(prompt) {
  const featureId = detectFeature(prompt);
  if (featureId) return generatePlan(featureId, prompt);

  const p = prompt.toLowerCase();
  if (/이미지|사진|그림|image|photo|일러스트/.test(p)) return await makeImage(prompt);
  return makeDocument(prompt);
}
