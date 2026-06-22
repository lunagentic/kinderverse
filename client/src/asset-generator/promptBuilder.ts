// =============================================================================
// Asset Prompt Builder — assetId + assetRole + styleFamily → GPT 이미지 생성 프롬프트.
//
// 규칙:
//  - sticker/object/character/decoration/icon → 투명 배경
//  - background → 배경 이미지(투명 아님)
//  - 이미지 안에 한국어/텍스트 넣지 않음 (텍스트는 Template Blueprint Text Layer 담당)
//  - 같은 Style Family 안에서 질감/색감 일관
// =============================================================================
import { getStyle } from "../style-family";
import type { AssetPromptParams, GeneratedAssetRole } from "./types";

const ROLE_NOUN: Record<GeneratedAssetRole, string> = {
  object: "sticker",
  character: "character sticker",
  decoration: "decorative element",
  icon: "icon",
  background: "background illustration",
};

// 스타일 토큰 → 사람이 읽는 표현
const LIGHTING: Record<string, string> = {
  warm_daylight: "bright warm daylight",
};

function capitalize(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

/** assetId → 영문 subject (예: summer_sun → "summer sun", summer_icon_play → "summer play") */
function subjectFor(assetId: string, role: GeneratedAssetRole): string {
  let s = assetId.replace(/_/g, " ");
  if (role === "icon") s = s.replace(/\bicon\b/g, "").replace(/\s+/g, " ").trim();
  return s.trim();
}

// assetId 별 상세 프롬프트 오버라이드 (레퍼런스 완성도용 — 일반 규칙으로 부족한 자산)
const ASSET_PROMPT_OVERRIDES: Record<string, string> = {
  summer_hero_bg:
    "Create a cheerful summer village landscape background scene for a preschool poster. " +
    "Bright gradient sky (light sky-blue at top to pale near horizon), rolling green hills, " +
    "round spherical trees, small flower bushes, a cute yellow rounded eco house with a blue solar panel, " +
    "green door and round windows on the right side, fluffy white clouds, a small windmill, " +
    "a smiling sun in the top-left corner, soft 3D clay (claymation) storybook style, soft shadows, " +
    "bright and cheerful, NO people, NO characters, NO text, full edge-to-edge background, wide landscape composition.",
  summer_teacher_notepad:
    "Create a friendly preschool teacher character sticker, shown as a half-body bust (waist-up, NOT full body), " +
    "holding a small notepad/clipboard in one hand, warm gentle smile, soft 3D clay (claymation) look, " +
    "soft shadow, rounded friendly shape, bright warm daylight, transparent background, no text.",
};

/** GPT 이미지 생성 프롬프트 문자열 생성 */
export function buildAssetPrompt(params: AssetPromptParams): string {
  const { assetId, assetRole, styleFamily } = params;
  if (ASSET_PROMPT_OVERRIDES[assetId]) return ASSET_PROMPT_OVERRIDES[assetId];
  const style = getStyle(styleFamily);
  const subject = subjectFor(assetId, assetRole);
  const roleNoun = ROLE_NOUN[assetRole];
  const rendering = capitalize(style.assetPromptStyle.rendering);
  const lighting = LIGHTING[style.lighting] ?? style.lighting.replace(/_/g, " ");
  const shadowDesc = `${style.shadow} shadow`;
  const background =
    assetRole === "background"
      ? "full edge-to-edge background scene"
      : "transparent background";

  return (
    `Create a cute ${subject} ${roleNoun} for a preschool education template. ` +
    `${rendering}, ${lighting}, ${shadowDesc}, rounded friendly shape, ${background}, no text.`
  );
}
