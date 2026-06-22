// =============================================================================
// Asset Family — 공개 API (Asset Catalog).
//
//   import { summerAssetFamily, resolveStickerAsset } from "@/asset-family";
//   const sun = resolveStickerAsset(summerAssetFamily, "sun");
//   // → { id:"sun", family:"summer", category:"sticker", tags:[...], style:"pixar_storybook", src:null, status:"empty" }
//
// 카탈로그(슬롯)만 제공한다. 이미지 생성/저장은 Phase 2 에서 status/src/prompt 를 채운다.
// =============================================================================
export { summerAssetFamily, summerAssets } from "./summerAssets";
export {
  assetRef,
  makeAsset,
  allAssets,
  getAsset,
  byTag,
  resolveStickerAsset,
} from "./types";
export { validateAssetSlot, isValidAssetSlot, AssetValidationError, getFamily, hasAsset } from "./validate";

export type {
  AssetCatalog,
  AssetItem,
  AssetCategory,
  AssetStatus,
} from "./types";
