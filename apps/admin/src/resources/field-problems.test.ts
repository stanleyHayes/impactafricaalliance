import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { createFieldProblems, useFieldProblems, useHasFieldProblems } from './field-problems';

const INCOMPLETE = 'Finish typing the date and time, or clear the field.';

describe('a form’s field problems', () => {
  // A click on Continue can arrive between a field's report (as it loses
  // focus) and the form's next render; the decision must already see it.
  it('knows a report at once', () => {
    const problems = createFieldProblems();
    problems.report('deadline', INCOMPLETE);
    expect(problems.current()).toEqual({ deadline: INCOMPLETE });
  });

  it('forgets a field once it reports no problem', () => {
    const problems = createFieldProblems();
    problems.report('startsAt', 'Pick a later date and time.');
    problems.report('endsAt', 'Pick a later date and time.');
    problems.report('startsAt', null);
    expect(problems.current()).toEqual({ endsAt: 'Pick a later date and time.' });
  });

  it('tells whatever shows them of each change, and of nothing else', () => {
    const problems = createFieldProblems();
    let told = 0;
    const stop = problems.subscribe(() => {
      told += 1;
    });
    problems.report('deadline', null);
    problems.report('deadline', 'Finish it.');
    problems.report('deadline', 'Finish it.');
    expect(told).toBe(1);
    stop();
    problems.report('deadline', null);
    expect(told).toBe(1);
  });

  // Each report used to re-render the whole form, date picker and all, a
  // moment after the key that caused it; the next key could land first,
  // and the picker then lost the part just typed.
  it('re-renders nothing that only reports', () => {
    let renders = 0;
    const { result } = renderHook(() => {
      renders += 1;
      return useFieldProblems();
    });
    const settled = renders;
    act(() => result.current.report('deadline', INCOMPLETE));
    act(() => result.current.report('deadline', null));
    expect(renders).toBe(settled);
  });

  it('re-renders what shows whether there are any', () => {
    const problems = createFieldProblems();
    const { result } = renderHook(() => useHasFieldProblems(problems));
    expect(result.current).toBe(false);
    act(() => problems.report('deadline', INCOMPLETE));
    expect(result.current).toBe(true);
    act(() => problems.report('deadline', null));
    expect(result.current).toBe(false);
  });
});
