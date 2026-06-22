// =============================================================================
// Phase 1 검증 샘플 — 엔진을 실제 월안 픽스처로 실행해 산출물을 점검한다.
// 실행:  npx tsx client/src/engine/__sample__/runSample.ts
// (UI 연결 없음 — 순수 엔진 검증)
// =============================================================================
import { buildDesignRecipe } from "../recipe/buildDesignRecipe";
import { buildTemplateBlueprint } from "../blueprint/buildTemplateBlueprint";
import type { MonthlyPlanRawData } from "../../renderer/types";
import rawFixture from "../../renderer/__fixtures__/monthlyPlan.sample.json";

const raw = rawFixture as unknown as MonthlyPlanRawData;

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`  ✗ FAIL: ${msg}`);
    process.exitCode = 1;
  } else {
    console.log(`  ✓ ${msg}`);
  }
}

console.log("\n===== Design Recipe =====");
const recipe = buildDesignRecipe(raw);
console.log("title:", recipe.meta.title, "| subtitle:", recipe.meta.subtitle);
console.log("sections:", recipe.sections.map((s) => `${s.id}(${s.emphasis})`).join(", "));
console.log("priorityOrder:", recipe.intent.priorityOrder.join(" > "));

assert(recipe.version === 1, "recipe.version === 1");
assert(recipe.sections.length > 0, "recipe has sections");
assert(
  recipe.sections.every((s) => Array.isArray(s.blocks) && s.blocks.length > 0),
  "every recipe section has ≥1 block"
);
assert(
  recipe.intent.priorityOrder.length === recipe.sections.length,
  "priorityOrder covers all sections"
);
assert(
  recipe.sections.some((s) => s.imageIntent && s.imageIntent.length > 0),
  "at least one section declares image intent (hero)"
);

console.log("\n===== Template Blueprint (document) =====");
const bp = buildTemplateBlueprint(recipe, "document");
const allSlots = bp.blocks.flatMap((b) => b.slots);
const editable = allSlots.filter((s) => s.editable);
const bound = allSlots.filter((s) => s.binding);
const byKind = allSlots.reduce<Record<string, number>>((m, s) => {
  m[s.kind] = (m[s.kind] || 0) + 1;
  return m;
}, {});

console.log("canvas:", `${bp.canvas.w}×${bp.canvas.h}`, "| bg:", bp.canvas.bg);
console.log("blocks:", bp.blocks.length, "| slots:", allSlots.length, "| byKind:", byKind);
console.log("editable slots:", editable.length, "| bound slots:", bound.length);
console.log("contentHeight:", bp.contentHeight, "| overflow:", bp.overflow);

assert(bp.blocks.length === recipe.sections.length, "blueprint blocks === recipe sections");
assert(allSlots.length > 0, "blueprint has slots");
assert(
  allSlots.every(
    (s) =>
      s.frame &&
      [s.frame.x, s.frame.y, s.frame.w, s.frame.h].every((n) => Number.isFinite(n))
  ),
  "every slot has a finite frame"
);
assert(
  allSlots.every((s) => s.frame.x >= 0 && s.frame.x + s.frame.w <= bp.canvas.w + 1),
  "every slot is within canvas width"
);
assert(editable.length > 0, "blueprint has editable slots");
assert(bound.length > 0, "blueprint has data-bound slots (reverse-sync ready)");
assert(
  bp.blocks.every((b) => b.slots.some((s) => s.role === "sectionTitle")),
  "every block has a section title slot"
);

console.log("\n----- sample: first block slots -----");
console.log(
  JSON.stringify(
    bp.blocks[0].slots.slice(0, 4).map((s) => ({
      id: s.id,
      kind: s.kind,
      role: s.role,
      editable: s.editable,
      frame: s.frame,
      text: s.kind === "text" ? s.text.slice(0, 24) : undefined,
      binding: s.binding?.path,
    })),
    null,
    2
  )
);

console.log(
  process.exitCode === 1
    ? "\n❌ Phase 1 검증 실패 (위 FAIL 확인)\n"
    : "\n✅ Phase 1 검증 통과 — Recipe → Blueprint 엔진 정상 동작\n"
);
