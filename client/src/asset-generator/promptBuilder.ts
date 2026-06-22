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

/** GPT 이미지 생성 프롬프트 문자열 생성 */
export function buildAssetPrompt(params: AssetPromptParams): string {
  const { assetId, assetRole, styleFamily } = params;
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
