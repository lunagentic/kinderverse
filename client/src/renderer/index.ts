// 공개 API
export { normalizeMonthlyPlan } from "./normalize/monthlyPlan";
export { buildSections, SECTION_REGISTRY } from "./sections/registry";
export { buildMonthlyTemplate } from "./buildMonthlyTemplate";
export { buildLayerTree } from "./buildLayerTree";
export { layoutTemplate } from "./renderers/template";
export { layoutColorLab, colorLabTheme } from "./templates/ColorLabTemplate";
export { layoutInfographic, infographicTheme } from "./templates/InfographicTemplate";
export { sectionToBlocks } from "./renderers/template/sectionToBlocks";
export { toDesignDoc } from "./adapters/toDesignDoc";
export { makeImageSlot, RATIO } from "./image/slots";
export { resolveTemplateImages, resolveImageSlot, pickIcon } from "./image/resolver";
export { sampleImageFor } from "./image/assetLibrary";
export {
  renderMonthlyPlanTemplate,
  renderColorLabFromRaw,
  renderInfographicFromRaw,
  buildTemplateFromRaw,
  buildLayerTreeFromRaw,
} from "./pipeline";

// 타입은 단일 출처(types.ts)에서 일괄 노출
export type {
  // raw / view model
  MonthlyPlanRawData,
  MonthlyPlanViewModel,
  AnyPlanRawData,
  AnyPlanViewModel,
  // 타입드 섹션 + 레지스트리
  MonthlySection,
  AnySection,
  SectionKind,
  SectionDefinition,
  SectionInstance,
  HeaderSection,
  SelectionReasonSection,
  TeacherExpectationSection,
  CurriculumSection,
  WeeklyFlowSection,
  WeeklyImage,
  OutdoorActivitySection,
  SafetySection,
  CharacterSection,
  EventSection,
  FamilyConnectionSection,
  // 블록
  Block,
  BlockKind,
  // Section Tree (buildMonthlyTemplate)
  TemplateDocument,
  TemplateSectionNode,
  // Layer Tree (buildLayerTree)
  LayerTree,
  LayerNode,
  LayerNodeKind,
  TextLayerNode,
  ImageLayerNode,
  ShapeLayerNode,
  GroupLayerNode,
  // Layout (layoutTemplate)
  LayoutDocument,
  LayoutSection,
  Layer,
  TypedLayer,
  ThemeTokens,
  DataBinding,
  // 이미지 슬롯 + 오버레이
  ImageSlot,
  ImageAsset,
  ImageSource,
  ImageRole,
  ImageStyle,
  ImageSlotStatus,
  ImagePrompt,
  ImagePlaceholder,
  ImageCrop,
  AspectRatio,
  AspectRatioPreset,
  OverlayLayer,
  OverlayKind,
  OverlayAnchor,
  TextOverlay,
  IconOverlay,
  ShapeOverlay,
  // 식별자
  PlanType,
  OutputType,
  SectionId,
  SectionRole,
  LayerType,
  Rect,
} from "./types";
export type { DesignDoc } from "./adapters/toDesignDoc";
