import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from './lib/api.js';
import { addDays, dayKey, formatDay, parseDayKey, weekKey } from './lib/dates.js';
import { AlertIcon, CheckSquareIcon, PlusIcon, SearchIcon, XSquareIcon } from './components/Icons.jsx';
import { TaskRow } from './components/TaskRow.jsx';
import { Onboarding } from './components/Onboarding.jsx';
import { Spinner, Toast } from './components/ui.jsx';
import { WeekCard } from './components/WeekCard.jsx';
import { TaskForm } from './components/TaskForm.jsx';
import { TaskDetail } from './components/TaskDetail.jsx';
import { SearchScreen } from './components/SearchScreen.jsx';

const ONBOARDED = 'todo.onboarded';
const seen = () => { try { return localStorage.getItem(ONBOARDED) === '1'; } catch { return true; } };
const wd = new Intl.DateTimeFormat(undefined, { weekday: 'short' });

export default function App() {
  const [screen, setScreen] = useState('home');
  const [searchStatus, setSearchStatus] = useState('all');
  const [overdue, setOverdue] = useState([]);
  const [weeks, setWeeks] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [expanded, setExpanded] = useState(() => new Set());
  const [sheet, setSheet] = useState(null); // { kind: 'create'|'edit'|'view', task?, week? }
  const [toast, setToast] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [onboarded, setOnboarded] = useState(seen);
  const [day, setDay] = useState(() => dayKey(new Date()));
  const [weekTasks, setWeekTasks] = useState(null);
  const currentWeek = weekKey();
  const today = dayKey(new Date());

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);
  const closeToast = useCallback(() => setToast(null), []);
  const closeSheet = useCallback(() => setSheet(null), []);
  const fail = (e) => setToast({ message: e.message, error: true });

  useEffect(() => {
    let live = true;
    api.weeks().then((w) => { if (live) { setWeeks(w); setLoadError(null); } }).catch((e) => live && setLoadError(e.message));
    api.weekTasks(currentWeek).then((t) => live && setWeekTasks(t)).catch(() => live && setWeekTasks([]));
    api.search('', { overdue: true }).then((t) => live && setOverdue(t)).catch(() => live && setOverdue([]));
    return () => { live = false; };
  }, [refreshKey, currentWeek]);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i)), [currentWeek]);
  const dayTasks = useMemo(() => (weekTasks || []).filter((t) => dayKey(new Date(t.dueAt)) === day), [weekTasks, day]);
  const busyDays = useMemo(() => new Set((weekTasks || []).map((t) => dayKey(new Date(t.dueAt)))), [weekTasks]);

  // Always show the current week, even when it has no tasks yet.
  const cards = useMemo(() => {
    if (!weeks) return [];
    const list = weeks.some((w) => w.weekStart === currentWeek) ? weeks
      : [...weeks, { weekStart: currentWeek, total: 0, open: 0, completed: 0 }].sort((a, b) => a.weekStart.localeCompare(b.weekStart));
    return list;
  }, [weeks, currentWeek]);

  const thisWeek = cards.find((w) => w.weekStart === currentWeek) || { total: 0, open: 0, completed: 0 };
  const pct = thisWeek.total ? Math.round((thisWeek.completed / thisWeek.total) * 100) : 0;

  const openSearch = useCallback((status = 'all') => { setSearchStatus(status); setScreen('search'); }, []);

  // Keyboard shortcuts on the home screen: "/" search, "n" new task.
  useEffect(() => {
    if (!onboarded || screen !== 'home' || sheet) return;
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.target.closest?.('input, textarea, select, [contenteditable]')) return;
      if (e.key === '/') { e.preventDefault(); openSearch(); }
      else if (e.key === 'n' || e.key === 'N') { e.preventDefault(); setSheet({ kind: 'create', day }); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onboarded, screen, sheet, day, openSearch]);

  const toggleWeek = (key) => setExpanded((s) => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; });

  const short = (title) => (title.length > 28 ? `${title.slice(0, 28)}…` : title);

  const actions = {
    onOpen: (task) => setSheet({ kind: 'view', task }),
    onEdit: (task) => setSheet({ kind: 'edit', task }),
    onToggle: async (task) => {
      try {
        await api.update(task.id, { status: task.status === 'completed' ? 'in_progress' : 'completed' });
        refresh();
      } catch (e) { fail(e); }
    },
    onDelete: async (task) => {
      try {
        await api.remove(task.id);
        setSheet(null);
        refresh();
        const { title, description, dueAt, priority, status } = task;
        setToast({
          message: `Deleted “${short(title)}”`,
          action: { label: 'Undo', run: () => api.create({ title, description, dueAt, priority, status }).then(refresh).catch(fail) },
        });
      } catch (e) { fail(e); }
    },
  };

  const save = async (data) => {
    if (sheet.kind === 'edit') {
      await api.update(sheet.task.id, data);
      setToast({ message: 'Task updated' });
    } else {
      const created = await api.create(data);
      const wk = weekKey(new Date(created.dueAt));
      if (wk === currentWeek) setDay(dayKey(new Date(created.dueAt)));
      else setExpanded((s) => new Set(s).add(wk));
      setToast({ message: 'Task added' });
    }
    setSheet(null);
    refresh();
  };

  const postpone = async (task) => {
    try {
      const was = new Date(task.dueAt);
      const next = new Date();
      next.setDate(next.getDate() + 1);
      next.setHours(was.getHours(), was.getMinutes(), 0, 0);
      const updated = await api.update(task.id, { dueAt: next.toISOString() });
      setSheet((s) => (s?.task?.id === task.id ? { ...s, task: updated } : s));
      refresh();
      setToast({
        message: `Moved to ${formatDay(next)}`,
        action: { label: 'Undo', run: () => api.update(task.id, { dueAt: task.dueAt }).then(() => { setSheet(null); refresh(); }).catch(fail) },
      });
    } catch (e) { fail(e); }
  };

  const duplicate = async (task) => {
    try {
      const { title, description, dueAt, priority } = task;
      const copy = await api.create({ title, description, dueAt, priority });
      setSheet({ kind: 'edit', task: copy });
      refresh();
      setToast({ message: `Duplicated “${short(title)}”` });
    } catch (e) { fail(e); }
  };

  const setStatus = async (task, status) => {
    try {
      const updated = await api.update(task.id, { status });
      setSheet((s) => (s?.task?.id === task.id ? { ...s, task: updated } : s));
      refresh();
    } catch (e) { fail(e); }
  };

  if (!onboarded) {
    return (
      <div className="mx-auto min-h-full max-w-md md:grid md:min-h-dvh md:max-w-none md:place-items-center md:p-8">
        <Onboarding onStart={() => { try { localStorage.setItem(ONBOARDED, '1'); } catch { /* private mode */ } setOnboarded(true); }} />
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-full max-w-md bg-canvas md:max-w-3xl lg:max-w-6xl">
      {screen === 'search' ? (
        <SearchScreen key={searchStatus} initialStatus={searchStatus} onBack={() => setScreen('home')} refreshKey={refreshKey} actions={actions} />
      ) : (
        <>
          <header className="px-4 pt-[max(1.25rem,env(safe-area-inset-top))] min-[360px]:px-5 md:px-8 md:pt-8">
            <button type="button" onClick={() => openSearch()} aria-label="Search tasks"
              className="flex w-full items-center justify-between rounded-lg bg-white px-4 py-3 text-left text-sm text-muted ring-1 ring-gray-200 ring-inset transition hover:ring-brand-400">
              Search for a task<SearchIcon className="size-5 text-ink" />
            </button>
          </header>

          <nav aria-label="Days this week" className="mt-4 grid grid-cols-7 gap-0.5 px-3 min-[360px]:gap-1 min-[360px]:px-4 md:gap-2 md:px-8">
            {days.map((d) => {
              const on = d === day;
              const date = parseDayKey(d);
              return (
                <button key={d} type="button" onClick={() => setDay(d)} aria-pressed={on} aria-label={formatDay(date)}
                  className={`flex min-w-0 flex-col items-center gap-0.5 rounded-lg py-2 text-[11px] min-[360px]:text-xs md:py-3 md:text-sm transition ${on ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30' : 'text-muted hover:bg-white'}`}>
                  <span className={on ? 'text-white/80' : d === today ? 'font-semibold text-brand-600' : ''}>{wd.format(date)}</span>
                  <span className={`text-sm font-medium ${on ? '' : 'text-ink/70'}`}>{String(date.getDate()).padStart(2, '0')}</span>
                  <span className={`size-1 rounded-full ${busyDays.has(d) ? (on ? 'bg-white' : 'bg-brand-400') : 'bg-transparent'}`} />
                </button>
              );
            })}
          </nav>

          <main className="px-4 pt-5 pb-[calc(var(--dock)+6rem)] min-[360px]:px-5 md:px-8 md:pt-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-10">
            <div className="min-w-0">
            {loadError && (
              <div role="alert" className="mb-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
                <p className="font-semibold">{loadError}</p>
                <button type="button" onClick={refresh} className="mt-2 font-bold underline">Try again</button>
              </div>
            )}

            {overdue.length > 0 && (
              <button type="button" onClick={() => openSearch('overdue')} data-testid="overdue-banner"
                className="mb-4 flex w-full items-center gap-3 rounded-lg bg-rose-50 px-4 py-3 text-left text-sm text-rose-700 ring-1 ring-rose-100 ring-inset hover:bg-rose-100">
                <AlertIcon className="size-5 shrink-0" />
                <span className="flex-1"><b className="font-semibold">{overdue.length} overdue task{overdue.length === 1 ? '' : 's'}</b> · tap to review</span>
                <span aria-hidden className="text-lg leading-none">›</span>
              </button>
            )}

            <section className="grid grid-cols-2 gap-2 min-[360px]:gap-3 md:gap-4" aria-label="This week">
              <StatCard icon={<CheckSquareIcon className="size-5" />} label="Task Complete" value={thisWeek.completed}
                tone="bg-brand-50" iconTone="bg-brand-600 text-white" testid="week-completed" />
              <StatCard icon={<XSquareIcon className="size-5" />} label="Task Pending" value={thisWeek.open}
                tone="bg-rose-50" iconTone="bg-rose-400 text-white" testid="week-pending" />
            </section>

            <section className="mt-6">
              <div className="flex items-baseline justify-between">
                <h2 className="text-lg font-semibold">Weekly Progress</h2>
                <span className="text-xs font-medium text-muted tabular-nums">{pct}%</span>
              </div>
              <div className="mt-2 h-4 overflow-hidden bg-brand-100" role="progressbar" aria-label="This week’s progress"
                aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full bg-brand-600 transition-[width] duration-500" style={{ width: `${pct}%` }} />
              </div>
            </section>

            <section className="mt-6">
              <div className="flex items-baseline justify-between">
                <h2 className="text-lg font-semibold">{day === today ? 'Tasks Today' : `Tasks on ${formatDay(parseDayKey(day))}`}</h2>
                <button type="button" onClick={() => document.getElementById('all-weeks')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  className="text-sm font-medium text-brand-600 hover:underline">View All</button>
              </div>
              {!weekTasks && !loadError && <div className="grid place-items-center py-8 text-brand-600"><Spinner className="size-6" /></div>}
              {weekTasks && dayTasks.length === 0 && (
                <p className="mt-3 rounded-xl bg-white px-4 py-6 text-center text-sm text-muted ring-1 ring-gray-100">
                  Nothing planned for this day. Tap <b className="text-ink">+</b> to add a task.
                </p>
              )}
              {dayTasks.length > 0 && (
                <ul className="mt-3 space-y-2" data-testid="day-tasks">
                  {dayTasks.map((t) => <TaskRow key={t.id} task={t} showDay={false} {...actions} />)}
                </ul>
              )}
            </section>
            </div>

            <section id="all-weeks" className="mt-8 min-w-0 scroll-mt-4 lg:mt-0">
              <h2 className="text-lg font-semibold">All Weeks</h2>
              <p className="text-xs text-muted">Monday to Sunday · tap a week to see its tasks</p>
              <div className="mt-3 space-y-3">
                {!weeks && !loadError && <div className="grid place-items-center py-10 text-brand-600"><Spinner className="size-6" /></div>}
                {cards.map((w) => (
                  <WeekCard key={w.weekStart} week={w} current={w.weekStart === currentWeek}
                    expanded={expanded.has(w.weekStart)} onToggle={() => toggleWeek(w.weekStart)}
                    refreshKey={refreshKey} actions={actions} />
                ))}
              </div>
            </section>
          </main>

          <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-md justify-center md:max-w-3xl lg:max-w-6xl lg:justify-end lg:px-8 pb-[max(var(--dock),calc(env(safe-area-inset-bottom)+1.5rem))]">
            <button type="button" onClick={() => setSheet({ kind: 'create', day })} aria-label="Add task"
              className="pointer-events-auto grid size-14 place-items-center rounded-full bg-brand-600 text-white shadow-xl shadow-brand-600/40 transition hover:bg-brand-700 active:scale-95">
              <PlusIcon className="size-6" />
            </button>
          </div>
        </>
      )}

      {(sheet?.kind === 'create' || sheet?.kind === 'edit') && (
        <TaskForm key={sheet.task?.id || 'new'} task={sheet.task} week={sheet.week} day={sheet.day} onSave={save} onClose={closeSheet} />
      )}
      {sheet?.kind === 'view' && (
        <TaskDetail task={sheet.task} onClose={closeSheet} onEdit={actions.onEdit} onDelete={actions.onDelete} onSetStatus={setStatus}
          onPostpone={postpone} onDuplicate={duplicate} />
      )}
      <Toast toast={toast} onClose={closeToast} />
    </div>
  );
}

function StatCard({ icon, label, value, tone, iconTone, testid }) {
  return (
    <div className={`min-w-0 rounded-lg p-3 min-[360px]:p-3.5 md:p-5 ${tone}`}>
      <div className="flex items-center gap-2">
        <span className={`grid size-7 shrink-0 place-items-center rounded-md ${iconTone}`}>{icon}</span>
        <span className="text-xs leading-tight font-medium min-[360px]:text-[13px] md:text-sm">{label}</span>
      </div>
      <p className="mt-2 flex flex-wrap items-baseline gap-x-2">
        <span className="text-2xl font-semibold tabular-nums min-[360px]:text-3xl md:text-4xl" data-testid={testid}>{String(value).padStart(2, '0')}</span>
        <span className="text-xs text-muted">This Week</span>
      </p>
    </div>
  );
}
