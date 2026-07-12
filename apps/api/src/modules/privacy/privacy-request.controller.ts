import {
  paginationQuerySchema,
  privacyRequestInputSchema,
  updatePrivacyRequestSchema,
  PRIVACY_REQUEST_STATUSES,
  PRIVACY_REQUEST_TYPES,
  type PrivacyRequestStatus,
  type PrivacyRequestType,
} from '@iaa/shared';
import type { Request, Response } from 'express';
import { inject, injectable } from 'tsyringe';

import { pathParam } from '../../common/http.js';
import { parseWith } from '../../common/validate.js';

import type { PrivacyRequestListFilter } from './privacy-request.repository.js';
import { PrivacyRequestService } from './privacy-request.service.js';

const asEnumValue = <T extends string>(allowed: readonly T[], raw: unknown): T | undefined =>
  typeof raw === 'string' && (allowed as readonly string[]).includes(raw) ? (raw as T) : undefined;

@injectable()
export class PrivacyRequestController {
  constructor(@inject(PrivacyRequestService) private readonly service: PrivacyRequestService) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const input = parseWith(privacyRequestInputSchema, req.body);
    const request = await this.service.create(input);
    res.status(201).json({ id: request.id, verificationToken: request.verificationToken });
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const { page, pageSize } = parseWith(paginationQuerySchema, req.query);
    const filter: PrivacyRequestListFilter = {};
    const type = asEnumValue<PrivacyRequestType>(PRIVACY_REQUEST_TYPES, req.query.type);
    const status = asEnumValue<PrivacyRequestStatus>(PRIVACY_REQUEST_STATUSES, req.query.status);
    if (type) filter.type = type;
    if (status) filter.status = status;
    res.json(await this.service.list(filter, page, pageSize));
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const input = parseWith(updatePrivacyRequestSchema, req.body);
    res.json(await this.service.update(pathParam(req, 'id'), input));
  };

  exportData = async (req: Request, res: Response): Promise<void> => {
    const email = parseWith(
      privacyRequestInputSchema.shape.email,
      req.query.email ?? req.body.email,
    );
    res.json(await this.service.exportPersonalData(email));
  };
}
