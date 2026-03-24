"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

interface Props {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export function ChartFullscreen({ title, onClose, children }: Props) {
  useEffect(() => {
    async function enter() {
      try {
        await document.documentElement.requestFullscreen?.();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (screen.orientation as any).lock?.("landscape");
      } catch {}
    }
    enter();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("keydown", onKey);
      try {
        if (document.fullscreenElement) document.exitFullscreen();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (screen.orientation as any).unlock?.();
      } catch {}
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[200] bg-background flex flex-col">
      <div className="flex items-center justify-between px-4 h-11 border-b border-border shrink-0">
        <p className="text-xs uppercase tracking-wider text-muted">{title}</p>
        <button
          onClick={onClose}
          className="text-muted hover:text-text-primary p-1.5 rounded-lg hover:bg-surface-2 transition-colors"
          title="Fechar"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <path d="M8 3v3a2 2 0 01-2 2H3" />
            <path d="M21 8h-3a2 2 0 01-2-2V3" />
            <path d="M3 16h3a2 2 0 012 2v3" />
            <path d="M16 21v-3a2 2 0 012-2h3" />
          </svg>
        </button>
      </div>
      <div className="flex-1 p-4 min-h-0">
        {children}
      </div>
    </div>,
    document.body,
  );
}
