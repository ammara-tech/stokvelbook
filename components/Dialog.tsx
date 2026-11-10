"use client";

import { useEffect, useRef } from "react";
import Icon from "@/components/Icon";

/*
  A pop-up window using the browser's own <dialog>: Escape closes it, keyboard focus stays
  inside it, and focus goes back to the button that opened it.
*/
export default function Dialog({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-label={title}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl border border-line bg-card p-0 text-ink shadow-2xl backdrop:bg-black/50"
    >
      {open && (
        <div className="p-6">
          <div className="mb-5 flex items-start gap-3">
            <h2 className="flex-1 text-xl font-extrabold">{title}</h2>
            <button type="button" onClick={onClose} className="tool -mt-1 -mr-2" aria-label="Close">
              <Icon name="close" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
