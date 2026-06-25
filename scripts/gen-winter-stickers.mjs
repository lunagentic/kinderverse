// 겨울 주제 Pixar 스티커 4종 + 테이프/압정 꾸밈 스티커 3종 생성 (quality=medium, 투명 배경 PNG)
// 실행 중인 서버(/api/weekcard-image)로 gpt-image 호출 → public/generated-assets 에 저장
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "client", "public", "generated-assets");
mkdirSync(OUT, { recursive: true });

const PIXAR =
  "Pixar-style 3D rendered cute sticker, soft global illumination, smooth rounded clay-like surfaces, vibrant friendly winter colors, big charming adorable character, centered single subject, die-cut sticker look, isolated on a fully transparent background, no background, no text, no words, no letters, high quality kawaii kids illustration.";
const SCRAP =
  "cute kindergarten scrapbook decoration, soft pastel colors, gentle subtle 3D depth and soft shadow, single object, isolated on a fully transparent background, no background, no text, no words, high quality.";

const SUBJECTS = [
  { name: "stk-winter-1", style: PIXAR, subject: "a cheerful little child wearing a warm winter coat and a knit beanie, holding a big round magnifying glass and looking through it with curious wonder" },
  { name: "stk-winter-2", style: PIXAR, subject: "an adorable chubby baby penguin wearing a cozy red knit scarf and matching beanie, standing and waving happily" },
  { name: "stk-winter-3", style: PIXAR, subject: "a cute fluffy little squirrel with a big bushy tail holding a brown acorn, wearing a tiny knitted winter scarf" },
  { name: "stk-winter-4", style: PIXAR, subject: "a single beautiful crystalline snowflake, soft icy blue and white, gently sparkling, symmetrical and pretty" },
  { name: "deco-tape-1", style: SCRAP, subject: "a single short strip of pastel mint washi masking tape with softly torn edges, semi-transparent, lying flat at a slight diagonal angle" },
  { name: "deco-tape-2", style: SCRAP, subject: "a single short strip of pastel peach washi masking tape with softly torn edges, semi-transparent, lying flat horizontally" },
  { name: "deco-pin-1", style: SCRAP, subject: "a single cute glossy round push pin thumbtack in a warm pastel color, viewed slightly from the top, small and friendly" },
];

const API = "http://localhost:3001/api/weekcard-image";

async function genOne(s) {
  const prompt = `${s.subject}. ${s.style}`;
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, size: "1024x1024", quality: "medium", background: "transparent", model: "gpt-image-1" }),
    signal: AbortSignal.timeout(240000),
  });
  const data = await res.json();
  if (!data?.src) throw new Error("no image returned");
  const b64 = data.src.replace(/^data:image\/\w+;base64,/, "");
  const buf = Buffer.from(b64, "base64");
  writeFileSync(join(OUT, `${s.name}.png`), buf);
  return { bytes: buf.length, model: data.model };
}

const results = [];
for (const s of SUBJECTS) {
  process.stdout.write(`generating ${s.name} ... `);
  try {
    const r = await genOne(s);
    console.log(`OK (${(r.bytes / 1024).toFixed(0)}KB, ${r.model})`);
    results.push({ name: s.name, ok: true });
  } catch (e) {
    console.log(`FAIL: ${e.message}`);
    results.push({ name: s.name, ok: false, err: e.message });
  }
}
console.log("\nDONE:", JSON.stringify(results));
