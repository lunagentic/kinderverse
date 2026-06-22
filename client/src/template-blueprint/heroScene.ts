// =============================================================================
// Hero Scene System — Hero 를 "주제를 상징하는 장면(Scene)"으로 합성한다.
//
//   Hero (생성 순서 = 뒤→앞)
//   ├─ Sky Background      그라데이션 하늘 (단색 금지)
//   ├─ Sky Objects         해·구름·풍선·풍차
//   ├─ Landscape           언덕·둥근 나무·꽃덤불 (장면의 40%)
//   ├─ Signature Building  Eco House — Scene Anchor / 랜드마크 (30%)
//   ├─ Foreground Ground   모래길·잔디·꽃·돌 (depth)
//   ├─ Characters          아이들 (10%, 전경)
//   ├─ Decorations         수박·비치볼 등
//   └─ Title Area          제목 + 배지 (최전면)
//
// 좌표는 모두 region(Hero 영역) 기준 상대 계산 → region 만 바꾸면 통째로 이동/재배치.
// 에셋은 createAssetSlot 으로 카탈로그 검증(없는 assetId → throw). 이미지 미생성 시 보드에서 자동 숨김.
// =============================================================================
import { createAssetSlot } from "./assetSlot";
import {
  getHeroRecipe,
  type HeroSceneRecipe,
  type SceneAsset,
} from "../design-system/heroSceneRecipe";
import { type SeasonTheme, TITLE_FONT, SUBTITLE_FONT } from "../design-system/themeDesignSystem";
import type { AssetSlot, Frame, ShapeElement, ShapeStyle, TextElement, TextStyle } from "./types";

/** Hero 의 레이어 이름 (생성 순서) */
export type HeroLayerName =
  | "background"
  | "skyObjects"
  | "landscape"
  | "signatureBuilding"
  | "foreground"
  | "characters"
  | "decoratives"
  | "titleArea";

/** Hero Scene 합성 입력 */
export interface HeroSceneInput {
  theme: SeasonTheme;
  themeFamily?: import("../design-recipe").ThemeFamily;
  region: Frame; // Hero 영역 (캔버스 절대 좌표)
  title: string;
  age: string;
  lifeTheme: string;
  recipe?: HeroSceneRecipe; // 생략 시 themeFamily 기준 기본 Recipe
  titleColors?: [string, string]; // 제목 2톤 컬러 (기본 빨강/파랑)
  titleSplit?: number; // 제목 분리 글자수 (기본 2: "여름" | "이 왔어요")
  bindings?: { title?: string; age?: string; theme?: string };
}

/** 레이어별로 분리된 Hero Scene */
export interface HeroScene {
  background: ShapeElement[]; // 하늘색 그라데이션(베이스)
  backgroundImage: AssetSlot[]; // 주제 연관 배경 장면 이미지 (커버, 하늘 위)
  characters: AssetSlot[]; // 배경 위 캐릭터
  decoratives: AssetSlot[]; // 배경 위 장식
  titleArea: (ShapeElement | TextElement)[]; // 제목/배지 (최전면)
}

/** 블루프린트 레이어(타입별) 버킷으로 평탄화 */
export interface HeroLayerBuckets {
  shapes: ShapeElement[]; // background(그라데이션) + titleArea 배지
  stickers: AssetSlot[]; // 배경 이미지(뒤) → 캐릭터(앞)
  decorations: AssetSlot[]; // decoratives
  texts: TextElement[]; // titleArea 텍스트
}

const ROLE: Record<HeroLayerName, AssetSlot["assetRole"]> = {
  background: "background",
  skyObjects: "object",
  landscape: "object",
  signatureBuilding: "object",
  foreground: "object",
  characters: "character",
  decoratives: "decoration",
  titleArea: "object",
};

/** SceneAsset → AssetSlot (region 상대 위치, widthPx 절대 크기) */
function sceneSlot(layer: HeroLayerName, s: SceneAsset, i: number, region: Frame): AssetSlot {
  const w = s.widthPx;
  const h = Math.round(w * (s.aspect ?? 1));
  return createAssetSlot({
    id: `hero_${layer}_${i}_${s.assetId}`,
    type: layer === "decoratives" ? "decoration" : "sticker",
    assetId: s.assetId,
    assetRole: s.role ?? ROLE[layer],
    x: Math.round(region.x + s.ax * region.width),
    y: Math.round(region.y + s.ay * region.height),
    width: w,
    height: h,
  });
}
const mapLayer = (layer: HeroLayerName, list: SceneAsset[], region: Frame) =>
  list.map((s, i) => sceneSlot(layer, s, i, region));

/** Hero 를 장면 Recipe 로 합성한다 (뒤→앞). */
export function buildHeroScene(input: HeroSceneInput): HeroScene {
  const { theme: T, region } = input;
  const R = input.recipe ?? getHeroRecipe(input.themeFamily ?? "summer");
  const x0 = region.x;
  const y0 = region.y;
  const W = region.width;
  const H = region.height;

  // ── 하늘색 그라데이션 (베이스, 풀블리드) — 배경 이미지 없을 때 그대로 노출 ──
  const skyFill = `linear-gradient(180deg, ${R.sky.top} 0%, ${R.sky.middle} 50%, ${R.sky.bottom} 100%)`;
  const background: ShapeElement[] = [
    shp("Hero_sky", { x: x0, y: y0, width: W, height: H }, 1, "rect", { fill: skyFill, radius: 0 }),
  ];

  // ── 주제 연관 배경 장면 이미지 (하늘 위 커버, 있으면 사용·없으면 생성) ──
  const backgroundImage: AssetSlot[] = [
    createAssetSlot({
      id: "Hero_bg_image",
      type: "sticker",
      assetId: R.heroBackground,
      assetRole: "background", // cover · 누끼 제외 · 잠금 처리
      x: x0, y: y0, width: W, height: H,
    }),
  ];

  // ── 배경 위 캐릭터 / 장식 ──
  const characters = mapLayer("characters", R.characters, region);
  const decoratives = mapLayer("decoratives", R.decoratives, region);

  // ── Title Area (최전면) — 제목을 두 컬러 세그먼트로 분리 (여름 / 이 왔어요) ──
  // 흰색 외곽선 + 2톤 컬러(레퍼런스). 가운데 이음새 기준 좌(우정렬)/우(좌정렬)로 맞붙임.
  const [c1, c2] = input.titleColors ?? ["#E8443B", "#2B7FE0"];
  const splitAt = input.titleSplit ?? 2;
  const seg1 = input.title.slice(0, splitAt);
  const seg2 = input.title.slice(splitAt);
  const titleBase = { fontSize: 92, weight: 800, fontFamily: TITLE_FONT, stroke: "#FFFFFF", strokeWidth: 9 };
  const seam = x0 + W / 2;
  const titleY = y0 + 36;
  const chip: TextStyle = { fontSize: 32, weight: 700, color: "#FFFFFF", align: "center", fontFamily: SUBTITLE_FONT };
  const pill = (fill: string): ShapeStyle => ({ fill, radius: 999 });
  const ageW = 220;
  const themeW = 300;
  const gap = 10;
  const bx = Math.round(x0 + (W - (ageW + gap + themeW)) / 2);
  const by = Math.round(y0 + H - 64);
  const titleArea: (ShapeElement | TextElement)[] = [
    txt("Title", "hero", seg1, { x: seam - (W / 2 - 40), y: titleY, width: W / 2 - 40, height: 130 }, { ...titleBase, color: c1, align: "right" }, 5, input.bindings?.title ?? "meta.title"),
    txt("Title2", "hero2", seg2, { x: seam, y: titleY, width: W / 2 - 40, height: 130 }, { ...titleBase, color: c2, align: "left" }, 5),
    shp("AgeBadge", { x: bx, y: by, width: ageW, height: 64 }, 4, "pill", pill(T.hero.accent)),
    shp("ThemeBadge", { x: bx + ageW + gap, y: by, width: themeW, height: 64 }, 4, "pill", pill(T.hero.accent)),
    txt("Age", "hero_age", input.age, { x: bx, y: by + 16, width: ageW, height: 36 }, chip, 6, input.bindings?.age ?? "basic_info.age"),
    txt("Theme", "hero_theme", input.lifeTheme, { x: bx + ageW + gap, y: by + 16, width: themeW, height: 36 }, chip, 6, input.bindings?.theme ?? "basic_info.theme"),
  ];

  return { background, backgroundImage, characters, decoratives, titleArea };
}

/** 레이어를 블루프린트 레이어(타입별)로 분배. 스티커는 뒤(배경이미지)→앞(캐릭터) 순서. */
export function heroSceneToBuckets(scene: HeroScene): HeroLayerBuckets {
  const titleShapes = scene.titleArea.filter((e): e is ShapeElement => (e as ShapeElement).kind === "shape");
  const titleTexts = scene.titleArea.filter((e): e is TextElement => (e as TextElement).kind === "text");
  return {
    shapes: [...scene.background, ...titleShapes],
    stickers: [...scene.backgroundImage, ...scene.characters],
    decorations: [...scene.decoratives],
    texts: [...titleTexts],
  };
}

// ── 내부 헬퍼 ──
function shp(id: string, frame: Frame, z: number, shape: ShapeElement["shape"], style: ShapeStyle): ShapeElement {
  return { id, kind: "shape", shape, frame, editable: true, movable: true, resizable: true, visible: true, z, style };
}
function txt(id: string, role: string, value: string, frame: Frame, style: TextStyle, z: number, binding?: string): TextElement {
  return { id, kind: "text", role, text: value, frame, editable: true, movable: true, resizable: true, visible: true, z, style, binding };
}
