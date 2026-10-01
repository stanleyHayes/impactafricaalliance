import { AMBASSADOR_COUNTRY_MESSAGE, teamCountryMissing } from '@iaa/shared';
import type { HydratedDocument, UpdateQuery } from 'mongoose';

import { ContentService } from '../../common/crud/content-service.js';
import { ValidationError } from '../../common/errors.js';

import type { TeamMemberDocument } from './models/team.model.js';

/**
 * Team members, with the ambassador rule: an ambassador represents the alliance
 * in a country, so the website always shows which one.
 *
 * New members are checked by the create schema. Edits arrive as partial
 * changes, so they are checked against the record as it will be after the
 * edit: moving someone into Ambassadors without a country, or clearing an
 * ambassador's country, is refused on the country field. A country cleared on
 * anyone else is removed, like any other cleared field, by the base service.
 */
export class TeamContentService extends ContentService<TeamMemberDocument> {
  override async update(
    id: string,
    changes: UpdateQuery<TeamMemberDocument>,
  ): Promise<HydratedDocument<TeamMemberDocument>> {
    const previous = await this.getById(id);
    if (teamCountryMissing({ ...previous.toObject(), ...changes })) {
      throw new ValidationError('Validation failed', [
        { path: 'country', message: AMBASSADOR_COUNTRY_MESSAGE },
      ]);
    }
    return super.update(id, changes);
  }
}
