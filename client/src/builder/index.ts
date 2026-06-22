// =============================================================================
// 통합 Builder — 입력 하나로 Design Recipe + Template Blueprint 를 함께 생성.
//
//   buildDesign({ type, theme, age, month })
//     → { designRecipe, templateBlueprint }
//
// 처리 순서:
//   1. Design Recipe 생성
//   2. Template Family 확인 (monthly_plan_v1)
//   3. Theme Family 확인 (summer)
//   4. Style Family 확인 (pixar_storybook)
//   5. Monthly Plan v1 Blueprint 생성
//   6. Summer Asset Catalog 연결 (createAssetSlot 내부 검증)
//   7. Asset Slot validation 수행 (최종 일괄 재검증)
//   8. 결과 반환
//
// 실제 이미지 생성은 하지 않는다 (모든 AssetSlot.imageUrl = null).
// =============================================================================
import { buildDesignRecipe } from "../design-recipe";
import type { DesignRecipe, DesignRecipeInput } from "../design-recipe";
import { buildTemplateBlueprint } from "../template-blueprint";
import type { AssetSlot, TemplateBlueprint } from "../template-blueprint";
import { validateAssetSlot } from "../asset-family";

export interface DesignBuildResult {
  designRecipe: DesignRecipe;
  templateBlueprint: TemplateBlueprint;
}

/** Blueprint 레이어에서 AssetSlot 만 추출 */
export function collectAssetSlots(blueprint: TemplateBlueprint): AssetSlot[] {
  return blueprint.layers.flatMap((layer) =>
    layer.children.filter((c): c is AssetSlot => typeof (c as AssetSlot).assetId === "string")
  );
}

/** 모든 AssetSlot 의 assetId 를 카탈로그 기준으로 일괄 재검증. 실패 시 throw. */
export function validateBlueprintAssets(blueprint: TemplateBlueprint): void {
  const errors: string[] = [];
  for (const slot of collectAssetSlots(blueprint)) {
    try {
      validateAssetSlot(slot.assetId, slot.assetFamily);
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }
  if (errors.length) {
    throw new Error("Asset Slot validation failed:\n" + errors.join("\n"));
  }
}

/**
 * 통합 빌드 — 입력 → { designRecipe, templateBlueprint }.
 */
/** STEP 8 별칭 — Phase 1 통합 빌더 (= buildDesign) */
export function buildEditableTemplateBlueprint(input: DesignRecipeInput): DesignBuildResult {
  return buildDesign(input);
}

export function buildDesign(input: DesignRecipeInput): DesignBuildResult {
  // 1. Design Recipe 생성
  const designRecipe = buildDesignRecipe(input);

  // 2~4. Family 확인 (Recipe 가 결정한 토큰)
  //   designRecipe.templateFamily / themeFamily / styleFamily

  // 5~6. Monthly Plan v1 Blueprint 생성 + Summer Asset Catalog 연결
  //   (createAssetSlot 이 슬롯 생성 시 assetId 를 검증 — 미존재면 throw)
  const templateBlueprint = buildTemplateBlueprint(designRecipe);

  // 7. Asset Slot validation (최종 일괄 재검증)
  validateBlueprintAssets(templateBlueprint);

  // 8. 결과 반환
  return { designRecipe, templateBlueprint };
}
