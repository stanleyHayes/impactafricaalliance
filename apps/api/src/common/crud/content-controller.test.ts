import type { Request, Response } from 'express';
import type { HydratedDocument } from 'mongoose';
import { describe, expect, it, vi } from 'vitest';

import { ContentController } from './content-controller.js';
import type { ContentService } from './content-service.js';

interface Doc {
  title: string;
  meetingUrl?: string;
}

/** A stand-in for the Mongoose document the service hands back. */
const doc = (data: Doc): HydratedDocument<Doc> =>
  ({ ...data, toJSON: () => ({ ...data }) }) as unknown as HydratedDocument<Doc>;

const fixture = (publicOmit: string[]) => {
  const record = doc({ title: 'Webinar', meetingUrl: 'https://meet.example.com/abc' });
  const service = {
    listPublic: vi.fn().mockResolvedValue({ items: [record], total: 1, page: 1, pageSize: 20 }),
    getPublic: vi.fn().mockResolvedValue(record),
    listAll: vi.fn().mockResolvedValue({ items: [record], total: 1, page: 1, pageSize: 20 }),
    getById: vi.fn().mockResolvedValue(record),
  };
  const controller = new ContentController<Doc>(
    service as unknown as ContentService<Doc>,
    { create: {} as never, update: {} as never },
    publicOmit,
  );
  const json = vi.fn();
  const res = { json } as unknown as Response;
  return { controller, json, res };
};

const req = (params: Record<string, string> = {}): Request =>
  ({ query: {}, params }) as unknown as Request;

describe('public reads', () => {
  it('withholds omitted fields from a public list', async () => {
    const { controller, json, res } = fixture(['meetingUrl']);
    await controller.listPublic(req(), res);
    const [payload] = json.mock.calls[0] as [{ items: Doc[] }];
    expect(payload.items[0]).toEqual({ title: 'Webinar' });
    expect(payload.items[0]).not.toHaveProperty('meetingUrl');
  });

  it('withholds omitted fields from a public single read', async () => {
    const { controller, json, res } = fixture(['meetingUrl']);
    await controller.getPublic(req({ key: 'webinar' }), res);
    expect(json.mock.calls[0][0]).toEqual({ title: 'Webinar' });
  });

  it('keeps every field when nothing is omitted', async () => {
    const { controller, json, res } = fixture([]);
    await controller.getPublic(req({ key: 'webinar' }), res);
    expect(json.mock.calls[0][0]).toHaveProperty('meetingUrl');
  });

  it('leaves the admin surface untouched, so editors still see the link', async () => {
    const { controller, json, res } = fixture(['meetingUrl']);
    await controller.getAdmin(req({ id: 'abc' }), res);
    expect(json.mock.calls[0][0]).toHaveProperty('meetingUrl');
  });
});
