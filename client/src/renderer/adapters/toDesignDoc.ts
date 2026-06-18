// LayoutDocument → 기존 DesignDoc({frame, elements[]}). 현 보드 에디터(DesignFrame) 재사용.
import type { LayoutDocument } from "../types";

export interface DesignDocElement {
  id: string;
  type: "text" | "shape" | "image";
  x: number;
  y: number;
  w: number;
  h: number;
  text?: string;
  src?: string;
  prompt?: string;
  fit?: string;
  locked?: boolean;
  hidden?: boolean; // 편집 중 숨김 (정적/최종 출력 제외)
  textRole?: "title" | "content";
  style?: {
    bg?: string;
    radius?: number;
    fontSize?: number;
    weight?: number;
    color?: string;
    align?: string;
    valign?: string;
    fontFamily?: string;
    opacity?: number;
    stroke?: string;
    strokeWidth?: number;
  };
  // 에디터는 무시하지만 역동기화를 위해 보존
  binding?: { sectionId: string; path: string };
}

export interface DesignDoc {
  output_type: "DesignDoc";
  title: string;
  frame: { w: number; h: number; bg: string };
  elements: DesignDocElement[];
}

export function toDesignDoc(doc: LayoutDocument, title = "월간 놀이계획"): DesignDoc {
  const elements: DesignDocElement[] = [];
  for (const sec of doc.sections) {
    for (const l of sec.layers) {
      elements.push({
        id: l.id,
        type: l.type,
        x: l.frame.x,
        y: l.frame.y,
        w: l.frame.w,
        h: l.frame.h,
        text: l.text,
        src: l.src,
        prompt: l.prompt,
        fit: l.fit,
        locked: l.locked,
        textRole: l.textRole,
        style: l.style,
        binding: l.binding,
      });
    }
  }
  return {
    output_type: "DesignDoc",
    title,
    frame: { w: doc.canvas.width, h: doc.canvas.height, bg: doc.canvas.background },
    elements,
  };
}
