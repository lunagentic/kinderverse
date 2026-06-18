// AssetLibrary — ContentImageLayer/BackgroundLayer 에 연결할 번들 일러스트(매니페스트 기반).
// 주제 키워드 → /assets/... 파일. (client/public/assets/ 에 PNG 교체 가능)
// 매니페스트에 없을 때만 이모지 SVG(data-URI)로 폴백.
import type { ImageAsset } from "../types";
import { ASSET_MANIFEST, assetThemeFor } from "./assetManifest";

const emojiScene = (emoji: string) =>
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#F4EFF8"/><text x="50" y="62" font-size="44" text-anchor="middle">${emoji}</text></svg>`
  );

// ContentImageLayer 샘플 이미지 (번들 일러스트, 없으면 이모지 폴백)
export function sampleImageFor(text: string, emojiFallback = "🖼️"): ImageAsset {
  const key = assetThemeFor(text);
  const url = ASSET_MANIFEST[key]?.content || ASSET_MANIFEST.default.content || emojiScene(emojiFallback);
  return { url, source: "stock", width: 400, height: 400, attribution: "KinderLab 라이브러리" };
}

// BackgroundLayer 프레임 이미지(A4 풀페이지)
export function frameImageFor(text = ""): string | undefined {
  const key = assetThemeFor(text);
  return ASSET_MANIFEST[key]?.frame || ASSET_MANIFEST.default?.frame;
}
