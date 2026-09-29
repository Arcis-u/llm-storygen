"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

export default function NexusDialog({ open, onClose, title, eyebrow, children, className = "" }: {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow: string;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (open && element && !element.open) {
      element.showModal();
      element.scrollTop = 0;
    }
    if (!open && element?.open) element.close();
  }, [open]);

  return <dialog ref={ref} className={`nexus-dialog ${className}`} aria-label={title}
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => {
      if (event.target !== event.currentTarget) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
    }}>
    <header className="nexus-dialog-header"><div><span className="evo-eyebrow">{eyebrow}</span><h2>{title}</h2></div><button className="dialog-close" aria-label={`Đóng ${title.toLocaleLowerCase('vi')}`} onClick={onClose}><X size={19} /></button></header>
    {children}
  </dialog>;
}
