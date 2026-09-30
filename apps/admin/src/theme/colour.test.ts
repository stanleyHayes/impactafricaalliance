import { getContrastRatio } from '@mui/material/styles';
import { describe, expect, it } from 'vitest';

import { poolsToCss, washExtremes } from './backdrop';
import { boundary, contrast, ensureContrast, ensureContrastOnAll, mix, over } from './colour';

describe('colour arithmetic', () => {
  it('mixes two colours by weight', () => {
    expect(mix('#000000', '#FFFFFF', 0)).toBe('#000000');
    expect(mix('#000000', '#FFFFFF', 1)).toBe('#FFFFFF');
    expect(mix('#000000', '#FFFFFF', 0.5)).toBe('#808080');
  });

  it('composites a translucent colour over an opaque one', () => {
    expect(over('rgba(255, 255, 255, 0.5)', '#000000')).toBe('#808080');
    expect(over('#123456', '#FFFFFF')).toBe('#123456');
    expect(over('transparent', '#ABCDEF')).toBe('#ABCDEF');
  });

  it('measures translucent text as it is seen', () => {
    expect(contrast('rgba(0, 0, 0, 0)', '#FFFFFF')).toBeCloseTo(1);
    expect(contrast('#000000', '#FFFFFF')).toBeCloseTo(21);
  });

  it('deepens a colour only as far as it needs to read', () => {
    const readable = ensureContrast('#00D68B', '#FFFFFF', 4.5);
    expect(getContrastRatio(readable, '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
    // Still recognisably green, not black.
    expect(readable).not.toBe('#000000');
    expect(ensureContrast('#0A0F0D', '#FFFFFF', 4.5)).toBe('#0A0F0D');
  });

  it('lightens on a dark ground', () => {
    const readable = ensureContrast('#5E6B66', '#101010', 4.5);
    expect(getContrastRatio(readable, '#101010')).toBeGreaterThanOrEqual(4.5);
  });

  it('reads on the worst of several grounds', () => {
    const grounds = ['#FFFFFF', '#E0E0E0', '#D0D8D0'];
    const readable = ensureContrastOnAll('#5E6B66', grounds, 4.5);
    grounds.forEach((ground) =>
      expect(getContrastRatio(readable, ground)).toBeGreaterThanOrEqual(4.5),
    );
  });

  it('finds the quietest boundary that still reaches 3:1', () => {
    const line = boundary('#E1E6DF', '#0A0F0D');
    expect(getContrastRatio(line, '#E1E6DF')).toBeGreaterThanOrEqual(3);
    expect(getContrastRatio(line, '#E1E6DF')).toBeLessThan(3.4);
  });
});

describe('colour wash', () => {
  const pool = { colour: 'rgba(0, 0, 0, 0.5)', width: 400, height: 300, x: 0, y: 0 };

  it('writes the pools as radial gradients fixed to the viewport', () => {
    expect(poolsToCss([pool])).toBe(
      'radial-gradient(400px 300px at 0% 0%, rgba(0, 0, 0, 0.5), transparent 70%)',
    );
  });

  it('reports the plain canvas and the darkest and lightest it becomes', () => {
    const [base, darkest, lightest] = washExtremes('#FFFFFF', [pool]);
    expect(base).toBe('#FFFFFF');
    // At the pool's centre the canvas is half black.
    expect(darkest).toBe('#808080');
    // Far from the pool it is untouched.
    expect(lightest).toBe('#FFFFFF');
  });

  it('never reports stacked pools that cannot overlap on screen', () => {
    const apart = [pool, { ...pool, x: 100, y: 100 }];
    const [, darkest] = washExtremes('#FFFFFF', apart);
    // Both pools at full strength on one spot would give #404040.
    expect(getContrastRatio(darkest as string, '#FFFFFF')).toBeLessThan(
      getContrastRatio('#404040', '#FFFFFF'),
    );
  });
});
