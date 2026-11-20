import { useEffect, useState } from 'react';
import { BackIcon, EditIcon, EyeIcon, SearchIcon, TrashIcon, CloseIcon } from './Icons.jsx';
import { PriorityChip, Spinner, StatusCheck } from './ui.jsx';
import { api } from '../lib/api.js';
import { formatDay, formatTime } from '../lib/dates.js';

const isOverdue = (t) => t.status !== 'completed' && new Date(t.dueAt) < new Date();
const STATUS = [['all', 'All'], ['in_progress', 'Open'], ['completed', 'Done'], ['overdue', 'Overdue']];
const PRIOS = [['', 'Any priority'], ['high', 'High'], ['medium', 'Medium'], ['low', 'Low']];

export function SearchScreen({ onBack, refreshKey, actions, initialStatus = 'all' }) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState(initialStatus);
  const [priority, setPriority] = useState('');
  const filtered = status !== 'all' || priority !== '';
  const active = Boolean(q.trim()) || filtered;
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const term = q.trim();
    if (!term && !filtered) { setResults(null); setError(null); setLoading(false); return; }
    let live = true;
    setLoading(true);
    const t = setTimeout(() => {
      api.search(term, {
        status: status === 'overdue' || status === 'all' ? null : status,
        overdue: status === 'overdue',
        priority: priority || null,
      })
        .then((r) => { if (live) { setResults(r); setError(null); } })
        .catch((e) => live && setError(e.message))
        .finally(() => live && setLoading(false));
    }, term ? 250 : 0);
    return () => { live = false; clearTimeout(t); };
  }, [q, refreshKey, status, priority, filtered]);

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-2 bg-canvas/90 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3 md:px-8 md:pt-8 backdrop-blur">
        <button type="button" onClick={onBack} aria-label="Back to home" className="-ml-2 grid size-11 shrink-0 place-items-center rounded-full text-ink hover:bg-white">
          <BackIcon />
        </button>
        <div className="relative flex-1">
          
          <input
            autoFocus type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search"
            aria-label="Search tasks by keyword"
            className="w-full rounded-lg border-0 bg-white py-3 pr-11 pl-4 text-sm ring-1 ring-gray-200 outline-none ring-inset focus:ring-2 focus:ring-brand-600 [&::-webkit-search-cancel-button]:hidden"
          />
          {loading ? <Spinner className="absolute top-1/2 right-4 size-4 -translate-y-1/2 text-brand-600" />
            : q ? <button type="button" onClick={() => setQ('')} aria-label="Clear search" className="absolute top-1/2 right-3 grid size-7 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-gray-100"><CloseIcon className="size-4" /></button>
            : <SearchIcon className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-ink" />}
        </div>
      </header>

      <div className="space-y-2 px-4 pb-3 md:px-8" role="group" aria-label="Filters">
        <Chips label="Status" options={STATUS} value={status} onChange={setStatus} />
        <Chips label="Priority" options={PRIOS} value={priority} onChange={setPriority} />
      </div>

      <main className="flex-1 px-4 pb-[calc(var(--dock)+1rem)] md:px-8">
        {error && <p role="alert" className="rounded-lg bg-rose-50 p-4 text-sm font-medium text-rose-700">{error}</p>}
        {!active && <Empty title="Find a task" body="Search by any word in a task’s title or description, or pick a filter above." />}
        {results?.length === 0 && active && !loading && (
          <Empty title="No matches" body={q.trim() ? `Nothing found for “${q.trim()}” with these filters.` : 'No tasks match these filters.'} />
        )}
        {results?.length > 0 && (
          <>
            <p className="mb-2 px-1 text-sm font-semibold text-muted" aria-live="polite">{results.length} result{results.length === 1 ? '' : 's'}</p>
            <ul className="grid gap-2.5 lg:grid-cols-2">
              {results.map((t) => (
                <li key={t.id} className="rounded-lg bg-white p-3.5 ring-1 ring-gray-200/80" data-testid="search-result">
                  <div className="flex items-start gap-3">
                    <StatusCheck done={t.status === 'completed'} label={t.title} onToggle={() => actions.onToggle(t)} />
                    <div className="min-w-0 flex-1">
                      <p className={`font-medium break-words ${t.status === 'completed' ? 'text-muted line-through' : ''}`}><Highlight text={t.title} q={q} /></p>
                      {t.description && <p className="line-clamp-2 text-sm text-muted"><Highlight text={t.description} q={q} /></p>}
                      <p className={`mt-1 text-xs font-medium ${isOverdue(t) ? 'text-rose-600' : 'text-muted'}`}>{formatDay(t.dueAt)} · {formatTime(t.dueAt)}{isOverdue(t) && ' · Overdue'}</p>
                    </div>
                    <PriorityChip priority={t.priority} />
                  </div>
                  <div className="mt-3 flex gap-2 border-t border-gray-100 pt-3">
                    <Action onClick={() => actions.onOpen(t)} icon={<EyeIcon className="size-4" />} label="View" title={t.title} />
                    <Action onClick={() => actions.onEdit(t)} icon={<EditIcon className="size-4" />} label="Edit" title={t.title} />
                    <Action onClick={() => actions.onDelete(t)} icon={<TrashIcon className="size-4" />} label="Delete" title={t.title} danger />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
    </div>
  );
}

function Chips({ label, options, value, onChange }) {
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 md:-mx-8 md:flex-wrap md:px-8 [scrollbar-width:none]" role="radiogroup" aria-label={label}>
      {options.map(([v, text]) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} onClick={() => onChange(v)}
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium ring-1 ring-inset transition ${
            value === v ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-ink/70 ring-gray-200 hover:ring-brand-400'}`}>
          {text}
        </button>
      ))}
    </div>
  );
}

const Action = ({ onClick, icon, label, title, danger }) => (
  <button type="button" onClick={onClick} aria-label={`${label} “${title}”`}
    className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-semibold transition ${danger ? 'text-rose-600 hover:bg-rose-50' : 'text-brand-700 hover:bg-brand-50'}`}>
    {icon}{label}
  </button>
);

const Empty = ({ title, body }) => (
  <div className="mx-auto mt-16 max-w-xs text-center">
    <div className="mx-auto mb-4 grid size-16 place-items-center rounded-3xl bg-brand-50 text-brand-600"><SearchIcon className="size-7" /></div>
    <p className="font-semibold">{title}</p>
    <p className="mt-1 text-sm text-muted">{body}</p>
  </div>
);

function Highlight({ text, q }) {
  const terms = q.trim().split(/\s+/).filter(Boolean).map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!terms.length) return text;
  const parts = text.split(new RegExp(`(${terms.join('|')})`, 'gi'));
  return parts.map((p, i) => (i % 2 ? <mark key={i} className="rounded-sm bg-brand-100 text-inherit">{p}</mark> : p));
}
