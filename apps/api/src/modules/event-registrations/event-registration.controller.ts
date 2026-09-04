import { eventRegistrationInputSchema, paginationQuerySchema } from '@iaa/shared';
import type { Request, Response } from 'express';
import { inject, injectable } from 'tsyringe';

import { pathParam } from '../../common/http.js';
import { parseWith } from '../../common/validate.js';

import { EventRegistrationService } from './event-registration.service.js';

@injectable()
export class EventRegistrationController {
  constructor(
    @inject(EventRegistrationService) private readonly registrations: EventRegistrationService,
  ) {}

  register = async (req: Request, res: Response): Promise<void> => {
    const input = parseWith(eventRegistrationInputSchema, req.body);
    const result = await this.registrations.register(pathParam(req, 'eventId'), input);
    res.status(201).json(result);
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const { page, pageSize } = parseWith(paginationQuerySchema, req.query);
    res.json(await this.registrations.listForEvent(pathParam(req, 'eventId'), page, pageSize));
  };

  qr = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.registrations.qrForEvent(pathParam(req, 'eventId')));
  };

  counts = async (_req: Request, res: Response): Promise<void> => {
    res.json(await this.registrations.countsByEvent());
  };
}
