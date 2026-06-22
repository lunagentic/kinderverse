// =============================================================================
// Design Recipe — "이 디자인이 무엇을 담고 무엇을 강조하는가"를 기술하는 의미(semantic) 계층.
// 좌표/스타일/이미지 생성과 무관. (Template Blueprint Engine - Phase 1)
//
//   월안(raw) → [normalize + buildMonthlyTemplate + sectionToBlocks 재사용]
//             → DesignRecipe (의미 + 강조 + 의도)
//
// 기존 렌더러 위에 얹는 additive 계층 — 기존 타입(Block 등)을 그대로 재사용한다.
// =============================================================================
import type { Block, SectionId, SectionRole } from "../../renderer/types";

/** 섹션 강조도 — Blueprint 레이아웃이 크기/배치 우선순위로 사용 */
export type RecipeEmphasis = "primary" | "secondary" | "tertiary";

/** 콘텐츠 밀도 의도 (Style Family 제외 — 레이아웃 힌트일 뿐 구체 스타일 아님) */
export type RecipeDensity = "compact" | "comfortable" | "spacious";

/** 어조 의도 — 월안은 "예정/계획" 어조 */
export type RecipeTone = "plan";

/**
 * 이미지가 "무엇을 담아야 하는가"의 의미만 선언 (Phase 1: 생성/에셋/스타일 전부 제외).
 * 실제 생성·프롬프트·레퍼런스는 후속 Phase 의 Asset/Style Family 책임.
 */
export interface RecipeImageIntent {
  role: "hero" | "section" | "decoration";
  subject: string; // ko — 담아야 할 대상(사람이 읽는 의미)
  note?: string;
}

/** 레시피의 한 섹션 — 의미 데이터(Block[]) + 강조 + (선택)이미지 의도 */
export interface RecipeSection {
  id: SectionId;
  role: SectionRole;
  title: string;
  emphasis: RecipeEmphasis;
  /** 렌더 무관 콘텐츠 IR (기존 Block 재사용) */
  blocks: Block[];
  /** 의미적 이미지 의도 (메타데이터 — 생성 아님) */
  imageIntent?: RecipeImageIntent[];
}

/** 월안 전체의 Design Recipe */
export interface DesignRecipe {
  version: 1;
  kind: "monthly_plan";
  meta: {
    title: string; // 대표 주제(theme)
    subtitle: string; // 연령 · 기간 · 생활주제
    season?: string;
    locale: "ko";
  };
  intent: {
    /** 강조도 순으로 정렬된 섹션 id (primary → tertiary) */
    priorityOrder: SectionId[];
    density: RecipeDensity;
    tone: RecipeTone;
  };
  sections: RecipeSection[];
}
