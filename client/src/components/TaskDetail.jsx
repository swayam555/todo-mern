import { useState } from 'react';
import { Sheet, PriorityChip } from './ui.jsx';
import { CalendarIcon, CopyIcon, EditIcon, SkipIcon, TrashIcon } from './Icons.jsx';
import { formatLong } from '../lib/dates.js';

export function TaskDetail({ task, onClose, onEdit, onDelete, onSetStatus, onPostpone, onDuplicate }) {
  const [busy, setBusy] = useState(false);
  const setStatus = async (status) => {
    if (status === task.status) return;
    setBusy(true);
    try { await onSetStatus(task, status); } finally { setBusy(false); }
  };
  const run = async (fn) => {
    setBusy(true);
    try { await fn(task); } finally { setBusy(false); }
  };
  const overdue = task.status !== 'completed' && new Date(task.dueAt) < new Date();
  const seg = (value, label) => (
    <button type="button" disabled={busy} onClick={() => setStatus(value)} aria-pressed={task.status === value}
      className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${task.status === value ? 'bg-white text-brand-700 shadow-sm' : 'text-muted hover:text-ink'}`}>
      {label}
    </button>
  );

  return (
    <Sheet
      title="Task details"
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          <button type="button" onClick={() => onDelete(task)} className="flex items-center justify-center gap-2 rounded-lg bg-rose-50 px-5 py-3.5 font-semibold text-rose-600 hover:bg-rose-100">
            <TrashIcon />Delete
          </button>
          <button type="button" data-autofocus onClick={() => onEdit(task)} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-600 py-3.5 font-semibold text-white hover:bg-brand-700">
            <EditIcon />Edit
          </button>
        </div>
      }
    >
      <div className="space-y-5 pt-2">
        <div>
          <div className="mb-2"><PriorityChip priority={task.priority} /></div>
          <h3 className={`text-xl font-semibold break-words ${task.status === 'completed' ? 'text-muted line-through' : ''}`}>{task.title}</h3>
          <p className="mt-2 flex items-center gap-2 text-sm font-medium text-muted"><CalendarIcon className="size-4" />{formatLong(task.dueAt)}</p>
          {overdue && <p className="mt-1 text-sm font-medium text-rose-600">Overdue</p>}
        </div>
        {task.description
          ? <p className="whitespace-pre-wrap break-words rounded-lg bg-canvas p-4 text-[15px] leading-relaxed">{task.description}</p>
          : <p className="text-sm italic text-muted">No description</p>}
        <div>
          <p className="mb-1.5 text-sm font-semibold">Status</p>
          <div className="flex gap-1 rounded-lg bg-canvas p-1">
            {seg('in_progress', 'In progress')}
            {seg('completed', 'Completed')}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Quick disabled={busy} onClick={() => run(onPostpone)} icon={<SkipIcon className="size-4" />}>Move to tomorrow</Quick>
          <Quick disabled={busy} onClick={() => run(onDuplicate)} icon={<CopyIcon className="size-4" />}>Duplicate</Quick>
        </div>
      </div>
    </Sheet>
  );
}

const Quick = ({ onClick, icon, children, disabled }) => (
  <button type="button" onClick={onClick} disabled={disabled}
    className="flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium text-brand-700 ring-1 ring-brand-100 ring-inset transition hover:bg-brand-50 disabled:opacity-50">
    {icon}{children}
  </button>
);
