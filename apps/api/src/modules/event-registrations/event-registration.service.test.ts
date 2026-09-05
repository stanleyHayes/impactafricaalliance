import QRCode from 'qrcode';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AppConfig } from '../../config/env.js';
import type { AppLogger } from '../../config/logger.js';
import type { EmailProvider } from '../../providers/email.provider.js';
import { EventModel } from '../content/models/event.model.js';

import { EventRegistrationModel } from './event-registration.model.js';
import { EventRegistrationService } from './event-registration.service.js';

const eventId = '507f1f77bcf86cd799439011';

/** The service also sends mail and logs, so every test supplies both. */
const build = (siteUrl = 'https://impact.example') => {
  const send = vi.fn().mockResolvedValue(undefined);
  const logger = { error: vi.fn(), warn: vi.fn(), info: vi.fn() } as unknown as AppLogger;
  const service = new EventRegistrationService(
    { siteUrl } as AppConfig,
    { send } as unknown as EmailProvider,
    logger,
  );
  return { service, send, logger };
};

/** A published, open event standing in for a Mongoose document. */
const publishedEvent = (overrides: Record<string, unknown> = {}) => {
  const data = {
    id: eventId,
    title: 'Leveraging AI to Accelerate Your Career',
    description: 'A practical session.',
    startAt: '2099-09-11T17:00:00.000Z',
    location: 'Online',
    type: 'webinar',
    status: 'published',
    registrationEnabled: true,
    questions: [],
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  };
  return { ...data, toJSON: () => data };
};

const mockFindById = (value: unknown): void => {
  vi.spyOn(EventModel, 'findById').mockReturnValue({
    exec: vi.fn().mockResolvedValue(value),
  } as unknown as ReturnType<typeof EventModel.findById>);
};

const registration = {
  fullName: 'Ama Mensah',
  email: 'ama@example.com',
  answers: [],
  consent: true as const,
};

afterEach(() => vi.restoreAllMocks());

describe('downloadable event QR codes', () => {
  it.each(['https://impact.example', 'https://impact.example/'])(
    'encodes the event detail URL in a printable PNG for %s',
    async (siteUrl) => {
      vi.spyOn(EventModel, 'findById').mockReturnValue({
        exec: vi.fn().mockResolvedValue({ _id: eventId }),
      } as unknown as ReturnType<typeof EventModel.findById>);
      const encode = vi.spyOn(QRCode, 'toDataURL');
      const { service } = build(siteUrl);

      const result = await service.qrForEvent(eventId);

      expect(result.targetUrl).toBe(`https://impact.example/events/${eventId}`);
      expect(new URL(result.targetUrl).hash).toBe('');
      expect(encode).toHaveBeenCalledWith(
        result.targetUrl,
        expect.objectContaining({ width: 720, margin: 2, errorCorrectionLevel: 'M' }),
      );
      expect(result.dataUrl).toMatch(/^data:image\/png;base64,/);
      const png = Buffer.from(result.dataUrl.split(',')[1] ?? '', 'base64');
      expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
      expect(png.readUInt32BE(16)).toBe(720);
      expect(png.readUInt32BE(20)).toBe(720);
    },
  );

  it('does not generate a QR code for an event that does not exist', async () => {
    vi.spyOn(EventModel, 'findById').mockReturnValue({
      exec: vi.fn().mockResolvedValue(null),
    } as unknown as ReturnType<typeof EventModel.findById>);
    const encode = vi.spyOn(QRCode, 'toDataURL');
    const { service } = build();

    await expect(service.qrForEvent(eventId)).rejects.toThrow('Event');
    expect(encode).not.toHaveBeenCalled();
  });
});

describe('registration confirmation', () => {
  it('emails the attendee a calendar invitation carrying the joining link', async () => {
    mockFindById(publishedEvent({ meetingUrl: 'https://meet.example.com/iaa' }));
    vi.spyOn(EventRegistrationModel, 'create').mockResolvedValue({} as never);
    const { service, send } = build();

    const result = await service.register(eventId, registration);

    expect(result).toEqual({
      registered: true,
      alreadyRegistered: false,
      meetingUrl: 'https://meet.example.com/iaa',
    });
    expect(send).toHaveBeenCalledTimes(1);
    const message = send.mock.calls[0][0];
    expect(message.to).toBe('ama@example.com');
    expect(message.subject).toContain('Leveraging AI');
    expect(message.html).toContain('Ama');
    expect(message.html).toContain('https://meet.example.com/iaa');

    const [attachment] = message.attachments;
    expect(attachment.filename).toBe('leveraging-ai-to-accelerate-your-career.ics');
    expect(attachment.contentType).toContain('text/calendar');
    const ics = attachment.content.toString('utf8');
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics.replace(/\r\n /g, '')).toContain('Join here: https://meet.example.com/iaa');
  });

  it('still reports success when the confirmation email cannot be sent', async () => {
    mockFindById(publishedEvent());
    vi.spyOn(EventRegistrationModel, 'create').mockResolvedValue({} as never);
    const { service, send, logger } = build();
    send.mockRejectedValue(new Error('provider down'));

    await expect(service.register(eventId, registration)).resolves.toMatchObject({
      registered: true,
    });
    expect(logger.error).toHaveBeenCalled();
  });

  it('re-sends the details when the same email registers again', async () => {
    mockFindById(publishedEvent());
    vi.spyOn(EventRegistrationModel, 'create').mockRejectedValue({ code: 11000 });
    const { service, send } = build();

    await expect(service.register(eventId, registration)).resolves.toEqual({
      registered: true,
      alreadyRegistered: true,
    });
    expect(send).toHaveBeenCalledTimes(1);
  });
});

describe('public calendar download', () => {
  it('serves an event file that withholds the joining link', async () => {
    mockFindById(publishedEvent({ meetingUrl: 'https://meet.example.com/iaa' }));
    const { service } = build();

    const { filename, body } = await service.calendarForEvent(eventId);

    expect(filename).toBe('leveraging-ai-to-accelerate-your-career.ics');
    expect(body).toContain('BEGIN:VCALENDAR');
    expect(body).not.toContain('meet.example.com');
    expect(body.replace(/\r\n /g, '')).toContain(
      `URL:https://impact.example/events/${eventId}`,
    );
  });

  it('refuses an event that is not published', async () => {
    mockFindById(publishedEvent({ status: 'draft' }));
    const { service } = build();
    await expect(service.calendarForEvent(eventId)).rejects.toThrow('Event');
  });
});
