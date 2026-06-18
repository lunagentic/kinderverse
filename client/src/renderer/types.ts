// =============================================================================
// 월안 Template Renderer — 타입 단일 출처
//
// 파이프라인: RawData → ViewModel → Section[](IR) → TemplateDocument(Layer)
//   - Raw      : LLM 출력 원본 (느슨, 전 필드 optional)
//   - ViewModel : 정규화된 표시용 (non-null, 고정 순서, 파생값)
//   - Section   : 출력형식 무관 중간표현(IR). template/document/infographic 공유
//   - Layer     : 편집 가능 출력 단위 (좌표·스타일·데이터 바인딩)
//
// 확장 지점은 각 섹션의 "확장:" 주석 참고.
// =============================================================================

// ── 1. 원시 기하/캔버스 ──────────────────────────────────────────────────────
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Canvas {
  width: number;
  height: number;
  background: string;
  padding: number;
}

// ── 2. 도메인 식별자 (확장: 새 plan/output/section/block/layer는 여기 union에 추가) ──
export type PlanType = "monthly_plan"; // 향후: | "weekly_plan" | "daily_plan" | "project_plan"

export type OutputType = "template" | "document" | "infographic"; // 현재 template만 구현

export type MonthlyPlanSectionId =
  | "basic_info"
  | "rationale"
  | "teacher_expectations"
  | "curriculum_links"
  | "weekly_flow"
  | "outdoor_play"
  | "safety"
  | "character"
  | "events"
  | "home_connection";

// 향후 plan별 SectionId union을 추가로 합집합한다.
export type SectionId = MonthlyPlanSectionId;

// 섹션의 의미 역할 — 렌더러/테마가 레이아웃 힌트로 사용
export type SectionRole = "header" | "narrative" | "list" | "matrix" | "media";

export type LayerType = "text" | "shape" | "image"; // 확장: | "icon" | "chart" ...

// =============================================================================
// 3. RAW DATA — LLM 출력 원본 미러링
//    출처: server/prompts/planFeatures.js monthly_plan output_schema
// =============================================================================

// 모든 plan raw의 공통 베이스 (확장: plan별 RawData 가 이를 extends)
export interface PlanRawBase {
  output_type?: string;
  plan_type?: PlanType;
}

export interface MonthlyPlanRawData extends PlanRawBase {
  plan_type?: "monthly_plan";
  basic_info?: {
    age_band?: string;
    class_name?: string;
    theme?: string;
    life_theme?: string;
    season?: string;
    period?: { start_date?: string; end_date?: string; label?: string };
  };
  rationale?: {
    summary?: string;
    children_interest?: { recent_interest?: string; play_experience?: string };
    season_and_environment?: {
      seasonal_feature?: string;
      natural_environment?: string;
      institution_event?: string;
    };
    developmental_value?: {
      cognitive?: string;
      social?: string;
      physical?: string;
      language?: string;
      artistic?: string;
    };
  };
  teacher_expectations?: Array<{ goal?: string; focus?: string }>;
  curriculum_links?: Array<{ area?: string; category?: string; content?: string }>;
  weekly_flow?: Array<{
    week?: number;
    flow_stage?: string;
    sub_theme?: string;
    play_ideas?: Array<{ title?: string; core_experience?: string }>;
  }>;
  outdoor_and_physical_play?: Array<{
    week?: number;
    activity_name?: string;
    method?: string;
    expected_experience?: string;
  }>;
  safety_education?: { play_safety?: string; tool_safety?: string; life_safety?: string };
  character_education?: { core_value?: string; practice_context?: string };
  events?: Array<{ name?: string; date?: string; connection?: string }>;
  home_connection?: {
    home_play?: string;
    parent_question?: string;
    recommended_picture_book?: string;
  };
}

// 확장: 향후 plan raw 들의 합집합
export type AnyPlanRawData = MonthlyPlanRawData;

/** @deprecated 명칭 호환용 별칭 */
export type MonthlyPlanRaw = MonthlyPlanRawData;

// =============================================================================
// 4. VIEW MODEL — 정규화된 표시용 (non-null 보장, 고정 순서, 파생값)
// =============================================================================

export interface KV {
  label: string;
  value: string;
}

export interface BasicInfoVM {
  ageBand: string;
  className: string;
  theme: string;
  lifeTheme: string;
  season: string;
  periodLabel: string; // 파생: label || "start ~ end" || season
}

export interface RationaleVM {
  summary: string;
  childrenInterest: string[];
  seasonEnv: string[];
  devValue: string[];
}

export interface ExpectationVM {
  goal: string;
  focus: string;
}

export interface CurriculumLinkVM {
  area: string; // 5영역 고정 순서 보장
  category: string;
  content: string;
}

export interface PlayVM {
  title: string;
  coreExperience: string;
}

export interface WeekVM {
  week: number;
  flowStage: string;
  subTheme: string;
  plays: PlayVM[];
}

export interface OutdoorVM {
  week: number;
  activityName: string;
  method: string;
}

export interface EventVM {
  name: string;
  date: string;
  connection: string;
}

// 모든 plan ViewModel의 공통 베이스 (확장: plan별 VM 이 이를 extends)
export interface PlanViewModelBase {
  planType: PlanType;
}

export interface MonthlyPlanViewModel extends PlanViewModelBase {
  planType: "monthly_plan";
  basicInfo: BasicInfoVM;
  rationale: RationaleVM;
  teacherExpectations: ExpectationVM[];
  curriculumLinks: CurriculumLinkVM[];
  weeklyFlow: WeekVM[];
  outdoorPlay: OutdoorVM[];
  safety: KV[];
  character: { coreValue: string; practiceContext: string };
  events: EventVM[];
  homeConnection: KV[];
}

// 확장: 향후 plan VM 들의 합집합
export type AnyPlanViewModel = MonthlyPlanViewModel;

/** @deprecated 명칭 호환용 별칭 */
export type MonthlyPlanVM = MonthlyPlanViewModel;

// =============================================================================
// 5. IMAGE SLOT — 이미지 자리 데이터 구조 (렌더링/생성 코드 없음, 데이터만)
//    설계 원칙: 실제 URL 없이도 동작 · AI 프롬프트 보존 · 나중에 교체/변경 가능 ·
//    aspectRatio/crop 저장 · "미생성" 상태 지원 · 위치(x/y)는 저장하지 않음(Layout Engine 담당)
// =============================================================================

// 슬롯의 의미적 용도 (지원 대상 1~3 + 일반)
export type ImageRole = "hero" | "weekly" | "activity" | "decoration" | "generic";

// 시각 레이어 종류 (Notion 스펙: KinderLab 이미지/시각 레이어 구조)
// - background    : 카드/섹션/페이지 배경
// - contentImage  : 실제 콘텐츠 이미지 (AssetLibrary 와 연결)
// - decoration    : 디자인 시스템 꾸미기 아이콘
export type VisualLayerType = "background" | "contentImage" | "decoration";

// 이미지 출처(provenance) — 확장: | "external"
export type ImageSource = "ai" | "upload" | "stock";

// 시각 스타일 — 일러스트/사진 (auto = 미정)
export type ImageStyle = "illustration" | "photo" | "auto";

// 슬롯 생애주기 상태 (요구사항 6: 미생성 상태 지원)
export type ImageSlotStatus =
  | "empty" // 아무 정보 없음 (플레이스홀더만)
  | "prompt" // AI 프롬프트만 있고 아직 생성 안 됨
  | "generating" // 생성 진행 중
  | "ready" // asset 확보됨
  | "error"; // 생성/로드 실패

export type AspectRatioPreset = "1:1" | "4:3" | "3:4" | "16:9" | "9:16" | "3:2";

// 비율만 저장 (요구사항 7). 실제 픽셀 크기는 ImageAsset 이 가진다.
export interface AspectRatio {
  w: number;
  h: number;
  preset?: AspectRatioPreset;
}

// 크롭/초점 정보 (요구사항 8) — 0~1 정규화 좌표라 해상도·교체에 독립적
export interface ImageCrop {
  x: number; // 0~1
  y: number; // 0~1
  width: number; // 0~1
  height: number; // 0~1
  scale?: number; // 줌 (Canva/Figma 스타일)
  focalX?: number; // 0~1 초점
  focalY?: number; // 0~1 초점
}

// AI 생성용 프롬프트 (요구사항 2)
export interface ImagePrompt {
  text: string; // 핵심 프롬프트
  negative?: string; // 제외 요소
  style?: ImageStyle; // 일러스트/사진
  keywords?: string[]; // 보조 키워드
  model?: string; // 모델 힌트 (예: "small" | "large")
  aspectRatio?: AspectRatio; // 생성 비율 힌트
  seed?: number; // 재현용
  origin?: "auto" | "teacher"; // 자동 파생 / 교사 입력
}

// 실제 이미지 자산 (요구사항 3: 생성/교체되면 채워짐)
export interface ImageAsset {
  url: string; // 원격 URL 또는 dataURL
  source: ImageSource; // 이 자산의 출처
  width?: number; // intrinsic px
  height?: number; // intrinsic px
  mimeType?: string;
  thumbnailUrl?: string;
  assetId?: string;
  generatedFrom?: ImagePrompt; // AI 생성이면 사용한 프롬프트
  attribution?: string; // 스톡/저작자 표기
  createdAt?: string; // ISO (런타임 주입)
}

// 빈 슬롯 표시용 (요구사항 1·6: URL 없이도 동작)
export interface ImagePlaceholder {
  label: string; // 예: "대표 이미지"
  icon?: string; // 아이콘 힌트
  bg?: string; // 배경색
  showPrompt?: boolean; // 프롬프트 미리보기 노출 여부
}

// ── 이미지 위 오버레이 — "이미지 위에 무엇을 올릴 수 있는가"만 정의 ──
// 실제 위치(x/y)는 담지 않는다. anchor 는 의미적 배치 힌트일 뿐(픽셀 아님 → Layout Engine 담당).
export type OverlayAnchor =
  | "top-left"
  | "top"
  | "top-right"
  | "left"
  | "center"
  | "right"
  | "bottom-left"
  | "bottom"
  | "bottom-right"
  | "fill"; // 이미지 전체 덮기 (scrim 등)

export interface OverlayBase {
  id: string;
  anchor?: OverlayAnchor; // 의미적 위치 힌트 (좌표 아님)
  opacity?: number; // 0~1
  z?: number; // 겹침 순서(상대)
}

// 이미지 위 텍스트
export interface TextOverlay extends OverlayBase {
  kind: "text";
  text: string;
  style?: {
    fontSize?: number;
    weight?: number;
    color?: string;
    align?: "left" | "center" | "right";
    italic?: boolean;
    background?: string; // 글자 뒤 배경(가독성용, 선택)
  };
}

// 이미지 위 아이콘
export interface IconOverlay extends OverlayBase {
  kind: "icon";
  icon: string; // 아이콘 식별자(이름)
  color?: string;
  size?: number;
}

// 이미지 위 반투명 박스/도형 (opacity 로 반투명 표현)
export interface ShapeOverlay extends OverlayBase {
  kind: "shape";
  shape: "rect" | "roundRect" | "circle" | "scrim"; // scrim = 그라데이션 막
  fill?: string;
  radius?: number;
}

export type OverlayLayer = TextOverlay | IconOverlay | ShapeOverlay;
export type OverlayKind = OverlayLayer["kind"];

// 편집 가능한 이미지 자리 (위치 없음 — Layout Engine 이 frame 결정: 요구사항 9)
export interface ImageSlot {
  id: string;
  role: ImageRole;
  visualType?: VisualLayerType; // 시각 레이어 분류 (contentImage 만 AssetLibrary 연결)
  status: ImageSlotStatus;
  aspectRatio: AspectRatio; // 요구사항 7
  placeholder: ImagePlaceholder; // 요구사항 1·6
  source?: ImageSource; // 확정 시 (ai/upload/stock) — 요구사항 4
  style?: ImageStyle;
  prompt?: ImagePrompt; // 요구사항 2
  crop?: ImageCrop; // 요구사항 8
  asset?: ImageAsset; // 요구사항 3 (없으면 미생성/플레이스홀더)
  resolvedIcon?: string; // ImageResolver 가 채운 주제/놀이 연관 이모지(asset 없을 때 표시)
  overlays?: OverlayLayer[]; // ★ 이미지 위 텍스트/아이콘/반투명 박스
  alt?: string;
  locked?: boolean; // Canva/Figma 스타일 잠금 (요구사항 5)
  history?: ImageAsset[]; // 교체 이력 (요구사항 3·4)
  // ⚠️ x/y/위치 없음 — Layout Engine 책임 (요구사항 9)
}

// =============================================================================
// 6. SECTION (IR) — 타입드 섹션(의미 단위). template/document/infographic 공유.
//    각 섹션은 자신의 데이터만 담고(좌표·블록 없음), 출력 렌더러가 해석한다.
// =============================================================================

// 블록은 "출력 렌더러의 표현 1차 단위"(template 가 layout 으로 변환). 섹션과 분리.
export type Block =
  | { kind: "keyValue"; items: KV[] }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; ordered?: boolean; items: string[] }
  | { kind: "tags"; items: string[] }
  | { kind: "table"; columns: string[]; rows: string[][] }
  | { kind: "image"; slot: ImageSlot };

export type BlockKind = Block["kind"];

// ── 10개 타입드 섹션 (요청 명칭) ──
export interface HeaderSection {
  kind: "header";
  basicInfo: BasicInfoVM;
  hero?: ImageSlot; // 월안 대표 이미지
}

export interface SelectionReasonSection {
  kind: "selectionReason";
  summary: string;
  details: KV[]; // 유아관심 / 계절·환경 / 발달가치
}

export interface TeacherExpectationSection {
  kind: "teacherExpectation";
  expectations: ExpectationVM[];
}

export interface CurriculumSection {
  kind: "curriculum";
  links: CurriculumLinkVM[]; // 5영역 고정
}

export interface WeeklyImage {
  week: number;
  image: ImageSlot; // 주차별 대표 이미지
}

export interface WeeklyFlowSection {
  kind: "weeklyFlow";
  weeks: WeekVM[];
  weekImages?: WeeklyImage[]; // 주차별 대표 이미지 (선택)
}

export interface OutdoorActivitySection {
  kind: "outdoorActivity";
  activities: OutdoorVM[];
}

export interface SafetySection {
  kind: "safety";
  items: KV[];
}

export interface CharacterSection {
  kind: "character";
  coreValue: string;
  practiceContext: string;
}

export interface EventSection {
  kind: "event";
  events: EventVM[];
}

export interface FamilyConnectionSection {
  kind: "familyConnection";
  items: KV[];
}

// 월안 섹션 판별 합집합 (확장: 향후 plan 섹션 union 을 AnySection 에 합집합)
export type MonthlySection =
  | HeaderSection
  | SelectionReasonSection
  | TeacherExpectationSection
  | CurriculumSection
  | WeeklyFlowSection
  | OutdoorActivitySection
  | SafetySection
  | CharacterSection
  | EventSection
  | FamilyConnectionSection;

export type AnySection = MonthlySection;

export type SectionKind = MonthlySection["kind"];

// ── Section Registry ──
// 섹션 종류별 메타 + 빌더. 출력형식 무관(의미 계층). 순서는 레지스트리 배열 순.
export interface SectionDefinition<S extends MonthlySection = MonthlySection> {
  kind: S["kind"];
  id: SectionId; // snake_case — DataBinding/메타용
  title: string;
  role: SectionRole;
  build: (vm: MonthlyPlanViewModel) => S | null; // null = 데이터 없으면 섹션 생략
}

// 빌드된 섹션 인스턴스 (메타 + 데이터) — 렌더러가 소비
export interface SectionInstance<S extends MonthlySection = MonthlySection> {
  def: SectionDefinition<S>;
  section: S;
}

// 레이어가 어느 원본 데이터에서 왔는지 — 재편집/역동기화 키
export interface DataBinding {
  sectionId: SectionId;
  path: string; // 예: "weeklyFlow.blocks[0].rows[1][2]"
}

export interface LayerStyle {
  bg?: string;
  radius?: number;
  fontSize?: number;
  weight?: number;
  color?: string;
  align?: "left" | "center" | "right";
  valign?: "top" | "center" | "bottom";
  fontFamily?: string;
  opacity?: number;
  stroke?: string; // 텍스트 외곽선 색
  strokeWidth?: number; // 외곽선 두께(px)
}

export interface ThemeTokens {
  pageBg: string;
  sectionBg: string;
  accent: string;
  ink: string;
  sub: string;
  rowAlt: string;
  font: { title: number; heading: number; body: number; small: number };
  weight: { bold: number; medium: number; normal: number };
  space: { page: number; section: number; gap: number; row: number };
}

// =============================================================================
// 7. SECTION TREE (TemplateDocument) — buildMonthlyTemplate 의 출력.
//    구조만 담는다. 좌표/레이어/렌더 없음 (Layout 은 후속 단계).
// =============================================================================

export interface TemplateSectionNode {
  id: SectionId;
  kind: SectionKind;
  title: string;
  role: SectionRole;
  section: MonthlySection; // 의미 데이터(typed)
  children: TemplateSectionNode[]; // 트리 (현재 평면, 향후 중첩)
}

export interface TemplateDocument {
  version: string; // "1.0"
  planType: PlanType;
  output: OutputType; // "template"
  sections: TemplateSectionNode[]; // 루트 섹션 노드들
  // ⚠️ canvas/frame/layer 없음 — Layout Engine 이 LayoutDocument 로 변환
}

// =============================================================================
// 8. LAYER TREE (LayerTree) — buildLayerTree 의 출력.
//    text / image / shape / group 만 지원. 좌표 없음(구조만 — Layout 후속).
// =============================================================================

export type LayerNodeKind = "text" | "image" | "shape" | "group";

export interface LayerNodeBase {
  id: string;
  binding?: DataBinding; // 원본 추적(선택)
  style?: LayerStyle; // 표현 힌트(폰트·색·배경 등 — 위치 제외)
  meta?: Record<string, unknown>;
  // ⚠️ x/y/frame 없음 — Layout Engine 담당
}

export interface TextLayerNode extends LayerNodeBase {
  kind: "text";
  text: string;
}

export interface ImageLayerNode extends LayerNodeBase {
  kind: "image";
  slot: ImageSlot; // 이미지 슬롯(+overlays)
}

export interface ShapeLayerNode extends LayerNodeBase {
  kind: "shape";
  shape?: "rect" | "roundRect" | "line" | "circle";
}

export interface GroupLayerNode extends LayerNodeBase {
  kind: "group";
  role?: string; // 예: "document" | "section" | "table" | "row"
  direction?: "vertical" | "horizontal" | "stack"; // 배치 힌트(좌표 아님)
  children: LayerNode[];
}

export type LayerNode = TextLayerNode | ImageLayerNode | ShapeLayerNode | GroupLayerNode;

export interface LayerTree {
  version: string;
  planType: PlanType;
  root: GroupLayerNode; // 문서 전체를 감싸는 최상위 그룹
}

// =============================================================================
// 9. LAYOUT (LayoutDocument) — 좌표가 부여된 출력 (DesignDoc 호환).
//    현재 preview 렌더 경로. 향후 Layout Engine 이 LayerTree → LayoutDocument.
// =============================================================================

// 모든 레이어 공통 필드 (확장: 새 LayerType 의 전용 필드는 optional 로 추가)
export interface BaseLayer {
  id: string;
  type: LayerType;
  frame: Rect; // 절대좌표 (기존 DesignDoc element 호환)
  z: number;
  locked?: boolean;
  visible?: boolean;
  style?: LayerStyle;
  binding?: DataBinding;
  role?: string;
}

export interface TextLayer extends BaseLayer {
  type: "text";
  text: string;
}

export interface ShapeLayer extends BaseLayer {
  type: "shape";
}

export interface ImageLayer extends BaseLayer {
  type: "image";
  src?: string;
  prompt?: string;
}

export type TypedLayer = TextLayer | ShapeLayer | ImageLayer;

// 생성/순회 코드의 실용 표면(평탄형). content 필드는 type 에 따라 optional.
export interface Layer extends BaseLayer {
  text?: string;
  src?: string;
  prompt?: string;
  fit?: "cover" | "contain" | "fill"; // image objectFit (기본 cover)
  textRole?: "title" | "content"; // 텍스트 레이어 분류 (TitleTextLayer / ContentTextLayer)
}

export interface LayoutSection {
  id: SectionId;
  title: string;
  frame: Rect;
  layers: Layer[];
}

export interface LayoutDocument {
  version: string;
  planType: PlanType;
  output: OutputType;
  canvas: Canvas;
  theme: ThemeTokens;
  sections: LayoutSection[];
}
