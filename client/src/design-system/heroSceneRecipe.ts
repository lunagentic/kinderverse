// =============================================================================
// Hero Scene Recipe — 주제를 상징하는 "장면(Scene)"으로 Hero 를 구성하는 디자인 규칙.
//
// 레퍼런스 완성도의 핵심은 태양·아이가 아니라 장면 구성비:
//   40% Summer Village Landscape · 30% Signature Building(Eco House)
//   20% Sky Objects · 10% Characters
//
// 생성 순서(뒤→앞):
//   Theme → Sky Background → Sky Objects → Landscape → Signature Building
//        → Foreground Ground → Characters → Decorations → Title
//
// 좌표 ax/ay 는 Hero region(0~1) 기준 상대 비율, widthPx 는 절대 폭(px).
// =============================================================================
import type { ThemeFamily } from "../design-recipe";
import type { AssetRole } from "../template-blueprint/types";

/** Layer 1. Sky Background — 단색 금지, 밝고 경쾌한 그라데이션 */
export interface SkyGradient {
  top: string;
  middle: string;
  bottom: string;
}

/** 장면 한 요소 — 카탈로그 assetId + region 상대 위치/크기 */
export interface SceneAsset {
  assetId: string;
  role?: AssetRole;
  ax: number; // region 좌측 기준 0~1
  ay: number; // region 상단 기준 0~1
  widthPx: number;
  aspect?: number; // h/w (기본 1)
}

/** 주제별 Signature Building(Scene Anchor / 랜드마크) — 있으면 불러오고 없으면 생성 */
export const SIGNATURE_BUILDING: Record<string, string> = {
  summer: "summer_eco_house", // eco_solar_house
  autumn: "autumn_pumpkin_cottage",
  space: "space_station",
  snail: "garden_greenhouse",
  market: "market_shop",
};

/** Hero Scene Recipe — 5 레이어 + 캐릭터/장식 */
export interface HeroSceneRecipe {
  sky: SkyGradient; // Layer 1
  /** 주제 연관 Hero 배경 장면 이미지 assetId (있으면 사용, 없으면 생성) */
  heroBackground: string;
  skyObjects: SceneAsset[]; // Layer 2 (sun/clouds/balloons/windmill)
  landscape: SceneAsset[]; // Layer 3 (hills/trees/bushes)
  signatureBuilding: SceneAsset; // Layer 4 (anchor, hero_width 18~22%)
  foreground: SceneAsset[]; // Layer 5 (ground/path/flowers)
  characters: SceneAsset[]; // 10% (front)
  decoratives: SceneAsset[]; // watermelon/beach_ball 등
}

// =============================================================================
// Summer Hero Scene Recipe v1
// =============================================================================
export const SUMMER_HERO_RECIPE: HeroSceneRecipe = {
  // Layer 1. Sky Background (gradient · cheerful · 절대 dark/photo 금지)
  sky: { top: "#67C8FF", middle: "#8AD9FF", bottom: "#C9F2FF" },

  // 주제 연관 Hero 배경 장면 (여름 마을 풍경 — 하늘색 위에 배치)
  heroBackground: "summer_hero_bg",

  // Layer 2. Floating Sky Objects (sun top-left · balloon near title · clouds top · windmill far right)
  skyObjects: [
    { assetId: "summer_sun", ax: 0.03, ay: 0.04, widthPx: 150 }, // main hero asset (smiling_sun)
    { assetId: "summer_cloud", ax: 0.3, ay: 0.05, widthPx: 130 },
    { assetId: "summer_cloud", ax: 0.55, ay: 0.13, widthPx: 110 },
    { assetId: "summer_cloud", ax: 0.74, ay: 0.04, widthPx: 120 },
    { assetId: "summer_balloon", ax: 0.42, ay: 0.28, widthPx: 70, aspect: 1.2 },
    { assetId: "summer_balloon", ax: 0.5, ay: 0.2, widthPx: 60, aspect: 1.2 },
    { assetId: "summer_windmill", ax: 0.9, ay: 0.28, widthPx: 120, aspect: 1.3 },
  ],

  // Layer 3. Summer Landscape (rolling hills · round trees · flower bushes) — 화면 대부분
  landscape: [
    { assetId: "summer_hill", ax: 0.0, ay: 0.58, widthPx: 1080, aspect: 0.16 }, // 와이드-숏 언덕 밴드(풀블리드)
    { assetId: "summer_tree", ax: 0.12, ay: 0.42, widthPx: 130 },
    { assetId: "summer_tree", ax: 0.82, ay: 0.46, widthPx: 120 },
    { assetId: "summer_bush", ax: 0.3, ay: 0.68, widthPx: 130, aspect: 0.6 },
  ],

  // Layer 4. Signature Building (Eco House) — Scene Anchor, hero_width 18~22%
  signatureBuilding: { assetId: "summer_eco_house", ax: 0.67, ay: 0.32, widthPx: 210, aspect: 1.05 },

  // Layer 5. Foreground Ground (sand path · grass edge · flowers · stones) — depth feeling
  foreground: [
    { assetId: "summer_ground", ax: 0.0, ay: 0.8, widthPx: 1080, aspect: 0.11 }, // 전경 지면 밴드(풀블리드)
    { assetId: "summer_flower", ax: 0.08, ay: 0.8, widthPx: 70 },
    { assetId: "summer_flower", ax: 0.58, ay: 0.82, widthPx: 60 },
  ],

  // Characters (summer_girl / summer_boy) — 10%, 전경
  characters: [
    { assetId: "summer_child_girl", ax: 0.06, ay: 0.5, widthPx: 150, aspect: 1.1 },
    { assetId: "summer_child_boy", ax: 0.5, ay: 0.54, widthPx: 140, aspect: 1.1 },
  ],

  // Decorative Assets
  decoratives: [
    { assetId: "summer_watermelon", ax: 0.22, ay: 0.78, widthPx: 80 },
    { assetId: "summer_beach_ball", ax: 0.42, ay: 0.82, widthPx: 80 },
  ],
};

/** 주제별 Hero Scene Recipe (현재 Summer 자산만 상세 — 그 외는 Summer 구성 재사용) */
export function getHeroRecipe(_theme: ThemeFamily): HeroSceneRecipe {
  return SUMMER_HERO_RECIPE;
}
