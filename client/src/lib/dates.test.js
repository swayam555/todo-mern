import { describe, it, expect } from 'vitest';
import { weekKey, addDays, weekTitle, fromInputs, toInputs, defaultDue, weekRange } from './dates.js';

describe('week math (Monday–Sunday)', () => {
  it('maps every day of a week to its Monday', () => {
    for (let d = 16; d <= 22; d++) expect(weekKey(new Date(2026, 10, d, 13))).toBe('2026-11-16');
    expect(weekKey(new Date(2026, 10, 23, 0, 1))).toBe('2026-11-23');
    expect(weekKey(new Date(2026, 10, 15, 23, 59))).toBe('2026-11-09');
  });
  it('crosses month and year boundaries', () => {
    expect(weekKey(new Date(2027, 0, 2))).toBe('2026-12-28');
    expect(addDays('2026-12-28', 7)).toBe('2027-01-04');
  });
  it('labels relative weeks', () => {
    const today = new Date(2026, 10, 18);
    expect(weekTitle('2026-11-16', today)).toBe('This week');
    expect(weekTitle('2026-11-23', today)).toBe('Next week');
    expect(weekTitle('2026-11-09', today)).toBe('Last week');
    expect(weekTitle('2026-12-07', today)).toMatch(/^Week of /);
  });
  it('renders a range ending on Sunday', () => {
    expect(weekRange('2026-11-30')).toMatch(/30.*6/);
    expect(weekRange('2026-11-16')).toMatch(/16.*22/);
  });
});

describe('date/time inputs', () => {
  it('round-trips local date + time', () => {
    const iso = fromInputs('2026-11-20', '09:45');
    expect(toInputs(iso)).toEqual({ date: '2026-11-20', time: '09:45' });
  });
  it('requires both parts', () => {
    expect(fromInputs('', '09:00')).toBeNull();
    expect(fromInputs('2026-11-20', '')).toBeNull();
  });
  it('defaults into the selected week', () => {
    const now = new Date(2026, 10, 18, 14, 10);
    expect(defaultDue('2026-11-16', now)).toEqual({ date: '2026-11-18', time: '15:00' });
    expect(defaultDue('2026-11-30', now)).toEqual({ date: '2026-11-30', time: '09:00' });
  });
});
