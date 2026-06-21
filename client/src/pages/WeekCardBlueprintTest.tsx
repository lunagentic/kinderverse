// 월안 "밴드" 편집 카드 (포스터의 1주차 밴드 구조 재현).
//  - 데이터: 여름이 왔어요(summer)  - StylePack: summer_play(공유) → 폰트/팔레트 일치
//  - 레이아웃: 좌측 주차/제목/놀이 텍스트(편집) + 우측 작품 사진 3장(이미지 슬롯)
//  - 스타일 기준(레퍼런스): 업로드한 실제 포스터 / 월안 포스터 생성 → 슬롯을 그 분위기로 컨디셔닝
//  - 텍스트/이미지/배경 편집 + 1200px PNG export
import { useMemo, useRef, useState } from "react";
import { sampleSummerPlan } from "../data/sampleSummerPlan";
import { monthPlanPoster } from "../data/monthPlanPoster";
import { transformMonthlyPlanToInfographic } from "../transformers/monthlyToInfographic";
import { getStylePack } from "../styles/stylePacks";
import { buildMonthPosterPrompt } from "../prompts/buildImagePrompt";
import type { EditableLayer } from "../templates/buildEditableWeekCardTemplate";
import WeekCardEditor from "../components/WeekCardEditor";
import LayerPanel from "../components/LayerPanel";
import PropertyPanel from "../components/PropertyPanel";
import RegionCropper from "../components/RegionCropper";
import { exportNodeToPng } from "../utils/exportToPng";
import { generateImageForPrompt } from "../utils/imageCache";
import { sampleMonthPoster } from "../utils/sampleMonthPoster";
import { loadComponents, saveComponent, deleteComponent } from "../utils/componentStore";
import { removeBackground } from "../utils/removeBackground";

interface SlotGenState {
  loading: boolean;
  error: string;
  cached: boolean;
}

const PACK = getStylePack("summer_play"); // 모든 주차 공유 — 폰트/팔레트 일치
const W = 1280;
const H = 470;
// ✏️ 편집: 월간계획안 포스터의 "주차 카드"를 코드 레이어로 그대로 재현(편집 가능).
const RICH_W = 900;
const RICH_H = 480;
const SLOT_IDS = ["image-1", "image-2", "image-3"];
// 슬롯 프롬프트(캐시 키 일치를 위해 한 곳에서 생성)
const slotPromptFor = (wk: any, k: number) =>
  `유치원 "${wk.playNames[k] || wk.title}" 활동의 아이 작품 사진 한 장, 밝은 여름 분위기, 글자 없음`;

export default function WeekCardBlueprintTest({ autoCrop = false, richEdit = false }: { autoCrop?: boolean; richEdit?: boolean }) {
  const ig = useMemo(() => transformMonthlyPlanToInfographic(sampleSummerPlan), []);

  // 한 주차를 "밴드"(좌 텍스트 + 우 이미지 3장) 레이어로 빌드
  const buildForWeek = (idx: number) => {
    const week = ig.weeks[idx];
    const accent = PACK.palette[idx % PACK.palette.length];
    const layers: EditableLayer[] = [
      { id: "background", type: "shape", name: "배경", editable: true, locked: true, x: 0, y: 0, width: W, height: H, content: undefined, src: undefined, style: { fill: PACK.bg, backgroundColor: PACK.bg, radius: 28 } },
      // 배경 장식 (뒤에 깔리는 여름 분위기 — 물결/구름)
      { id: "deco-wave", type: "shape", name: "물결 장식", editable: true, locked: true, x: 0, y: 404, width: W, height: 66, content: undefined, src: undefined, style: { fill: "#4DBFFF", backgroundColor: "#4DBFFF", radius: 0, opacity: 0.18 } },
      { id: "deco-cloud-1", type: "icon", name: "구름 장식 1", editable: true, locked: false, x: 588, y: 18, width: 72, height: 44, content: "cloud", src: undefined, style: { iconKind: "cloud", size: 34, colors: [] } },
      { id: "deco-cloud-2", type: "icon", name: "구름 장식 2", editable: true, locked: false, x: 968, y: 26, width: 64, height: 40, content: "cloud", src: undefined, style: { iconKind: "cloud", size: 26, colors: [] } },
      { id: "week-badge", type: "text", name: "주차 배지", editable: true, locked: false, x: 44, y: 34, width: 120, height: 46, content: week.weekLabel, src: undefined, style: { fontSize: 22, fontWeight: 800, color: PACK.ink, align: "center", backgroundColor: PACK.soft, radius: 23, fontFamily: PACK.font } },
      { id: "phase", type: "text", name: "단계", editable: true, locked: false, x: 176, y: 38, width: 130, height: 38, content: week.phase, src: undefined, style: { fontSize: 18, fontWeight: 700, color: "#ffffff", align: "center", backgroundColor: accent, radius: 19, fontFamily: PACK.font } },
      { id: "title", type: "text", name: "제목", editable: true, locked: false, x: 44, y: 96, width: 470, height: 70, content: week.title, src: undefined, style: { fontSize: 46, fontWeight: 800, color: PACK.ink, align: "left", lineClamp: 1, fontFamily: PACK.font } },
      { id: "play-names", type: "text", name: "놀이 목록", editable: true, locked: false, x: 44, y: 184, width: 470, height: 200, content: week.playNames.map((p) => `· ${p}`).join("\n"), src: undefined, style: { fontSize: 24, fontWeight: 600, color: PACK.body, align: "left", fontFamily: PACK.font } },
      { id: "description", type: "text", name: "설명", editable: true, locked: false, x: 44, y: 396, width: 470, height: 54, content: week.description, src: undefined, style: { fontSize: 16, fontWeight: 400, color: PACK.body, align: "left", lineClamp: 2, fontFamily: PACK.font } },
      { id: "image-1", type: "image", name: "작품 사진 1", editable: true, locked: false, x: 540, y: 78, width: 220, height: 276, content: week.artifacts[0] || "작품 1", src: undefined, style: { fit: "cover", radius: 18, frame: "card", shadow: "soft" } },
      { id: "image-2", type: "image", name: "작품 사진 2", editable: true, locked: false, x: 778, y: 78, width: 220, height: 276, content: week.artifacts[1] || "작품 2", src: undefined, style: { fit: "cover", radius: 18, frame: "card", shadow: "soft" } },
      { id: "image-3", type: "image", name: "작품 사진 3", editable: true, locked: false, x: 1016, y: 78, width: 220, height: 276, content: week.artifacts[2] || "작품 3", src: undefined, style: { fit: "cover", radius: 18, frame: "card", shadow: "soft" } },
      // 사진 아래 캡션 (결과물 이름)
      { id: "caption-1", type: "text", name: "사진 캡션 1", editable: true, locked: false, x: 540, y: 362, width: 220, height: 30, content: week.artifacts[0] || "", src: undefined, style: { fontSize: 16, fontWeight: 700, color: PACK.ink, align: "center", lineClamp: 1, fontFamily: PACK.font } },
      { id: "caption-2", type: "text", name: "사진 캡션 2", editable: true, locked: false, x: 778, y: 362, width: 220, height: 30, content: week.artifacts[1] || "", src: undefined, style: { fontSize: 16, fontWeight: 700, color: PACK.ink, align: "center", lineClamp: 1, fontFamily: PACK.font } },
      { id: "caption-3", type: "text", name: "사진 캡션 3", editable: true, locked: false, x: 1016, y: 362, width: 220, height: 30, content: week.artifacts[2] || "", src: undefined, style: { fontSize: 16, fontWeight: 700, color: PACK.ink, align: "center", lineClamp: 1, fontFamily: PACK.font } },
      { id: "decoration", type: "icon", name: "장식 아이콘", editable: true, locked: false, x: 1136, y: 22, width: 110, height: 54, content: "sun", src: undefined, style: { iconKind: "sun", colors: [accent, PACK.band], size: 40 } },
    ];
    const slotPromptById: Record<string, string> = {
      "image-1": slotPromptFor(week, 0),
      "image-2": slotPromptFor(week, 1),
      "image-3": slotPromptFor(week, 2),
    };
    return { week, layers, slotPromptById };
  };

  // ✏️ 편집: 월간계획안 포스터의 "주차 카드"를 코드 레이어로 그대로 재현 → 모든 요소 편집 가능.
  //  - 재구현(편집): 카드 배경/테두리 · 가장자리 꾸밈 · 주차 배지 · 제목 · 놀이명(라벨+값)
  //  - 장식 그림: 실제 그림을 그대로 쓰도록 "이미지 슬롯" (✂️ 캡처/업로드로 채움 · AI 생성 아님)
  const buildRichWeekCard = (idx: number): EditableLayer[] => {
    // 콘텐츠(주차/제목/놀이명)는 "생성 소스 데이터"(프롬프트가 쓰는 plan = ig.weeks)에서 — 놀이명 3개 포함.
    const week = ig.weeks[idx % ig.weeks.length];
    // 표시 스타일(색/테두리/장식)만 포스터 설정에서.
    const w = monthPlanPoster.weeks[idx % monthPlanPoster.weeks.length];
    const cw = RICH_W, ch = RICH_H;
    const ink = "#4A423B";
    // 장식 그림(좌측 컬럼) — 포스터의 누끼 그림 2개 → 실제 이미지 슬롯(캡처/업로드 → 🪄누끼로 배경 제거)
    const illos: EditableLayer[] = (w.illos || []).slice(0, 2).map((_kind, i) => ({
      id: `illo-${i + 1}`, type: "image", name: `포스터 그림 ${i + 1}`, editable: true, locked: false,
      x: 52 + i * 12, y: 126 + i * 150, width: 176, height: 150,
      content: `포스터 그림 ${i + 1} · ✂️캡처/업로드`, src: undefined, style: { fit: "contain", radius: 12, background: "transparent" },
    }));
    // 가장자리 꾸밈 요소 — 포스터 배경 가장자리의 작은 장식(점/별/꽃). 색은 주차색, 모두 편집/이동 가능.
    const decos: EditableLayer[] = [
      { id: "deco-star", type: "icon", name: "꾸밈 별", editable: true, locked: false, x: cw - 84, y: 18, width: 46, height: 42, content: "star", src: undefined, style: { iconKind: "star", size: 26, colors: [] } },
      { id: "deco-flower", type: "icon", name: "꾸밈 꽃", editable: true, locked: false, x: 24, y: ch - 66, width: 46, height: 46, content: "flower", src: undefined, style: { iconKind: "flower", size: 26, colors: [] } },
      { id: "deco-dot-1", type: "shape", name: "꾸밈 점 1", editable: true, locked: false, x: cw - 134, y: 30, width: 14, height: 14, content: undefined, src: undefined, style: { fill: w.badge, backgroundColor: w.badge, radius: 7, opacity: 0.45 } },
      { id: "deco-dot-2", type: "shape", name: "꾸밈 점 2", editable: true, locked: false, x: cw - 60, y: ch - 52, width: 16, height: 16, content: undefined, src: undefined, style: { fill: w.badge, backgroundColor: w.badge, radius: 8, opacity: 0.4 } },
      { id: "deco-dot-3", type: "shape", name: "꾸밈 점 3", editable: true, locked: false, x: Math.round(cw / 2), y: ch - 44, width: 12, height: 12, content: undefined, src: undefined, style: { fill: w.badge, backgroundColor: w.badge, radius: 6, opacity: 0.4 } },
    ];
    // 놀이명 (생성 데이터의 playNames — 3개) — "· 놀이명:" 라벨[색]+ 값[검정] 분리 → 활동명만 따로 편집
    const plays: EditableLayer[] = week.playNames.flatMap((name, i) => {
      const y = 150 + i * 84;
      return [
        { id: `play-${i + 1}-label`, type: "text", name: `놀이명 라벨 ${i + 1}`, editable: true, locked: false, x: 332, y, width: 134, height: 40, content: "· 놀이명:", src: undefined, style: { fontSize: 25, fontWeight: 800, color: w.badge, align: "left", lineClamp: 1, fontFamily: PACK.font } } as EditableLayer,
        { id: `play-${i + 1}-value`, type: "text", name: `놀이명 ${i + 1}`, editable: true, locked: false, x: 466, y, width: 392, height: 40, content: name, src: undefined, style: { fontSize: 25, fontWeight: 700, color: ink, align: "left", lineClamp: 1, fontFamily: PACK.font } } as EditableLayer,
      ];
    });
    return [
      // 카드: 배경색 + 테두리 (포스터 주차 카드)
      { id: "background", type: "shape", name: "카드 배경", editable: true, locked: true, x: 0, y: 0, width: cw, height: ch, content: undefined, src: undefined, style: { fill: w.cardBg, backgroundColor: w.cardBg, radius: 28, border: w.border, borderWidth: 3 } },
      // 가장자리 꾸밈
      ...decos,
      // 주차 배지 + 제목 (상단)
      { id: "week-badge", type: "text", name: "주차 배지", editable: true, locked: false, x: 40, y: 36, width: 92, height: 50, content: week.weekLabel, src: undefined, style: { fontSize: 24, fontWeight: 800, color: "#ffffff", align: "center", backgroundColor: w.badge, radius: 14, fontFamily: PACK.font } },
      { id: "title", type: "text", name: "제목", editable: true, locked: false, x: 148, y: 32, width: 606, height: 58, content: week.title, src: undefined, style: { fontSize: 42, fontWeight: 800, color: w.badge, align: "left", lineClamp: 1, fontFamily: PACK.font } },
      // 장식 그림 (좌측, 실제 이미지 슬롯)
      ...illos,
      // 놀이명 (우측, 라벨+값)
      ...plays,
    ];
  };

  const [weekIndex, setWeekIndex] = useState(0);
  const built = useMemo(() => buildForWeek(weekIndex), [weekIndex]);
  const { week, slotPromptById } = built;

  const [layers, setLayers] = useState(() => (richEdit ? buildRichWeekCard(0) : buildForWeek(0).layers));
  const [selectedId, setSelectedId] = useState(null as string | null);
  const [exporting, setExporting] = useState(false);
  const [genByLayer, setGenByLayer] = useState({} as Record<string, SlotGenState>);
  const [referenceSrc, setReferenceSrc] = useState(null as string | null);
  const [posterGen, setPosterGen] = useState({ loading: false, error: "" });
  const [cropOpen, setCropOpen] = useState(!!autoCrop);
  const [cropImage, setCropImage] = useState(() => sampleMonthPoster() as string | null); // 크로퍼 기본 = 샘플 월안 포스터
  const [cropReference, setCropReference] = useState(null as string | null); // 원본 선택 영역(나란히 비교용)
  const [capturedPhotos, setCapturedPhotos] = useState([] as string[]); // 캡처한 개별 사진들
  const [cardCanvas, setCardCanvas] = useState(richEdit ? { w: RICH_W, h: RICH_H } : { w: W, h: H }); // 크롭/리치 시 비율에 맞춤
  const stageRef = useRef(null as HTMLDivElement | null);
  const [components, setComponents] = useState(() => loadComponents()); // 저장한 컴포넌트들
  const [savingComp, setSavingComp] = useState(false);
  const [nukiBusy, setNukiBusy] = useState(null as string | null); // 누끼 처리 중인 레이어 id

  // 월안 이미지(업로드 포스터 또는 🗓️ 생성한 월안 포스터)에서 영역 선택
  const openRegionSelect = () => {
    setCropImage(referenceSrc || sampleMonthPoster());
    setCropOpen(true);
  };

  // 참조 이미지에서 배경색/잉크색 샘플링 (배경 = 모서리 평균, 잉크 = 배경과 가장 대비되는 색)
  const sampleColors = (url: string): Promise<{ bg: string; ink: string } | null> =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          const w = 48, h = 32;
          const c = document.createElement("canvas");
          c.width = w; c.height = h;
          const ctx = c.getContext("2d");
          if (!ctx) { resolve(null); return; }
          ctx.drawImage(img, 0, 0, w, h);
          const d = ctx.getImageData(0, 0, w, h).data;
          const px = (x: number, y: number) => { const i = (y * w + x) * 4; return [d[i], d[i + 1], d[i + 2]]; };
          const corners = [px(0, 0), px(w - 1, 0), px(0, h - 1), px(w - 1, h - 1)];
          const bg = [0, 1, 2].map((k) => Math.round(corners.reduce((s, cc) => s + cc[k], 0) / corners.length));
          let best = bg, bestD = -1;
          for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            const p = px(x, y);
            const dist = (p[0] - bg[0]) ** 2 + (p[1] - bg[1]) ** 2 + (p[2] - bg[2]) ** 2;
            if (dist > bestD) { bestD = dist; best = p; }
          }
          const hex = (cc: number[]) => "#" + cc.map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0")).join("");
          resolve({ bg: hex(bg), ink: hex(best) });
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });

  // 담은 사진들(N장)을 "액자 없이 원본 그대로" 우측에 N등분 배치 + 좌측 편집 텍스트.
  // colors 가 있으면 샘플링한 배경/잉크색으로 디자인을 맞춘다.
  // 캡처 사진은 "원본 비율 그대로"(사이즈 고정 X) — 각 사진 aspect 에 맞춰 폭이 결정됨. 위치/크기는 이후 자유 조정.
  const buildCropCard = (
    cropsIn: { url: string; sx: number; sy: number; sw: number; sh: number }[],
    colors: { bg: string; ink: string } | null,
    bgImg: string | null = null,
    regionBox: { x: number; y: number; w: number; h: number } | null = null,
    canvas: { w: number; h: number } = { w: W, h: H }
  ): EditableLayer[] => {
    const accent = PACK.palette[weekIndex % PACK.palette.length];
    const bg = (colors && colors.bg) || PACK.bg;
    const ink = (colors && colors.ink) || PACK.ink;
    const cw = canvas.w, ch = canvas.h;
    const rb = regionBox && regionBox.w > 0 && regionBox.h > 0 ? regionBox : null;
    // 사진 배치: rb 있으면 원본 영역 대비 상대좌표로 "원위치" 매핑, 없으면 가로줄 폴백
    let cursorX = Math.round(cw * 0.42);
    const meta = cropsIn.map((cp, i) => {
      if (rb) {
        return {
          url: cp.url, i,
          x: Math.round(((cp.sx - rb.x) / rb.w) * cw),
          y: Math.round(((cp.sy - rb.y) / rb.h) * ch),
          w: Math.round((cp.sw / rb.w) * cw),
          h: Math.round((cp.sh / rb.h) * ch),
        };
      }
      const ar = cp.sh > 0 ? cp.sw / cp.sh : 1;
      const w = Math.max(40, Math.round(240 * ar));
      const x = cursorX;
      cursorX += w + 16;
      return { url: cp.url, i, x, y: Math.round(ch * 0.2), w, h: 240 };
    });
    const photos: EditableLayer[] = meta.map((m) => ({
      id: `image-${m.i + 1}`, type: "image", name: `작품 사진 ${m.i + 1}`, editable: true, locked: false,
      x: m.x, y: m.y, width: m.w, height: m.h,
      content: week.artifacts[m.i] || `작품 ${m.i + 1}`, src: m.url, style: { fit: "cover", radius: 8 }, // 원본 비율·원위치, 액자 없음
    }));
    const caps: EditableLayer[] = meta.map((m) => ({
      id: `caption-${m.i + 1}`, type: "text", name: `사진 캡션 ${m.i + 1}`, editable: true, locked: false,
      x: m.x, y: m.y + m.h + 4, width: m.w, height: 26,
      content: week.artifacts[m.i] || "", src: undefined, style: { fontSize: 15, fontWeight: 700, color: ink, align: "center", lineClamp: 1, fontFamily: PACK.font },
    }));
    // 텍스트(좌측) — 캔버스 높이에 비례 배치, 이후 자유 조정
    const tx = Math.round(cw * 0.035);
    return [
      { id: "background", type: "shape", name: "배경", editable: true, locked: true, x: 0, y: 0, width: cw, height: ch, content: undefined, src: undefined, style: { fill: bg, backgroundColor: bg, radius: 28 } },
      ...(bgImg ? [{ id: "bg-image", type: "image", name: "월안 배경", editable: true, locked: false, x: 0, y: 0, width: cw, height: ch, content: "배경", src: bgImg, style: { fit: "cover", radius: 28 } } as EditableLayer] : []),
      { id: "week-badge", type: "text", name: "주차 배지", editable: true, locked: false, x: tx, y: Math.round(ch * 0.07), width: 110, height: 44, content: week.weekLabel, src: undefined, style: { fontSize: 22, fontWeight: 800, color: ink, align: "center", backgroundColor: PACK.soft, radius: 22, fontFamily: PACK.font } },
      { id: "title", type: "text", name: "제목", editable: true, locked: false, x: tx, y: Math.round(ch * 0.2), width: Math.round(cw * 0.36), height: 64, content: week.title, src: undefined, style: { fontSize: 42, fontWeight: 800, color: ink, align: "left", lineClamp: 1, fontFamily: PACK.font } },
      { id: "play-names", type: "text", name: "놀이 목록", editable: true, locked: false, x: tx, y: Math.round(ch * 0.42), width: Math.round(cw * 0.36), height: Math.round(ch * 0.42), content: week.playNames.map((p) => `· ${p}`).join("\n"), src: undefined, style: { fontSize: 22, fontWeight: 600, color: PACK.body, align: "left", fontFamily: PACK.font } },
      ...photos,
      ...caps,
    ];
  };

  // 크롭 = 담은 사진(N장)을 그대로 슬롯에 넣음(생성 X, 액자 X). 참조영역으로 색 샘플링 + 나란히 비교.
  const onCropped = async (
    cropsIn: { url: string; sx: number; sy: number; sw: number; sh: number }[],
    reference: string | null,
    background: string | null,
    regionBox: { x: number; y: number; w: number; h: number } | null
  ) => {
    setCropReference(reference);
    setCapturedPhotos(cropsIn.map((c) => c.url));
    // 리치 편집: 캡처한 "실제 그림"을 장식 그림 슬롯(illo-1, illo-2…)에 그대로 채움 (카드 구조 유지)
    if (richEdit) {
      if (cropsIn.length) {
        setLayers((ls) => ls.map((l) => {
          const m = /^illo-(\d+)$/.exec(l.id);
          const cp = m ? cropsIn[Number(m[1]) - 1] : null;
          return cp ? { ...l, type: "image", src: cp.url, style: { ...l.style, fit: "contain" } } : l;
        }));
        setSelectedId(null);
      }
      setCropOpen(false);
      return;
    }
    if (cropsIn.length || background) {
      // 카드 비율을 원본 영역 비율에 맞춤
      const canvas = regionBox && regionBox.w > 0 ? { w: W, h: Math.round((W * regionBox.h) / regionBox.w) } : { w: W, h: H };
      setCardCanvas(canvas);
      const colors = reference ? await sampleColors(reference) : null;
      setLayers(buildCropCard(cropsIn, colors, background, regionBox, canvas));
      setSelectedId(null);
      setGenByLayer({});
    }
    setCropOpen(false);
  };

  const chooseWeek = (i: number) => {
    setWeekIndex(i);
    setLayers(richEdit ? buildRichWeekCard(i) : buildForWeek(i).layers);
    setSelectedId(null);
    setGenByLayer({});
    setCropReference(null);
    setCapturedPhotos([]);
    setCardCanvas(richEdit ? { w: RICH_W, h: RICH_H } : { w: W, h: H }); // 모드별 비율 복귀
  };

  const template = { name: `${week.weekLabel} ${week.title}`, canvas: cardCanvas, background: { color: PACK.bg, radius: 28 }, layers };
  const selected = layers.find((l) => l.id === selectedId) || null;
  const updateLayer = (id: string, patch: Partial<EditableLayer>) =>
    setLayers((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  const generateSlotImage = async (layerId: string, force = false) => {
    const p = slotPromptById[layerId];
    if (!p) return;
    setGenByLayer((s) => ({ ...s, [layerId]: { loading: true, error: "", cached: false } }));
    try {
      const useRef = referenceSrc || null;
      const { src, cached } = await generateImageForPrompt(p, { force, reference: useRef });
      updateLayer(layerId, { src });
      setGenByLayer((s) => ({ ...s, [layerId]: { loading: false, error: "", cached } }));
    } catch (e: any) {
      setGenByLayer((s) => ({ ...s, [layerId]: { loading: false, error: (e && e.message) || "생성 실패", cached: false } }));
    }
  };

  const generateAllSlots = async () => {
    for (const id of SLOT_IDS) await generateSlotImage(id, false);
  };
  const anyLoading = SLOT_IDS.some((id) => genByLayer[id]?.loading);

  const onUploadReference = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setReferenceSrc(String(reader.result));
    reader.readAsDataURL(f);
    e.target.value = "";
  };

  const generateMonthPoster = async () => {
    setPosterGen({ loading: true, error: "" });
    try {
      const { src } = await generateImageForPrompt(buildMonthPosterPrompt(ig, PACK), {});
      setReferenceSrc(src);
      setPosterGen({ loading: false, error: "" });
    } catch (e: any) {
      setPosterGen({ loading: false, error: (e && e.message) || "생성 실패" });
    }
  };

  const exportPng = async () => {
    if (!stageRef.current) return;
    setExporting(true);
    setSelectedId(null);
    try {
      await new Promise((r) => setTimeout(r, 60)); // 선택 해제 반영 (rAF 는 백그라운드 탭에서 멈춤)
      await exportNodeToPng(stageRef.current, { fileName: template.name, width: 1280, backgroundColor: template.background.color, cacheBust: false });
    } catch (e) {
      console.warn("PNG 저장 실패:", e);
    } finally {
      setExporting(false);
    }
  };

  // 현재 디자인을 "컴포넌트"로 저장 (썸네일 포함)
  const saveCurrentComponent = async () => {
    const name = window.prompt("컴포넌트 이름", template.name) || "";
    if (!name.trim()) return;
    setSavingComp(true);
    setSelectedId(null);
    try {
      await new Promise((r) => setTimeout(r, 60)); // 선택 해제 반영 (rAF 는 백그라운드 탭에서 멈춤)
      // 썸네일은 "있으면 좋은" 것 — toPng 가 느리거나 멈춰도 저장은 항상 진행되도록 타임아웃 경쟁.
      let thumb: string | undefined;
      try {
        if (stageRef.current) {
          const shot = exportNodeToPng(stageRef.current, { width: 360, backgroundColor: template.background.color, download: false, cacheBust: false });
          const timeout = new Promise<undefined>((res) => setTimeout(() => res(undefined), 4000));
          thumb = await Promise.race([shot, timeout]);
        }
      } catch (e) {
        console.warn("썸네일 생성 실패 — 썸네일 없이 저장:", e);
      }
      setComponents(saveComponent({ name: name.trim(), canvas: cardCanvas, layers, thumb }));
    } finally {
      setSavingComp(false);
    }
  };

  const loadComponentToCanvas = (id: string) => {
    const c = components.find((x) => x.id === id);
    if (!c) return;
    setLayers(JSON.parse(JSON.stringify(c.layers)));
    setCardCanvas(c.canvas);
    setSelectedId(null);
    setGenByLayer({});
    setCropReference(null);
    setCapturedPhotos([]);
  };

  // 누끼: 선택한 이미지 레이어의 배경을 투명하게 (투명 배경으로 카드에 자연스럽게 올림)
  const removeBg = async (layerId: string) => {
    const layer = layers.find((l) => l.id === layerId);
    if (!layer || !layer.src) return;
    setNukiBusy(layerId);
    try {
      const out = await removeBackground(layer.src);
      updateLayer(layerId, { src: out, style: { ...layer.style, background: "transparent", fit: "contain" } });
    } catch (e) {
      console.warn("누끼(배경 제거) 실패:", e);
    } finally {
      setNukiBusy(null);
    }
  };

  const removeComponent = (id: string) => {
    if (!window.confirm("이 컴포넌트를 삭제할까요?")) return;
    setComponents(deleteComponent(id));
  };

  const card: React.CSSProperties = { background: "#fff", border: "1px solid #e6ddd2", borderRadius: 10 };
  const weekBtn = (active: boolean): React.CSSProperties => ({ padding: "5px 12px", borderRadius: 8, border: "1px solid #d8c9bb", background: active ? "#E8862B" : "#fff", color: active ? "#fff" : "#3f3833", fontSize: 12, fontWeight: 700, cursor: "pointer" });
  const smallBtn: React.CSSProperties = { padding: "4px 10px", borderRadius: 7, border: "1px solid #E8862B", background: "#fff", color: "#E8862B", fontSize: 12, fontWeight: 700, cursor: "pointer" };

  return (
    <div style={{ minHeight: "100vh", background: "#efe9e0", padding: 28, paddingBottom: 120, fontFamily: "system-ui, sans-serif", boxSizing: "border-box" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <h2 style={{ margin: "0 0 4px", color: "#3f3833", fontSize: 18 }}>
          {richEdit
            ? `포스터 주차 카드 재현 (${week.weekLabel} ${week.title})`
            : `월안 1주차 밴드 편집 (${week.title})`}
        </h2>
        <p style={{ margin: "0 0 12px", color: "#8a8078", fontSize: 12.5 }}>
          {richEdit ? (
            <>월간계획안 포스터의 <b>주차 카드(배지·제목·가장자리 꾸밈·놀이명)</b>를 <b>그대로 재현</b>. 장식 그림은 <b>실제 이미지 슬롯</b> — <b>✂️ 월안에서 영역 선택</b>으로 포스터의 그림을 캡처하면 그대로 채워집니다(또는 속성패널에서 업로드/URL). 모든 요소는 클릭→선택, 더블클릭→글자 편집, 드래그·리사이즈·속성패널로 수정.</>
          ) : (
            <>포스터의 1주차 구조(<b>좌 텍스트 + 우 작품 사진 3장</b>)를 재현. <b>summer_play</b> StylePack 공유(폰트/팔레트 일치). 작품 사진은 업로드한 포스터를 스타일 기준으로 컨디셔닝.</>
          )}
        </p>

        {/* 주차 선택 */}
        <div style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "#8a8078", marginRight: 4 }}>주차</span>
          {ig.weeks.map((w, i) => (
            <button key={w.id} onClick={() => chooseWeek(i)} style={weekBtn(weekIndex === i)} title={w.title}>{w.weekLabel}</button>
          ))}
          <button onClick={openRegionSelect} style={{ ...smallBtn, marginLeft: 8, borderColor: "#5B53A8", background: "#5B53A8", color: "#fff" }} title="월안 이미지에서 영역을 드래그로 선택해 편집 카드로 만들기">
            ✂️ 월안에서 영역 선택
          </button>
        </div>

        {/* 스타일 기준(레퍼런스): 업로드 / 월안 포스터 생성 */}
        <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "#8a8078" }}>🎨 스타일 기준(레퍼런스)</span>
          <label title="가지고 있는 실제 포스터 이미지를 올려 스타일 기준으로 지정" style={{ ...smallBtn, borderColor: "#d8c9bb", color: "#3f3833" }}>
            📤 이미지 업로드→기준
            <input type="file" accept="image/*" style={{ display: "none" }} onChange={onUploadReference} />
          </label>
          <button onClick={generateMonthPoster} disabled={posterGen.loading} style={smallBtn}>
            {posterGen.loading ? "생성 중…" : "🗓️ 월안 포스터 생성→기준"}
          </button>
          {posterGen.error && <span style={{ fontSize: 12, color: "#b4452f" }}>{posterGen.error}</span>}
          {referenceSrc && (
            <>
              <img src={referenceSrc} alt="레퍼런스" style={{ width: 34, height: 34, borderRadius: 6, objectFit: "cover", border: "1px solid #d8c9bb" }} />
              <span style={{ fontSize: 12, color: "#4f9d69" }}>ON · 작품 사진이 이 분위기로 생성됩니다</span>
              <button onClick={() => setReferenceSrc(null)} style={{ ...smallBtn, borderColor: "#d8c9bb", color: "#3f3833" }}>해제</button>
            </>
          )}
        </div>

        {/* 3분할 */}
        {cropReference && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#8a8078", marginBottom: 6 }}>
              원본 선택 영역 (참고 · 아래 편집 카드와 같은 크기로 비교)
              <button onClick={() => setCropReference(null)} style={{ marginLeft: 8, padding: "2px 8px", borderRadius: 6, border: "1px solid #d8c9bb", background: "#fff", color: "#3f3833", fontSize: 11, cursor: "pointer" }}>숨기기</button>
            </div>
            <img src={cropReference} alt="원본 선택 영역" style={{ width: 740, maxWidth: "100%", borderRadius: 12, border: "2px solid #5B53A8", display: "block" }} />
          </div>
        )}

        {capturedPhotos.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#8a8078", marginBottom: 6 }}>캡처한 영역 ({capturedPhotos.length}장)</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {capturedPhotos.map((p, i) => (
                <img key={i} src={p} alt={`캡처 ${i + 1}`} title={`캡처 ${i + 1}`} style={{ height: 92, borderRadius: 8, border: "1px solid #d8c9bb", display: "block", background: "#fff" }} />
              ))}
            </div>
          </div>
        )}

        {/* 내 컴포넌트 (저장한 디자인 — 클릭하면 캔버스로 불러오기) */}
        {components.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#8a8078", marginBottom: 6 }}>💾 내 컴포넌트 ({components.length}) · 클릭하면 불러오기</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {components.map((c) => (
                <div key={c.id} style={{ position: "relative", width: 132 }}>
                  <button
                    onClick={() => loadComponentToCanvas(c.id)}
                    title={`${c.name} 불러오기`}
                    style={{ width: "100%", padding: 0, border: "1px solid #d8c9bb", borderRadius: 10, background: "#fff", cursor: "pointer", overflow: "hidden", display: "block" }}
                  >
                    <div style={{ width: "100%", height: 80, background: "#f4efe8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {c.thumb ? (
                        <img src={c.thumb} alt={c.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      ) : (
                        <span style={{ fontSize: 22 }}>🧩</span>
                      )}
                    </div>
                    <div style={{ padding: "6px 8px", fontSize: 12, fontWeight: 700, color: "#3f3833", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
                  </button>
                  <button onClick={() => removeComponent(c.id)} title="삭제" style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", border: "none", background: "#b4452f", color: "#fff", fontSize: 12, cursor: "pointer", lineHeight: "20px", padding: 0, boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }}>×</button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <WeekCardEditor ref={stageRef} template={template} selectedId={selectedId} onSelect={setSelectedId} onUpdateLayer={updateLayer} width={740} />
          <div style={{ width: 210, flexShrink: 0 }}>
            <PropertyPanel
              layer={selected}
              onUpdateLayer={updateLayer}
              onGenerateImage={slotPromptById[selectedId || ""] ? generateSlotImage : undefined}
              genState={selectedId ? genByLayer[selectedId] : undefined}
              onRemoveBackground={removeBg}
              nukiBusy={nukiBusy === selectedId}
            />
          </div>
        </div>

        {!richEdit && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#8a8078", marginBottom: 6 }}>작품 사진 프롬프트 (Preview · 글자 없음)</div>
            <pre style={{ ...card, whiteSpace: "pre-wrap", padding: 12, fontSize: 12, lineHeight: 1.6, color: "#4a423b", margin: 0 }}>{SLOT_IDS.map((id) => `${id}: ${slotPromptById[id]}`).join("\n")}</pre>
          </div>
        )}
      </div>

      {/* 플로팅 버튼 */}
      <div style={{ position: "fixed", right: 24, bottom: 24, display: "flex", flexDirection: "column", gap: 10, zIndex: 1000 }}>
        {!richEdit && (
          <button onClick={generateAllSlots} disabled={anyLoading} title="작품 사진 3장을 생성(레퍼런스 있으면 그 분위기로 컨디셔닝). 슬롯별 생성은 우측 속성 패널에서."
            style={{ padding: "11px 18px", borderRadius: 26, border: "none", background: anyLoading ? "#e0a878" : "#E8862B", color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer", boxShadow: "0 6px 18px rgba(232,134,43,0.4)" }}>
            {anyLoading ? "생성 중…" : "🤖 작품 사진 생성(3장)"}
          </button>
        )}
        <button onClick={saveCurrentComponent} disabled={savingComp} title="현재 디자인을 컴포넌트로 저장(브라우저에 보관 · 재사용/재편집)"
          style={{ padding: "11px 18px", borderRadius: 26, border: "none", background: savingComp ? "#9a93d6" : "#5B53A8", color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer", boxShadow: "0 6px 18px rgba(91,83,168,0.4)" }}>
          {savingComp ? "저장 중…" : "💾 컴포넌트로 저장"}
        </button>
        <button onClick={exportPng} disabled={exporting} title="밴드 카드를 PNG 로 저장 (무료)"
          style={{ padding: "11px 18px", borderRadius: 26, border: "1px solid #d8c9bb", background: exporting ? "#e9e2d8" : "#fff", color: "#3f3833", fontSize: 14, fontWeight: 800, cursor: "pointer", boxShadow: "0 6px 18px rgba(0,0,0,0.15)" }}>
          {exporting ? "저장 중…" : "🖼 이번 버전 (PNG)"}
        </button>
      </div>

      {cropOpen && <RegionCropper imageSrc={cropImage} onCrop={onCropped} onClose={() => setCropOpen(false)} />}
    </div>
  );
}
