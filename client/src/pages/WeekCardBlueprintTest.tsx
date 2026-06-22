// 월안 "밴드" 편집 카드 (포스터의 1주차 밴드 구조 재현).
//  - 데이터: 여름이 왔어요(summer)  - StylePack: summer_play(공유) → 폰트/팔레트 일치
//  - 레이아웃: 좌측 주차/제목/놀이 텍스트(편집) + 우측 작품 사진 3장(이미지 슬롯)
//  - 스타일 기준(레퍼런스): 업로드한 실제 포스터 / 월안 포스터 생성 → 슬롯을 그 분위기로 컨디셔닝
//  - 텍스트/이미지/배경 편집 + 1200px PNG export
import { useEffect, useMemo, useRef, useState } from "react";
import { sampleSummerPlan } from "../data/sampleSummerPlan";
import { monthPlanPoster } from "../data/monthPlanPoster";
import { transformMonthlyPlanToInfographic } from "../transformers/monthlyToInfographic";
import { getStylePack } from "../styles/stylePacks";
import type { EditableLayer } from "../templates/buildEditableWeekCardTemplate";
import WeekCardEditor from "../components/WeekCardEditor";
import LayerPanel from "../components/LayerPanel";
import PropertyPanel from "../components/PropertyPanel";
import { exportNodeToPng } from "../utils/exportToPng";
import { generateImageForPrompt } from "../utils/imageCache";
import { loadComponents, saveComponent, deleteComponent } from "../utils/componentStore";
import { removeBackground } from "../utils/removeBackground";
import RegionCropper from "../components/RegionCropper";
import { getAsset, getCachedAsset, descriptorFor } from "../utils/assetLibrary";
import { buildPosterWeekCard, RICH_W, RICH_H } from "../templates/buildPosterWeekCard";
import { buildWeekCardBlueprint } from "../blueprints/buildWeekCardBlueprint";
import { buildEditableWeekCardTemplate } from "../templates/buildEditableWeekCardTemplate";

interface SlotGenState {
  loading: boolean;
  error: string;
  cached: boolean;
}

const PACK = getStylePack("summer_play"); // 모든 주차 공유 — 폰트/팔레트 일치
const W = 1280;
const H = 470;
// ✏️ 편집: 월간계획안 포스터의 "주차 카드" — 빌더는 ../templates/buildPosterWeekCard 로 공용화(보드 프리뷰와 일치).
const SLOT_IDS = ["image-1", "image-2", "image-3"];
// 슬롯 프롬프트(캐시 키 일치를 위해 한 곳에서 생성)
const slotPromptFor = (wk: any, k: number) =>
  `유치원 "${wk.playNames[k] || wk.title}" 활동의 아이 작품 사진 한 장, 밝은 여름 분위기, 글자 없음`;

export default function WeekCardBlueprintTest({ richEdit = false, onPlaceOnBoard, initialTemplate = null, initialWeek = 0, onApply, posterSrc = null, embedded = false, initialOverride = null }: { richEdit?: boolean; onPlaceOnBoard?: (src: string, size: { w: number; h: number }) => void; initialTemplate?: { canvas: { w: number; h: number }; layers: EditableLayer[] } | null; initialWeek?: number; onApply?: (template: { canvas: { w: number; h: number }; layers: EditableLayer[] }) => void; posterSrc?: string | null; embedded?: boolean; initialOverride?: { weekLabel?: string; title?: string; playNames?: string[] } | null }) {
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
  const buildRichWeekCard = (idx: number): EditableLayer[] => buildPosterWeekCard(idx).layers;

  const [weekIndex, setWeekIndex] = useState(initialWeek || 0);
  const built = useMemo(() => buildForWeek(weekIndex), [weekIndex]);
  const { week, slotPromptById } = built;

  const [layers, setLayers] = useState(() =>
    initialTemplate?.layers ? JSON.parse(JSON.stringify(initialTemplate.layers)) : richEdit ? buildRichWeekCard(initialWeek || 0) : buildForWeek(0).layers
  );
  const [selectedId, setSelectedId] = useState(null as string | null);
  const [genByLayer, setGenByLayer] = useState({} as Record<string, SlotGenState>);
  const [cardCanvas, setCardCanvas] = useState(initialTemplate?.canvas ? initialTemplate.canvas : richEdit ? { w: RICH_W, h: RICH_H } : { w: W, h: H }); // 리치 시 비율에 맞춤
  const stageRef = useRef(null as HTMLDivElement | null);
  const [components, setComponents] = useState(() => loadComponents()); // 저장한 컴포넌트들
  const [savingComp, setSavingComp] = useState(false);
  const [nukiBusy, setNukiBusy] = useState(null as string | null); // 누끼 처리 중인 레이어 id
  const [cropOpen, setCropOpen] = useState(false); // 포스터에서 그림 추출(드래그 크롭)
  const [assetMsg, setAssetMsg] = useState(""); // 기본 에셋 생성 진행 메시지
  // 컴포넌트 저장 이름 입력 모달 (window.prompt 대신 — 임베디드 환경에서도 동작)
  const [saveModal, setSaveModal] = useState({ open: false, kind: "card", layerId: null as string | null, name: "" });

  // ✏️ 리치 편집: 카드를 열면(주차 변경 포함) 기본 장식 그림·꾸밈 에셋을 자동 생성→캐시.
  //  - 캐시에 있으면 즉시(과금 0). 없으면 한 번 생성 후 캐시(이후 재사용).
  //  - 사용자가 이미 채운 슬롯(src 존재)은 덮어쓰지 않는다.
  useEffect(() => {
    if (!richEdit) return;
    let cancelled = false;
    const wk = monthPlanPoster.weeks[weekIndex % monthPlanPoster.weeks.length];
    // (슬롯ids, 디스크립터) 목록
    const jobs: { slotIds: string[]; d: ReturnType<typeof descriptorFor> }[] = [
      ...(wk.illos || []).slice(0, 2).map((kind, i) => ({ slotIds: [`illo-${i + 1}`], d: descriptorFor("illustration", kind) })),
      { slotIds: ["deco-1", "deco-2"], d: descriptorFor("decoration", "corner-sparkle") },
    ];
    const missing = jobs.filter((j) => !getCachedAsset(j.d));
    if (!missing.length) return; // 모두 캐시됨 — 생성 불필요
    const fill = (slotIds: string[], src: string) =>
      setLayers((ls) => ls.map((l) => (slotIds.includes(l.id) && !l.src ? { ...l, src, style: { ...l.style, fit: "contain", background: "transparent" } } : l)));
    (async () => {
      for (let i = 0; i < missing.length; i++) {
        if (cancelled) return;
        setAssetMsg(`기본 디자인 생성 중… (${i + 1}/${missing.length}) · 처음 한 번만, 이후 캐시`);
        try {
          const { src } = await getAsset(missing[i].d);
          if (cancelled) return;
          fill(missing[i].slotIds, src);
        } catch (e) {
          console.warn("에셋 생성 실패:", missing[i].d.key, e);
        }
      }
      if (!cancelled) setAssetMsg("");
    })();
    return () => { cancelled = true; };
  }, [richEdit, weekIndex]);

  const chooseWeek = (i: number) => {
    setWeekIndex(i);
    setLayers(richEdit ? buildRichWeekCard(i) : buildForWeek(i).layers);
    setSelectedId(null);
    setGenByLayer({});
    setCardCanvas(richEdit ? { w: RICH_W, h: RICH_H } : { w: W, h: H }); // 모드별 비율 복귀
  };

  // 🧱 블루프린트 버전: 현재 주차를 블루프린트 레이아웃(1080² · 좌 텍스트 + 우 main/sub2)으로 전환.
  //  콘텐츠(주차/제목/놀이명)는 현재 카드 내용(initialOverride)으로 보존, 없으면 샘플(ig).
  const applyBlueprintVersion = () => {
    const base = ig.weeks[weekIndex % ig.weeks.length];
    const ov = initialOverride;
    const wk = {
      ...base,
      weekLabel: (ov && ov.weekLabel) || base.weekLabel,
      title: (ov && ov.title) || base.title,
      playNames: ov && ov.playNames && ov.playNames.length ? ov.playNames : base.playNames,
    };
    const bp = buildWeekCardBlueprint(wk, PACK);
    const tpl = buildEditableWeekCardTemplate(bp, wk);
    setLayers(JSON.parse(JSON.stringify(tpl.layers)));
    setCardCanvas(tpl.canvas);
    setSelectedId(null);
    setGenByLayer({});
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
      const { src, cached } = await generateImageForPrompt(p, { force });
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

  const [placing, setPlacing] = useState(false);
  // 이 카드를 PNG 로 캡처해 보드 위에 이미지 아이템으로 올림
  const placeOnBoard = async () => {
    if (!stageRef.current || !onPlaceOnBoard) return;
    setPlacing(true);
    setSelectedId(null);
    try {
      await new Promise((r) => setTimeout(r, 60));
      const src = await exportNodeToPng(stageRef.current, { width: 1280, backgroundColor: undefined, download: false, cacheBust: false });
      const w = 520, h = Math.round((w * cardCanvas.h) / cardCanvas.w);
      onPlaceOnBoard(src, { w, h });
    } catch (e) {
      console.warn("보드에 올리기 실패:", e);
    } finally {
      setPlacing(false);
    }
  };

  // 저장 모달 열기 (이름 입력) — window.prompt 대신 인라인 입력
  const saveCurrentComponent = () => setSaveModal({ open: true, kind: "card", layerId: null, name: template.name });

  // 모달에서 "저장" — kind 에 따라 카드 전체 / 단일 요소 저장
  const confirmSaveModal = async () => {
    const name = saveModal.name.trim();
    if (!name) return;
    const { kind, layerId } = saveModal;
    setSaveModal((m) => ({ ...m, open: false }));
    if (kind === "asset") {
      const layer = layers.find((l) => l.id === layerId);
      if (!layer || !layer.src) return;
      const single: EditableLayer = { ...JSON.parse(JSON.stringify(layer)), id: "el-0", x: 0, y: 0 };
      setComponents(saveComponent({ name, kind: "asset", canvas: { w: layer.width, h: layer.height }, layers: [single], thumb: layer.src }));
      return;
    }
    // 카드 전체 (썸네일 포함)
    setSavingComp(true);
    setSelectedId(null);
    try {
      await new Promise((r) => setTimeout(r, 60));
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
      setComponents(saveComponent({ name, kind: "card", canvas: cardCanvas, layers, thumb }));
    } finally {
      setSavingComp(false);
    }
  };

  const loadComponentToCanvas = (id: string) => {
    const c = components.find((x) => x.id === id);
    if (!c) return;
    // 단일 요소(asset): 카드 교체 X — 선택한 이미지 슬롯에 채우거나, 없으면 새 레이어로 추가.
    if (c.kind === "asset" && c.layers[0]) {
      const a = c.layers[0];
      const sel = layers.find((l) => l.id === selectedId);
      if (sel && sel.type === "image") {
        updateLayer(sel.id, { src: a.src, style: { ...sel.style, ...a.style } });
      } else {
        const nl: EditableLayer = { ...JSON.parse(JSON.stringify(a)), id: `el-${Date.now().toString(36)}`, x: Math.round((cardCanvas.w - a.width) / 2), y: Math.round((cardCanvas.h - a.height) / 2) };
        setLayers((ls) => [...ls, nl]);
        setSelectedId(nl.id);
      }
      return;
    }
    // 카드 전체 교체
    setLayers(JSON.parse(JSON.stringify(c.layers)));
    setCardCanvas(c.canvas);
    setSelectedId(null);
    setGenByLayer({});
  };

  // 선택한 요소(이미지 레이어)를 "컴포넌트"로 저장 — 모달로 이름 입력
  const saveAssetComponent = (layerId: string) => {
    const layer = layers.find((l) => l.id === layerId);
    if (!layer || !layer.src) return;
    setSaveModal({ open: true, kind: "asset", layerId, name: layer.name || "요소" });
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

  // A안: 포스터에서 드래그로 선택한 영역을 누끼 → 선택한 이미지 슬롯(없으면 illo-1)에 그대로 채움
  const onPosterCrop = async (photos: { url: string }[]) => {
    setCropOpen(false);
    const first = photos && photos[0];
    if (!first) return;
    const sel = layers.find((l) => l.id === selectedId);
    const targetId = sel && sel.type === "image" ? sel.id : (layers.find((l) => /^illo-/.test(l.id))?.id || "illo-1");
    setNukiBusy(targetId);
    try {
      const cut = await removeBackground(first.url);
      const cur = layers.find((l) => l.id === targetId);
      updateLayer(targetId, { type: "image", src: cut, style: { ...(cur?.style || {}), fit: "contain", background: "transparent" } });
      setSelectedId(targetId);
    } catch (e) {
      console.warn("포스터에서 그림 가져오기 실패:", e);
    } finally {
      setNukiBusy(null);
    }
  };

  const card: React.CSSProperties = { background: "#fff", border: "1px solid #e6ddd2", borderRadius: 10 };
  const weekBtn = (active: boolean): React.CSSProperties => ({ padding: "5px 12px", borderRadius: 8, border: "1px solid #d8c9bb", background: active ? "#E8862B" : "#fff", color: active ? "#fff" : "#3f3833", fontSize: 12, fontWeight: 700, cursor: "pointer" });
  const smallBtn: React.CSSProperties = { padding: "4px 10px", borderRadius: 7, border: "1px solid #E8862B", background: "#fff", color: "#E8862B", fontSize: 12, fontWeight: 700, cursor: "pointer" };

  return (
    <div style={{ minHeight: embedded ? "100%" : "100vh", background: embedded ? "transparent" : "#efe9e0", padding: embedded ? "20px 20px 0" : 28, paddingBottom: embedded ? 0 : 120, fontFamily: "system-ui, sans-serif", boxSizing: "border-box" }}>
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
            <>포스터의 1주차 구조(<b>좌 텍스트 + 우 작품 사진 3장</b>)를 재현. <b>summer_play</b> StylePack 공유(폰트/팔레트 일치).</>
          )}
        </p>

        {/* 주차 선택 */}
        <div style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "#8a8078", marginRight: 4 }}>주차</span>
          {ig.weeks.map((w, i) => (
            <button key={w.id} onClick={() => chooseWeek(i)} style={weekBtn(weekIndex === i)} title={w.title}>{w.weekLabel}</button>
          ))}
          {posterSrc && (
            <button onClick={() => setCropOpen(true)} style={{ ...smallBtn, marginLeft: 8, borderColor: "#5B53A8", background: "#5B53A8", color: "#fff" }} title="생성된 월안 포스터에서 그림 영역을 드래그로 선택 → 누끼 → 선택 슬롯에 채움">
              📥 포스터에서 그림 가져오기
            </button>
          )}
        </div>

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
                        <img src={c.thumb} alt={c.name} style={{ maxWidth: "100%", maxHeight: "100%", width: "auto", height: "auto", objectFit: "contain", display: "block" }} />
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

        <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
          <WeekCardEditor ref={stageRef} template={template} selectedId={selectedId} onSelect={setSelectedId} onUpdateLayer={updateLayer} width={embedded ? 560 : 740} />
          <div style={{ width: 210, flexShrink: 0 }}>
            <PropertyPanel
              layer={selected}
              onUpdateLayer={updateLayer}
              onGenerateImage={slotPromptById[selectedId || ""] ? generateSlotImage : undefined}
              genState={selectedId ? genByLayer[selectedId] : undefined}
              onRemoveBackground={removeBg}
              nukiBusy={nukiBusy === selectedId}
              onSaveAsset={saveAssetComponent}
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
      <div style={embedded
        ? { position: "sticky", bottom: 0, display: "flex", flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-end", gap: 10, zIndex: 1000, padding: "12px 4px 4px", marginTop: 8, background: "linear-gradient(180deg, rgba(239,233,224,0) 0%, #efe9e0 36%)" }
        : { position: "fixed", right: 24, bottom: 24, display: "flex", flexDirection: "column", gap: 10, zIndex: 1000 }}>
        <button onClick={applyBlueprintVersion} title="이 주차를 블루프린트 레이아웃(1080² · 좌 텍스트 + 우 대표/서브 이미지)으로 전환"
          style={{ padding: "11px 18px", borderRadius: 26, border: "1px solid #5B53A8", background: "#fff", color: "#5B53A8", fontSize: 14, fontWeight: 800, cursor: "pointer", boxShadow: "0 6px 18px rgba(0,0,0,0.12)" }}>
          🧱 블루프린트 버전
        </button>
        {!richEdit && (
          <button onClick={generateAllSlots} disabled={anyLoading} title="작품 사진 3장을 생성(레퍼런스 있으면 그 분위기로 컨디셔닝). 슬롯별 생성은 우측 속성 패널에서."
            style={{ padding: "11px 18px", borderRadius: 26, border: "none", background: anyLoading ? "#e0a878" : "#E8862B", color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer", boxShadow: "0 6px 18px rgba(232,134,43,0.4)" }}>
            {anyLoading ? "생성 중…" : "🤖 작품 사진 생성(3장)"}
          </button>
        )}
        {onApply && (
          <button onClick={() => onApply({ canvas: cardCanvas, layers })} title="편집 내용을 저장하고 보드 카드에 반영"
            style={{ padding: "11px 18px", borderRadius: 26, border: "none", background: "#E8862B", color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer", boxShadow: "0 6px 18px rgba(232,134,43,0.4)" }}>
            ✅ 저장 후 보드에 반영
          </button>
        )}
        {onPlaceOnBoard && !onApply && (
          <button onClick={placeOnBoard} disabled={placing} title="이 카드를 이미지로 보드 위에 올리기"
            style={{ padding: "11px 18px", borderRadius: 26, border: "none", background: placing ? "#7fbf95" : "#4f9d69", color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer", boxShadow: "0 6px 18px rgba(79,157,105,0.4)" }}>
            {placing ? "올리는 중…" : "🧷 보드에 올리기"}
          </button>
        )}
        <button onClick={saveCurrentComponent} disabled={savingComp} title="이 카드를 컴포넌트로 저장(브라우저에 보관 · 재사용/재편집)"
          style={{ padding: "11px 18px", borderRadius: 26, border: "none", background: savingComp ? "#9a93d6" : "#5B53A8", color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer", boxShadow: "0 6px 18px rgba(91,83,168,0.4)" }}>
          {savingComp ? "저장 중…" : "💾 이 카드 컴포넌트로 저장"}
        </button>
      </div>

      {/* 포스터에서 그림 추출(드래그 크롭 → 누끼) */}
      {cropOpen && <RegionCropper imageSrc={posterSrc} onCrop={onPosterCrop} onClose={() => setCropOpen(false)} />}

      {/* 컴포넌트 저장 이름 입력 모달 (window.prompt 대체) */}
      {saveModal.open && (
        <div
          onMouseDown={() => setSaveModal((m) => ({ ...m, open: false }))}
          style={{ position: "fixed", inset: 0, zIndex: 4000, background: "rgba(40,36,32,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <div onMouseDown={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 14, padding: 20, width: 320, boxShadow: "0 10px 40px rgba(0,0,0,0.25)" }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#3f3833", marginBottom: 4 }}>
              {saveModal.kind === "asset" ? "요소를 컴포넌트로 저장" : "카드를 컴포넌트로 저장"}
            </div>
            <div style={{ fontSize: 12, color: "#8a8078", marginBottom: 10 }}>이름을 입력하세요.</div>
            <input
              autoFocus
              value={saveModal.name}
              onChange={(e) => setSaveModal((m) => ({ ...m, name: e.target.value }))}
              onKeyDown={(e) => { if (e.key === "Enter") confirmSaveModal(); if (e.key === "Escape") setSaveModal((m) => ({ ...m, open: false })); }}
              placeholder="컴포넌트 이름"
              style={{ width: "100%", boxSizing: "border-box", padding: "9px 11px", border: "1px solid #d8c9bb", borderRadius: 8, fontSize: 14, marginBottom: 14 }}
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setSaveModal((m) => ({ ...m, open: false }))} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #d8c9bb", background: "#fff", color: "#3f3833", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>취소</button>
              <button onClick={confirmSaveModal} disabled={!saveModal.name.trim()} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: saveModal.name.trim() ? "#5B53A8" : "#b8b2d8", color: "#fff", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
