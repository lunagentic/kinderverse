// =============================================================================
// GPT Image Client — GPT 이미지 모델 호출을 격리.
//  - 실제 API 호출은 createOpenAIImageClient (env: OPENAI_API_KEY, GPT_IMAGE_MODEL)
//  - 비용/오프라인용 createMockImageClient (1×1 PNG 플레이스홀더)
//  - getDefaultClient(): ASSET_GEN_REAL=1 + 키 있으면 real, 아니면 mock
// 모델 교체 가능하도록 GPTImageClient 인터페이스를 유지한다.
// =============================================================================
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { GPTImageClient, GeneratedImage } from "./types";

let envLoaded = false;
/** 루트/클라이언트 .env 1회 로드 (tsx 실행 환경용) */
function ensureEnv(): void {
  if (envLoaded) return;
  envLoaded = true;
  const here = dirname(fileURLToPath(import.meta.url)); // client/src/asset-generator
  for (const p of [join(here, "../../../.env"), join(here, "../../.env")]) {
    if (existsSync(p)) {
      try {
        // Node 20.12+/22+ : process.loadEnvFile
        (process as unknown as { loadEnvFile?: (path: string) => void }).loadEnvFile?.(p);
      } catch {
        /* 무시 */
      }
    }
  }
}

/** 실제 GPT 이미지 사용 가능 여부 */
export function isRealGenerationEnabled(): boolean {
  ensureEnv();
  return process.env.ASSET_GEN_REAL === "1" && Boolean(process.env.OPENAI_API_KEY);
}

// 1×1 투명 PNG (mock 플레이스홀더)
const MOCK_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAen63NgAAAAASUVORK5CYII=";

/** Mock 클라이언트 — 실제 호출 없이 유효한 PNG 버퍼 반환 (비용 0) */
export function createMockImageClient(): GPTImageClient {
  return {
    async generateImage(_prompt: string): Promise<GeneratedImage> {
      return { imageBuffer: Buffer.from(MOCK_PNG_BASE64, "base64"), mimeType: "image/png" };
    },
  };
}

/** 실제 OpenAI gpt-image 클라이언트 */
export function createOpenAIImageClient(): GPTImageClient {
  return {
    async generateImage(prompt, opts = {}): Promise<GeneratedImage> {
      ensureEnv();
      const key = process.env.OPENAI_API_KEY;
      if (!key) throw new Error("OPENAI_API_KEY 미설정 — 실제 이미지 생성 불가");
      const base = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
      const model = process.env.GPT_IMAGE_MODEL || process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";
      const size = opts.size || process.env.OPENAI_IMAGE_SIZE || "1024x1024";
      const quality = opts.quality || process.env.OPENAI_IMAGE_QUALITY || "high";

      const call = (withBackground: boolean) => {
        const body: Record<string, unknown> = { model, prompt, size, quality, n: 1 };
        if (withBackground && opts.transparent) body.background = "transparent";
        return fetch(`${base}/images/generations`, {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
          body: JSON.stringify(body),
        });
      };

      let res = await call(true);
      // 일부 모델은 background:transparent 미지원 → 배경 옵션 없이 1회 재시도
      if (!res.ok && opts.transparent) {
        const detail = await res.text().catch(() => "");
        if (/background|transparent/i.test(detail)) {
          res = await call(false);
        } else {
          throw new Error(`GPT image API 실패 (${res.status}): ${detail.slice(0, 300)}`);
        }
      }
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(`GPT image API 실패 (${res.status}): ${detail.slice(0, 300)}`);
      }
      const data = (await res.json()) as { data?: { b64_json?: string }[] };
      const b64 = data?.data?.[0]?.b64_json;
      if (!b64) throw new Error("GPT image API 응답에 b64_json 이 없습니다.");
      return { imageBuffer: Buffer.from(b64, "base64"), mimeType: "image/png" };
    },
  };
}

/** 기본 클라이언트 — 실제 가능하면 OpenAI, 아니면 Mock */
export function getDefaultClient(): GPTImageClient {
  return isRealGenerationEnabled() ? createOpenAIImageClient() : createMockImageClient();
}
