// =============================================================================
// Asset Select — 월안(한국어) 텍스트에서 가장 알맞은 라이브러리 스티커를 고른다.
//   카탈로그 태그는 대부분 영어라, 한국어 동의어 사전(MATCH_KEYWORDS)으로 매칭한다.
//   점수 = (한국어 키워드 히트 ×2) + (weekTag가 에셋 tags에 있으면 +1). 최고점 선택, 0이면 fallback.
//   (콘텐츠 기반 선택 = A단계. 생성은 B단계에서.)
// =============================================================================
import { summerAssetFamily, allAssets, hasAsset } from "./index";

/** assetId → 매칭용 한국어 동의어 */
export const MATCH_KEYWORDS: Record<string, string[]> = {
  summer_sun: ["해", "태양", "햇빛", "날씨"],
  summer_sun_sunglasses: ["해", "태양", "날씨", "여름", "선글라스"],
  summer_cloud: ["구름", "하늘"],
  summer_rain_cloud: ["비", "장마", "빗물", "구름"],
  summer_ice_cube: ["얼음", "빙수", "시원", "얼리"],
  summer_water_slide: ["물놀이", "워터", "미끄럼", "수영장", "물"],
  summer_water_child: ["물놀이", "수영", "물", "수영장"],
  summer_sandcastle: ["모래", "모래성", "해변", "바닷가", "바다"],
  summer_bucket: ["양동이", "모래", "해변", "도구"],
  summer_beach_ball: ["공", "비치볼", "해변", "바다"],
  summer_watermelon: ["수박", "과일"],
  summer_pineapple: ["파인애플", "과일"],
  summer_tent: ["캠핑", "텐트", "야영"],
  summer_lantern: ["랜턴", "등불", "밤", "캠핑"],
  summer_frog: ["개구리", "생물", "곤충", "관찰", "동물"],
  summer_dragonfly: ["잠자리", "곤충", "생물", "관찰"],
};

/** 주차 포커스 스티커 후보 (hero 장면용·아이콘·교사 제외) */
export const WEEK_STICKER_POOL: string[] = [
  "summer_sun_sunglasses", "summer_cloud", "summer_rain_cloud", "summer_ice_cube",
  "summer_water_slide", "summer_water_child", "summer_sandcastle", "summer_bucket",
  "summer_beach_ball", "summer_watermelon", "summer_pineapple", "summer_tent",
  "summer_lantern", "summer_frog", "summer_dragonfly",
];

/** assetId → 카탈로그 category 기반 슬롯 role (character / 그 외 object) */
export function assetRoleOf(assetId: string): "character" | "object" {
  const a = allAssets(summerAssetFamily).find((x) => x.id === assetId);
  return a?.category === "character" ? "character" : "object";
}

export interface SelectStickerOpts {
  pool?: string[];
  weekTag?: string; // 예: "week2"
  fallback: string;
}

/** 텍스트에서 가장 알맞은 스티커 assetId 선택 (없으면 fallback) */
export function selectSticker(text: string, opts: SelectStickerOpts): string {
  const pool = opts.pool ?? WEEK_STICKER_POOL;
  const hay = (text || "").toLowerCase();
  const byId = new Map(allAssets(summerAssetFamily).map((a) => [a.id, a]));

  let bestId = opts.fallback;
  let bestScore = 0;
  for (const id of pool) {
    const asset = byId.get(id);
    if (!asset) continue;
    const kws = MATCH_KEYWORDS[id] ?? [];
    let score = 0;
    for (const kw of kws) if (hay.includes(kw.toLowerCase())) score += 2;
    if (opts.weekTag && asset.tags.includes(opts.weekTag)) score += 1;
    if (score > bestScore) {
      bestScore = score;
      bestId = id;
    }
  }
  // 안전: 결과가 카탈로그에 없으면 fallback
  return hasAsset("summer", bestId) ? bestId : opts.fallback;
}
