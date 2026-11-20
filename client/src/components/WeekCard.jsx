import { useEffect, useState } from 'react';
import { ChevronIcon } from './Icons.jsx';
import { Spinner } from './ui.jsx';
import { TaskRow } from './TaskRow.jsx';
import { api } from '../lib/api.js';
import { weekRange, weekTitle } from '../lib/dates.js';

export function WeekCard({ week, current, expanded, onToggle, refreshKey, actions }) {
  const [tasks, setTasks] = useState(null);
  const [error, setError] = useState(null);
  const pct = week.total ? Math.round((week.completed / week.total) * 100) : 0;

  useEffect(() => {
    if (!expanded) return;
    let live = true;
    setError(null);
    api.weekTasks(week.weekStart).then((t) => live && setTasks(t)).catch((e) => live && setError(e.message));
    return () => { live = false; };
  }, [expanded, week.weekStart, refreshKey]);

  const panelId = `week-${week.weekStart}`;
  return (
    <article className={`overflow-hidden rounded-xl bg-white ring-inset ${current ? 'ring-2 ring-brand-600' : 'ring-1 ring-gray-200/80'}`} data-testid="week-card">
      <button type="button" onClick={onToggle} aria-expanded={expanded} aria-controls={panelId} className="w-full p-4 text-left">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold">{weekTitle(week.weekStart)}</h3>
            <p className="text-xs text-muted">{weekRange(week.weekStart)}</p>
          </div>
          <span className={`grid size-8 place-items-center rounded-lg bg-canvas text-muted transition-transform ${expanded ? 'rotate-180' : ''}`}>
            <ChevronIcon className="size-4" />
          </span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <Stat label="Completed" value={week.completed} tone="bg-brand-50 text-brand-700" testid="completed-count" />
          <Stat label="Open" value={week.open} tone="bg-rose-50 text-rose-600" testid="open-count" />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-2.5 flex-1 overflow-hidden bg-brand-100"
            role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Week progress">
            <div className="h-full bg-brand-600 transition-[width] duration-500" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs font-semibold tabular-nums text-brand-600">{pct}%</span>
        </div>
      </button>

      {expanded && (
        <div id={panelId} className="border-t border-gray-100 bg-canvas/60 p-2.5">
          {error && <p className="p-3 text-sm font-medium text-rose-600">{error}</p>}
          {!tasks && !error && <div className="grid place-items-center py-6 text-brand-600"><Spinner /></div>}
          {tasks?.length === 0 && <p className="p-4 text-center text-sm text-muted">Nothing planned yet.</p>}
          {tasks?.length > 0 && (
            <ul className="space-y-2">
              {tasks.map((t) => <TaskRow key={t.id} task={t} {...actions} />)}
            </ul>
          )}
          {tasks?.length > 0 && <p className="px-2 pt-2 text-center text-[11px] text-muted">Swipe a task left to delete</p>}
        </div>
      )}
    </article>
  );
}

function Stat({ label, value, tone, testid }) {
  return (
    <div className={`rounded-lg px-3 py-2 ${tone}`}>
      <p className="text-xl font-semibold tabular-nums" data-testid={testid}>{value}</p>
      <p className="text-[11px] font-medium opacity-80">{label}</p>
    </div>
  );
}
