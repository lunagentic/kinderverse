// WeekCardEditor canvas → PNG 저장 (html-to-image).
// - 현재 편집 상태 그대로 캡처 / 배경 포함 / 출력 너비 1200px 기준.
import { toPng } from "html-to-image";

export interface ExportToPngOptions {
  fileName?: string; // 다운로드 파일명
  width?: number; // 목표 PNG 너비(px). 기본 1200
  backgroundColor?: string; // 투명 영역(둥근 모서리 바깥) 채울 배경색
  download?: boolean; // true(기본)면 즉시 다운로드
  cacheBust?: boolean; // 기본 true. dataURL <img> 가 많은 노드는 false 권장(해시 깨짐 방지)
}

/**
 * 주어진 DOM 노드를 PNG dataURL 로 변환한다.
 * 노드가 화면에 작게(스케일) 표시돼 있어도, pixelRatio 를 조정해 width(기본 1200px) 기준으로 출력한다.
 */
export async function exportNodeToPng(
  node: HTMLElement,
  options: ExportToPngOptions = {}
): Promise<string> {
  const { fileName = "week-card", width = 1200, backgroundColor, download = true, cacheBust = true } = options;

  // 화면 표시 너비 → 목표 너비 비율로 해상도 배율 산출 (1200px 기준)
  const displayWidth = node.offsetWidth || width;
  const pixelRatio = width / displayWidth;

  const dataUrl = await toPng(node, {
    pixelRatio,
    backgroundColor, // 배경 포함 (둥근 모서리 바깥 투명 영역 채움)
    cacheBust,
    skipFonts: true, // 외부(Google) 폰트 임베드 시 cross-origin 에러 방지
  });

  if (download) {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = fileName.endsWith(".png") ? fileName : `${fileName}.png`;
    a.click();
  }
  return dataUrl;
}
