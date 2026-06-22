// =============================================================================
// Phase 1 통합 테스트 — 월안 입력 → Design Recipe → Template Blueprint → Asset 연결 → Validation.
// 실행:  npx tsx client/src/test/phase1.test.ts
// (실제 이미지 생성/렌더/Export 없음 — 데이터 파이프라인만 검증)
// =============================================================================
import { buildDesign, collectAssetSlots } from "../builder";
import { summerMonthlyPlanInput } from "./sampleData";
import { validateAssetSlot, summerAssetFamily, allAssets } from "../asset-family";
import type { AssetSlot, TextElement, ShapeElement } from "../template-blueprint";
import { expect, it, summary } from "./expect";

const { designRecipe, templateBlueprint } = buildDesign(summerMonthlyPlanInput);
const slots = collectAssetSlots(templateBlueprint);
const catalogIds = new Set(allAssets(summerAssetFamily).map((a) => a.id));
const childOf = (type: string) =>
  templateBlueprint.layers.find((l) => l.type === type)?.children ?? [];

console.log("=== Phase 1 통합 테스트 (summerMonthlyPlanInput) ===\n");

// 1
it("templateFamily가 monthly_plan_v1", () => {
  expect(designRecipe.templateFamily).toBe("monthly_plan_v1");
});
// 2
it("themeFamily가 summer", () => {
  expect(designRecipe.themeFamily).toBe("summer");
});
// 3
it("styleFamily가 pixar_storybook", () => {
  expect(designRecipe.styleFamily).toBe("pixar_storybook");
  expect(templateBlueprint.styleFamily).toBe("pixar_storybook");
});
// 4
it("canvas가 1080 폭 + 세로형(>=1920)", () => {
  expect(templateBlueprint.canvas.width).toBe(1080);
  expect(templateBlueprint.canvas.height >= 1920).toBeTruthy();
  expect(templateBlueprint.canvas.editable).toBe(true);
});
// 5
it("layer가 5개 생성", () => {
  expect(templateBlueprint.layers).toHaveLength(5);
  expect(templateBlueprint.layers.map((l) => l.type)).toEqual([
    "background",
    "shape",
    "sticker",
    "decoration",
    "text",
  ]);
});
// 6
it("Week card가 4개 생성", () => {
  const weekCards = (childOf("shape") as ShapeElement[]).filter((c) => /^Week\dCard$/.test(c.id));
  expect(weekCards).toHaveLength(4);
});
// 7
it("Text element가 editable=true", () => {
  const texts = childOf("text") as TextElement[];
  expect(texts.length > 0).toBeTruthy();
  expect(texts.every((t) => t.editable === true)).toBeTruthy();
});
// 8
it("Shape element가 resizable=true", () => {
  const shapes = childOf("shape") as ShapeElement[];
  expect(shapes.length > 0).toBeTruthy();
  expect(shapes.every((s) => s.resizable === true)).toBeTruthy();
});
// 9
it("Sticker slot이 assetId를 가짐", () => {
  const stickers = childOf("sticker") as AssetSlot[];
  expect(stickers.length > 0).toBeTruthy();
  expect(stickers.every((s) => typeof s.assetId === "string" && s.assetId.length > 0)).toBeTruthy();
});
// 10
it("Decoration slot이 assetId를 가짐", () => {
  const decos = childOf("decoration") as AssetSlot[];
  expect(decos.length > 0).toBeTruthy();
  expect(decos.every((s) => typeof s.assetId === "string" && s.assetId.length > 0)).toBeTruthy();
});
// 11
it("Icon slot은 assetRole='icon'", () => {
  const icons = (childOf("sticker") as AssetSlot[]).filter((s) => s.assetId.startsWith("summer_icon_"));
  expect(icons).toHaveLength(6);
  expect(icons.every((s) => s.assetRole === "icon")).toBeTruthy();
});
// 12
it("모든 assetId가 Summer Asset Catalog에 존재", () => {
  expect(slots.length > 0).toBeTruthy();
  expect(slots.every((s) => catalogIds.has(s.assetId))).toBeTruthy();
});
// 13
it("존재하지 않는 assetId는 validation error", () => {
  expect(validateAssetSlot("summer_sun", "summer")).toBeTruthy();
  expect(() => validateAssetSlot("summer_unknown_asset", "summer")).toThrow();
});
// 14
it("모든 imageUrl이 null", () => {
  expect(slots.every((s) => s.imageUrl === null)).toBeTruthy();
});

// ── STEP 10 추가 완료 조건 ──
console.log("\n--- STEP 10 추가 완료 조건 ---");

// (1)
it("Sticker Layer에 Summer Asset Catalog 기반 asset slot 연결", () => {
  const stickers = childOf("sticker") as AssetSlot[];
  expect(stickers.length > 0).toBeTruthy();
  expect(stickers.every((s) => s.assetFamily === "summer" && catalogIds.has(s.assetId))).toBeTruthy();
});
// (2)
it("Decoration Layer에 Summer Asset Catalog 기반 decoration slot 연결", () => {
  const decos = childOf("decoration") as AssetSlot[];
  expect(decos.length > 0).toBeTruthy();
  expect(decos.every((s) => s.type === "decoration" && s.assetFamily === "summer" && catalogIds.has(s.assetId))).toBeTruthy();
});
// (3)
it("Learning Elements 아이콘은 assetRole='icon'으로 연결", () => {
  const icons = (childOf("sticker") as AssetSlot[]).filter((s) => s.assetId.startsWith("summer_icon_"));
  expect(icons).toHaveLength(6);
  expect(icons.every((s) => s.assetRole === "icon")).toBeTruthy();
});
// (4)
it("모든 assetId가 Summer Asset Catalog에 존재", () => {
  expect(slots.every((s) => catalogIds.has(s.assetId))).toBeTruthy();
});
// (5)
it("모든 imageUrl이 null", () => {
  expect(slots.every((s) => s.imageUrl === null)).toBeTruthy();
});
// (6)
it("undefined asset 연결이 없음", () => {
  expect(slots.every((s) => typeof s.assetId === "string" && s.assetId.length > 0)).toBeTruthy();
  expect(slots.every((s) => catalogIds.has(s.assetId))).toBeTruthy();
});
// (7)
it("실제 이미지 생성이 발생하지 않음 (이미지 데이터 0건)", () => {
  expect(slots.every((s) => s.imageUrl === null)).toBeTruthy();
  const json = JSON.stringify(templateBlueprint);
  expect(/data:image|base64|\.png|\.pdf/i.test(json)).toBe(false);
});

summary();
