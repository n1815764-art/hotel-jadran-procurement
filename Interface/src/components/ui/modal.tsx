"use client";

import { useEffect, useCallback } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}

export function Modal({ open, onClose, title, children, wide }: ModalProps) {
  const handleEsc = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [open, handleEsc]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[5vh]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className={cn(
          "relative bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl max-h-[90vh] overflow-y-auto",
          wide ? "w-full max-w-5xl" : "w-full max-w-2xl"
        )}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-zinc-900 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
          <button onClick={onClose} className="p-1 hover:bg-zinc-800 rounded transition-colors">
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
