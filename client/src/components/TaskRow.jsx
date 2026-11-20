import { useRef, useState } from 'react';
import { PriorityChip, StatusCheck } from './ui.jsx';
import { EditIcon, TrashIcon } from './Icons.jsx';
import { formatDay, formatTime } from '../lib/dates.js';

const REVEAL = 88;

/** A task row. Swipe (or drag) left to reveal Delete; tap to open. */
export function TaskRow({ task, onOpen, onToggle, onDelete, onEdit, showDay = true }) {
  const [x, setX] = useState(0);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const drag = useRef(null);
  const swallowClick = useRef(false);
  const done = task.status === 'completed';
  const overdue = !done && new Date(task.dueAt) < new Date();

  const onPointerDown = (e) => {
    if (e.button !== 0) return;
    swallowClick.current = false;
    drag.current = { x0: e.clientX, y0: e.clientY, start: x, moved: false, id: e.pointerId };
  };
  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x0;
    if (!d.moved) {
      if (Math.abs(dx) < 8) return;
      if (Math.abs(e.clientY - d.y0) > Math.abs(dx)) { drag.current = null; return; } // vertical scroll
      d.moved = true;
      setDragging(true);
      e.currentTarget.setPointerCapture?.(d.id);
    }
    setX(Math.max(-REVEAL - 24, Math.min(0, d.start + dx)));
  };
  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d?.moved) return;
    setDragging(false);
    setX((cur) => (cur < -REVEAL / 2 ? -REVEAL : 0));
    swallowClick.current = true;
  };

  const toggle = async () => {
    setBusy(true);
    try { await onToggle(task); } finally { setBusy(false); }
  };

  return (
    <li className={`relative overflow-hidden rounded-xl ${x !== 0 || dragging ? 'bg-rose-500' : 'bg-white'}`} data-testid="task-row">
      <button
        type="button"
        onClick={() => onDelete(task)}
        tabIndex={x === -REVEAL ? 0 : -1}
        aria-hidden={x !== -REVEAL}
        className="absolute inset-y-0 right-0 flex w-[88px] flex-col items-center justify-center gap-0.5 text-xs font-semibold text-white"
      >
        <TrashIcon />Delete
      </button>
      <div
        role="button"
        tabIndex={0}
        aria-label={`${task.title}, ${done ? 'completed' : 'in progress'}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={() => {
          if (swallowClick.current) { swallowClick.current = false; return; }
          if (x !== 0) { setX(0); return; }
          onOpen(task);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(task); }
          if (e.key === 'Delete') onDelete(task);
        }}
        style={{ transform: `translateX(${x}px)`, touchAction: 'pan-y' }}
        className={`relative flex cursor-pointer select-none items-center gap-3 bg-white py-3 pr-2 pl-3.5 ring-1 ring-gray-100 ring-inset transition-transform ${dragging ? 'duration-0' : 'duration-200'}`}
      >
        <StatusCheck done={done} onToggle={toggle} label={task.title} busy={busy} />
        <div className="min-w-0 flex-1">
          <p className={`truncate text-[15px] font-medium ${done ? 'text-muted line-through decoration-ink/60' : ''}`}>{task.title}</p>
          <p className={`mt-0.5 flex items-center gap-1.5 text-xs ${overdue ? 'text-rose-600' : 'text-muted'}`}>
            <span className="truncate">{showDay && `${formatDay(task.dueAt)} · `}{formatTime(task.dueAt)}{overdue && ' · Overdue'}</span>
            <PriorityChip priority={task.priority} />
          </p>
        </div>
        <RowIcon label={`Delete “${task.title}”`} onClick={() => onDelete(task)}><TrashIcon className="size-[18px]" /></RowIcon>
        {onEdit && <RowIcon label={`Edit “${task.title}”`} onClick={() => onEdit(task)}><EditIcon className="size-[18px]" /></RowIcon>}
      </div>
    </li>
  );
}

const RowIcon = ({ label, onClick, children }) => (
  <button type="button" aria-label={label} onPointerDown={(e) => e.stopPropagation()}
    onClick={(e) => { e.stopPropagation(); onClick(); }}
    className="grid size-9 shrink-0 place-items-center rounded-lg text-muted/80 transition hover:bg-canvas hover:text-ink">
    {children}
  </button>
);
