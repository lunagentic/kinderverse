# Template Blueprint Engine — Phase 1

"이미지 생성 중심" → "편집 가능한 디자인 생성 중심" 전환을 위한 엔진 계층.

## 목표 파이프라인

```
월안(raw)
  → Design Recipe        (의미: 무엇을 담고 무엇을 강조하는가)
  → Template Blueprint   (편집 가능한 좌표 슬롯 골격)
  → Editable Template    (후속 Phase)
  → 사용자 편집           (후속 Phase)
  → PNG / PDF Export      (후속 Phase)
```

## 이번 Phase 범위

포함
- **Design Recipe Engine** — `recipe/buildDesignRecipe.ts`
- **Template Blueprint Engine** — `blueprint/buildTemplateBlueprint.ts`
- **Monthly Plan Template Family** — `blueprint/family.ts` (현재 `document` 1종)

제외 (후속 Phase)
- 이미지 생성 · Asset Family · Reference Preview · Style Family · Export · Editor UI

## 기존 자산 재사용 (additive 계층)

맨바닥 재구현이 아니라 `renderer/` 자산 위에 의미·편집 계약 계층을 얹는다.

| 단계 | 재사용 | 위치 |
|------|--------|------|
| 정규화 | `normalizeMonthlyPlan` | `renderer/normalize/monthlyPlan.ts` |
| 섹션 트리 | `buildMonthlyTemplate` | `renderer/buildMonthlyTemplate.ts` |
| 콘텐츠 IR | `sectionToBlocks` | `renderer/renderers/template/sectionToBlocks.ts` |
| 좌표·높이·바인딩 | `layoutBlock` | `renderer/renderers/template/blockToLayers.ts` |
| 테마 토큰 | `defaultTheme` | `renderer/renderers/template/theme.ts` |

## 공개 API (`engine/index.ts`)

```ts
import { buildDesignRecipe, buildTemplateBlueprint } from "./engine";

const recipe = buildDesignRecipe(rawMonthlyPlan);       // DesignRecipe
const blueprint = buildTemplateBlueprint(recipe, "document"); // TemplateBlueprint
```

- `DesignRecipe` — `meta` + `intent`(강조 순서/밀도/어조) + `sections[]`(Block[] + emphasis)
- `TemplateBlueprint` — `canvas` + `blocks[]`(섹션) → `slots[]`(text/shape/image)
  - 각 슬롯: `frame`(절대좌표) · `editable` · `binding`(역동기화 경로) · `style`
  - `overflow` / `contentHeight` — 단일 페이지(A4 794×1123) 초과 여부 진단

## 검증

```bash
npx tsx client/src/engine/__sample__/runSample.ts
```

월안 픽스처(`renderer/__fixtures__/monthlyPlan.sample.json`)로 엔진을 실행하고
Recipe/Blueprint 산출물을 점검한다(섹션 수, 슬롯 frame 유효성, editable/binding 수 등).
