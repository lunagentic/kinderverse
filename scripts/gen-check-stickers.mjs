// 체크 꾸밈 스티커 3종(연보라·연주황·연파랑) 생성 (medium, 투명 PNG, gpt-image-1)
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "client", "public", "generated-assets");
mkdirSync(OUT, { recursive: true });

const STYLE =
  "cute kindergarten scrapbook sticker, glossy soft 3D, gentle soft shadow, single object centered, thick subtle white die-cut sticker border, isolated on a fully transparent background, no background, no text, no words, high quality kawaii.";

const SUBJECTS = [
  { name: "deco-check-purple", subject: "a cute rounded check mark (tick ✓ symbol) in soft pastel lavender purple" },
  { name: "deco-check-orange", subject: "a cute rounded check mark (tick ✓ symbol) in soft pastel peach orange" },
  { name: "deco-check-blue", subject: "a cute rounded check mark (tick ✓ symbol) in soft pastel sky blue" },
];

const API = "http://localhost:3001/api/weekcard-image";
async function genOne(s) {
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: `${s.subject}. ${STYLE}`, size: "1024x1024", quality: "medium", background: "transparent", model: "gpt-image-1" }),
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
