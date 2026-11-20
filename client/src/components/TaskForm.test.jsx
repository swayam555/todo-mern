import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskForm } from './TaskForm.jsx';
import { toInputs } from '../lib/dates.js';

describe('TaskForm', () => {
  it('requires a title and does not call onSave', async () => {
    const onSave = vi.fn();
    render(<TaskForm week="2026-11-16" onSave={onSave} onClose={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: 'Create task' }));
    expect(screen.getByText('Give your task a title')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('submits trimmed values with priority', async () => {
    const onSave = vi.fn().mockResolvedValue();
    render(<TaskForm week="2026-11-30" onSave={onSave} onClose={() => {}} />);
    await userEvent.type(screen.getByLabelText('Task Title'), '  Pay rent  ');
    await userEvent.type(screen.getByLabelText(/Description/), 'landlord');
    await userEvent.click(screen.getByText('High'));
    await userEvent.click(screen.getByRole('button', { name: 'Create task' }));
    expect(onSave).toHaveBeenCalledTimes(1);
    const arg = onSave.mock.calls[0][0];
    expect(arg).toMatchObject({ title: 'Pay rent', description: 'landlord', priority: 'high' });
    expect(toInputs(arg.dueAt)).toEqual({ date: '2026-11-30', time: '09:00' });
  });

  it('prefills when editing and shows server errors', async () => {
    const err = Object.assign(new Error('Title is required'), { details: { title: 'Title is required' } });
    const onSave = vi.fn().mockRejectedValue(err);
    const task = { id: '1', title: 'Old', description: 'd', dueAt: '2026-11-20T10:00:00Z', priority: 'low', status: 'in_progress' };
    render(<TaskForm task={task} onSave={onSave} onClose={() => {}} />);
    expect(screen.getByLabelText('Task Title')).toHaveValue('Old');
    expect(screen.getByRole('radio', { name: /Low/ })).toBeChecked();
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Title is required');
  });
});
