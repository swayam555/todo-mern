const Zigzag = ({ className }) => (
  <svg viewBox="0 0 64 40" className={className} fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
    {[6, 18, 30].map((y) => <path key={y} d={`M2 ${y + 6} 12 ${y} 22 ${y + 6} 32 ${y} 42 ${y + 6} 52 ${y} 62 ${y + 6}`} />)}
  </svg>
);

/** First-run welcome screen (Figma "Onboarding"). */
export function Onboarding({ onStart }) {
  return (
    <div className="flex min-h-dvh flex-col bg-white" data-testid="onboarding">
      <div className="relative flex-[1.6] overflow-hidden bg-brand-600 text-white/40">
        <span className="absolute -top-10 -right-10 size-28 rounded-full border-[14px] border-white/25" />
        <Zigzag className="absolute top-[22%] left-4 w-20" />
        <Zigzag className="absolute right-4 bottom-8 w-20" />
      </div>
      <div className="flex flex-1 flex-col px-6 pt-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <h1 className="text-2xl font-bold">Manage What To Do</h1>
        <p className="mt-3 max-w-[18rem] text-sm leading-relaxed text-muted">The best way to manage what you have to do, don’t forget your plans</p>
        <button type="button" onClick={onStart}
          className="mt-auto w-full rounded-md bg-brand-600 py-3.5 text-sm font-medium text-white shadow-lg shadow-brand-600/25 transition hover:bg-brand-700 active:scale-[.99]">
          Get Started
        </button>
      </div>
    </div>
  );
}
