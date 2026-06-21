// 선택적 LLM 호출 — provider 자동 선택
//   1) OPENAI_API_KEY 있으면 OpenAI(GPT) Chat Completions 호출
//   2) ANTHROPIC_API_KEY 있으면 Anthropic Messages 호출
//   3) 둘 다 없으면 null 반환 → 호출부가 스키마 기반 목업으로 폴백

export function activeProvider() {
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return null;
}

export function hasLLM() {
  return activeProvider() !== null;
}

// JSON만 추출 (코드펜스/잡텍스트 방어)
function extractJSON(text) {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}

async function callOpenAI({ system, user }) {
  const base = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.OPENAI_MODEL || "gpt-4o";
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) {
    console.warn(`[kinderverse] OpenAI ${res.status} — 목업으로 폴백`);
    return null;
  }
  const data = await res.json();
  return extractJSON(data?.choices?.[0]?.message?.content ?? "");
}

async function callAnthropic({ system, user }) {
  const base = (process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com").replace(/\/$/, "");
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
  const res = await fetch(`${base}/v1/messages`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) {
    console.warn(`[kinderverse] Anthropic ${res.status} — 목업으로 폴백`);
    return null;
  }
  const data = await res.json();
  const text = data?.content?.map((b) => b.text || "").join("") ?? "";
  return extractJSON(text);
}

export async function callLLM({ system, user }) {
  const provider = activeProvider();
  if (!provider) return null;
  try {
    return provider === "openai"
      ? await callOpenAI({ system, user })
      : await callAnthropic({ system, user });
  } catch (err) {
    console.warn(`[kinderverse] ${provider} 호출 실패 — 목업으로 폴백:`, err.message);
    return null;
  }
}

// ── 이미지 생성 (OpenAI 최신 이미지 모델 gpt-image-1) ──
// 성공 시 { dataUrl, model } 반환, 키 없음/실패 시 null → 호출부가 SVG 목업으로 폴백.
export function canGenerateImage() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export async function generateImage(prompt, opts = {}) {
  if (!canGenerateImage()) return null;
  const base = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2"; // 최신 (2026-04 출시)
  const size = opts.size || process.env.OPENAI_IMAGE_SIZE || "1024x1024";
  const quality = process.env.OPENAI_IMAGE_QUALITY || "high"; // low|medium|high|auto
  try {
    const res = await fetch(`${base}/images/generations`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({ model, prompt, size, quality, n: 1 }),
    });
    if (!res.ok) {
      console.warn(`[kinderverse] 이미지 ${res.status} — SVG 목업으로 폴백`);
      return null;
    }
    const data = await res.json();
    const item = data?.data?.[0];
    const b64 = item?.b64_json;
    if (b64) return { dataUrl: `data:image/png;base64,${b64}`, model };
    if (item?.url) return { dataUrl: item.url, model }; // 일부 모델은 url 반환
    return null;
  } catch (err) {
    console.warn("[kinderverse] 이미지 생성 실패 — SVG 목업으로 폴백:", err.message);
    return null;
  }
}

// ── 레퍼런스 이미지 컨디셔닝 (image-to-image, /images/edits) ──
// 레퍼런스(기준) 이미지의 그림체/분위기에 맞춰 새 이미지를 생성한다.
// 성공 시 { dataUrl, model }, 실패/미지원 시 null → 호출부가 일반 생성으로 폴백.
export async function generateImageWithReference(prompt, referenceDataUrl, opts = {}) {
  if (!canGenerateImage()) return null;
  if (!referenceDataUrl || typeof referenceDataUrl !== "string") return null;
  const base = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  // edits 지원 모델 (env 로 override 가능). 기본은 이미지 모델, 안되면 gpt-image-1.
  const model = process.env.OPENAI_IMAGE_EDIT_MODEL || process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
  const size = opts.size || process.env.OPENAI_IMAGE_SIZE || "1024x1024";
  try {
    const b64 = referenceDataUrl.split(",")[1];
    if (!b64) return null;
    const buffer = Buffer.from(b64, "base64");
    const form = new FormData();
    form.append("model", model);
    form.append("prompt", prompt);
    form.append("size", size);
    form.append("image", new Blob([buffer], { type: "image/png" }), "reference.png");
    const res = await fetch(`${base}/images/edits`, {
      method: "POST",
      headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, // content-type 은 FormData 가 설정
      body: form,
    });
    if (!res.ok) {
      console.warn(`[kinderverse] 이미지(edits) ${res.status} — 일반 생성으로 폴백`);
      return null;
    }
    const data = await res.json();
    const item = data?.data?.[0];
    if (item?.b64_json) return { dataUrl: `data:image/png;base64,${item.b64_json}`, model };
    if (item?.url) return { dataUrl: item.url, model };
    return null;
  } catch (err) {
    console.warn("[kinderverse] 이미지(edits) 실패 — 일반 생성으로 폴백:", err.message);
    return null;
  }
}
