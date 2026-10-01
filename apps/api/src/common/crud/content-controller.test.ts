import { partialForUpdate } from '@iaa/shared';
import type { Request, Response } from 'express';
import type { HydratedDocument } from 'mongoose';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { ValidationError } from '../errors.js';

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

describe('admin updates', () => {
  // Refined like the team's schema: the removable fields come from its shape.
  const create = z
    .object({
      name: z.string().min(2),
      tier: z.enum(['board', 'executive']).default('executive'),
      website: z
        .union([z.literal(''), z.string().url()])
        .optional()
        .transform((value) => (value === '' ? undefined : value)),
      photo: z.object({ url: z.string().url() }).optional(),
    })
    .superRefine(() => undefined);

  const updateFixture = () => {
    const record = doc({ title: 'Updated' });
    const service = { update: vi.fn().mockResolvedValue(record) };
    const controller = new ContentController<Doc>(service as unknown as ContentService<Doc>, {
      create,
      update: partialForUpdate(create),
    });
    const res = { json: vi.fn() } as unknown as Response;
    const patch = (body: unknown) =>
      controller.update({ params: { id: 'abc' }, query: {}, body } as unknown as Request, res);
    return { service, patch };
  };

  it('passes a null for an optional field on as a removal, with the other changes', async () => {
    const { service, patch } = updateFixture();
    await patch({ name: 'Ama Mensah', website: null, photo: null, unknown: null });
    expect(service.update).toHaveBeenCalledWith('abc', {
      name: 'Ama Mensah',
      website: null,
      photo: null,
    });
  });

  it('still validates the rest of the body', async () => {
    const { service, patch } = updateFixture();
    await expect(patch({ website: null, name: 'A' })).rejects.toBeInstanceOf(ValidationError);
    expect(service.update).not.toHaveBeenCalled();
  });

  it.each([{ name: null }, { tier: null }])(
    'refuses null for a required field or one with a default: %o',
    async (body) => {
      const { service, patch } = updateFixture();
      await expect(patch(body)).rejects.toBeInstanceOf(ValidationError);
      expect(service.update).not.toHaveBeenCalled();
    },
  );
});
