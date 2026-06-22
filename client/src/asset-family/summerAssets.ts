// =============================================================================
// Summer Asset Family — "여름이 왔어요" 레퍼런스 월안 기준 Asset Catalog.
// assetId 규칙: "summer_<name>" (Blueprint AssetSlot 의 assetId 와 1:1 매칭).
// 실제 이미지는 생성하지 않는다 — 카탈로그(슬롯)만 정의.
//
// 주차 매핑(monthly_plan_v1): week1 여름과 날씨 · week2 여름의 생물 ·
//                             week3 물과 얼음 놀이 · week4 여름의 즐거움
// =============================================================================
import type { AssetCatalog } from "./types";
import { makeAsset } from "./types";

const F = "summer";
const a = (cat: Parameters<typeof makeAsset>[1], id: string, tags: string[]) =>
  makeAsset(F, cat, id, tags);

export const summerAssetFamily: AssetCatalog = {
  id: F,

  // ── 배경 ──
  backgrounds: [
    a("background", "summer_sky", ["summer", "sky", "weather", "hero", "week1"]),
    a("background", "summer_hero_bg", ["summer", "hero", "scene", "landscape", "village", "background"]),
    a("background", "summer_hill", ["summer", "nature", "outdoor", "hill"]),
    a("background", "summer_lake", ["summer", "water", "lake", "week3"]),
  ],

  // ── 캐릭터 (사람·생물) ──
  characters: [
    a("character", "summer_child_girl", ["person", "child", "girl", "play", "hero"]),
    a("character", "summer_child_boy", ["person", "child", "boy", "play", "hero"]),
    a("character", "summer_magnifier_girl", ["person", "child", "girl", "탐색", "play_reason"]),
    a("character", "summer_frog", ["creature", "amphibian", "summer", "생물", "week2"]),
    a("character", "summer_dragonfly", ["creature", "insect", "summer", "생물", "week2"]),
    a("character", "summer_water_child", ["person", "child", "water", "week3"]),
    a("character", "summer_teacher", ["person", "teacher", "adult", "guide", "expectation"]),
    a("character", "summer_teacher_notepad", ["person", "teacher", "adult", "notepad", "half_body", "expectation"]),
  ],

  // ── 스티커 (사물 오브젝트) ──
  stickers: [
    a("sticker", "summer_sun", ["summer", "weather", "sky", "hero", "week1"]),
    a("sticker", "summer_cloud", ["summer", "weather", "sky", "hero", "week1"]),
    // ── Hero Scene Recipe v1 (배경 장면 구성요소) ──
    a("sticker", "summer_eco_house", ["summer", "hero", "scene", "building", "signature", "landmark"]),
    a("sticker", "summer_windmill", ["summer", "hero", "scene", "sky_object"]),
    a("sticker", "summer_tree", ["summer", "hero", "scene", "landscape", "nature"]),
    a("sticker", "summer_bush", ["summer", "hero", "scene", "landscape", "nature"]),
    a("sticker", "summer_ground", ["summer", "hero", "scene", "foreground", "ground"]),
    a("sticker", "summer_sun_sunglasses", ["summer", "weather", "fun", "week1"]),
    a("sticker", "summer_rain_cloud", ["summer", "weather", "rain", "week2"]),
    a("sticker", "summer_sandcastle", ["summer", "beach", "play", "play_reason"]),
    a("sticker", "summer_bucket", ["summer", "beach", "tool", "play_reason"]),
    a("sticker", "summer_beach_ball", ["summer", "beach", "play", "play_reason", "week4"]),
    a("sticker", "summer_water_slide", ["summer", "water", "play", "week3"]),
    a("sticker", "summer_ice_cube", ["summer", "water", "ice", "week3"]),
    a("sticker", "summer_tent", ["summer", "camping", "fun", "week4"]),
    a("sticker", "summer_watermelon", ["summer", "food", "fun", "week4"]),
    a("sticker", "summer_pineapple", ["summer", "food", "fun", "week4"]),
    a("sticker", "summer_lantern", ["summer", "camping", "night", "week4"]),
  ],

  // ── 장식 ──
  decorations: [
    a("decoration", "summer_water_drop", ["summer", "water", "accent", "week3"]),
    a("decoration", "summer_splash", ["summer", "water", "accent", "week3"]),
    a("decoration", "summer_flower", ["summer", "nature", "accent", "expectation"]),
    a("decoration", "summer_leaf", ["summer", "nature", "accent", "expectation"]),
    a("decoration", "summer_sparkle", ["accent", "highlight"]),
    a("decoration", "summer_balloon", ["fun", "party", "accent"]),
  ],

  // ── 아이콘 (주요 놀이 요소 / 학습 요소) ──
  icons: [
    a("icon", "summer_icon_exploration", ["learning", "play_element", "탐색"]),
    a("icon", "summer_icon_observation", ["learning", "play_element", "관찰"]),
    a("icon", "summer_icon_expression", ["learning", "play_element", "표현"]),
    a("icon", "summer_icon_cooperation", ["learning", "play_element", "협력"]),
    a("icon", "summer_icon_play", ["learning", "play_element", "놀이"]),
    a("icon", "summer_icon_safety", ["learning", "play_element", "안전"]),
  ],
};

/** 별칭 (이전 import 호환) */
export const summerAssets = summerAssetFamily;
