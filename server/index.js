import express from "express";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));

// .env 자동 로드 (루트 또는 server/) — generate.js import 보다 먼저 실행되어야 함
for (const envPath of [join(__dirname, "..", ".env"), join(__dirname, ".env")]) {
  if (existsSync(envPath)) {
    try {
      process.loadEnvFile(envPath);
      console.log(`[verse] .env 로드: ${envPath}`);
    } catch (err) {
      console.warn(`[verse] .env 로드 실패(${envPath}):`, err.message);
    }
  }
}

const { generateItem, convertItem, generateInfographicPoster } = await import("./generate.js");
const { activeProvider } = await import("./prompts/index.js");
const app = express();
// 프로덕션(호스팅)은 PORT 를 주입받아 사용.
// 개발 프리뷰에서는 클라이언트(vite)가 PORT 를 쓰므로 서버는 API_PORT 로 분리(충돌 방지).
const isProd = process.env.NODE_ENV === "production";
const PORT = process.env.API_PORT || (isProd ? process.env.PORT : undefined) || 3001;

app.use(express.json());

// --- API ---
app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "verse", time: new Date().toISOString() });
});

// 채팅 프롬프트 → 보드 아이템 생성
app.post("/api/generate", async (req, res) => {
  const prompt = (req.body?.prompt || "").trim();
  if (!prompt) {
    return res.status(400).json({ error: "prompt 가 비어있습니다." });
  }
  try {
    const item = await generateItem(prompt);
    res.json(item);
  } catch (err) {
    console.error("[verse] generate error:", err);
    res.status(500).json({ error: "생성 중 오류가 발생했습니다." });
  }
});

// 카드 → 문서/이미지/디자인 템플릿 변환
app.post("/api/convert", async (req, res) => {
  const { format, title, content } = req.body || {};
  if (!["document", "image", "design"].includes(format)) {
    return res.status(400).json({ error: "format 은 document|image|design 중 하나여야 합니다." });
  }
  try {
    const result = await convertItem({ format, title, content });
    res.json(result);
  } catch (err) {
    console.error("[verse] convert error:", err);
    res.status(500).json({ error: "변환 중 오류가 발생했습니다." });
  }
});

// 월안 → 완성 인포그래픽 포스터 이미지 1장(gpt-image). 실패 시 src:null.
app.post("/api/infographic", async (req, res) => {
  const plan = req.body?.payload;
  if (!plan) return res.status(400).json({ error: "payload(월안)가 필요합니다." });
  try {
    const poster = await generateInfographicPoster(plan);
    res.json({ src: poster?.src || null, model: poster?.model || null });
  } catch (err) {
    console.error("[verse] infographic error:", err);
    res.json({ src: null });
  }
});

// --- 프로덕션: 빌드된 프론트엔드 서빙 ---
const clientDist = join(__dirname, "..", "client", "dist");
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (req, res) => res.sendFile(join(clientDist, "index.html")));
}

app.listen(PORT, () => {
  const provider = activeProvider();
  console.log(`[verse] API listening on http://localhost:${PORT}`);
  console.log(
    `[verse] LLM provider: ${provider || "없음 (목업 모드 — .env 에 OPENAI_API_KEY 설정)"}`
  );
});
