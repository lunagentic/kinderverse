// 채팅 첨부 사진 입력 유틸.
// 업로드/붙여넣기/드롭한 이미지를 다운스케일한 JPEG dataURL 로 변환한다.
// (원본 그대로 보관하면 페이로드·localStorage 가 비대해지므로 최대 변(maxPx) 기준 축소)

export const MAX_PHOTOS = 20;

/** File/Blob → 다운스케일된 JPEG dataURL. 실패 시 reject. */
export function fileToDownscaledDataUrl(
  file: Blob,
  maxPx = 1280,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type?.startsWith("image/")) {
      reject(new Error("이미지 파일이 아닙니다."));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const { width, height } = img;
      const scale = Math.min(1, maxPx / Math.max(width, height));
      const w = Math.max(1, Math.round(width * scale));
      const h = Math.max(1, Math.round(height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("canvas 컨텍스트를 만들 수 없습니다."));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      try {
        resolve(canvas.toDataURL("image/jpeg", quality));
      } catch (e) {
        reject(e as Error);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("이미지를 불러올 수 없습니다."));
    };
    img.src = url;
  });
}

/** 여러 이미지 파일/Blob → dataURL 배열 (실패분은 건너뜀). remaining 만큼만 처리. */
export async function filesToDataUrls(files: Blob[], remaining: number): Promise<string[]> {
  const slice = files.slice(0, Math.max(0, remaining));
  const out: string[] = [];
  for (const f of slice) {
    try {
      out.push(await fileToDownscaledDataUrl(f));
    } catch {
      /* 변환 실패 이미지는 건너뜀 */
    }
  }
  return out;
}

/** 붙여넣기/드롭 이벤트의 DataTransfer/Clipboard 에서 이미지 Blob 들을 추출 */
export function extractImageBlobs(items?: DataTransferItemList | null, files?: FileList | null): Blob[] {
  const blobs: Blob[] = [];
  if (items) {
    for (const it of Array.from(items)) {
      if (it.kind === "file" && it.type.startsWith("image/")) {
        const f = it.getAsFile();
        if (f) blobs.push(f);
      }
    }
  }
  if (!blobs.length && files) {
    for (const f of Array.from(files)) {
      if (f.type.startsWith("image/")) blobs.push(f);
    }
  }
  return blobs;
}
