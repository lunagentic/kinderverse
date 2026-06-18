// 전통적 표 형식 월간계획안 문서 렌더러 (A4 세로, 흑백, 인쇄용).
// 입력: MonthlyPlanViewModel. HTML <table> 기반 → 추후 PDF/DOCX 확장 대비.
// editable 모드: 각 셀 contentEditable 인라인 편집(autoFocus 없음 → 화면 점프 없음),
//   편집값은 onEditField(field, value)로 상위에 위임(보드 카드가 data.edits 에 저장).
import "./MonthlyDocument.css";
import type { MonthlyPlanViewModel, MonthlyPlanRawData } from "../types";
import { normalizeMonthlyPlan } from "../normalize/monthlyPlan";

const WEEK_COLS = [1, 2, 3, 4, 5];

type Edits = Record<string, string>;

interface EditCtx {
  editable?: boolean;
  edits?: Edits;
  onEditField?: (field: string, value: string) => void;
}

// 여러 줄을 셀 안에 줄바꿈으로 (읽기 전용 표시)
function MultiLine({ lines }: { lines: string[] }) {
  const items = lines.filter((l) => l && l.trim());
  if (!items.length) return null;
  return (
    <>
      {items.map((l, i) => (
        <span key={i} className="mdoc-line">
          {l}
        </span>
      ))}
    </>
  );
}

// 편집 가능한 텍스트 셀 내용. value 는 기본값(줄바꿈 포함 가능), 편집 시 override 우선.
function EditText({
  field,
  value,
  multiline,
  ctx,
}: {
  field: string;
  value: string;
  multiline?: boolean;
  ctx: EditCtx;
}) {
  const text = ctx.edits && ctx.edits[field] != null ? ctx.edits[field] : value;
  if (!ctx.editable) {
    if (multiline) return <MultiLine lines={text.split("\n")} />;
    return <>{text}</>;
  }
  return (
    <span
      className="mdoc-edit"
      contentEditable
      suppressContentEditableWarning
      data-field={field}
      style={multiline ? { whiteSpace: "pre-wrap", display: "block" } : undefined}
      onPointerDown={(e) => e.stopPropagation()}
      onBlur={(e) => ctx.onEditField?.(field, e.currentTarget.innerText)}
    >
      {text}
    </span>
  );
}

export interface MonthlyDocumentRendererProps extends EditCtx {
  vm: MonthlyPlanViewModel;
  className?: string;
}

export function MonthlyDocumentRenderer({
  vm,
  className,
  editable,
  edits,
  onEditField,
}: MonthlyDocumentRendererProps) {
  const ctx: EditCtx = { editable, edits, onEditField };
  const b = vm.basicInfo;
  const flowByWeek = new Map(vm.weeklyFlow.map((w) => [w.week, w]));
  const outdoorByWeek = new Map(vm.outdoorPlay.map((o) => [o.week, o]));

  const curriculum = vm.curriculumLinks
    .filter((c) => c.content)
    .map((c) => `${c.area} · ${c.content}`)
    .join("\n");
  const expectations = vm.teacherExpectations.map((e) => e.goal).join("\n");
  const safety = vm.safety.map((kv) => `${kv.label}: ${kv.value}`).join("\n");
  const home = vm.homeConnection.map((kv) => `${kv.label}: ${kv.value}`).join("\n");
  const events = vm.events.map((e) => `${e.name}${e.date ? ` (${e.date})` : ""}`).join("\n");
  const character = [vm.character.coreValue, vm.character.practiceContext]
    .filter(Boolean)
    .join(" — ");

  return (
    <div className={"mdoc-page" + (className ? " " + className : "")}>
      {/* 1. 상단 제목 */}
      <div className="mdoc-header">
        <div className="mdoc-title">
          <EditText field="doc-title" value="놀이중심 월간계획안" ctx={ctx} />
        </div>
        <div className="mdoc-meta">
          <span>
            <EditText field="lbl-class" value="반이름" ctx={ctx} /> <EditText field="className" value={b.className} ctx={ctx} />
          </span>
          <span>
            <EditText field="lbl-age" value="연령" ctx={ctx} /> <EditText field="ageBand" value={b.ageBand} ctx={ctx} />
          </span>
        </div>
      </div>

      {/* 2. 기본정보 */}
      <table className="mdoc-table mdoc-section">
        <tbody>
          <tr>
            <th className="mdoc-label"><EditText field="lbl-theme" value="예상 놀이주제" ctx={ctx} /></th>
            <td><EditText field="theme" value={b.theme} ctx={ctx} /></td>
          </tr>
          <tr>
            <th className="mdoc-label"><EditText field="lbl-period" value="예상놀이 기간" ctx={ctx} /></th>
            <td><EditText field="period" value={b.periodLabel} ctx={ctx} /></td>
          </tr>
          <tr>
            <th className="mdoc-label"><EditText field="lbl-rationale" value="놀이 선정 이유" ctx={ctx} /></th>
            <td><EditText field="rationale" value={vm.rationale.summary} multiline ctx={ctx} /></td>
          </tr>
          <tr>
            <th className="mdoc-label"><EditText field="lbl-expectations" value="교사의 기대(활동 목표)" ctx={ctx} /></th>
            <td><EditText field="expectations" value={expectations} multiline ctx={ctx} /></td>
          </tr>
          <tr>
            <th className="mdoc-label"><EditText field="lbl-curriculum" value="교육과정 연계" ctx={ctx} /></th>
            <td><EditText field="curriculum" value={curriculum} multiline ctx={ctx} /></td>
          </tr>
        </tbody>
      </table>

      {/* 3. 예상 놀이 흐름 */}
      <table className="mdoc-table mdoc-section">
        <thead>
          <tr>
            <th className="mdoc-week-head" colSpan={WEEK_COLS.length}>
              <EditText field="sect-flow" value="예상 놀이 흐름" ctx={ctx} />
            </th>
          </tr>
          <tr>
            {WEEK_COLS.map((w) => {
              const sub = flowByWeek.get(w)?.subTheme;
              return (
                <th key={w} className="mdoc-week-head">
                  <EditText field={`flowhead-${w}`} value={`${w}주차`} ctx={ctx} />
                  {sub ? (
                    <div className="mdoc-subtheme">
                      <EditText field={`flowsub-${w}`} value={sub} ctx={ctx} />
                    </div>
                  ) : null}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          <tr>
            {WEEK_COLS.map((w) => (
              <td key={w} className="mdoc-week-cell">
                <EditText
                  field={`week-${w}`}
                  value={(flowByWeek.get(w)?.plays || []).map((p) => p.title).join("\n")}
                  multiline
                  ctx={ctx}
                />
              </td>
            ))}
          </tr>
        </tbody>
      </table>

      {/* 4. 바깥놀이 및 신체활동 */}
      <table className="mdoc-table mdoc-section">
        <thead>
          <tr>
            <th className="mdoc-week-head" colSpan={WEEK_COLS.length}>
              <EditText field="sect-outdoor" value="바깥놀이 및 신체활동" ctx={ctx} />
            </th>
          </tr>
          <tr>
            {WEEK_COLS.map((w) => (
              <th key={w} className="mdoc-week-head">
                <EditText field={`outhead-${w}`} value={`${w}주차`} ctx={ctx} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {WEEK_COLS.map((w) => (
              <td key={w} className="mdoc-week-cell">
                <EditText
                  field={`outdoor-${w}`}
                  value={outdoorByWeek.get(w)?.activityName || ""}
                  multiline
                  ctx={ctx}
                />
              </td>
            ))}
          </tr>
        </tbody>
      </table>

      {/* 5. 하단 월간 연계 */}
      <table className="mdoc-table mdoc-section">
        <tbody>
          <tr>
            <th className="mdoc-label"><EditText field="lbl-safety" value="안전 교육" ctx={ctx} /></th>
            <td><EditText field="safety" value={safety} multiline ctx={ctx} /></td>
          </tr>
          <tr>
            <th className="mdoc-label"><EditText field="lbl-character" value="인성 교육" ctx={ctx} /></th>
            <td><EditText field="character" value={character} multiline ctx={ctx} /></td>
          </tr>
          <tr>
            <th className="mdoc-label"><EditText field="lbl-events" value="행사" ctx={ctx} /></th>
            <td><EditText field="events" value={events || "-"} multiline ctx={ctx} /></td>
          </tr>
          <tr>
            <th className="mdoc-label"><EditText field="lbl-home" value="가정연계활동" ctx={ctx} /></th>
            <td><EditText field="home" value={home} multiline ctx={ctx} /></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export interface MonthlyDocumentFromRawProps extends EditCtx {
  raw: MonthlyPlanRawData;
  className?: string;
}

// 보드/인스펙터용: raw payload → 내부 정규화 (+ 편집 컨텍스트 전달)
export function MonthlyDocumentFromRaw({
  raw,
  className,
  editable,
  edits,
  onEditField,
}: MonthlyDocumentFromRawProps) {
  return (
    <MonthlyDocumentRenderer
      vm={normalizeMonthlyPlan(raw)}
      className={className}
      editable={editable}
      edits={edits}
      onEditField={onEditField}
    />
  );
}

export default MonthlyDocumentRenderer;
