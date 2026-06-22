// =============================================================================
// 의존성 없는 미니 테스트 하니스 (vitest/jest 미설치 환경용).
//   it("...", () => { expect(x).toBe(y); });  →  npx tsx 로 실행
// =============================================================================
let passed = 0;
let failed = 0;

export function expect(actual: unknown) {
  return {
    toBe(expected: unknown) {
      if (actual !== expected) throw new Error(`expected ${fmt(actual)} toBe ${fmt(expected)}`);
    },
    toEqual(expected: unknown) {
      if (JSON.stringify(actual) !== JSON.stringify(expected))
        throw new Error(`expected ${fmt(actual)} toEqual ${fmt(expected)}`);
    },
    toBeTruthy() {
      if (!actual) throw new Error(`expected ${fmt(actual)} toBeTruthy`);
    },
    toBeNull() {
      if (actual !== null) throw new Error(`expected ${fmt(actual)} toBeNull`);
    },
    toHaveLength(n: number) {
      const len = (actual as { length?: number })?.length;
      if (len !== n) throw new Error(`expected length ${len} toBe ${n}`);
    },
    toThrow() {
      if (typeof actual !== "function") throw new Error("toThrow expects a function");
      let threw = false;
      try {
        (actual as () => unknown)();
      } catch {
        threw = true;
      }
      if (!threw) throw new Error("expected function toThrow");
    },
  };
}

export function it(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    console.log(`  ✗ ${name}\n      ${e instanceof Error ? e.message : String(e)}`);
  }
}

export function summary() {
  console.log(`\n${failed === 0 ? "✅" : "❌"} ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

function fmt(v: unknown): string {
  const s = typeof v === "function" ? "[fn]" : JSON.stringify(v);
  return s && s.length > 60 ? s.slice(0, 60) + "…" : String(s);
}
