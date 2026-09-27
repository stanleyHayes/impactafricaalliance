import { describe, expect, it } from 'vitest';

import { autosaveView } from './AutosaveStatusLine';

describe('autosaveView', () => {
  // Built from local parts, so the expected words hold in any time zone.
  it('says when it saved on the 12-hour clock the rest of the site uses', () => {
    expect(autosaveView({ kind: 'saved', at: new Date(2026, 8, 27, 15, 10) })?.text).toBe(
      'Saved at 3:10 PM',
    );
    expect(autosaveView({ kind: 'saved', at: new Date(2026, 8, 27, 0, 5) })?.text).toBe(
      'Saved at 12:05 AM',
    );
  });

  it('shows nothing before the first save', () => {
    expect(autosaveView({ kind: 'idle' })).toBeNull();
  });
});
