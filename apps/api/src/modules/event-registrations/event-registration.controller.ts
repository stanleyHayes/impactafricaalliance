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

  /** Public calendar download; served as a file so browsers hand it to the OS. */
  calendar = async (req: Request, res: Response): Promise<void> => {
    const { filename, body } = await this.registrations.calendarForEvent(
      pathParam(req, 'eventId'),
    );
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    // Details can change in the dashboard, so keep the cached copy short-lived.
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(body);
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
