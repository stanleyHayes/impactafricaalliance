import type { Milestone } from '@iaa/shared';
import { ThemeProvider } from '@mui/material/styles';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { theme } from '../../theme/theme';

import {
  draftFromMilestone,
  emptyMilestoneDraft,
  milestoneDraftErrors,
  moveMilestone,
  parseOverrideDraft,
  removeMilestone,
  saveMilestoneDraft,
  toggleMilestoneDone,
} from './milestones';
import { MilestoneDialog, ProgressOverrideDialog } from './ProjectDialogs';

const milestones: Milestone[] = [
  {
    id: 'launch',
    kind: 'milestone',
    title: 'Launch the hub',
    status: 'done',
    dueDate: '2026-10-05T12:00:00.000Z',
    completedAt: '2026-10-05T15:00:00.000Z',
  },
  { id: 'cohort', kind: 'activity', title: 'First cohort', status: 'planned', dueDate: null },
  { id: 'report', kind: 'milestone', title: 'Final report', status: 'in-progress' },
];

afterEach(() => {
  cleanup();
});

describe('milestone list changes', () => {
  it('replaces the item being edited in place and never sends completedAt', () => {
    const draft = { ...draftFromMilestone(milestones[1]!), title: 'First cohort starts' };
    const next = saveMilestoneDraft(milestones, draft, 'cohort');
    expect(next.map((item) => item.id)).toEqual(['launch', 'cohort', 'report']);
    expect(next[1]).toMatchObject({ title: 'First cohort starts', kind: 'activity' });
    expect(next.every((item) => !('completedAt' in item))).toBe(true);
  });

  it('adds a new item at the end with its own id', () => {
    const next = saveMilestoneDraft(
      milestones,
      { ...emptyMilestoneDraft(), title: '  Graduation  ', description: '   ' },
      null,
    );
    expect(next).toHaveLength(4);
    const added = next[3]!;
    expect(added).toMatchObject({ title: 'Graduation', kind: 'milestone', status: 'planned' });
    expect(added).not.toHaveProperty('description');
    expect(added.id).toMatch(/^milestone-[0-9a-f]{12}$/);
  });

  it('marks done and reopens', () => {
    expect(toggleMilestoneDone(milestones, 'cohort')[1]?.status).toBe('done');
    expect(toggleMilestoneDone(milestones, 'launch')[0]?.status).toBe('planned');
  });

  it('moves up and down, and stays put at either end', () => {
    expect(moveMilestone(milestones, 'report', -1).map((item) => item.id)).toEqual([
      'launch',
      'report',
      'cohort',
    ]);
    expect(moveMilestone(milestones, 'launch', -1).map((item) => item.id)).toEqual([
      'launch',
      'cohort',
      'report',
    ]);
    expect(moveMilestone(milestones, 'report', 1).map((item) => item.id)).toEqual([
      'launch',
      'cohort',
      'report',
    ]);
  });

  it('removes one item', () => {
    expect(removeMilestone(milestones, 'cohort').map((item) => item.id)).toEqual([
      'launch',
      'report',
    ]);
  });

  it('asks for a real title', () => {
    expect(milestoneDraftErrors({ ...emptyMilestoneDraft(), title: ' a ' }).title).toMatch(
      /at least 2 characters/,
    );
    expect(milestoneDraftErrors({ ...emptyMilestoneDraft(), title: 'Launch' })).toEqual({});
  });
});

describe('progress set by hand', () => {
  it('takes a whole percentage and a reason', () => {
    expect(parseOverrideDraft({ value: '75', reason: 'Training ended early' })).toEqual({
      ok: true,
      override: { value: 75, reason: 'Training ended early' },
    });
  });

  it('refuses a figure out of range, a fraction, or no reason', () => {
    for (const value of ['', '101', '-1', '12.5', 'lots']) {
      const result = parseOverrideDraft({ value, reason: 'A good reason' });
      expect(result.ok).toBe(false);
    }
    const noReason = parseOverrideDraft({ value: '50', reason: ' ' });
    expect(noReason).toEqual({
      ok: false,
      errors: { reason: 'Say why, in at least 3 characters.' },
    });
  });
});

const withPickers = (ui: JSX.Element): void => {
  render(
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="en-gb">
        {ui}
      </LocalizationProvider>
    </ThemeProvider>,
  );
};

describe('MilestoneDialog', () => {
  it('checks the title before saving, then saves the draft and closes', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    withPickers(
      <MilestoneDialog
        open
        initial={emptyMilestoneDraft()}
        editing={false}
        onSave={onSave}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(await screen.findByText(/at least 2 characters/)).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();

    fireEvent.change(screen.getByRole('textbox', { name: /^Title/ }), {
      target: { value: 'Launch the hub' },
    });
    // One step only, so Enter saves.
    fireEvent.submit(screen.getByRole('textbox', { name: /^Title/ }).closest('form')!);
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0]?.[0]).toMatchObject({ title: 'Launch the hub', status: 'planned' });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('stays open with the reason when the save is refused', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('Each milestone needs its own id'));
    const onClose = vi.fn();
    withPickers(
      <MilestoneDialog
        open
        initial={draftFromMilestone(milestones[1]!)}
        editing
        onSave={onSave}
        onClose={onClose}
      />,
    );
    expect(screen.getByRole('textbox', { name: /^Title/ })).toHaveValue('First cohort');
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Each milestone needs its own id')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox', { name: /^Title/ })).toHaveValue('First cohort');
  });
});

describe('ProgressOverrideDialog', () => {
  it('warns that the figure replaces the count, and saves a valid one', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    withPickers(
      <ProgressOverrideDialog
        open
        initial={{ value: '', reason: '' }}
        countedText="5 of 12 done"
        onSave={onSave}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText(/replaces the count of finished tasks and milestones/)).toBeVisible();
    expect(screen.getByText(/The count today: 5 of 12 done/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Set figure' }));
    expect(await screen.findByText('Enter a whole number from 0 to 100.')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('spinbutton', { name: /Progress/ }), {
      target: { value: '80' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: /^Reason/ }), {
      target: { value: 'Training finished early' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Set figure' }));
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({ value: 80, reason: 'Training finished early' }),
    );
  });
});
