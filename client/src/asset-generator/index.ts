// =============================================================================
// Asset Generator (Phase 2) — 공개 API.
//
//   import { buildEditableTemplateWithGeneratedAssets } from "@/asset-generator";
//   const result = await buildEditableTemplateWithGeneratedAssets({ type:"monthly_plan", theme:"여름이 왔어요", age:"3~5세", month:"6월" });
//   // result.templateBlueprint.layers 의 asset slot 에 imageUrl 연결됨
//
// 개별 에셋 이미지만 GPT 로 생성·저장 (최종 포스터/Export 금지).
// 실제 생성은 ASSET_GEN_REAL=1 + OPENAI_API_KEY, 아니면 mock(비용 0).
// =============================================================================
export { buildAssetPrompt } from "./promptBuilder";
export {
  generateAssetFromCatalog,
  hydrateBlueprintAssets,
  buildEditableTemplateWithGeneratedAssets,
  linkExistingAssets,
} from "./assetGenerator";
export {
  createOpenAIImageClient,
  createMockImageClient,
  getDefaultClient,
  isRealGenerationEnabled,
} from "./gptImageClient";
export { saveGeneratedAsset, findStoredAsset } from "./assetStorage";

export type {
  GeneratedAsset,
  GeneratedAssetRole,
  AssetMimeType,
  AssetQuality,
  AssetPromptParams,
  GeneratedImage,
  GPTImageClient,
} from "./types";
