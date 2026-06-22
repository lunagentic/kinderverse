// =============================================================================
// useEditor — EditorDoc 상태 + Undo/Redo + 편집 연산.
// =============================================================================
import { useCallback, useMemo, useState } from "react";
import type { EditorDoc, EditorNode } from "./types";

export function useEditor(initial: EditorDoc) {
  const [doc, setDocState] = useState<EditorDoc>(initial);
  const [past, setPast] = useState<EditorDoc[]>([]);
  const [future, setFuture] = useState<EditorDoc[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const commit = useCallback((next: EditorDoc) => {
    setPast((p) => [...p, doc]);
    setFuture([]);
    setDocState(next);
  }, [doc]);

  const patchNode = useCallback((id: string, patch: Partial<EditorNode>) => {
    commit({ ...doc, nodes: doc.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)) });
  }, [doc, commit]);

  const removeNode = useCallback((id: string) => {
    commit({ ...doc, nodes: doc.nodes.filter((n) => n.id !== id) });
    setSelectedId(null);
  }, [doc, commit]);

  const duplicateNode = useCallback((id: string) => {
    const n = doc.nodes.find((x) => x.id === id);
    if (!n) return;
    const maxZ = Math.max(0, ...doc.nodes.map((x) => x.z));
    const copy: EditorNode = { ...n, id: `${n.id}_copy_${doc.nodes.length}`, x: n.x + 24, y: n.y + 24, z: maxZ + 1 };
    commit({ ...doc, nodes: [...doc.nodes, copy] });
    setSelectedId(copy.id);
  }, [doc, commit]);

  const reorder = useCallback((id: string, dir: "front" | "back") => {
    const sorted = [...doc.nodes].sort((a, b) => a.z - b.z);
    const idx = sorted.findIndex((n) => n.id === id);
    if (idx < 0) return;
    const swapWith = dir === "front" ? idx + 1 : idx - 1;
    if (swapWith < 0 || swapWith >= sorted.length) return;
    const a = sorted[idx], b = sorted[swapWith];
    commit({ ...doc, nodes: doc.nodes.map((n) => (n.id === a.id ? { ...n, z: b.z } : n.id === b.id ? { ...n, z: a.z } : n)) });
  }, [doc, commit]);

  const swapAsset = useCallback((id: string, assetId: string, family: string, imageUrl: string) => {
    patchNode(id, { assetId, assetFamily: family, imageUrl });
  }, [patchNode]);

  const addAsset = useCallback((assetId: string, family: string, imageUrl: string, role: string) => {
    const maxZ = Math.max(0, ...doc.nodes.map((x) => x.z));
    const node: EditorNode = {
      id: `${assetId}_${doc.nodes.length}`, kind: "image", layerType: role === "decoration" ? "decoration" : "sticker",
      x: 120, y: 120, w: 200, h: 200, z: maxZ + 1, assetId, assetFamily: family, assetRole: role, imageUrl,
    };
    commit({ ...doc, nodes: [...doc.nodes, node] });
    setSelectedId(node.id);
  }, [doc, commit]);

  const undo = useCallback(() => {
    setPast((p) => {
      if (!p.length) return p;
      const prev = p[p.length - 1];
      setFuture((f) => [doc, ...f]);
      setDocState(prev);
      return p.slice(0, -1);
    });
  }, [doc]);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (!f.length) return f;
      const next = f[0];
      setPast((p) => [...p, doc]);
      setDocState(next);
      return f.slice(1);
    });
  }, [doc]);

  const selected = useMemo(() => doc.nodes.find((n) => n.id === selectedId) ?? null, [doc, selectedId]);

  return {
    doc, selected, selectedId, setSelectedId,
    patchNode, removeNode, duplicateNode, reorder, swapAsset, addAsset,
    undo, redo, canUndo: past.length > 0, canRedo: future.length > 0,
  };
}
