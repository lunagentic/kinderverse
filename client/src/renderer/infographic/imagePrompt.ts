// KinderLab 이미지 생성 스타일 가이드 → 이미지 프롬프트 빌더.
// (실제 이미지 생성 X — 프롬프트 텍스트만 만든다.)
import type {
  InfographicImagePrompt,
  InfographicImageStyle,
  ImagePromptPurpose,
} from "./types";

// 공통 스타일 기준 (모든 프롬프트에 반영)
const COMMON_STYLE = [
  "Korean kindergarten educational poster style",
  "premium preschool educational illustration",
  "child-friendly and emotionally warm",
  "safe and gentle visual mood",
  "high-quality classroom display asset",
  "soft natural lighting",
  "clean composition",
  "warm pastel color palette",
  "gentle shadows",
  "premium children's book quality",
].join(", ");

// 허용 스타일별 키워드
const STYLE_KEYWORDS: Record<InfographicImageStyle, string> = {
  premium_watercolor:
    "premium watercolor children's book illustration, soft watercolor texture, delicate hand-painted details, warm and emotional mood",
  premium_realistic:
    "high-end educational photography style, realistic preschool classroom activity, warm natural light, safe kindergarten environment",
  premium_clay_3d:
    "premium clay 3D educational asset, soft rounded shapes, gentle toy-like material, safe and friendly appearance, clean transparent background",
};

// 금지 스타일 (negativePrompt 공통)
const NEGATIVE = [
  "cheap clipart",
  "low-quality stock image",
  "flat emoji style",
  "meme style",
  "anime style",
  "pixel art",
  "overly childish cartoon",
  "scary expression",
  "violent scene",
  "unsafe classroom action",
  "messy background",
].join(", ");

// 용도별 권장 스타일 (가이드의 "사용 예" 기준)
export const PURPOSE_DEFAULT_STYLE: Record<ImagePromptPurpose, InfographicImageStyle> = {
  hero: "premium_realistic",
  idea: "premium_clay_3d",
  activity: "premium_realistic",
  background: "premium_watercolor",
  decoration: "premium_watercolor",
};

const TRANSPARENT_PURPOSES: ImagePromptPurpose[] = ["idea", "decoration"];

/**
 * 스타일 가이드를 따르는 이미지 프롬프트 1건 생성.
 * @param subject 한국어 제목/설명 (사람이 읽는 용도)
 * @param scene 영문 장면 묘사 (프롬프트 본문 앞부분)
 */
export function buildImagePrompt(
  subject: string,
  scene: string,
  purpose: ImagePromptPurpose,
  style: InfographicImageStyle = PURPOSE_DEFAULT_STYLE[purpose]
): InfographicImagePrompt {
  const bg = TRANSPARENT_PURPOSES.includes(purpose)
    ? "clean transparent background"
    : "clean composition suitable for classroom display";
  const prompt = [scene, STYLE_KEYWORDS[style], COMMON_STYLE, bg].join(", ");
  return { subject, purpose, style, prompt, negativePrompt: NEGATIVE };
}

// 스타일 한글 라벨 (Preview 표시용)
export const STYLE_LABEL: Record<InfographicImageStyle, string> = {
  premium_watercolor: "수채화",
  premium_realistic: "실사풍",
  premium_clay_3d: "클레이 3D",
};

export const PURPOSE_LABEL: Record<ImagePromptPurpose, string> = {
  hero: "대표",
  idea: "놀이",
  activity: "활동",
  background: "배경",
  decoration: "장식",
};
