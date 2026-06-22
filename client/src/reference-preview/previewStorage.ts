// =============================================================================
// Preview Storage — Render Spec → PNG 저장, previewUrl 반환.
// 픽셀 합성은 Pillow 컴포지터(compositor.py)로 위임 (이미 설치된 venv 사용).
// 저장: client/public/generated-previews/<templateId>/<fileName>
// (나중에 sharp/S3 등으로 교체 가능하도록 분리)
// =============================================================================
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { RenderSpec } from "./types";

const HERE = dirname(fileURLToPath(import.meta.url)); // client/src/reference-preview
const PUBLIC_DIR = join(HERE, "../../public"); // client/public
const PREVIEWS_SUBDIR = "generated-previews";
const COMPOSITOR = join(HERE, "compositor.py");

/** PIL 가능한 python 실행 경로 탐색 (env > venv > python3) */
function resolvePython(): string {
  const candidates = [
    process.env.PREVIEW_PYTHON,
    "/tmp/imgvenv/bin/python",
    "python3",
  ].filter(Boolean) as string[];
  for (const p of candidates) {
    if (p === "python3") return p; // 마지막 폴백
    if (existsSync(p)) return p;
  }
  return "python3";
}

export interface SavePreviewInput {
  spec: RenderSpec;
  templateId: string;
  fileName: string; // 예: "summer-preview.png"
}

export interface SavedPreview {
  previewUrl: string;
  absolutePath: string;
}

export function savePreview(input: SavePreviewInput): SavedPreview {
  const { spec, templateId, fileName } = input;
  const outDir = join(PUBLIC_DIR, PREVIEWS_SUBDIR, templateId);
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, fileName);

  const specPath = join(outDir, `.${fileName}.spec.json`);
  writeFileSync(specPath, JSON.stringify(spec));
  try {
    execFileSync(resolvePython(), [COMPOSITOR, specPath, PUBLIC_DIR, outPath], { stdio: "pipe" });
  } finally {
    rmSync(specPath, { force: true });
  }

  return {
    previewUrl: `/${PREVIEWS_SUBDIR}/${templateId}/${fileName}`,
    absolutePath: outPath,
  };
}
