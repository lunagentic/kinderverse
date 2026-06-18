// LLM JSON의 결측/잡음을 흡수하는 순수 헬퍼

export const str = (v: unknown, fallback = ""): string => {
  if (v == null) return fallback;
  const s = String(v).trim();
  return s || fallback;
};

export const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

// 여러 후보를 문자열로 정리하고 빈 값 제거
export const compact = (xs: unknown[]): string[] => xs.map((x) => str(x)).filter(Boolean);

// 교육과정 5영역 고정 순서
export const CURRICULUM_AREAS = [
  "신체운동·건강",
  "의사소통",
  "사회관계",
  "예술경험",
  "자연탐구",
] as const;
