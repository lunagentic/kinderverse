// 환경지킴이 꾸미기 스티커 5종 생성·저장 (Pixar 느낌, quality=medium)
// 실행 중인 서버(/api/weekcard-image)로 gpt-image 호출 → PNG 저장
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "client", "public", "generated-assets", "eco");
mkdirSync(OUT, { recursive: true });

const STYLE =
  "Pixar-style 3D rendered cute sticker, soft global illumination, smooth rounded clay-like surfaces, vibrant friendly colors, big charming character, thick subtle white die-cut sticker border, centered single subject, isolated on a plain solid white background, no text, no words, no letters, high quality, adorable kawaii kids illustration.";

const SUBJECTS = [
  { name: "01-earth", subject: "a happy smiling planet Earth globe with rosy cheeks and a small green sprout growing on top" },
  { name: "02-kid-plant", subject: "a cheerful little child wearing a green knit beanie and overalls, holding a terracotta flower pot with a young green sprout, big smile" },
  { name: "03-recycle-bin", subject: "a cute green recycling bin character with a friendly smiling face and the white recycle arrows symbol on the front" },
  { name: "04-nature", subject: "a beautiful little cluster of nature: colorful daisies and flowers, fresh green leaves and grass with tiny clouds, soft and lovely" },
  { name: "05-lightbulb", subject: "an eco idea light bulb glowing warmly with a small green sprout leaf growing inside it, cute and friendly" },
];

const API = "http://localhost:3001/api/weekcard-image";

async function genOne(s) {
  const prompt = `${s.subject}. ${STYLE}`;
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, size: "1024x1024", quality: "medium" }),
    signal: AbortSignal.timeout(180000),
  });
  const data = await res.json();
  if (!data?.src) throw new Error("no image returned");
  const b64 = data.src.replace(/^data:image\/\w+;base64,/, "");
  const file = join(OUT, `${s.name}.png`);
  writeFileSync(file, Buffer.from(b64, "base64"));
  return { file, model: data.model, bytes: Buffer.from(b64, "base64").length };
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
