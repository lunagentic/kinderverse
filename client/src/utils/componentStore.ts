// 편집한 카드 디자인을 "컴포넌트"로 저장/불러오기 (localStorage).
// 한 컴포넌트 = { 캔버스 비율 + 레이어 배열 + 썸네일 }. 재사용/재편집 가능.
import type { EditableLayer } from "../templates/buildEditableWeekCardTemplate";

export interface SavedComponent {
  id: string;
  name: string;
  canvas: { w: number; h: number };
  layers: EditableLayer[];
  thumb?: string; // 미리보기 dataURL (PNG)
  createdAt: number;
}

const KEY = "verse:card-components";

export function loadComponents(): SavedComponent[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function persist(list: SavedComponent[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch (e) {
    // 용량 초과 등 — 썸네일 없이 한 번 더 시도
    try {
      localStorage.setItem(KEY, JSON.stringify(list.map((c) => ({ ...c, thumb: undefined }))));
    } catch {
      console.warn("컴포넌트 저장 실패:", e);
    }
  }
}

// 새 컴포넌트 저장 (가장 앞에 추가). 레이어는 깊은 복사로 저장해 이후 편집과 분리.
export function saveComponent(input: Omit<SavedComponent, "id" | "createdAt">): SavedComponent[] {
  const entry: SavedComponent = {
    ...input,
    layers: JSON.parse(JSON.stringify(input.layers)),
    id: `cmp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: Date.now(),
  };
  const list = [entry, ...loadComponents()];
  persist(list);
  return list;
}

export function deleteComponent(id: string): SavedComponent[] {
  const list = loadComponents().filter((c) => c.id !== id);
  persist(list);
  return list;
}

export function renameComponent(id: string, name: string): SavedComponent[] {
  const list = loadComponents().map((c) => (c.id === id ? { ...c, name } : c));
  persist(list);
  return list;
}
