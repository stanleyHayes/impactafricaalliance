import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DotList } from './DotList';

const partsOf = (container: HTMLElement): string[] =>
  Array.from(container.querySelectorAll('span[aria-hidden]')).map(
    (dot) => dot.parentElement?.textContent ?? '',
  );

describe('DotList', () => {
  it('gives each part its own dot, before it, hidden from assistive technology', () => {
    const { container } = render(<DotList parts={['GH₵6,050', '$3,670']} />);
    expect(partsOf(container)).toEqual(['·GH₵6,050', '·$3,670']);
  });

  it('puts the dots after the parts when the line is set to the end', () => {
    const { container } = render(<DotList parts={['$1,200', '9 of 12 gifts']} align="end" />);
    expect(partsOf(container)).toEqual(['$1,200·', '9 of 12 gifts·']);
  });
});
