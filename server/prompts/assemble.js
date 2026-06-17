// PROMPTS.md §0 — L0+L1+L2(+L3) 조립 + 출력 스키마 기반 목업 생성
import { L0_CHARTER, L1_PEDAGOGY, buildTenantBlock } from "./layers.js";
import { PLAN_FEATURES } from "./planFeatures.js";

const j = (obj) => JSON.stringify(obj, null, 2);

// L2 태스크 프롬프트 (역할 + 생성규칙 + 출력 스키마)
function buildTaskBlock(feature) {
  const rules = feature.rules.map((r) => `- ${r}`).join("\n");
  return [
    `[L2 태스크] feature_id=${feature.feature_id} · agent=${feature.agent} · output_type=${feature.output_type}`,
    `역할: ${feature.role}`,
    `생성 규칙:\n${rules}`,
    feature.extra ? feature.extra : "",
    `출력은 아래 JSON 스키마를 정확히 따른다. 빈 문자열/배열은 실제 내용으로 채운다. JSON 외 텍스트 금지:\n${j(feature.output_schema)}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

// 에이전트 프롬프트 = system(L0+L1+L2+L3) + user(입력 컨텍스트)
export function buildPlanPrompt(featureId, context = {}, tenant = {}) {
  const feature = PLAN_FEATURES[featureId];
  if (!feature) throw new Error(`unknown plan feature: ${featureId}`);

  const system = [
    L0_CHARTER,
    L1_PEDAGOGY,
    buildTaskBlock(feature),
    buildTenantBlock(tenant),
  ].join("\n\n──────────\n\n");

  const mergedInput = { ...feature.input_schema, ...context, feature_id: featureId };
  const teacherInput = (context.teacher_input || "").trim();
  const user = [
    teacherInput &&
      `교사 입력(원문) — 이 요청의 의도·주제·연령·요구사항을 최우선으로 반영하세요:\n"${teacherInput}"`,
    `위 교사 입력을 바탕으로 ${feature.label}(${feature.output_type})를 생성하세요. theme 등 컨텍스트 값이 비어 있으면 교사 입력 원문에서 추론해 채우세요. 입력과 무관한 일반적 내용을 임의로 생성하지 마세요.`,
    `보조 입력 컨텍스트(JSON):\n${j(mergedInput)}`,
    `출력: output_type="${feature.output_type}" 스키마를 따르는 JSON만 반환.`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return { feature, system, user, input: mergedInput };
}

// ── 출력 스키마 기반 목업 생성 (LLM 키가 없을 때 UI 동작용) ──
// 스키마를 복제하며 빈 슬롯을 컨텍스트 기반 placeholder로 채운다.
export function mockFromSchema(feature, context = {}) {
  const ctx = {
    age_band: context.age_band || "3-5세",
    theme: context.theme || "이달의 주제",
    sub_theme: context.sub_theme || `${context.theme || "주제"} 살펴보기`,
    season: context.season || "",
    month: context.month || "",
  };
  const ph = (key) => {
    if (/sub_theme/.test(key)) return ctx.sub_theme;
    if (/life_theme/.test(key)) return ctx.theme;
    if (/theme/.test(key)) return ctx.theme;
    if (/age/.test(key)) return ctx.age_band;
    if (/season/.test(key)) return ctx.season || "계절";
    if (/date/.test(key)) return "0000-00-00";
    if (/title|name|goal|summary|content|description|message|intro|meaning/.test(key))
      return `[${ctx.theme}] ${key.replace(/_/g, " ")} (예시)`;
    return `${key.replace(/_/g, " ")} 내용 (예시)`;
  };

  const fill = (node, key = "") => {
    if (Array.isArray(node)) {
      // 빈 배열이면 샘플 1개, 항목이 있으면 각 항목 채움
      if (node.length === 0) return [`${ctx.theme} 항목 (예시)`];
      return node.map((el, i) => fill(el, key));
    }
    if (node && typeof node === "object") {
      const out = {};
      for (const [k, v] of Object.entries(node)) out[k] = fill(v, k);
      return out;
    }
    if (typeof node === "string") {
      // "탐색|표현|..." 같은 enum 은 첫 값 사용, 빈 문자열은 placeholder
      if (node.includes("|")) return node.split("|")[0];
      if (node === "") return ph(key);
      return node; // 고정 라벨(예: flow_stage) 유지
    }
    return node;
  };

  return fill(feature.output_schema);
}
