// =============================================================================
// Asset Slot 검증 — assetId 가 해당 family 카탈로그에 실제로 존재하는지 확인.
// 유효하면 true 반환, 유효하지 않으면(미존재/undefined/미등록 family) throw.
// undefined / 미존재 asset 연결을 차단한다. (이미지 생성과 무관)
// =============================================================================
import type { AssetCatalog } from "./types";
import { allAssets } from "./types";
import { summerAssetFamily } from "./summerAssets";

// 등록된 에셋 패밀리 레지스트리
const FAMILIES: Record<string, AssetCatalog> = {
  summer: summerAssetFamily,
};

// 에러 메시지용 표시 이름
const FAMILY_TITLE: Record<string, string> = {
  summer: "Summer",
};

/** Asset 검증 실패 에러 */
export class AssetValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssetValidationError";
  }
}

export function getFamily(familyId: string): AssetCatalog | undefined {
  return FAMILIES[familyId];
}

export function hasAsset(familyId: string, assetId: string): boolean {
  const fam = FAMILIES[familyId];
  return !!fam && allAssets(fam).some((asset) => asset.id === assetId);
}

/**
 * Asset Slot 연결 전 검증.
 *  1) assetFamily 존재 확인
 *  2) assetId(정의됨) 확인
 *  3) assetId 가 family 카탈로그에 존재 확인
 *  4) 미존재 시 AssetValidationError throw (명확한 메시지)
 * @returns 유효하면 true
 */
export function validateAssetSlot(
  assetId: string | undefined | null,
  assetFamily: string
): true {
  if (!assetFamily || !FAMILIES[assetFamily]) {
    throw new AssetValidationError(`Asset family "${assetFamily}" not found.`);
  }
  if (!assetId) {
    throw new AssetValidationError(`Asset id is undefined for family "${assetFamily}".`);
  }
  if (!hasAsset(assetFamily, assetId)) {
    const title = FAMILY_TITLE[assetFamily] ?? assetFamily;
    throw new AssetValidationError(`Asset "${assetId}" not found in ${title} Asset Catalog.`);
  }
  return true;
}

/** 비-throw 버전 — 유효 여부만 boolean 으로 반환 */
export function isValidAssetSlot(
  assetId: string | undefined | null,
  assetFamily: string
): boolean {
  try {
    return validateAssetSlot(assetId, assetFamily);
  } catch {
    return false;
  }
}
