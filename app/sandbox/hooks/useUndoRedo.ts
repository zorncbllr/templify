import { useRef, useState, useCallback } from "react";

const MAX_PAST = 25;
const MAX_FUTURE = 25;

export function useUndoRedo<T>(init: T) {
  const past = useRef<T[]>([]);
  const present = useRef<T>(init);
  const future = useRef<T[]>([]);
  const [, rerender] = useState(0);
  const bump = () => rerender((n) => n + 1);

  const push = useCallback((val: T) => {
    past.current.push(present.current);
    if (past.current.length > MAX_PAST) past.current.shift();
    present.current = val;
    future.current = [];
    bump();
  }, []);

  const setState = useCallback(
    (next: T | ((p: T) => T), commit = true) => {
      const val =
        typeof next === "function"
          ? (next as (p: T) => T)(present.current)
          : next;
      if (commit) push(val);
      else {
        present.current = val;
        bump();
      }
    },
    [push],
  );

  const undoFn = useCallback(() => {
    if (!past.current.length) return;
    future.current.unshift(present.current);
    if (future.current.length > MAX_FUTURE) future.current.pop();
    present.current = past.current.pop()!;
    bump();
  }, []);

  const redoFn = useCallback(() => {
    if (!future.current.length) return;
    past.current.push(present.current);
    if (past.current.length > MAX_PAST) past.current.shift();
    present.current = future.current.shift()!;
    bump();
  }, []);

  const undoRef = useRef(undoFn);
  undoRef.current = undoFn;
  const redoRef = useRef(redoFn);
  redoRef.current = redoFn;

  return {
    state: present.current,
    setState,
    undo: undoFn,
    redo: redoFn,
    undoRef,
    redoRef,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
  };
}
