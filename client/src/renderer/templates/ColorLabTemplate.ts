// ColorLab — MonthlyPlan 디자인 템플릿 (A4 세로 · 파스텔 · 카드형 · 이미지 자리 다수).
// 입력: TemplateDocument(Section Tree) → 출력: LayoutDocument.
// 구성(위→아래): Header → 놀이 선정 이유(크게) → 이달의 놀이 흐름(크게) →
//                교육과정 연계(작게) → 바깥놀이·안전교육·인성교육 → 가정연계·행사
import type {
  TemplateDocument,
  LayoutDocument,
  LayoutSection,
  Layer,
  ThemeTokens,
  MonthlySection,
  HeaderSection,
  SelectionReasonSection,
  TeacherExpectationSection,
  CurriculumSection,
  WeeklyFlowSection,
  OutdoorActivitySection,
  SafetySection,
  CharacterSection,
  FamilyConnectionSection,
  EventSection,
  ImageSlot,
} from "../types";
import { frameImageFor } from "../image/assetLibrary";
import { bannerFor } from "../image/bannerManifest";

// 크롭된 리본 배너 가로:세로 비율 (1536×470 ≈ 3.27)
const BANNER_AR = 1536 / 470;

// 섹션 제목 배너(리본) 레이어 — 높이 기준으로 사이즈(가로는 비율 자동), 왼쪽 정렬.
function bannerLayer(sectionId: string, x: number, y: number, h = 54): Layer | null {
  const url = bannerFor(sectionId);
  if (!url) return null;
  const w = Math.round(h * BANNER_AR);
  return {
    id: `${sectionId}-banner`,
    type: "image",
    z: 0,
    frame: { x, y, w, h },
    src: url,
    fit: "contain",
    role: "titleBanner",
  };
}

export function hasBanner(sectionId: string): boolean {
  return !!bannerFor(sectionId);
}

// 섹션 제목 — 배너가 있으면 리본 이미지로, 없으면 텍스트 제목으로.
function pushTitle(ls: Layer[], sectionId: string, x: number, y: number, textLayer: Layer, h = 54): void {
  const bn = bannerLayer(sectionId, x, y, h);
  if (bn) ls.push(bn);
  else ls.push(textLayer);
}

const A4 = { W: 794, H: 1123 };
const M = 28;
const GAP = 12;
const SG = 10; // 섹션 사이 간격 (A4 한 장에 맞추기 위해 압축)
const CW = A4.W - M * 2; // 738

const P = {
  page: "#FBF7FB",
  header: "#FFE3EC",
  headerInk: "#A24E6B",
  reason: "#FFF4EC",
  ink: "#4A4453",
  sub: "#8A8392",
  white: "#FFFFFF",
  week: ["#FFE0E9", "#E2F2EA", "#E6E7FF", "#FFF1D6"],
  weekInk: ["#A85070", "#3E8E72", "#5A5BB0", "#B08A3E"],
  curriculum: ["#FDE2E4", "#E3F1EA", "#E8E8FB", "#FFF3D6", "#E2F1F6"],
  outdoor: { bg: "#E2F1F6", ink: "#3E7D8E" },
  safety: { bg: "#FFE7E0", ink: "#B0644E" },
  character: { bg: "#F0E7FB", ink: "#7A5AA0" },
  home: { bg: "#E6F5EE", ink: "#3E8E72" },
  event: { bg: "#FFF2D8", ink: "#B08A3E" },
};

export const colorLabTheme: ThemeTokens = {
  pageBg: P.page,
  sectionBg: P.white,
  accent: P.headerInk,
  ink: P.ink,
  sub: P.sub,
  rowAlt: "#F6EEF4",
  font: { title: 32, heading: 20, body: 13, small: 12 },
  weight: { bold: 800, medium: 600, normal: 400 },
  space: { page: M, section: 18, gap: GAP, row: 26 },
};

function pick<K extends MonthlySection["kind"]>(
  doc: TemplateDocument,
  kind: K
): Extract<MonthlySection, { kind: K }> | undefined {
  const node = doc.sections.find((n) => n.section.kind === kind);
  return node ? (node.section as Extract<MonthlySection, { kind: K }>) : undefined;
}

const T = (
  id: string,
  text: string,
  frame: Layer["frame"],
  style: Layer["style"],
  textRole: "title" | "content" = "content"
): Layer => ({
  id, type: "text", z: 0, text, frame, style, textRole,
});
// 제목 텍스트 헬퍼 (textRole: "title")
const TT = (id: string, text: string, frame: Layer["frame"], style: Layer["style"]): Layer =>
  T(id, text, frame, style, "title");
const S = (id: string, frame: Layer["frame"], style: Layer["style"], role?: string, locked?: boolean): Layer => ({
  id, type: "shape", z: 0, frame, style, role, locked,
});
const IMG = (id: string, frame: Layer["frame"], slot?: ImageSlot, role = "image", fit: "cover" | "contain" | "fill" = "cover"): Layer => ({
  id, type: "image", z: 0, frame, src: slot?.asset?.url, prompt: slot?.prompt?.text, role, fit,
});

const heading = (id: string, text: string, y: number, fontSize = 20): Layer =>
  TT(id, text, { x: M, y, w: CW, h: 26 }, { fontSize, weight: 800, color: P.ink, align: "left", stroke: "#FFFFFF", strokeWidth: fontSize >= 20 ? 3.5 : 2.5 });

const estLines = (text: string, fontSize: number, width: number): number => {
  const cpl = Math.max(1, Math.floor(width / (fontSize * 0.95)));
  return Math.max(1, Math.ceil((text.length || 1) / cpl));
};

// ── 이미지 자리 (레퍼런스 느낌: 파스텔 박스 + 아이콘 + overlay 프리뷰) ──
const ICON_EMOJI: Record<string, string> = {
  sun: "☀️", snail: "🐌", leaf: "🌿", heart: "💗", star: "⭐", flower: "🌸", rainbow: "🌈",
};
const roleEmoji = (role?: string) => (role === "hero" ? "🌈" : role === "weekly" ? "🎨" : "🖼️");

function rgba(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

// anchor → 이미지 프레임 내 대략 영역 (픽셀 좌표는 여기서 계산, 슬롯엔 없음)
function overlayRegion(f: Layer["frame"], anchor?: string): Layer["frame"] {
  const a = anchor || "center";
  if (a === "fill") return { ...f };
  if (a.startsWith("bottom")) {
    const h = Math.round(f.h * 0.42);
    return { x: f.x, y: f.y + f.h - h, w: f.w, h };
  }
  if (a === "top-right") return { x: f.x + f.w - 36, y: f.y + 8, w: 28, h: 28 };
  if (a === "top-left") return { x: f.x + 8, y: f.y + 8, w: 28, h: 28 };
  if (a.startsWith("top")) return { x: f.x, y: f.y, w: f.w, h: Math.round(f.h * 0.3) };
  return f;
}

// 이미지 슬롯 → 레이어들 (asset 있으면 실제 이미지, 없으면 디자인된 플레이스홀더 + overlay 프리뷰)
function imageArea(idp: string, frame: Layer["frame"], slot: ImageSlot | undefined, tint: string): Layer[] {
  const out: Layer[] = [];
  if (slot?.asset?.url) {
    out.push(IMG(idp, frame, slot, slot.role, "contain")); // 일러스트 전체 보이게
  } else {
    out.push(S(`${idp}-box`, frame, { bg: tint, radius: 14 }, "imageSlot"));
    const mainEmoji = slot?.resolvedIcon || roleEmoji(slot?.role);
    out.push(T(`${idp}-emoji`, mainEmoji, { x: frame.x, y: frame.y + frame.h / 2 - 24, w: frame.w, h: 34 }, { fontSize: 30, align: "center", color: "#C9B6D6" }));
    const hasText = (slot?.overlays || []).some((o) => o.kind === "text");
    if (!hasText)
      out.push(T(`${idp}-label`, slot?.placeholder?.label || "이미지", { x: frame.x + 8, y: frame.y + frame.h / 2 + 12, w: frame.w - 16, h: 18 }, { fontSize: 12, align: "center", color: "#9A8FA6" }));
  }
  (slot?.overlays || []).forEach((o, i) => {
    const r = overlayRegion(frame, o.anchor);
    if (o.kind === "shape") {
      out.push(S(`${idp}-ov${i}`, r, { bg: rgba(o.fill || "#000000", o.opacity ?? 0.4), radius: 0 }));
    } else if (o.kind === "text") {
      out.push(T(`${idp}-ov${i}`, o.text, { x: r.x + 12, y: r.y + r.h - 30, w: r.w - 24, h: 24 }, { fontSize: Math.min(o.style?.fontSize || 16, 18), weight: o.style?.weight || 800, color: o.style?.color || "#ffffff", align: "left" }));
    } else if (o.kind === "icon") {
      // resolver 가 이모지를 직접 넣었으면 그대로, 아니면 이름→이모지 매핑
      const emoji = ICON_EMOJI[o.icon] || o.icon || "✨";
      out.push(T(`${idp}-ov${i}`, emoji, { x: r.x, y: r.y, w: r.w, h: r.h }, { fontSize: o.size || 20, align: "center", color: o.color || "#ffffff" }));
    }
  });
  return out;
}

export function layoutColorLab(doc: TemplateDocument): LayoutDocument {
  const header = pick(doc, "header") as HeaderSection | undefined;
  const reason = pick(doc, "selectionReason") as SelectionReasonSection | undefined;
  const teacher = pick(doc, "teacherExpectation") as TeacherExpectationSection | undefined;
  const curr = pick(doc, "curriculum") as CurriculumSection | undefined;
  const weekly = pick(doc, "weeklyFlow") as WeeklyFlowSection | undefined;
  const outdoor = pick(doc, "outdoorActivity") as OutdoorActivitySection | undefined;
  const safety = pick(doc, "safety") as SafetySection | undefined;
  const character = pick(doc, "character") as CharacterSection | undefined;
  const home = pick(doc, "familyConnection") as FamilyConnectionSection | undefined;
  const events = pick(doc, "event") as EventSection | undefined;

  const sections: LayoutSection[] = [];
  let y = M;

  // ── Header (컴팩트) ──
  {
    const h = 104;
    const ls: Layer[] = [];
    ls.push(S("page", { x: 0, y: 0, w: A4.W, h: A4.H }, { bg: P.page }, "page", true));
    // 제목 영역 배경은 투명을 디폴트로 (배경 일러스트가 비치게) → 패널에서 다시 채울 수 있음
    ls.push(S("hdr-bg", { x: M, y, w: CW, h }, { bg: P.header, radius: 22, opacity: 0 }, "sectionBg"));
    const bi = header?.basicInfo;
    const tw = CW - 270;
    ls.push(TT("hdr-title", bi?.theme || "월간 놀이계획", { x: M + 24, y: y + 18, w: tw, h: 40 }, { fontSize: 30, weight: 800, color: P.headerInk, align: "left", stroke: "#FFFFFF", strokeWidth: 4.5 }));
    const meta = [bi?.ageBand && `연령 ${bi.ageBand}`, bi?.className, bi?.periodLabel].filter(Boolean).join("   ·   ");
    ls.push(T("hdr-meta", meta, { x: M + 24, y: y + 60, w: tw, h: 20 }, { fontSize: 14, weight: 700, color: P.headerInk, align: "left", stroke: "#FFFFFF", strokeWidth: 3 }));
    if (bi?.lifeTheme)
      ls.push(T("hdr-life", `생활주제 · ${bi.lifeTheme}`, { x: M + 24, y: y + 82, w: tw, h: 18 }, { fontSize: 13, weight: 600, color: P.headerInk, align: "left", stroke: "#FFFFFF", strokeWidth: 2.5 }));
    const heroW = 220;
    ls.push(...imageArea("hdr-hero", { x: M + CW - heroW - 12, y: y + 10, w: heroW, h: h - 20 }, header?.hero, "#FCEAF1"));
    sections.push({ id: "basic_info", title: "Header", frame: { x: M, y, w: CW, h }, layers: ls });
    y += h + SG;
  }

  // ── 놀이 선정 이유 (밴드, 최대 3줄) ──
  {
    let summary = reason?.summary || "";
    if (summary.length > 180) summary = summary.slice(0, 180) + "…";
    const bodyFs = 13;
    const bodyW = CW - 44;
    const lines = summary ? Math.min(3, estLines(summary, bodyFs, bodyW)) : 0;
    const detail = (reason?.details || []).map((d) => d.value).filter(Boolean).join("   ·   ");
    const detailH = detail ? 18 : 0;
    const h = 16 + 24 + (lines ? lines * 19 + 4 : 0) + detailH + 12;
    const ls: Layer[] = [];
    ls.push(S("reason-bg", { x: M, y, w: CW, h }, { bg: P.reason, radius: 16 }, "sectionBg"));
    pushTitle(
      ls,
      "rationale",
      M + 16,
      y + 6,
      TT("reason-h", "놀이 선정 이유", { x: M + 22, y: y + 14, w: CW - 44, h: 24 }, { fontSize: 16, weight: 800, color: P.headerInk, align: "left" }),
      44
    );
    if (summary)
      ls.push(T("reason-body", summary, { x: M + 22, y: y + 42, w: bodyW, h: lines * 19 }, { fontSize: bodyFs, weight: 400, color: P.ink, align: "left", valign: "top" }));
    if (detail)
      ls.push(T("reason-detail", detail, { x: M + 22, y: y + 42 + lines * 19 + 4, w: bodyW, h: 16 }, { fontSize: 12, weight: 600, color: P.sub, align: "left" }));
    sections.push({ id: "rationale", title: "놀이 선정 이유", frame: { x: M, y, w: CW, h }, layers: ls });
    y += h + SG;
  }

  // ── 이달의 놀이 흐름 (4주차 한 줄 카드 + 주차 이미지) ──
  {
    const ls: Layer[] = [];
    pushTitle(ls, "weekly_flow", M, y - 2, heading("wk-h", "이달의 놀이 흐름", y, 18), 56);
    const top = y + (hasBanner("weekly_flow") ? 62 : 30);
    const cardH = 184;
    const cardW = (CW - GAP * 3) / 4;
    const weeks = (weekly?.weeks || []).slice(0, 4);
    const wImgs = weekly?.weekImages || [];
    for (let i = 0; i < 4; i++) {
      const w = weeks[i];
      const cx = M + i * (cardW + GAP);
      const cy = top;
      ls.push(S(`wk${i}-bg`, { x: cx, y: cy, w: cardW, h: cardH }, { bg: P.week[i], radius: 18 }, "card"));
      ls.push(S(`wk${i}-badge`, { x: cx + 12, y: cy + 12, w: 46, h: 24 }, { bg: P.white, radius: 12 }));
      ls.push(TT(`wk${i}-no`, `${w ? w.week : i + 1}주`, { x: cx + 12, y: cy + 15, w: 46, h: 20 }, { fontSize: 12.5, weight: 800, color: P.weekInk[i], align: "center" }));
      ls.push(TT(`wk${i}-sub`, w?.subTheme || "-", { x: cx + 12, y: cy + 42, w: cardW - 24, h: 22 }, { fontSize: 13.5, weight: 800, color: P.weekInk[i], align: "left" }));
      // 주차 데코 이미지 — 기본 사이즈를 태양(hero)만큼 크게 (카드 우하단)
      const thumb = 84;
      const slot = wImgs.find((wi) => wi.week === (w ? w.week : i + 1))?.image;
      ls.push(...imageArea(`wk${i}-img`, { x: cx + cardW - thumb - 6, y: cy + cardH - thumb - 6, w: thumb, h: thumb }, slot, "#FFFFFF"));
      // 놀이 아이디어 리스트 = 한 영역(멀티라인 텍스트) → 한 번에 편집
      const playsText = (w?.plays || []).slice(0, 4).map((p) => `· ${p.title}`).join("\n");
      if (playsText)
        ls.push(T(`wk${i}-plays`, playsText, { x: cx + 12, y: cy + 68, w: cardW - 22, h: cardH - 80 }, { fontSize: 12, color: P.ink, align: "left", valign: "top" }));
    }
    const h = (top - y) + cardH;
    sections.push({ id: "weekly_flow", title: "주차 카드", frame: { x: M, y, w: CW, h }, layers: ls });
    y += h + SG;
  }

  // ── 교사의 기대 (멀티라인 한 블록) ──
  {
    const exps = (teacher?.expectations || []).slice(0, 6);
    if (exps.length) {
      const top = y + (hasBanner("teacher_expectations") ? 56 : 26);
      const rowH = 19;
      const bodyH = exps.length * rowH + 12;
      const ls: Layer[] = [];
      pushTitle(ls, "teacher_expectations", M, y - 2, heading("te-h", "교사의 기대", y, 15), 52);
      ls.push(S("te-bg", { x: M, y: top, w: CW, h: bodyH }, { bg: "#F3F0FA", radius: 10 }));
      const teText = exps.map((e) => `· ${e.goal}`).join("\n");
      ls.push(T("te-list", teText, { x: M + 14, y: top + 6, w: CW - 28, h: bodyH - 12 }, { fontSize: 12.5, color: P.ink, align: "left", valign: "top" }));
      const h = (top - y) + bodyH;
      sections.push({ id: "teacher_expectations", title: "교사의 기대", frame: { x: M, y, w: CW, h }, layers: ls });
      y += h + SG;
    }
  }

  // ── 교육과정 연계 (행 테이블, 컴팩트) ──
  {
    const ls: Layer[] = [];
    pushTitle(ls, "curriculum_links", M, y - 2, heading("cur-h", "교육과정 연계", y, 15), 48);
    const top = y + 26;
    const links = (curr?.links || []).slice(0, 5);
    const rowH = 24;
    const rowGap = 3;
    links.forEach((c, i) => {
      const ry = top + i * (rowH + rowGap);
      ls.push(S(`cur${i}-bg`, { x: M, y: ry, w: CW, h: rowH }, { bg: P.curriculum[i % 5], radius: 8 }));
      ls.push(T(`cur${i}-area`, c.area, { x: M + 12, y: ry + 5, w: 120, h: 16 }, { fontSize: 12.5, weight: 800, color: P.ink, align: "left" }));
      if (c.category) ls.push(T(`cur${i}-cat`, c.category, { x: M + 136, y: ry + 5, w: 130, h: 15 }, { fontSize: 12, weight: 600, color: P.sub, align: "left" }));
      ls.push(T(`cur${i}-content`, c.content, { x: M + 272, y: ry + 5, w: CW - 286, h: 15 }, { fontSize: 12, color: P.ink, align: "left" }));
    });
    const h = 26 + links.length * (rowH + rowGap);
    sections.push({ id: "curriculum_links", title: "교육과정 연계", frame: { x: M, y, w: CW, h }, layers: ls });
    y += h + SG;
  }

  // ── 바깥놀이 · 안전교육 · 인성교육 (3열) ──
  {
    const ls: Layer[] = [];
    const colW = (CW - GAP * 2) / 3;
    const boxH = 132;

    let x = M;
    ls.push(S("od-bg", { x, y, w: colW, h: boxH }, { bg: P.outdoor.bg, radius: 14 }, "card"));
    ls.push(TT("od-h", "바깥놀이·신체활동", { x: x + 12, y: y + 12, w: colW - 24, h: 20 }, { fontSize: 13.5, weight: 800, color: P.outdoor.ink, align: "left" }));
    const odText = (outdoor?.activities || []).slice(0, 5).map((o) => `· ${o.week}주 ${o.activityName}`).join("\n");
    ls.push(T("od-list", odText, { x: x + 12, y: y + 38, w: colW - 24, h: boxH - 48 }, { fontSize: 12, color: P.ink, align: "left", valign: "top" }));

    x = M + colW + GAP;
    ls.push(S("sf-bg", { x, y, w: colW, h: boxH }, { bg: P.safety.bg, radius: 14 }, "card"));
    ls.push(TT("sf-h", "안전교육", { x: x + 12, y: y + 12, w: colW - 24, h: 20 }, { fontSize: 13.5, weight: 800, color: P.safety.ink, align: "left" }));
    const sfText = (safety?.items || []).slice(0, 4).map((kv) => `· ${kv.value}`).join("\n");
    ls.push(T("sf-list", sfText, { x: x + 12, y: y + 38, w: colW - 24, h: boxH - 48 }, { fontSize: 12, color: P.ink, align: "left", valign: "top" }));

    x = M + (colW + GAP) * 2;
    ls.push(S("ch-bg", { x, y, w: colW, h: boxH }, { bg: P.character.bg, radius: 14 }, "card"));
    ls.push(TT("ch-h", "인성교육", { x: x + 12, y: y + 12, w: colW - 24, h: 20 }, { fontSize: 13.5, weight: 800, color: P.character.ink, align: "left" }));
    if (character?.coreValue)
      ls.push(T("ch-core", `핵심 가치 · ${character.coreValue}`, { x: x + 12, y: y + 38, w: colW - 24, h: 20 }, { fontSize: 12, weight: 700, color: P.character.ink, align: "left" }));
    if (character?.practiceContext)
      ls.push(T("ch-ctx", character.practiceContext, { x: x + 12, y: y + 62, w: colW - 24, h: boxH - 70 }, { fontSize: 12, color: P.ink, align: "left", valign: "top" }));

    sections.push({ id: "outdoor_play", title: "바깥/안전/인성", frame: { x: M, y, w: CW, h: boxH }, layers: ls });
    y += boxH + SG;
  }

  // ── 가정연계 · 행사 (2열) ──
  {
    const colW = (CW - GAP) / 2;
    const boxH = 116;
    const hl: Layer[] = [];
    hl.push(S("home-bg", { x: M, y, w: colW, h: boxH }, { bg: P.home.bg, radius: 14 }, "card"));
    hl.push(TT("home-h", "가정 연계", { x: M + 14, y: y + 12, w: colW - 28, h: 20 }, { fontSize: 14, weight: 800, color: P.home.ink, align: "left" }));
    const homeText = (home?.items || []).slice(0, 4).map((kv) => `· ${kv.label}: ${kv.value}`).join("\n");
    hl.push(T("home-list", homeText, { x: M + 14, y: y + 38, w: colW - 28, h: boxH - 48 }, { fontSize: 12, color: P.ink, align: "left", valign: "top" }));
    sections.push({ id: "home_connection", title: "가정연계", frame: { x: M, y, w: colW, h: boxH }, layers: hl });

    const ex = M + colW + GAP;
    const el: Layer[] = [];
    el.push(S("ev-bg", { x: ex, y, w: colW, h: boxH }, { bg: P.event.bg, radius: 14 }, "card"));
    el.push(TT("ev-h", "행사", { x: ex + 14, y: y + 12, w: colW - 28, h: 20 }, { fontSize: 14, weight: 800, color: P.event.ink, align: "left" }));
    const evs = events?.events || [];
    const evText = evs.length
      ? evs.slice(0, 4).map((e) => `· ${e.name}${e.date ? ` (${e.date})` : ""}`).join("\n")
      : "예정된 행사 없음";
    el.push(T("ev-list", evText, { x: ex + 14, y: y + 38, w: colW - 28, h: boxH - 48 }, { fontSize: 12, color: evs.length ? P.ink : P.sub, align: "left", valign: "top" }));
    sections.push({ id: "events", title: "행사", frame: { x: ex, y, w: colW, h: boxH }, layers: el });
    y += boxH;
  }

  // 기본은 A4 한 장, 내용이 많으면 그만큼 늘려서 표/섹션이 잘리지 않게
  const height = Math.max(A4.H, Math.ceil(y + M));

  // BackgroundLayer: 테마 풀페이지 프레임 일러스트 (페이지 배경 위, 카드 뒤)
  const frameUrl = frameImageFor(header?.basicInfo?.theme || "");
  if (frameUrl && sections[0]) {
    sections[0].layers.splice(1, 0, {
      id: "page-frame",
      type: "image",
      z: 0,
      frame: { x: 0, y: 0, w: A4.W, h: height },
      src: frameUrl,
      fit: "fill",
      role: "background",
      locked: true, // 배경 프레임은 잠금(선택·이동 불가)
    });
  }

  // 제목 배너(리본)를 맨 위 레이어로 — 모든 섹션에서 추출해 마지막 섹션 끝에 모음(렌더 순서상 최상단)
  const banners: Layer[] = [];
  for (const s of sections) {
    for (let i = s.layers.length - 1; i >= 0; i--) {
      if (s.layers[i].role === "titleBanner") banners.unshift(s.layers.splice(i, 1)[0]);
    }
  }
  if (banners.length) sections[sections.length - 1].layers.push(...banners);

  let z = 0;
  for (const s of sections) for (const l of s.layers) l.z = z++;

  return {
    version: "1.0",
    planType: doc.planType,
    output: doc.output,
    canvas: { width: A4.W, height, background: P.page, padding: M },
    theme: colorLabTheme,
    sections,
  };
}
