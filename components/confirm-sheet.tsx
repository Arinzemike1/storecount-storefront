"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/button";

export interface ConfirmSheetProps {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Renders the confirm CTA in the danger style. */
  destructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * A yes/no question asked in a sheet that rises from the bottom of the screen —
 * the phone-native shape for a confirmation, and within reach of a thumb.
 *
 * Portalled to <body> so it clears the stacking contexts of the pinned cart bar
 * (z-30) and the tab bar (z-40) instead of competing with them for z-index.
 */
export function ConfirmSheet({
  open,
  title,
  message,
  confirmLabel = "Delete",
  cancelLabel = "No",
  destructive = false,
  onConfirm,
  onClose,
}: ConfirmSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  // Read through a ref so the effect below depends on `open` alone. Callers
  // pass inline arrows, and depending on the callback itself would re-run the
  // whole setup — stealing focus back — on every parent render.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    // First button in the panel is the cancel CTA: opening on the safe choice
    // means a stray Enter dismisses rather than destroys.
    panelRef.current?.querySelector("button")?.focus();

    const restoreOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;

      // Hold focus inside the sheet for as long as it owns the screen.
      const focusable = panelRef.current?.querySelectorAll("button");
      if (!focusable?.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = restoreOverflow;
      previouslyFocused?.focus();
    };
  }, [open]);

  // Nothing is portalled until a tap opens the sheet, so this renders to null
  // on the server and through hydration — document is only touched after.
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Dismiss"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 bg-ink/40 animate-fade-in"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative mx-auto w-full max-w-md bg-surface rounded-t-card shadow-float animate-sheet-up pb-safe"
      >
        <div className="px-5 pt-3 pb-5">
          <div
            aria-hidden
            className="mx-auto mb-4 h-1 w-9 rounded-full bg-border-strong"
          />

          <h2 id={titleId} className="text-[19px] font-bold text-ink">
            {title}
          </h2>
          {message && <p className="text-[15px] text-ink-2 mt-1">{message}</p>}

          <div className="mt-5 flex gap-3">
            <Button full variant="secondary" onClick={onClose}>
              {cancelLabel}
            </Button>
            <Button
              full
              variant={destructive ? "danger" : "primary"}
              onClick={onConfirm}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
