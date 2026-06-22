// 임시: 여름 blueprint 에셋 전체 실제 생성 (백그라운드). 스티커 기본 low quality.
import { buildDesign } from "../builder";
import { generateAssetFromCatalog, createOpenAIImageClient } from "../asset-generator";
import { summerMonthlyPlanInput } from "./sampleData";
import type { AssetSlot } from "../template-blueprint";

const client = createOpenAIImageClient();
const { designRecipe, templateBlueprint } = buildDesign(summerMonthlyPlanInput);

const slots = templateBlueprint.layers.flatMap((l) =>
  l.children.filter((c): c is AssetSlot => typeof (c as AssetSlot).assetId === "string")
);
const seen = new Set<string>();
const unique = slots.filter((s) => (seen.has(s.assetId) ? false : (seen.add(s.assetId), true)));

console.log(`총 고유 에셋: ${unique.length} (기존 파일은 dedup 으로 skip)`);
let gen = 0, cached = 0, failed = 0, done = 0;
const t0 = Date.now();

for (const s of unique) {
  const a0 = Date.now();
  try {
    const r = await generateAssetFromCatalog({
      assetId: s.assetId,
      assetFamily: s.assetFamily,
      assetRole: s.assetRole,
      styleFamily: designRecipe.styleFamily,
      client,
      // quality 미지정 → 스티커 기본 low
    });
    done++;
    if (r.cached) cached++; else gen++;
    console.log(`[${done}/${unique.length}] ${s.assetId} ${r.cached ? "(cached)" : "(generated " + Math.round((Date.now() - a0) / 1000) + "s, low)"} -> ${r.imageUrl}`);
  } catch (e) {
    done++; failed++;
    console.log(`[${done}/${unique.length}] FAIL ${s.assetId}: ${e instanceof Error ? e.message : String(e)}`);
  }
}

console.log(`\nDONE generated=${gen} cached=${cached} failed=${failed} total=${unique.length} elapsed=${Math.round((Date.now() - t0) / 1000)}s`);
