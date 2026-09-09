import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AppLogger } from '../../config/logger.js';
import type { EmailProvider } from '../../providers/email.provider.js';
import { EventModel } from '../content/models/event.model.js';
import { EventRegistrationModel } from '../event-registrations/event-registration.model.js';

import { EventMessageModel } from './event-message.model.js';
import { EventMessageService } from './event-message.service.js';

const eventId = '507f1f77bcf86cd799439011';

const config = {
  siteUrl: 'https://www.impactafricaalliance.org',
} as unknown as ConstructorParameters<typeof EventMessageService>[0];

const build = () => {
  const send = vi.fn().mockResolvedValue(undefined);
  const logger = { error: vi.fn(), warn: vi.fn(), info: vi.fn() } as unknown as AppLogger;
  const service = new EventMessageService(config, { send } as unknown as EmailProvider, logger);
  return { service, send, logger };
};

const mockEvent = (overrides: Record<string, unknown> = {}): void => {
  const data: Record<string, unknown> = {
    id: eventId,
    _id: eventId,
    title: 'Leveraging AI to Accelerate Your Career',
    startAt: new Date('2026-09-11T17:00:00Z'),
    location: 'Online',
    meetingUrl: 'https://meet.example.com/iaa',
    ...overrides,
  };
  vi.spyOn(EventModel, 'findById').mockReturnValue({
    exec: vi.fn().mockResolvedValue({ ...data, get: (key: string) => data[key] }),
  } as unknown as ReturnType<typeof EventModel.findById>);
};

const mockRegistrations = (rows: { email: string; fullName: string }[]): void => {
  vi.spyOn(EventRegistrationModel, 'find').mockReturnValue({
    select: () => ({ lean: () => ({ exec: vi.fn().mockResolvedValue(rows) }) }),
  } as unknown as ReturnType<typeof EventRegistrationModel.find>);
};

const captureRecord = () => {
  const created: Record<string, unknown>[] = [];
  vi.spyOn(EventMessageModel, 'create').mockImplementation(((doc: Record<string, unknown>) => {
    created.push(doc);
    return Promise.resolve({
      ...doc,
      id: 'm1',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);
  }) as never);
  return created;
};

const two = [
  { email: 'ama@example.com', fullName: 'Ama Mensah' },
  { email: 'kwame@example.com', fullName: 'Kwame Asante' },
];

afterEach(() => vi.restoreAllMocks());

describe('writing to everyone registered', () => {
  it('sends one email per registrant and records the send', async () => {
    const { service, send } = build();
    mockEvent();
    mockRegistrations(two);
    const created = captureRecord();

    const result = await service.send(
      eventId,
      'custom',
      { subject: 'See you tomorrow', body: 'A quick note before we meet.', includeMeetingLink: false },
      'admin@impactafricaalliance.org',
    );

    expect(send).toHaveBeenCalledTimes(2);
    expect(result.recipientCount).toBe(2);
    expect(created[0]).toMatchObject({ kind: 'custom', status: 'sent', failedCount: 0 });
  });

  it('greets each person by their own first name', async () => {
    const { service, send } = build();
    mockEvent();
    mockRegistrations(two);
    captureRecord();

    await service.send(eventId, 'custom', {
      subject: 'Hello',
      body: 'A note.',
      includeMeetingLink: false,
    });

    expect(send.mock.calls[0]?.[0].html).toContain('Hi Ama,');
    expect(send.mock.calls[1]?.[0].html).toContain('Hi Kwame,');
  });

  it('withholds the joining link unless it was asked for', async () => {
    const { service, send } = build();
    mockEvent();
    mockRegistrations(two);
    captureRecord();

    await service.send(eventId, 'custom', {
      subject: 'Hello',
      body: 'A note.',
      includeMeetingLink: false,
    });

    // The link is kept off the public API on purpose; putting it in an email
    // has to be a decision rather than a default.
    expect(send.mock.calls[0]?.[0].html).not.toContain('meet.example.com');
  });

  it('includes the joining link when it is asked for', async () => {
    const { service, send } = build();
    mockEvent();
    mockRegistrations(two);
    captureRecord();

    await service.send(eventId, 'custom', {
      subject: 'Joining details',
      body: 'Here is how to join.',
      includeMeetingLink: true,
    });

    expect(send.mock.calls[0]?.[0].html).toContain('https://meet.example.com/iaa');
  });

  it('refuses to promise a link the event does not have', async () => {
    const { service } = build();
    mockEvent({ meetingUrl: undefined });
    mockRegistrations(two);

    await expect(
      service.send(eventId, 'custom', {
        subject: 'Joining details',
        body: 'Here is how to join.',
        includeMeetingLink: true,
      }),
    ).rejects.toThrow(/no joining link/);
  });

  it('keeps going when one address fails, and counts it', async () => {
    const { service, send } = build();
    mockEvent();
    mockRegistrations(two);
    const created = captureRecord();
    send.mockRejectedValueOnce(new Error('bad address'));

    const result = await service.send(eventId, 'custom', {
      subject: 'Hello',
      body: 'A note.',
      includeMeetingLink: false,
    });

    // A send that reached one of two is a fact worth recording, not an error
    // that throws away what did happen.
    expect(send).toHaveBeenCalledTimes(2);
    expect(result.recipientCount).toBe(1);
    expect(result.failedCount).toBe(1);
    expect(created[0]?.status).toBe('sent');
  });

  it('records a failure when nobody received it', async () => {
    const { service, send } = build();
    mockEvent();
    mockRegistrations(two);
    const created = captureRecord();
    send.mockRejectedValue(new Error('provider down'));

    const result = await service.send(eventId, 'custom', {
      subject: 'Hello',
      body: 'A note.',
      includeMeetingLink: false,
    });

    expect(result.status).toBe('failed');
    expect(created[0]?.recipientCount).toBe(0);
  });

  it('refuses to send to an empty room', async () => {
    const { service } = build();
    mockEvent();
    mockRegistrations([]);

    await expect(
      service.send(eventId, 'custom', {
        subject: 'Hello',
        body: 'A note.',
        includeMeetingLink: false,
      }),
    ).rejects.toThrow(/Nobody has registered/);
  });
});
