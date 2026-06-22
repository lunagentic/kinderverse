// =============================================================================
// createAssetSlot — 검증된 AssetSlot 생성 팩토리.
// validateAssetSlot 로 assetId 존재를 확인하고, 통과해야만 슬롯을 만든다.
// (assetId 가 카탈로그에 없거나 undefined 면 에러를 던져 슬롯을 생성하지 않는다)
// =============================================================================
import { validateAssetSlot } from "../asset-family";
import type { AssetRole, AssetSlot } from "./types";

export interface AssetSlotInput {
  id: string;
  type: "sticker" | "decoration";
  assetId: string;
  assetRole: AssetRole;
  x: number;
  y: number;
  width: number;
  height: number;
  assetFamily?: "summer";
}

export function createAssetSlot(input: AssetSlotInput): AssetSlot {
  const assetFamily = input.assetFamily ?? "summer";
  // assetId 가 카탈로그에 없거나 undefined 면 throw → 슬롯 생성 안 함
  validateAssetSlot(input.assetId, assetFamily);
  return {
    id: input.id,
    type: input.type,
    assetId: input.assetId,
    assetFamily,
    assetRole: input.assetRole,
    x: input.x,
    y: input.y,
    width: input.width,
    height: input.height,
    editable: true,
    movable: true,
    scalable: true,
    rotatable: true,
    imageUrl: null,
  };
}
