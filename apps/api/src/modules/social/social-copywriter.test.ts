import { formatForDestination } from '@iaa/shared';
import { describe, expect, it, vi } from 'vitest';

import type { AppLogger } from '../../config/logger.js';
import { AiAssistService } from '../ai/ai.service.js';

import { SocialCopywriter } from './social-copywriter.js';

const logger = { warn: vi.fn(), error: vi.fn(), info: vi.fn() } as unknown as AppLogger;
const source = {
  title: 'Ghana STEM Network opens applications for its 2027 fellowship',
  excerpt: 'Two hundred places are open across Ghana and Nigeria.',
  url: 'https://www.impactafricaalliance.org/news/stem-2027',
};

describe('when no assistant is configured', () => {
  it('uses the template and says so', async () => {
    const writer = new SocialCopywriter(undefined, logger);

    expect(writer.available).toBe(false);
    const drafted = await writer.draft('linkedin', source);
    expect(drafted.origin).toBe('template');
    expect(drafted.caption).toBe(formatForDestination('linkedin', source));
  });
});

describe('when the assistant is configured', () => {
  it('uses what it writes', async () => {
    vi.spyOn(AiAssistService.prototype, 'assist').mockResolvedValue('A sharper line entirely.');
    const writer = new SocialCopywriter('key', logger);

    const drafted = await writer.draft('x', source);

    expect(drafted).toEqual({ caption: 'A sharper line entirely.', origin: 'ai' });
  });

  it('never lets a failing assistant stop the post', async () => {
    vi.spyOn(AiAssistService.prototype, 'assist').mockRejectedValue(new Error('upstream down'));
    const writer = new SocialCopywriter('key', logger);

    const drafted = await writer.draft('facebook', source);

    expect(drafted.origin).toBe('template');
    expect(drafted.caption).toBe(formatForDestination('facebook', source));
  });

  it('falls back when it answers with nothing usable', async () => {
    vi.spyOn(AiAssistService.prototype, 'assist').mockResolvedValue('   ');
    const writer = new SocialCopywriter('key', logger);

    expect((await writer.draft('threads', source)).origin).toBe('template');
  });

  it('still respects the network limit when it overruns', async () => {
    vi.spyOn(AiAssistService.prototype, 'assist').mockResolvedValue('word '.repeat(200));
    const writer = new SocialCopywriter('key', logger);

    // X allows 280; an answer twice that must not reach the provider.
    expect((await writer.draft('x', source)).caption.length).toBeLessThanOrEqual(280);
  });

  it('drafts every destination, each falling back on its own', async () => {
    vi.spyOn(AiAssistService.prototype, 'assist')
      .mockResolvedValueOnce('Written for LinkedIn.')
      .mockRejectedValueOnce(new Error('rate limited'));
    const writer = new SocialCopywriter('key', logger);

    const drafted = await writer.draftAll(['linkedin', 'facebook'], source);

    expect(drafted[0]).toMatchObject({ destination: 'linkedin', origin: 'ai' });
    expect(drafted[1]).toMatchObject({ destination: 'facebook', origin: 'template' });
  });
});
