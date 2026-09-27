import { describe, expect, it } from 'vitest';

import { initials } from './initials';

describe('initials', () => {
  it('takes the first letter of the first two names', () => {
    expect(initials('Ama Serwaa Mensah')).toBe('AS');
  });

  it('capitalises and ignores extra spaces', () => {
    expect(initials('  kofi   boateng ')).toBe('KB');
  });

  it('shows a question mark when there is no name', () => {
    expect(initials('   ')).toBe('?');
  });
});
