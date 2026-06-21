// 월안 이미지에서 작품 사진을 한 장씩 드래그로 담는 오버레이.
// 확정 시 (담은 사진들 + 원본 참조영역) 을 함께 넘긴다 → 참조영역으로 색 샘플링/나란히 비교.
import { useEffect, useRef, useState } from "react";

export interface CapturedPhoto { url: string; sx: number; sy: number; sw: number; sh: number }
export interface RegionBox { x: number; y: number; w: number; h: number }

export interface RegionCropperProps {
  imageSrc?: string | null;
  onCrop: (photos: CapturedPhoto[], reference: string | null, background: string | null, regionBox: RegionBox | null) => void;
  onClose: () => void;
}

interface Rect { x: number; y: number; w: number; h: number }
interface Crop { url: string; sx: number; sy: number; sw: number; sh: number } // sx.. = 원본(natural) 좌표

export default function RegionCropper({ imageSrc = null, onCrop, onClose }: RegionCropperProps) {
  const [src, setSrc] = useState(imageSrc as string | null);
  const [rect, setRect] = useState(null as Rect | null);
  const [crops, setCrops] = useState([] as Crop[]);
  const [bgCrop, setBgCrop] = useState(null as string | null); // 배경으로 쓸 조각
  const dragging = useRef(false);
  const start = useRef({ x: 0, y: 0 });
  const imgRef = useRef(null as HTMLImageElement | null);
  const wrapRef = useRef(null as HTMLDivElement | null);

  useEffect(() => {
    if (imageSrc) setSrc(imageSrc);
  }, [imageSrc]);

  const onUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => { setSrc(String(rd.result)); setRect(null); setCrops([]); setBgCrop(null); };
    rd.readAsDataURL(f);
    e.target.value = "";
  };

  const rel = (e: React.MouseEvent) => {
    const r = wrapRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const onDown = (e: React.MouseEvent) => { if (!src) return; dragging.current = true; const p = rel(e); start.current = p; setRect({ x: p.x, y: p.y, w: 0, h: 0 }); };
  const onMove = (e: React.MouseEvent) => { if (!dragging.current) return; const p = rel(e); const s = start.current; setRect({ x: Math.min(s.x, p.x), y: Math.min(s.y, p.y), w: Math.abs(p.x - s.x), h: Math.abs(p.y - s.y) }); };
  const onUp = () => { dragging.current = false; };

  const cropRectToDataUrl = (img: HTMLImageElement, sx: number, sy: number, sw: number, sh: number) => {
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(sw));
    c.height = Math.max(1, Math.round(sh));
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    return c.toDataURL("image/png");
  };

  const addCrop = () => {
    const img = imgRef.current;
    if (!img || !rect || rect.w < 6 || rect.h < 6) return;
    const fx = img.naturalWidth / img.clientWidth;
    const fy = img.naturalHeight / img.clientHeight;
    const sx = rect.x * fx, sy = rect.y * fy, sw = rect.w * fx, sh = rect.h * fy;
    const url = cropRectToDataUrl(img, sx, sy, sw, sh);
    if (!url) return;
    setCrops((c) => [...c, { url, sx, sy, sw, sh }]);
    setRect(null);
  };

  // 현재 선택을 "배경"으로 담기 (무늬/그라데이션 배경 매칭용)
  const addBgCrop = () => {
    const img = imgRef.current;
    if (!img || !rect || rect.w < 6 || rect.h < 6) return;
    const fx = img.naturalWidth / img.clientWidth;
    const fy = img.naturalHeight / img.clientHeight;
    const url = cropRectToDataUrl(img, rect.x * fx, rect.y * fy, rect.w * fx, rect.h * fy);
    if (url) { setBgCrop(url); setRect(null); }
  };

  const confirm = () => {
    let reference: string | null = null;
    let regionBox: RegionBox | null = null;
    const img = imgRef.current;
    if (img && crops.length) {
      const minY = Math.max(0, Math.min(...crops.map((c) => c.sy)) - 12);
      const maxX = Math.min(img.naturalWidth, Math.max(...crops.map((c) => c.sx + c.sw)) + 12);
      const maxY = Math.min(img.naturalHeight, Math.max(...crops.map((c) => c.sy + c.sh)) + 12);
      // 참조영역: 좌측(텍스트 포함)부터 사진 우측 끝까지
      reference = cropRectToDataUrl(img, 0, minY, maxX, maxY - minY);
      regionBox = { x: 0, y: minY, w: maxX, h: maxY - minY };
    }
    onCrop(crops, reference, bgCrop, regionBox);
  };

  const btn: React.CSSProperties = { padding: "7px 14px", borderRadius: 8, border: "1px solid #d8c9bb", background: "#fff", color: "#3f3833", fontSize: 13, fontWeight: 700, cursor: "pointer" };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(40,36,32,0.7)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", padding: 20, overflow: "auto" }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
        <span style={{ color: "#fff", fontSize: 14, fontWeight: 800 }}>작품 사진을 한 장씩 드래그해서 담으세요</span>
        <label style={{ ...btn, cursor: "pointer" }}>
          📂 월안 이미지 불러오기
          <input type="file" accept="image/*" style={{ display: "none" }} onChange={onUpload} />
        </label>
        <button onClick={addCrop} disabled={!rect || rect.w < 6} style={{ ...btn, border: "none", background: "#4f9d69", color: "#fff" }}>➕ 이 사진 담기</button>
        <button onClick={addBgCrop} disabled={!rect || rect.w < 6} style={{ ...btn, border: "none", background: "#c2843e", color: "#fff" }} title="원본 배경(무늬/그라데이션) 부분을 카드 배경으로 사용">🎨 배경으로 담기</button>
        <button onClick={confirm} disabled={crops.length === 0 && !bgCrop} style={{ ...btn, border: "none", background: crops.length || bgCrop ? "#5B53A8" : "#b8b2d8", color: "#fff" }}>✅ 카드 만들기 (사진 {crops.length}장)</button>
        <button onClick={onClose} style={{ ...btn, background: "#3f3833", color: "#fff", border: "none" }}>닫기</button>
      </div>

      {bgCrop && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, background: "rgba(255,255,255,0.12)", padding: 6, borderRadius: 8 }}>
          <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>🎨 배경:</span>
          <img src={bgCrop} alt="배경" style={{ width: 90, height: 40, objectFit: "cover", borderRadius: 6, border: "2px solid #fff" }} />
          <button onClick={() => setBgCrop(null)} style={{ ...btn, padding: "2px 8px", fontSize: 11 }}>제거</button>
        </div>
      )}
      {crops.length > 0 && (
        <div style={{ display: "flex", gap: 6, marginBottom: 10, background: "rgba(255,255,255,0.12)", padding: 6, borderRadius: 8 }}>
          {crops.map((c, i) => (
            <div key={i} style={{ position: "relative" }}>
              <img src={c.url} alt="" style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 6, border: "2px solid #fff" }} />
              <button onClick={() => setCrops((cs) => cs.filter((_, k) => k !== i))} title="제거" style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: "50%", border: "none", background: "#b4452f", color: "#fff", fontSize: 11, cursor: "pointer", lineHeight: "18px", padding: 0 }}>×</button>
            </div>
          ))}
        </div>
      )}

      <div ref={wrapRef} onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} style={{ position: "relative", background: "#fff", borderRadius: 8, lineHeight: 0, userSelect: "none", cursor: src ? "crosshair" : "default" }}>
        {src ? (
          <img ref={imgRef} src={src} alt="월안" draggable={false} style={{ maxWidth: "min(900px, 92vw)", maxHeight: "72vh", display: "block", borderRadius: 8 }} />
        ) : (
          <div style={{ width: 600, height: 360, display: "flex", alignItems: "center", justifyContent: "center", color: "#a99", fontSize: 14 }}>월안 이미지를 불러오면 영역을 선택할 수 있어요</div>
        )}
        {rect && rect.w > 1 && (
          <div style={{ position: "absolute", left: rect.x, top: rect.y, width: rect.w, height: rect.h, border: "2px solid #4f9d69", background: "rgba(79,157,105,0.18)", pointerEvents: "none", borderRadius: 4 }} />
        )}
      </div>
    </div>
  );
}
