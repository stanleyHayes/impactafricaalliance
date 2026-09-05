import QRCode from 'qrcode';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AppConfig } from '../../config/env.js';
import { EventModel } from '../content/models/event.model.js';

import { EventRegistrationService } from './event-registration.service.js';

const eventId = '507f1f77bcf86cd799439011';

afterEach(() => vi.restoreAllMocks());

describe('downloadable event QR codes', () => {
  it.each(['https://impact.example', 'https://impact.example/'])(
    'encodes the event detail URL in a printable PNG for %s',
    async (siteUrl) => {
      vi.spyOn(EventModel, 'findById').mockReturnValue({
        exec: vi.fn().mockResolvedValue({ _id: eventId }),
      } as unknown as ReturnType<typeof EventModel.findById>);
      const encode = vi.spyOn(QRCode, 'toDataURL');
      const service = new EventRegistrationService({ siteUrl } as AppConfig);

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
    const service = new EventRegistrationService({
      siteUrl: 'https://impact.example',
    } as AppConfig);

    await expect(service.qrForEvent(eventId)).rejects.toThrow('Event');
    expect(encode).not.toHaveBeenCalled();
  });
});
