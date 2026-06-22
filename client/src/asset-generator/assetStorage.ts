// =============================================================================
// Asset Storage — 생성된 이미지를 파일로 저장하고 imageUrl 반환.
// 저장: client/public/generated-assets/<family>/<assetId>.<ext>
// 서빙: /generated-assets/<family>/<assetId>.<ext>  (vite public)
// 중복 방지: 같은 assetId 가 이미 있으면 재생성하지 않고 기존 imageUrl 반환.
// (나중에 S3/CDN 교체 가능하도록 storage 함수를 분리)
// =============================================================================
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AssetMimeType } from "./types";

const HERE = dirname(fileURLToPath(import.meta.url)); // client/src/asset-generator
const PUBLIC_DIR = join(HERE, "../../public"); // client/public
const ASSETS_SUBDIR = "generated-assets";

const EXT: Record<AssetMimeType, string> = { "image/png": "png", "image/webp": "webp" };

function familyDir(family: string): string {
  return join(PUBLIC_DIR, ASSETS_SUBDIR, family);
}
function publicUrl(family: string, file: string): string {
  return `/${ASSETS_SUBDIR}/${family}/${file}`;
}

export interface StoredAsset {
  imageUrl: string;
  mimeType: AssetMimeType;
}

/** 이미 저장된 에셋이 있으면 반환 (png → webp 순) */
export function findStoredAsset(assetId: string, family: string): StoredAsset | null {
  for (const mime of ["image/png", "image/webp"] as AssetMimeType[]) {
    const file = `${assetId}.${EXT[mime]}`;
    if (existsSync(join(familyDir(family), file))) {
      return { imageUrl: publicUrl(family, file), mimeType: mime };
    }
  }
  return null;
}

export interface SaveAssetInput {
  assetId: string;
  assetFamily: string;
  imageBuffer: Buffer;
  mimeType: AssetMimeType;
  forceRegenerate?: boolean;
}

/** 이미지 저장 → { imageUrl }. 이미 있으면(미강제) 기존 URL 반환. */
export function saveGeneratedAsset(input: SaveAssetInput): StoredAsset {
  const { assetId, assetFamily, imageBuffer, mimeType, forceRegenerate } = input;

  if (!forceRegenerate) {
    const existing = findStoredAsset(assetId, assetFamily);
    if (existing) return existing; // 중복 생성 방지
  }

  const dir = familyDir(assetFamily);
  mkdirSync(dir, { recursive: true });
  const file = `${assetId}.${EXT[mimeType]}`;
  writeFileSync(join(dir, file), imageBuffer);
  return { imageUrl: publicUrl(assetFamily, file), mimeType };
}
