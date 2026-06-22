// =============================================================================
// Asset Library (좌측 패널) — 카탈로그 에셋 목록. 클릭 시 교체/추가.
// =============================================================================
import { summerAssetFamily } from "../asset-family";
import type { AssetItem } from "../asset-family";
import { assetUrl } from "./blueprintToDoc";

const CATS: { key: keyof typeof summerAssetFamily; label: string }[] = [
  { key: "backgrounds", label: "배경" },
  { key: "characters", label: "캐릭터" },
  { key: "stickers", label: "스티커" },
  { key: "decorations", label: "장식" },
  { key: "icons", label: "아이콘" },
];

export interface AssetPick {
  assetId: string;
  family: string;
  imageUrl: string;
  role: string;
}

const ROLE_OF: Record<string, string> = {
  backgrounds: "background", characters: "character", stickers: "object", decorations: "decoration", icons: "icon",
};

export function AssetLibrary({ onPick }: { onPick: (p: AssetPick) => void }) {
  return (
    <div style={{ width: 220, flex: "0 0 220px", borderRight: "1px solid #e6ddd0", overflowY: "auto", background: "#fbf7f0", padding: 12 }}>
      <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 8, color: "#3f3833" }}>에셋 라이브러리</div>
      {CATS.map(({ key, label }) => {
        const items = summerAssetFamily[key] as AssetItem[];
        return (
          <div key={key} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#8a8078", margin: "6px 0" }}>{label}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
              {items.map((a) => (
                <button
                  key={a.id}
                  title={a.id}
                  onClick={() => onPick({ assetId: a.id, family: a.family, imageUrl: assetUrl(a.family, a.id), role: ROLE_OF[key] })}
                  style={{ aspectRatio: "1", border: "1px solid #e6ddd0", borderRadius: 8, background: "#fff", cursor: "pointer", padding: 2, overflow: "hidden" }}
                >
                  <img
                    src={assetUrl(a.family, a.id)}
                    alt={a.id}
                    style={{ width: "100%", height: "100%", objectFit: "contain" }}
                    onError={(e) => { (e.currentTarget.style.opacity = "0.15"); }}
                  />
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
