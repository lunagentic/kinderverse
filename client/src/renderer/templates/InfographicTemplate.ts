// Infographic — MonthlyPlan 디자인 템플릿 (이미지 중심·아이콘 인포그래픽).
// ColorLab(텍스트 카드형)과 달리 큰 이미지 타일 + 아이콘 칩 위주.
import type {
  TemplateDocument,
  LayoutDocument,
  LayoutSection,
  Layer,
  ThemeTokens,
  MonthlySection,
  HeaderSection,
  SelectionReasonSection,
  CurriculumSection,
  WeeklyFlowSection,
  OutdoorActivitySection,
  SafetySection,
  CharacterSection,
  FamilyConnectionSection,
  EventSection,
  ImageSlot,
} from "../types";

const A4 = { W: 794 };
const M = 36;
const GAP = 16;
const CW = A4.W - M * 2;

const P = {
  page: "#F3F6FB",
  ink: "#33384A",
  sub: "#8089A0",
  white: "#FFFFFF",
  band: "#3E7D8E",
  stage: ["#FF8FA3", "#5BC0A8", "#7C83DB", "#F4B860"],
  stageBg: ["#FFE7EC", "#E0F4EE", "#E7E9FB", "#FFF1DC"],
  area: ["#F2A0A8", "#7FC9B6", "#9AA0E0", "#F4C572", "#7FC0D6"],
  chipBg: "#FFFFFF",
};

export const infographicTheme: ThemeTokens = {
  pageBg: P.page,
  sectionBg: P.white,
  accent: P.band,
  ink: P.ink,
  sub: P.sub,
  rowAlt: "#EAF0F7",
  font: { title: 32, heading: 19, body: 13, small: 11 },
  weight: { bold: 800, medium: 600, normal: 400 },
  space: { page: M, section: 18, gap: GAP, row: 24 },
};

const AREA_ICON: Record<string, string> = {
  "신체운동·건강": "🤸",
  의사소통: "💬",
  사회관계: "🤝",
  예술경험: "🎨",
  자연탐구: "🔬",
};

function pick<K extends MonthlySection["kind"]>(
  doc: TemplateDocument,
  kind: K
): Extract<MonthlySection, { kind: K }> | undefined {
  const node = doc.sections.find((n) => n.section.kind === kind);
  return node ? (node.section as Extract<MonthlySection, { kind: K }>) : undefined;
}

const T = (id: string, text: string, frame: Layer["frame"], style: Layer["style"]): Layer => ({ id, type: "text", z: 0, text, frame, style });
const S = (id: string, frame: Layer["frame"], style: Layer["style"], role?: string): Layer => ({ id, type: "shape", z: 0, frame, style, role });
const IMG = (id: string, frame: Layer["frame"], slot?: ImageSlot, role = "image"): Layer => ({ id, type: "image", z: 0, frame, src: slot?.asset?.url, prompt: slot?.prompt?.text, role });

// 큰 이미지 영역 (asset 있으면 이미지, 없으면 이모지 큰 placeholder)
function bigImage(idp: string, frame: Layer["frame"], slot: ImageSlot | undefined, tint: string): Layer[] {
  if (slot?.asset?.url) return [IMG(idp, frame, slot)];
  const out: Layer[] = [S(`${idp}-box`, frame, { bg: tint, radius: 12 }, "imageSlot")];
  out.push(T(`${idp}-emoji`, slot?.resolvedIcon || "🖼️", { x: frame.x, y: frame.y + frame.h / 2 - 26, w: frame.w, h: 40 }, { fontSize: Math.min(40, frame.h * 0.5), align: "center", color: "#9AA6BD" }));
  return out;
}

export function layoutInfographic(doc: TemplateDocument): LayoutDocument {
  const header = pick(doc, "header") as HeaderSection | undefined;
  const reason = pick(doc, "selectionReason") as SelectionReasonSection | undefined;
  const curr = pick(doc, "curriculum") as CurriculumSection | undefined;
  const weekly = pick(doc, "weeklyFlow") as WeeklyFlowSection | undefined;
  const outdoor = pick(doc, "outdoorActivity") as OutdoorActivitySection | undefined;
  const safety = pick(doc, "safety") as SafetySection | undefined;
  const character = pick(doc, "character") as CharacterSection | undefined;
  const home = pick(doc, "familyConnection") as FamilyConnectionSection | undefined;
  const events = pick(doc, "event") as EventSection | undefined;

  const sections: LayoutSection[] = [];
  let y = M;

  // ── Header 배너 (큰 이미지 + 제목) ──
  {
    const h = 184;
    const ls: Layer[] = [S("page", { x: 0, y: 0, w: A4.W, h: 9999 }, { bg: P.page })];
    ls.push(S("hdr-bg", { x: M, y, w: CW, h }, { bg: P.white, radius: 22 }, "sectionBg"));
    ls.push(...bigImage("hdr-hero", { x: M + 18, y: y + 18, w: 210, h: h - 36 }, header?.hero, "#E7EEF6"));
    const bi = header?.basicInfo;
    const tx = M + 248;
    ls.push(T("hdr-title", bi?.theme || "월간 놀이계획", { x: tx, y: y + 34, w: CW - 248 - 20, h: 44 }, { fontSize: 30, weight: 800, color: P.ink, align: "left" }));
    const meta = [bi?.ageBand && `연령 ${bi.ageBand}`, bi?.className, bi?.periodLabel].filter(Boolean).join("   ·   ");
    ls.push(T("hdr-meta", meta, { x: tx, y: y + 84, w: CW - 248 - 20, h: 22 }, { fontSize: 13.5, weight: 600, color: P.band, align: "left" }));
    if (reason?.summary) {
      let s = reason.summary;
      if (s.length > 80) s = s.slice(0, 80) + "…";
      ls.push(T("hdr-reason", s, { x: tx, y: y + 112, w: CW - 248 - 20, h: 56 }, { fontSize: 12.5, color: P.sub, align: "left" }));
    }
    sections.push({ id: "basic_info", title: "Header", frame: { x: M, y, w: CW, h }, layers: ls });
    y += h + 18;
  }

  // ── 놀이 흐름: 큰 이미지 타일 (2열, 이미지 상단 강조) ──
  {
    const ls: Layer[] = [T("wk-h", "이달의 놀이 흐름", { x: M, y, w: CW, h: 30 }, { fontSize: 19, weight: 800, color: P.ink, align: "left" })];
    const top = y + 38;
    const tileW = (CW - GAP) / 2;
    const imgH = 122;
    const tileH = imgH + 90;
    const weeks = (weekly?.weeks || []).slice(0, 4);
    const wImgs = weekly?.weekImages || [];
    for (let i = 0; i < 4; i++) {
      const w = weeks[i];
      const col = i % 2;
      const row = Math.floor(i / 2);
      const cx = M + col * (tileW + GAP);
      const cy = top + row * (tileH + GAP);
      ls.push(S(`wk${i}-card`, { x: cx, y: cy, w: tileW, h: tileH }, { bg: P.white, radius: 16 }, "card"));
      const slot = wImgs.find((wi) => wi.week === (w ? w.week : i + 1))?.image;
      ls.push(...bigImage(`wk${i}-img`, { x: cx, y: cy, w: tileW, h: imgH }, slot, P.stageBg[i]));
      ls.push(S(`wk${i}-badge`, { x: cx + 12, y: cy + imgH + 12, w: 50, h: 24 }, { bg: P.stage[i], radius: 12 }));
      ls.push(T(`wk${i}-no`, `${w ? w.week : i + 1}주`, { x: cx + 12, y: cy + imgH + 14, w: 50, h: 20 }, { fontSize: 12, weight: 800, color: "#ffffff", align: "center" }));
      ls.push(T(`wk${i}-sub`, w?.subTheme || "-", { x: cx + 72, y: cy + imgH + 12, w: tileW - 84, h: 24 }, { fontSize: 15, weight: 800, color: P.stage[i], align: "left" }));
      const playLine = (w?.plays || []).slice(0, 2).map((p) => p.title).join(", ");
      ls.push(T(`wk${i}-plays`, playLine, { x: cx + 14, y: cy + imgH + 44, w: tileW - 28, h: 34 }, { fontSize: 12, color: P.ink, align: "left" }));
    }
    const h = 38 + tileH * 2 + GAP;
    sections.push({ id: "weekly_flow", title: "놀이 흐름", frame: { x: M, y, w: CW, h }, layers: ls });
    y += h + 18;
  }

  // ── 교육과정 연계: 아이콘 칩 5개 (한 줄) ──
  {
    const ls: Layer[] = [T("cur-h", "교육과정 연계", { x: M, y, w: CW, h: 28 }, { fontSize: 19, weight: 800, color: P.ink, align: "left" })];
    const top = y + 36;
    const links = curr?.links || [];
    const n = Math.max(links.length, 1);
    const chipW = (CW - GAP * (n - 1)) / n;
    const chipH = 96;
    links.forEach((c, i) => {
      const cx = M + i * (chipW + GAP);
      ls.push(S(`cur${i}-bg`, { x: cx, y: top, w: chipW, h: chipH }, { bg: P.white, radius: 14 }, "card"));
      ls.push(S(`cur${i}-bar`, { x: cx, y: top, w: chipW, h: 6 }, { bg: P.area[i % 5], radius: 0 }));
      ls.push(T(`cur${i}-icon`, AREA_ICON[c.area] || "•", { x: cx, y: top + 16, w: chipW, h: 30 }, { fontSize: 26, align: "center", color: P.ink }));
      ls.push(T(`cur${i}-area`, c.area, { x: cx + 6, y: top + 52, w: chipW - 12, h: 18 }, { fontSize: 11.5, weight: 800, color: P.ink, align: "center" }));
      ls.push(T(`cur${i}-cat`, c.category, { x: cx + 6, y: top + 72, w: chipW - 12, h: 16 }, { fontSize: 9.5, weight: 600, color: P.sub, align: "center" }));
    });
    const h = 36 + chipH;
    sections.push({ id: "curriculum_links", title: "교육과정 연계", frame: { x: M, y, w: CW, h }, layers: ls });
    y += h + 18;
  }

  // ── 바깥놀이 · 안전 · 인성 (아이콘 박스 3개) ──
  {
    const ls: Layer[] = [];
    const colW = (CW - GAP * 2) / 3;
    const boxH = 150;
    const boxes = [
      { id: "od", icon: "🌳", title: "바깥놀이", color: "#5BC0A8", lines: (outdoor?.activities || []).slice(0, 4).map((o) => `· ${o.week}주 ${o.activityName}`) },
      { id: "sf", icon: "🦺", title: "안전교육", color: "#FF8FA3", lines: (safety?.items || []).slice(0, 3).map((kv) => `· ${kv.value}`) },
      { id: "ch", icon: "💛", title: "인성교육", color: "#F4B860", lines: [character?.coreValue && `핵심 가치 · ${character.coreValue}`, character?.practiceContext].filter(Boolean) as string[] },
    ];
    boxes.forEach((b, bi) => {
      const x = M + bi * (colW + GAP);
      ls.push(S(`${b.id}-bg`, { x, y, w: colW, h: boxH }, { bg: P.white, radius: 14 }, "card"));
      ls.push(T(`${b.id}-icon`, b.icon, { x: x + 14, y: y + 14, w: 28, h: 26 }, { fontSize: 22, align: "left", color: P.ink }));
      ls.push(T(`${b.id}-h`, b.title, { x: x + 46, y: y + 16, w: colW - 60, h: 22 }, { fontSize: 14, weight: 800, color: b.color, align: "left" }));
      b.lines.forEach((ln, i) =>
        ls.push(T(`${b.id}${i}`, ln, { x: x + 14, y: y + 48 + i * 26, w: colW - 28, h: 24 }, { fontSize: 11.5, color: P.ink, align: "left" }))
      );
    });
    sections.push({ id: "outdoor_play", title: "운영", frame: { x: M, y, w: CW, h: boxH }, layers: ls });
    y += boxH + 18;
  }

  // ── 가정연계 · 행사 (2열) ──
  {
    const colW = (CW - GAP) / 2;
    const boxH = 140;
    const hl: Layer[] = [];
    hl.push(S("home-bg", { x: M, y, w: colW, h: boxH }, { bg: P.white, radius: 14 }, "card"));
    hl.push(T("home-icon", "🏠", { x: M + 14, y: y + 14, w: 26, h: 24 }, { fontSize: 20, align: "left", color: P.ink }));
    hl.push(T("home-h", "가정 연계", { x: M + 44, y: y + 16, w: colW - 56, h: 22 }, { fontSize: 14, weight: 800, color: "#5BC0A8", align: "left" }));
    (home?.items || []).slice(0, 3).forEach((kv, i) => hl.push(T(`home${i}`, `· ${kv.label}: ${kv.value}`, { x: M + 14, y: y + 48 + i * 25, w: colW - 28, h: 23 }, { fontSize: 12, color: P.ink, align: "left" })));
    sections.push({ id: "home_connection", title: "가정연계", frame: { x: M, y, w: colW, h: boxH }, layers: hl });

    const ex = M + colW + GAP;
    const el: Layer[] = [];
    el.push(S("ev-bg", { x: ex, y, w: colW, h: boxH }, { bg: P.white, radius: 14 }, "card"));
    el.push(T("ev-icon", "🎉", { x: ex + 14, y: y + 14, w: 26, h: 24 }, { fontSize: 20, align: "left", color: P.ink }));
    el.push(T("ev-h", "행사", { x: ex + 44, y: y + 16, w: colW - 56, h: 22 }, { fontSize: 14, weight: 800, color: "#F4B860", align: "left" }));
    const evs = events?.events || [];
    if (evs.length) evs.slice(0, 3).forEach((e, i) => el.push(T(`ev${i}`, `· ${e.name}${e.date ? ` (${e.date})` : ""}`, { x: ex + 14, y: y + 48 + i * 25, w: colW - 28, h: 23 }, { fontSize: 12, color: P.ink, align: "left" })));
    else el.push(T("ev-none", "예정된 행사 없음", { x: ex + 14, y: y + 48, w: colW - 28, h: 23 }, { fontSize: 12, color: P.sub, align: "left" }));
    sections.push({ id: "events", title: "행사", frame: { x: ex, y, w: colW, h: boxH }, layers: el });
    y += boxH;
  }

  const height = Math.ceil(y + M);
  // page bg 높이 보정
  sections[0].layers[0].frame.h = height;

  let z = 0;
  for (const s of sections) for (const l of s.layers) l.z = z++;

  return {
    version: "1.0",
    planType: doc.planType,
    output: doc.output,
    canvas: { width: A4.W, height, background: P.page, padding: M },
    theme: infographicTheme,
    sections,
  };
}
