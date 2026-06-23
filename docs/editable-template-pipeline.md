# 편집 가능한 디자인 템플릿 파이프라인 (놀이계획 (월안)→ 편집 템플릿)

> "놀이계획을 생성한 뒤, 보드에서 요소별로 편집 가능한 디자인 템플릿으로 만드는" 전체 흐름과 진입점을 정리합니다.
> 더 깊은 엔진 내부(레시피/블루프린트 단계): [`client/src/engine/README.md`](../client/src/engine/README.md)

---

## 개요

크게 **두 단계**입니다.

- **A. 월안 생성** — 사용자가 채팅으로 요청 → 서버가 LLM(OpenAI/Anthropic)으로 `monthly_plan` JSON(payload) 생성 → 보드에 "월안" 아이템으로 표시.
- **B. 편집 템플릿 변환** — 월안 아이템의 **🎨(편집 디자인 템플릿)** 버튼 → 클라이언트가 payload를 *DesignRecipe → TemplateBlueprint → EditorDoc → DesignDoc* 으로 변환 → 보드에 **요소별 클릭 편집이 가능한 카드**로 배치.

> 💡 **비용 메모:** 🎨 카드 생성·편집은 전부 **로컬 계산(무과금)**. 유료는 (a) 월안 텍스트 생성(LLM), (b) 에셋 이미지 생성(GPT, `ASSET_GEN_REAL=1`) **둘뿐**이고, 이미 생성된 에셋은 캐시 재사용(무과금).

---

## 전체 데이터 흐름

```
[A. 월안 생성 — server]
사용자 프롬프트("6월 '여름이 왔어요' 월안 만들어줘")
   │  ChatPanel.send() → POST /api/generate
   ▼
server/index.js  /api/generate
   │  generateItem() → detectFeature()=="monthly_plan" → generatePlan()
   │  buildPlanPrompt()(L0~L3) + planFeatures(monthly_plan 스키마) → callLLM()
   ▼
월안 JSON (payload)  ── App.jsx addGenerated() ──▶ 보드 아이템
   { feature_id:"monthly_plan", payload:{ basic_info, rationale, weekly_flow,
     teacher_expectations, events, home_connection ... } }

           │  [🎨 편집 디자인 템플릿] 클릭
           ▼
[B. 편집 템플릿 변환 — client]
App.jsx convertCard(item,"editTemplate")
   │  editorDocToDesignDoc({ type, theme, age, month, payload })
   ▼
buildDesign(input)                                   (client/src/builder/index.ts)
   ├─ buildDesignRecipe(input)                        → DesignRecipe
   │     payload → normalizeMonthlyPlan() → MonthlyContent
   │     + resolveTemplate/Theme/Style
   └─ buildTemplateBlueprint(recipe)                  → TemplateBlueprint (5 레이어)
         buildMonthlyPlanBlueprint() + buildHeroScene() + getTheme()
   ▼
buildEditorDoc()  → EditorDoc(평탄 노드)             (blueprintToDoc.ts)
   ▼
editorDocToDesignDoc()  → DesignDoc                  (frame + elements[])
   ▼
App.jsx addDesignDoc(doc, 480)  → 보드 "designdoc" 아이템
   ▼
DesignFrame / EditableEl / ControlPanel  (BoardItem.jsx)
   → 색상·폰트·투명도·크기·레이어순서·삭제 (요소별 편집)
```

---

## A. 월안 생성 (server)

| # | 파일 | 함수/식별자 | 역할 |
|---|---|---|---|
| 1 | `client/src/components/ChatPanel.jsx` | `send()` | 프롬프트를 `POST /api/generate`로 전송, 응답 `items`를 `onGenerate()`로 전달 |
| 2 | `server/index.js` | `/api/generate` → `generateItem(prompt)` | API 진입점 |
| 3 | `server/generate.js` | `detectFeature()` / `generatePlan()` | "월안/월간" 키워드 → `feature_id="monthly_plan"` 라우팅 |
| 4 | `server/prompts/assemble.js` | `buildPlanPrompt()` | 4계층 프롬프트 조립 (L0 Charter + L1 Pedagogy + L2 Task + L3 Tenant) |
| 5 | `server/prompts/planFeatures.js` | `monthly_plan` | 출력 스키마: `basic_info` / `rationale` / `weekly_flow` / `teacher_expectations` / `events` / `home_connection` 등 |
| 6 | `server/prompts/llm.js` | `callLLM()` / `activeProvider()` | OpenAI·Anthropic 호출 (키 없으면 mock JSON) |
| 7 | `client/src/App.jsx` | `addGenerated()` | 응답을 보드 아이템으로 추가 (`data.feature_id`, `data.payload`) |

---

## B. 편집 템플릿 변환 (client)

| # | 파일 | 함수 | 입력 → 출력 |
|---|---|---|---|
| 1 | `client/src/App.jsx` | `convertCard(item,"editTemplate")` | 월안 `payload` → `editorDocToDesignDoc()` 호출 → `addDesignDoc(doc,480)` |
| 2 | `client/src/editor/blueprintToDoc.ts` | `editorDocToDesignDoc()` | `DesignRecipeInput` → **DesignDoc** (보드 카드) |
| 2-1 | `client/src/editor/blueprintToDoc.ts` | `buildEditorDoc()` | 블루프린트 레이어를 z-순서 평탄 노드(EditorDoc)로 펼침. `assetUrl()`로 이미지 경로 부여 |
| 3 | `client/src/builder/index.ts` | `buildDesign()` | `buildDesignRecipe` + `buildTemplateBlueprint` + `validateBlueprintAssets`(카탈로그 재검증) |
| 4 | `client/src/design-recipe/builder.ts` | `buildDesignRecipe()` | payload → **DesignRecipe** (templateFamily / themeFamily / styleFamily / content) |
| 4-1 | `client/src/renderer/normalize/monthlyPlan.ts` | `normalizeMonthlyPlan()` | 월안 raw JSON → ViewModel → `MonthlyContent`(제목·주차놀이·행사·교사기대 등) |
| 5 | `client/src/template-blueprint/blueprintBuilder.ts` | `buildTemplateBlueprint()` | `templateFamily`로 빌더 디스패치 (`monthly_plan_v1` → 아래) |
| 5-1 | `client/src/template-blueprint/monthlyPlanBlueprint.ts` | `buildMonthlyPlanBlueprint()` | DesignRecipe → **TemplateBlueprint** (5 레이어) |
| 5-2 | `client/src/template-blueprint/heroScene.ts` | `buildHeroScene()` / `heroSceneToBuckets()` | Hero(배경장면 + 캐릭터 + 제목) 합성 |
| 5-3 | `client/src/design-system/themeDesignSystem.ts` | `getTheme()` | 계절 테마 색상·섹션색·폰트(`TITLE_FONT`/`SUBTITLE_FONT`/`BODY_FONT`) |
| 5-4 | `client/src/design-system/heroSceneRecipe.ts` | `getHeroRecipe()` | Hero 장면 레시피(하늘 그라데이션 + `heroBackground` + 캐릭터 배치) |

### 데이터 모델 변환 요약
```
월안 payload ──normalizeMonthlyPlan──▶ MonthlyContent
            ──buildDesignRecipe─────▶ DesignRecipe { templateFamily, themeFamily, styleFamily, content }
            ──buildMonthlyPlanBlueprint──▶ TemplateBlueprint { canvas, layers[5] }
            ──buildEditorDoc────────▶ EditorDoc { canvas, nodes[] }
            ──editorDocToDesignDoc──▶ DesignDoc { frame{w,h,bg}, elements[] }
```

---

## 5-레이어 구조 (TemplateBlueprint)

| 레이어 | 내용 | 예시 요소 |
|---|---|---|
| `background` | 캔버스 채움(크림색 `frame.bg`) | `Background` |
| `shape` | 카드/배지 (둥근 모서리·테두리·그림자) | `ReasonCard`, `Week1Card`, 배지 |
| `sticker` | 이미지 슬롯(에셋) | Hero 배경·캐릭터, 주차 스티커, 교사, 아이콘 |
| `decoration` | 장식 이미지 | `deco_flower`, `deco_leaf` |
| `text` | 텍스트 | 제목(2톤 분리), 섹션 제목·본문, 주차 놀이명 |

- 캔버스: `1080 × 2060` (상단 Hero `HERO_H=560` 확대분 `SECTION_SHIFT=140` 포함).
- 섹션 색 체계(놀이선정=핑크 / 흐름=블루 / 행사=퍼플 / 교사기대=그린)와 폰트는 모두 `themeDesignSystem.ts`에서 결정.

---

## 에셋 시스템

| 구분 | 위치 |
|---|---|
| 카탈로그(어떤 assetId가 존재하는지) | `client/src/asset-family/summerAssets.ts` |
| 슬롯 생성·검증 (없는 assetId면 throw) | `client/src/template-blueprint/assetSlot.ts` · `asset-family/validate.ts` |
| 이미지 파일 | `client/public/generated-assets/<family>/<assetId>.png` (URL: `assetUrl()`) |
| 이미지 생성(유료) | `client/src/asset-generator/*` (`promptBuilder` → `gptImageClient`(GPT) → `assetStorage`), `ASSET_GEN_REAL=1` 필요, 캐시 재사용 |

- `editorDocToDesignDoc`에서 `assetRole==="background"`는 **cover·누끼(cutout) 제외·잠금**, 그 외 스티커/캐릭터/아이콘은 **누끼 적용(contain)**.
- 카탈로그엔 있지만 PNG가 아직 없으면 보드에서 자동 숨김(에러 없음) — 이후 생성으로 채움.

---

## 보드 편집 (BoardItem.jsx)

`DesignFrame`이 `DesignDoc`을 렌더하고, 카드 선택 시 각 요소는 `EditableEl`(드래그·리사이즈) / 비선택 시 `DesignEl`(정적)로 그려집니다.

- **선택**: 요소 클릭 → 파란 외곽선 표시. 클릭은 **선택만**(레이어 순서 변경 없음).
- **ControlPanel 편집 항목**: 투명도 / 색상(스포이드 직접선택 + 팔레트) / 폰트·크기(텍스트) / 도형 모양·테두리 / **레이어 순서(맨앞·앞·뒤·맨뒤)** / 삭제.

---

## 확장 포인트

- **새 계절 테마**: `themeDesignSystem.ts`(`THEME_SYSTEM`) + `heroSceneRecipe.ts`에 항목 추가, theme resolver가 키워드로 매핑.
- **새 에셋**: `summerAssets.ts` 카탈로그에 등록 → `public/generated-assets/...`에 PNG 추가(또는 `asset-generator`로 생성).
- **새 템플릿 패밀리**: `blueprintBuilder.ts`의 `BLUEPRINT_BUILDERS`에 `templateFamily → builder` 등록.

---

## 검증/실행

- 개발 실행: `npm run dev` (server+client 동시) → 채팅에서 "월안" 생성 → 카드의 🎨 클릭 → 편집 템플릿 카드 확인.
- 파이프라인 단위 점검: `npx tsx client/src/test/phase1.test.ts` (월안 입력 → Recipe → Blueprint → 에셋 검증).
- 빌드: `npm run build`.
