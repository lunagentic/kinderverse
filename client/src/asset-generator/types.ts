// =============================================================================
// Asset Generator (Phase 2) — 타입 정의.
// 개별 에셋 이미지를 GPT 이미지 모델로 생성·저장한 결과. (최종 포스터 아님)
// =============================================================================
import type { StyleFamily } from "../design-recipe";

export type GeneratedAssetRole = "character" | "object" | "decoration" | "icon" | "background";
export type AssetMimeType = "image/png" | "image/webp";
/** 이미지 품질 — 스티커는 low 권장(비용 절감) */
export type AssetQuality = "low" | "medium" | "high" | "auto";

/** GPT 로 생성·저장된 개별 에셋 */
export interface GeneratedAsset {
  assetId: string;
  assetFamily: string;
  assetRole: GeneratedAssetRole;
  prompt: string;
  imageUrl: string;
  mimeType: AssetMimeType;
  model: "gpt-image";
  createdAt: string;
  /** 기존 파일 재사용(중복 생성 방지) 여부 */
  cached: boolean;
}

/** 프롬프트 빌더 입력 */
export interface AssetPromptParams {
  assetId: string;
  assetRole: GeneratedAssetRole;
  styleFamily: StyleFamily;
}

/** 이미지 클라이언트 결과 */
export interface GeneratedImage {
  imageBuffer: Buffer;
  mimeType: AssetMimeType;
}

/** 이미지 생성 클라이언트 인터페이스 (모델 교체 가능하도록 격리) */
export interface GPTImageClient {
  generateImage(
    prompt: string,
    opts?: { transparent?: boolean; size?: string; quality?: AssetQuality }
  ): Promise<GeneratedImage>;
}
