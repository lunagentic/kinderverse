// =============================================================================
// Phase 2 테스트 — GPT 에셋 생성 엔진 (mock 클라이언트, 비용 0).
// 실행:  npx tsx client/src/test/phase2.test.ts
// 실제 GPT 호출 없이 전체 파이프라인(프롬프트·저장·중복방지·imageUrl 연결)을 검증.
// =============================================================================
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildEditableTemplateWithGeneratedAssets,
  generateAssetFromCatalog,
  createMockImageClient,
  buildAssetPrompt,
} from "../asset-generator";
import { summerMonthlyPlanInput } from "./sampleData";
import { summerAssetFamily, allAssets } from "../asset-family";
import type { AssetSlot } from "../template-blueprint";
import { expect, it, summary } from "./expect";

const mock = createMockImageClient();

console.log("=== Phase 2 (GPT 에셋 생성 엔진, mock) ===\n");

// 전체 빌드 (mock, 강제 재생성으로 결정적 상태)
const { designRecipe, templateBlueprint } = await buildEditableTemplateWithGeneratedAssets(
  summerMonthlyPlanInput,
  { client: mock, forceRegenerate: true }
);
const slots = templateBlueprint.layers.flatMap((l) =>
  l.children.filter((c): c is AssetSlot => typeof (c as AssetSlot).assetId === "string")
);
const catalogIds = new Set(allAssets(summerAssetFamily).map((a) => a.id));

// 중복 생성 방지 확인: 같은 asset 두 번째 호출은 cached
const first = await generateAssetFromCatalog({
  assetId: "summer_sun", assetFamily: "summer", assetRole: "object",
  styleFamily: "pixar_storybook", client: mock, forceRegenerate: true,
});
const second = await generateAssetFromCatalog({
  assetId: "summer_sun", assetFamily: "summer", assetRole: "object",
  styleFamily: "pixar_storybook", client: mock,
});

// 프롬프트 텍스트 검사용
const prompts = slots.map((s) =>
  buildAssetPrompt({ assetId: s.assetId, assetRole: s.assetRole, styleFamily: "pixar_storybook" })
);
const hangul = /[가-힣]/;

// gptImageClient 분리 확인
const here = dirname(fileURLToPath(import.meta.url));
const clientFile = join(here, "../asset-generator/gptImageClient.ts");

// 1
it("designRecipe.templateFamily === monthly_plan_v1", () => {
  expect(designRecipe.templateFamily).toBe("monthly_plan_v1");
});
// 2
it("designRecipe.themeFamily === summer", () => {
  expect(designRecipe.themeFamily).toBe("summer");
});
// 3
it("designRecipe.styleFamily === pixar_storybook", () => {
  expect(designRecipe.styleFamily).toBe("pixar_storybook");
});
// 4
it("asset slot의 imageUrl이 null이 아님", () => {
  expect(slots.length > 0).toBeTruthy();
  expect(slots.every((s) => typeof s.imageUrl === "string" && s.imageUrl!.length > 0)).toBeTruthy();
});
// 5
it("imageUrl 경로가 /generated-assets/summer/ 로 시작", () => {
  expect(slots.every((s) => s.imageUrl!.startsWith("/generated-assets/summer/"))).toBeTruthy();
});
// 6
it("같은 assetId는 중복 생성하지 않음 (두 번째 호출 cached)", () => {
  expect(first.cached).toBe(false);
  expect(second.cached).toBe(true);
  expect(second.imageUrl).toBe(first.imageUrl);
});
// 7
it("텍스트는 이미지 생성 프롬프트에 포함하지 않음", () => {
  expect(prompts.every((p) => !hangul.test(p))).toBeTruthy(); // 한국어 없음
  expect(prompts.every((p) => /no text/i.test(p))).toBeTruthy(); // "no text" 명시
});
// 8
it("모든 assetId가 Summer Asset Catalog에 존재", () => {
  expect(slots.every((s) => catalogIds.has(s.assetId))).toBeTruthy();
});
// 9
it("GPT Image Client가 gptImageClient.ts 안에 분리", () => {
  expect(existsSync(clientFile)).toBe(true);
});

summary();
