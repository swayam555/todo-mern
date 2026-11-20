const pad = (n) => String(n).padStart(2, '0');
export const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseDayKey = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };

/** Monday of the local week containing `date`, as YYYY-MM-DD. */
export function weekKey(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return dayKey(d);
}

export function addDays(key, n) {
  const d = parseDayKey(key);
  d.setDate(d.getDate() + n);
  return dayKey(d);
}

const fmt = (opts) => new Intl.DateTimeFormat(undefined, opts);
const dm = fmt({ day: 'numeric', month: 'short' });

export function weekRange(key) {
  const start = parseDayKey(key);
  const end = parseDayKey(addDays(key, 6));
  return dm.formatRange ? dm.formatRange(start, end) : `${dm.format(start)} – ${dm.format(end)}`;
}

export function weekTitle(key, today = new Date()) {
  const current = weekKey(today);
  if (key === current) return 'This week';
  if (key === addDays(current, 7)) return 'Next week';
  if (key === addDays(current, -7)) return 'Last week';
  return `Week of ${dm.format(parseDayKey(key))}`;
}

export const formatTime = (iso) => fmt({ hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
export const formatDay = (iso) => fmt({ weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(iso));
export const formatLong = (iso) => fmt({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(iso));

export function toInputs(iso) {
  const t = new Date(iso);
  return { date: dayKey(t), time: `${pad(t.getHours())}:${pad(t.getMinutes())}` };
}
export function fromInputs(date, time) {
  if (!date || !time) return null;
  const [h, m] = time.split(':').map(Number);
  const t = parseDayKey(date);
  t.setHours(h, m, 0, 0);
  return Number.isNaN(t.getTime()) ? null : t.toISOString();
}

/** Sensible default when adding into a given week: today if it's inside that week, else the Monday; next full hour. */
export function defaultDue(week, now = new Date()) {
  const inWeek = !week || weekKey(now) === week;
  const day = inWeek ? dayKey(now) : week;
  const hour = inWeek ? Math.min(now.getHours() + 1, 23) : 9;
  return { date: day, time: `${pad(hour)}:00` };
}

/** Default due time on a specific day: next full hour if it's today, else 09:00. */
export function defaultDueOn(day, now = new Date()) {
  const today = dayKey(now) === day;
  return { date: day, time: `${pad(today ? Math.min(now.getHours() + 1, 23) : 9)}:00` };
}
