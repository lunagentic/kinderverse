// 퓨샷(few-shot) 예시 로더
//
// 사용법: server/prompts/examples/<feature_id>/ 폴더에 JSON 파일을 넣기만 하면
// 해당 feature 생성 프롬프트에 예시로 자동 포함된다. (채팅/코드 수정 불필요)
//   예) server/prompts/examples/play_idea/03-water.json
//       server/prompts/examples/monthly_plan/summer.json
// 파일명 사전순으로 정렬되어 들어간다. JSON 한 파일 = 예시 1개.

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const EX_DIR = join(dirname(fileURLToPath(import.meta.url)), "examples");

export function loadExamples(featureId) {
  const dir = join(EX_DIR, featureId);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => {
      try {
        return JSON.parse(readFileSync(join(dir, f), "utf8"));
      } catch (e) {
        console.warn(`[kinderverse] 예시 파싱 실패: ${featureId}/${f} — ${e.message}`);
        return null;
      }
    })
    .filter(Boolean);
}

// 프롬프트에 넣을 예시 블록 텍스트. 폴더에 예시가 없으면 빈 문자열.
export function examplesBlock(featureId) {
  const ex = loadExamples(featureId);
  if (!ex.length) return "";
  const body = ex
    .map((e, i) => `예시 ${i + 1}:\n${JSON.stringify(e, null, 2)}`)
    .join("\n\n");
  return `[출력 예시 — 아래 출력 JSON 스키마(또는 그 항목)와 동일한 형식이다. 표현·상세도 수준만 참고하고, 동일하거나 유사한 항목을 반복 생성하지 마라.]\n\n${body}`;
}
