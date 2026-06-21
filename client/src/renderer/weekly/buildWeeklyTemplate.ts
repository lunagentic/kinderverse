// 파이프라인: 월안 JSON → InfographicStructure(MonthlyInfographicData)
//   → StylePack 적용 → Editable WeekCard(DesignDoc) → PNG Export
import type { MonthlyPlanViewModel } from "../types";
import type { MonthlyInfographicData } from "../infographic/types";
import type { DesignDoc, DesignDocElement } from "../adapters/toDesignDoc";
import { buildInfographicData } from "../infographic/buildInfographicData";
import { sampleImageFor } from "../image/assetLibrary";

// ── StylePack: 카드 비주얼 테마(색/폰트/모서리) ──
export interface StylePack {
  id: string;
  name: string;
  bg: string; // 페이지 배경
  band: string; // 헤더/섹션 밴드
  soft: string; // 본문 박스
  ink: string; // 강조 글자색
  body: string; // 본문 글자색
  font?: string; // fontFamily (없으면 기본)
  radius: number;
}

export const STYLE_PACKS: StylePack[] = [
  { id: "pastel", name: "파스텔", bg: "#FBF7FB", band: "#FFE3EC", soft: "#FFFFFF", ink: "#A24E6B", body: "#4A4453", radius: 22 },
  { id: "mint", name: "민트", bg: "#F1FAF5", band: "#E2F2EA", soft: "#FFFFFF", ink: "#3E8E72", body: "#3D4A45", radius: 22 },
  { id: "sky", name: "하늘", bg: "#F2F4FF", band: "#E6E7FF", soft: "#FFFFFF", ink: "#5A5BB0", body: "#43455A", radius: 22 },
  { id: "crayon", name: "크레용", bg: "#FFFBF0", band: "#FFF1D6", soft: "#FFFFFF", ink: "#B0743E", body: "#5A4B33", font: "'Gaegu', cursive", radius: 26 },
  { id: "round", name: "동글", bg: "#FFF6F2", band: "#FFE0D6", soft: "#FFFFFF", ink: "#C2613F", body: "#4A4036", font: "'Jua', sans-serif", radius: 28 },
];

const W = 720;
const H = 940;
const M = 28;
const CW = W - M * 2;

export function buildWeekCard(ig: MonthlyInfographicData, weekIndex = 0, pack: StylePack = STYLE_PACKS[0]): DesignDoc {
  let z = 0;
  const fam = pack.font;
  const T = (
    id: string,
    text: string,
    x: number,
    y: number,
    w: number,
    h: number,
    style: DesignDocElement["style"],
    textRole?: "title" | "content"
  ): DesignDocElement => ({ id, type: "text", x, y, w, h, text, style: { fontFamily: fam, ...style }, textRole, z: z++ } as any);
  const S = (id: string, x: number, y: number, w: number, h: number, style: DesignDocElement["style"], locked = false): DesignDocElement =>
    ({ id, type: "shape", x, y, w, h, style, locked, z: z++ } as any);
  const IMG = (id: string, x: number, y: number, w: number, h: number, src?: string): DesignDocElement =>
    ({ id, type: "image", x, y, w, h, src, fit: "cover", z: z++ } as any);

  const wk = ig.weeklyFlow[weekIndex];
  const label = wk?.week || `${weekIndex + 1}주차`;
  const sub = wk?.title || label;
  const plays = (wk?.plays && wk.plays.length ? wk.plays : (wk?.shortSummary ? wk.shortSummary.split(/·|,/).map((s) => s.trim()).filter(Boolean) : []));
  const family = (ig.familyConnection?.message || "").trim();

  const els: DesignDocElement[] = [];
  els.push(S("page", 0, 0, W, H, { bg: pack.bg }, true));

  // 헤더 밴드
  els.push(S("hdr-bg", M, M, CW, 116, { bg: pack.band, radius: pack.radius }));
  els.push(S("wk-badge", M + 22, M + 24, 88, 38, { bg: "#FFFFFF", radius: 19 }));
  els.push(T("wk-no", label, M + 22, M + 30, 88, 28, { fontSize: 17, weight: 800, color: pack.ink, align: "center" }, "title"));
  els.push(T("hdr-theme", ig.title || "월간 놀이", M + 124, M + 22, CW - 150, 38, { fontSize: 27, weight: 800, color: pack.ink, align: "left" }, "title"));
  els.push(T("hdr-sub", sub, M + 124, M + 66, CW - 150, 32, { fontSize: 19, weight: 700, color: pack.ink, align: "left" }, "title"));

  let y = M + 116 + 18;

  // 대표 이미지 (가로형)
  const imgUrl = sampleImageFor(sub + " " + (plays[0] || ""), "🎨").url;
  els.push(S("img-bg", M, y, CW, 250, { bg: pack.soft, radius: pack.radius }));
  els.push(IMG("week-img", M + 8, y + 8, CW - 16, 234, imgUrl));
  y += 250 + 18;

  // 놀이 아이디어
  els.push(T("plays-h", "놀이 아이디어", M, y, CW, 28, { fontSize: 18, weight: 800, color: pack.body, align: "left" }, "title"));
  const playsText = plays.length ? plays.map((p) => `· ${p}`).join("\n") : "· 놀이 아이디어를 입력하세요";
  els.push(S("plays-bg", M, y + 32, CW, 170, { bg: pack.soft, radius: 14 }));
  els.push(T("plays-list", playsText, M + 18, y + 46, CW - 36, 146, { fontSize: 15, color: pack.body, align: "left", valign: "top" }, "content"));
  y += 32 + 170 + 18;

  // 핵심 메시지 (인포그래픽 hero)
  els.push(T("msg-h", "이런 놀이를 해요", M, y, CW, 24, { fontSize: 15, weight: 800, color: pack.body, align: "left" }, "title"));
  els.push(T("msg-body", ig.heroMessage || "놀이로 만나는 즐거운 한 주", M, y + 28, CW, 50, { fontSize: 14, color: pack.ink, weight: 700, align: "left", valign: "top" }, "content"));
  y += 28 + 50 + 12;

  // 가정 연계
  els.push(S("fam-bg", M, y, CW, 110, { bg: pack.band, radius: 14 }));
  els.push(T("fam-h", "가정 연계", M + 16, y + 12, CW - 32, 22, { fontSize: 14, weight: 800, color: pack.ink, align: "left" }, "title"));
  els.push(T("fam-body", family || "가정에서 함께 놀이를 이어가요", M + 16, y + 40, CW - 32, 60, { fontSize: 13, color: pack.body, align: "left", valign: "top" }, "content"));

  return {
    output_type: "DesignDoc",
    title: `${ig.title || "월안"} · ${label}`,
    frame: { w: W, h: H, bg: pack.bg },
    elements: els,
  };
}

// 월안 ViewModel → InfographicStructure (편의 함수)
export function toInfographicStructure(vm: MonthlyPlanViewModel): MonthlyInfographicData {
  return buildInfographicData(vm);
}
