import { useEffect, useRef } from 'react';
import { CloseIcon } from './Icons.jsx';

export const PRIORITY = {
  high: { label: 'High', chip: 'bg-rose-50 text-rose-600 ring-rose-200', dot: 'bg-rose-500' },
  medium: { label: 'Medium', chip: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-400' },
  low: { label: 'Low', chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' },
};

export function PriorityChip({ priority }) {
  if (!priority) return null;
  const p = PRIORITY[priority];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${p.chip}`}>
      <span className={`size-1.5 rounded-full ${p.dot}`} />{p.label}
    </span>
  );
}

export function StatusCheck({ done, onToggle, label, busy }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      disabled={busy}
      aria-pressed={done}
      aria-label={done ? `Mark “${label}” as in progress` : `Mark “${label}” as completed`}
      className="-m-2.5 grid shrink-0 place-items-center p-2.5 disabled:opacity-50"
    >
      <span className={`grid size-5 place-items-center rounded-[5px] border-2 transition-colors ${
        done ? 'border-brand-600 bg-brand-600 text-white' : 'border-brand-600 text-transparent hover:bg-brand-50'}`}>
        <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12.5 10 17l9-10" /></svg>
      </span>
    </button>
  );
}

/** Bottom sheet on phones, centered dialog on wider screens. */
export function Sheet({ title, onClose, children, footer }) {
  const panel = useRef(null);
  useEffect(() => {
    const prev = document.activeElement;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const first = panel.current?.querySelector('[data-autofocus]') || panel.current;
    first?.focus();
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; prev?.focus?.(); };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center sm:p-6">
      <div className="animate-fade absolute inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={onClose} />
      <section
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="animate-sheet relative flex max-h-[92dvh] w-full max-w-md flex-col rounded-t-[22px] bg-white shadow-2xl outline-none sm:rounded-[22px]"
      >
        <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-gray-200 sm:hidden" />
        <header className="flex items-center justify-between px-6 pt-4 pb-2">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="-mr-2 grid size-9 place-items-center rounded-full text-muted hover:bg-gray-100">
            <CloseIcon />
          </button>
        </header>
        <div className="overflow-y-auto px-6 pb-4">{children}</div>
        {footer && <footer className="border-t border-gray-100 px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</footer>}
      </section>
    </div>
  );
}

export function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, toast.action ? 5000 : 3000);
    return () => clearTimeout(t);
  }, [toast, onClose]);
  if (!toast) return null;
  return (
    <div role="status" className="animate-toast fixed bottom-24 left-1/2 z-50 flex w-[min(92vw,26rem)] -translate-x-1/2 items-center justify-between gap-3 rounded-xl bg-ink px-4 py-3 text-sm text-white shadow-xl">
      <span className={toast.error ? 'text-rose-200' : ''}>{toast.message}</span>
      {toast.action && (
        <button type="button" onClick={() => { toast.action.run(); onClose(); }} className="shrink-0 font-bold text-brand-200 hover:text-white">
          {toast.action.label}
        </button>
      )}
    </div>
  );
}

export const Spinner = ({ className = 'size-5' }) => (
  <svg viewBox="0 0 24 24" className={`animate-spin ${className}`} aria-hidden>
    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="3" opacity=".2" />
    <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);
