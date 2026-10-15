"use client";

import { useEffect } from "react";

/**
 * Warns before leaving the page while an editor has unsaved changes.
 * Editors register themselves with markDirty(); this guards both full page
 * unloads and in-app link clicks (client-side navigations).
 */
const dirty = new Set<string>();

export function markDirty(id: string, isDirty: boolean) {
  if (isDirty) dirty.add(id);
  else dirty.delete(id);
}

export const UNSAVED_MESSAGE = "You have unsaved changes. Leave this page and discard them?";

export default function UnsavedGuard() {
  useEffect(() => {
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty.size === 0) return;
      e.preventDefault();
      e.returnValue = "";
    };
    const onClick = (e: MouseEvent) => {
      if (dirty.size === 0 || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download") || a.dataset.skipUnsaved !== undefined) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || (url.pathname === location.pathname && url.search === location.search)) return;
      if (!window.confirm(UNSAVED_MESSAGE)) {
        e.preventDefault();
        e.stopPropagation();
      } else {
        dirty.clear();
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, []);
  return null;
}
