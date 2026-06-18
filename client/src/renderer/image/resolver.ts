// ImageResolver — 이미지 자리에 주제/놀이 연관 이모지를 연결하는 규칙 (오프라인·결정적).
// "레이어" 변환 시 실행되어 슬롯의 resolvedIcon / overlay 아이콘을 채운다.
// 향후 AI·스톡 소스로 교체 시: 같은 진입점에서 slot.asset(url) 을 채우면 됨.
import type { TemplateDocument, ImageSlot } from "../types";
import { sampleImageFor } from "./assetLibrary";

// 키워드 → 이모지 (구체적인 것 먼저). 주제·소주제·놀이명에서 매칭.
const KEYWORD_ICONS: Array<[string, string]> = [
  ["달팽이", "🐌"], ["나비", "🦋"], ["곤충", "🐛"], ["개미", "🐜"], ["거미", "🕸️"],
  ["물고기", "🐟"], ["새", "🐦"], ["동물", "🐾"],
  ["무지개", "🌈"], ["물놀이", "💧"], ["바다", "🌊"], ["얼음", "🧊"], ["눈", "⛄"],
  ["비", "☔"], ["바람", "🌬️"], ["햇빛", "☀️"], ["여름", "☀️"], ["봄", "🌷"],
  ["가을", "🍁"], ["겨울", "❄️"], ["계절", "🍃"], ["날씨", "⛅"],
  ["꽃", "🌸"], ["나무", "🌳"], ["잎", "🌿"], ["씨앗", "🌱"], ["자연", "🌿"], ["산책", "🚶"],
  ["미술", "🎨"], ["색", "🎨"], ["그림", "🖍️"], ["만들기", "✂️"], ["꾸미기", "✂️"],
  ["음악", "🎵"], ["노래", "🎤"], ["악기", "🎹"], ["동극", "🎭"], ["이야기", "📖"],
  ["그림책", "📖"], ["책", "📚"],
  ["요리", "🍳"], ["과일", "🍓"], ["음식", "🍽️"],
  ["운동", "⚽"], ["신체", "🤸"], ["게임", "🎲"], ["캠핑", "⛺"], ["축제", "🎉"],
  ["전시", "🖼️"], ["발표", "📣"], ["마라톤", "🏃"],
  ["집", "🏠"], ["마을", "🏘️"], ["가족", "👨‍👩‍👧"], ["친구", "🧒"], ["소리", "🔊"],
];

// 텍스트에서 첫 매칭 이모지, 없으면 fallback
export function pickIcon(text: string, fallback = "✨"): string {
  const t = text || "";
  for (const [kw, emoji] of KEYWORD_ICONS) {
    if (t.includes(kw)) return emoji;
  }
  return fallback;
}

// 단일 슬롯 해석. ContentImageLayer 는 AssetLibrary 샘플 이미지(asset)를 연결,
// DecorationLayer 는 꾸미기 아이콘(emoji)만. resolvedIcon 은 폴백/아이콘 용도로 유지.
export function resolveImageSlot(slot: ImageSlot, contextText: string, fallback = "🖼️"): ImageSlot {
  if (slot.asset?.url) return slot; // 이미 실제 이미지(업로드/생성) 있으면 유지
  slot.resolvedIcon = pickIcon(contextText, fallback);
  (slot.overlays || []).forEach((o) => {
    if (o.kind === "icon") o.icon = pickIcon(contextText, slot.resolvedIcon || "✨");
  });
  // ContentImageLayer → AssetLibrary 샘플 이미지 배치
  if (slot.visualType !== "decoration") {
    slot.asset = sampleImageFor(contextText, slot.resolvedIcon);
    slot.source = "stock";
    slot.status = "ready";
  }
  return slot;
}

// Section Tree 전체의 이미지 슬롯 해석 (hero=주제, 주차=소주제+놀이)
export function resolveTemplateImages(doc: TemplateDocument): TemplateDocument {
  for (const node of doc.sections) {
    const s = node.section;
    if (s.kind === "header" && s.hero) {
      const theme = s.basicInfo.theme || s.basicInfo.lifeTheme || "";
      resolveImageSlot(s.hero, theme, "🌈");
    }
    if (s.kind === "weeklyFlow" && s.weekImages) {
      s.weekImages.forEach((wi) => {
        const wk = s.weeks.find((w) => w.week === wi.week);
        const text = [wk?.subTheme, ...(wk?.plays || []).map((p) => p.title)].filter(Boolean).join(" ");
        resolveImageSlot(wi.image, text, "🎨");
      });
    }
  }
  return doc;
}
