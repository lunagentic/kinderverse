// =============================================================================
// Asset Family — Asset Catalog 타입 정의.
// 단순 키 목록이 아니라, Reference Template(여름이 왔어요 월안) 기준의
// 풍부한 에셋 카탈로그. 각 에셋은 id/family/category/tags/style 을 가진다.
// 실제 이미지는 생성하지 않는다 (Phase 2 에서 src/status/prompt 채움).
// =============================================================================
import type { StyleFamily } from "../design-recipe";

/** 에셋 카테고리 (5종) */
export type AssetCategory =
  | "background"
  | "character"
  | "sticker"
  | "decoration"
  | "icon";

/** 에셋 슬롯 상태 — Phase 2 이미지 생성 파이프라인 연결 지점 */
export type AssetStatus = "empty" | "prompt" | "generating" | "ready" | "error";

/** 카탈로그의 개별 에셋 항목 */
export interface AssetItem {
  id: string; // 카테고리 내 식별자 (예: "sun")
  family: string; // 패밀리 id (예: "summer")
  category: AssetCategory;
  tags: string[]; // 의미 태그 (검색/매칭/주차 연결)
  style: StyleFamily; // 일러스트 톤 (MVP: "pixar_storybook")
  // ── Phase 2 연결 지점 (지금은 비움 — 이미지 생성 안 함) ──
  src: string | null;
  status: AssetStatus;
  prompt: string | null;
}

/** 카테고리별 에셋 목록을 담는 카탈로그 */
export interface AssetCatalog {
  id: string; // 패밀리 id (예: "summer")
  backgrounds: AssetItem[];
  characters: AssetItem[];
  stickers: AssetItem[];
  decorations: AssetItem[];
  icons: AssetItem[];
}

/** 에셋 전역 참조키 "family/category/id" (Blueprint 연결용) */
export function assetRef(family: string, category: AssetCategory, id: string): string {
  return `${family}/${category}/${id}`;
}

/** 에셋 항목 생성 헬퍼 (src/status/prompt 는 Phase 2 까지 비움) */
export function makeAsset(
  family: string,
  category: AssetCategory,
  id: string,
  tags: string[],
  style: StyleFamily = "pixar_storybook"
): AssetItem {
  return { id, family, category, tags, style, src: null, status: "empty", prompt: null };
}

/** 카탈로그 전체 에셋 평탄화 (Phase 2 일괄 생성/검수용) */
export function allAssets(catalog: AssetCatalog): AssetItem[] {
  return [
    ...catalog.backgrounds,
    ...catalog.characters,
    ...catalog.stickers,
    ...catalog.decorations,
    ...catalog.icons,
  ];
}

/** 카테고리 + id 로 에셋 조회 */
export function getAsset(
  catalog: AssetCatalog,
  category: AssetCategory,
  id: string
): AssetItem | undefined {
  const bucket: Record<AssetCategory, AssetItem[]> = {
    background: catalog.backgrounds,
    character: catalog.characters,
    sticker: catalog.stickers,
    decoration: catalog.decorations,
    icon: catalog.icons,
  };
  return bucket[category].find((a) => a.id === id);
}

/** 태그로 에셋 필터 */
export function byTag(catalog: AssetCatalog, tag: string): AssetItem[] {
  return allAssets(catalog).filter((a) => a.tags.includes(tag));
}

/** Blueprint sticker 이름 → 해당 에셋 (연결용). 없으면 undefined. */
export function resolveStickerAsset(catalog: AssetCatalog, stickerName: string): AssetItem | undefined {
  return getAsset(catalog, "sticker", stickerName);
}
