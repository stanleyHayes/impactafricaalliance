import type { AnyKeys, HydratedDocument, UpdateQuery } from 'mongoose';

import { ContentService } from '../../common/crud/content-service.js';
import { ValidationError } from '../../common/errors.js';

import type { EventDocument } from './models/event.model.js';

const CLEARABLE = [
  'image',
  'endAt',
  'host',
  'hostTitle',
  'admission',
  'capacity',
  'registrationClosesAt',
];
const validateSchedule = (data: AnyKeys<EventDocument>): void => {
  if (data.endAt && new Date(data.endAt).getTime() <= new Date(data.startAt).getTime()) {
    throw new ValidationError('The event end must be after its start.');
  }
  if (
    data.registrationClosesAt &&
    new Date(data.registrationClosesAt).getTime() > new Date(data.startAt).getTime()
  ) {
    throw new ValidationError('Registration must close by the event start.');
  }
};

/** Event-specific update semantics keep removed media and optional fields from reappearing. */
export class EventContentService extends ContentService<EventDocument> {
  override create(data: AnyKeys<EventDocument>): Promise<HydratedDocument<EventDocument>> {
    validateSchedule(data);
    return super.create(data);
  }

  override async update(
    id: string,
    changes: UpdateQuery<EventDocument>,
  ): Promise<HydratedDocument<EventDocument>> {
    const previous = await this.getById(id);
    validateSchedule({ ...previous.toObject(), ...changes });
    const set = { ...changes };
    const unset: Record<string, 1> = {};
    for (const field of CLEARABLE) {
      if (set[field] === null) {
        delete set[field];
        unset[field] = 1;
      }
    }
    return super.update(id, { $set: set, ...(Object.keys(unset).length ? { $unset: unset } : {}) });
  }
}
