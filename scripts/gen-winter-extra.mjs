// 겨울 추가 캐릭터: 북극곰 + 벙어리장갑 (Pixar, medium, 투명 PNG, gpt-image-1)
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "client", "public", "generated-assets");
mkdirSync(OUT, { recursive: true });

const PIXAR =
  "Pixar-style 3D rendered cute sticker, soft global illumination, smooth rounded clay-like surfaces, vibrant friendly winter colors, big charming adorable character, centered single subject, die-cut sticker look, isolated on a fully transparent background, no background, no text, no words, high quality kawaii kids illustration.";

const SUBJECTS = [
  { name: "stk-winter-5", subject: "an adorable fluffy white baby polar bear sitting and waving happily, wearing a small cozy red knit scarf" },
  { name: "stk-winter-6", subject: "a pair of cute cozy red and pink knitted winter mittens with a snowflake pattern" },
];

const API = "http://localhost:3001/api/weekcard-image";
async function genOne(s) {
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: `${s.subject}. ${PIXAR}`, size: "1024x1024", quality: "medium", background: "transparent", model: "gpt-image-1" }),
    signal: AbortSignal.timeout(240000),
  });
  const data = await res.json();
  if (!data?.src) throw new Error("no image");
  const buf = Buffer.from(data.src.replace(/^data:image\/\w+;base64,/, ""), "base64");
  writeFileSync(join(OUT, `${s.name}.png`), buf);
  return buf.length;
}
const results = [];
for (const s of SUBJECTS) {
  process.stdout.write(`generating ${s.name} ... `);
  try { const b = await genOne(s); console.log(`OK (${(b/1024).toFixed(0)}KB)`); results.push({ name: s.name, ok: true }); }
  catch (e) { console.log(`FAIL: ${e.message}`); results.push({ name: s.name, ok: false }); }
}
console.log("\nDONE:", JSON.stringify(results));
