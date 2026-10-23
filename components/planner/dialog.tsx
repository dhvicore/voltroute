"use client";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";

/** Native dialog supplies modal focus trapping, Escape support and focus restoration. */
export function Dialog({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = previous;
    };
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-labelledby="vr-dialog-title"
      className={`vr-dialog ${wide ? "vr-dialog-wide" : ""}`}
    >
      <div className="relative">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[.08] bg-[#18231f] px-6 py-4">
          <h2
            id="vr-dialog-title"
            className="text-xs font-medium text-slate-400"
          >
            {title}
          </h2>
          <button
            aria-label="Close dialog"
            onClick={onClose}
            className="vr-icon-button !h-8 !w-8"
          >
            <X size={16} />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}
