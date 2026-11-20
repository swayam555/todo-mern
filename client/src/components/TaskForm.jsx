import { useState } from 'react';
import { Sheet, Spinner, PRIORITY } from './ui.jsx';
import { defaultDue, defaultDueOn, fromInputs, toInputs } from '../lib/dates.js';

const field = 'w-full rounded-md border-0 bg-white px-3.5 py-3 text-sm ring-1 ring-gray-300 ring-inset placeholder:text-muted/80 focus:ring-2 focus:ring-brand-600 outline-none';
const Label = ({ htmlFor, children, optional }) => (
  <label htmlFor={htmlFor} className="mb-1.5 flex items-center justify-between text-xs font-medium text-ink/70">
    {children}{optional && <span className="text-xs font-medium text-muted">Optional</span>}
  </label>
);
const Err = ({ id, msg }) => msg ? <p id={id} className="mt-1.5 text-sm font-medium text-rose-600">{msg}</p> : null;

export function TaskForm({ task, week, day, onSave, onClose }) {
  const editing = Boolean(task);
  const initialDue = editing ? toInputs(task.dueAt) : day ? defaultDueOn(day) : defaultDue(week);
  const [form, setForm] = useState({
    title: task?.title ?? '',
    description: task?.description ?? '',
    date: initialDue.date,
    time: initialDue.time,
    priority: task?.priority ?? '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setErrors((er) => ({ ...er, [k]: undefined, form: undefined })); };

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.title.trim()) errs.title = 'Give your task a title';
    const dueAt = fromInputs(form.date, form.time);
    if (!form.date) errs.date = 'Pick a date';
    if (!form.time) errs.time = 'Pick a time';
    if (Object.keys(errs).length) return setErrors(errs);
    setSaving(true);
    try {
      await onSave({ title: form.title.trim(), description: form.description.trim(), dueAt, priority: form.priority || null });
    } catch (err) {
      setErrors({ title: err.details?.title, date: err.details?.dueAt, form: err.message });
      setSaving(false);
    }
  };

  return (
    <Sheet
      title={editing ? 'Edit Task' : 'Add New Task'}
      onClose={onClose}
      footer={
        <button form="task-form" type="submit" disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-md bg-brand-600 py-3.5 text-sm font-medium text-white shadow-lg shadow-brand-600/25 transition hover:bg-brand-700 active:scale-[.99] disabled:opacity-60">
          {saving && <Spinner />}{editing ? 'Save changes' : 'Create task'}
        </button>
      }
    >
      <form id="task-form" onSubmit={submit} noValidate className="space-y-4 pt-2">
        <div>
          <Label htmlFor="title">Task Title</Label>
          <input id="title" data-autofocus className={field} value={form.title} onChange={set('title')} maxLength={120}
            placeholder="e.g. Doing Homework" aria-invalid={!!errors.title} aria-describedby="title-err" autoComplete="off" />
          <Err id="title-err" msg={errors.title} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="date">Set Date</Label>
            <input id="date" type="date" className={field} value={form.date} onChange={set('date')} aria-invalid={!!errors.date} aria-describedby="date-err" />
            <Err id="date-err" msg={errors.date} />
          </div>
          <div>
            <Label htmlFor="time">Set Time</Label>
            <input id="time" type="time" className={field} value={form.time} onChange={set('time')} aria-invalid={!!errors.time} aria-describedby="time-err" />
            <Err id="time-err" msg={errors.time} />
          </div>
        </div>
        <div>
          <Label htmlFor="description" optional>Description</Label>
          <textarea id="description" rows={3} className={`${field} resize-none`} value={form.description} onChange={set('description')}
            maxLength={2000} placeholder="Add Description" />
        </div>
        <fieldset>
          <legend className="mb-1.5 flex w-full items-center justify-between text-xs font-medium text-ink/70">
            Priority<span className="text-xs font-medium text-muted">Optional</span>
          </legend>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(PRIORITY).reverse().map(([value, p]) => {
              const on = form.priority === value;
              return (
                <label key={value} className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-md py-2.5 text-sm font-medium ring-1 ring-inset transition ${on ? p.chip.replace(/ring-\w+-200/, 'ring-current') : 'bg-white text-muted ring-gray-300 hover:ring-gray-400'}`}>
                  <input type="radio" name="priority" value={value} checked={on} className="sr-only"
                    onChange={set('priority')} onClick={() => on && setForm((f) => ({ ...f, priority: '' }))} />
                  <span className={`size-2 rounded-full ${p.dot}`} />{p.label}
                </label>
              );
            })}
          </div>
        </fieldset>
        {errors.form && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{errors.form}</p>}
      </form>
    </Sheet>
  );
}
