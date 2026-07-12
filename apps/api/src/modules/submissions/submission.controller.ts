import {
  paginationQuerySchema,
  submissionSchema,
  subscribeSchema,
  unsubscribeSchema,
  updateSubmissionStatusSchema,
  SUBMISSION_TYPES,
  SUBMISSION_STATUSES,
  type SubmissionStatus,
  type SubmissionType,
} from '@iaa/shared';
import type { Request, Response } from 'express';
import { inject, injectable } from 'tsyringe';

import { pathParam } from '../../common/http.js';
import { parseWith } from '../../common/validate.js';

import type { SubmissionListFilter } from './submission.repository.js';
import { SubmissionService } from './submission.service.js';

const asEnumValue = <T extends string>(allowed: readonly T[], raw: unknown): T | undefined =>
  typeof raw === 'string' && (allowed as readonly string[]).includes(raw) ? (raw as T) : undefined;

@injectable()
export class SubmissionController {
  constructor(@inject(SubmissionService) private readonly submissions: SubmissionService) {}

  submit = async (req: Request, res: Response): Promise<void> => {
    const input = parseWith(submissionSchema, req.body);
    res.status(201).json(await this.submissions.submit(input));
  };

  subscribe = async (req: Request, res: Response): Promise<void> => {
    const input = parseWith(subscribeSchema, req.body);
    res.status(201).json(await this.submissions.subscribe(input));
  };

  unsubscribe = async (req: Request, res: Response): Promise<void> => {
    const input = parseWith(unsubscribeSchema, req.body);
    res.status(200).json(await this.submissions.unsubscribe(input.email));
  };

  deleteSubscriber = async (req: Request, res: Response): Promise<void> => {
    await this.submissions.deleteSubscriber(pathParam(req, 'id'));
    res.status(204).send();
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const { page, pageSize } = parseWith(paginationQuerySchema, req.query);
    const filter: SubmissionListFilter = {};
    const type = asEnumValue<SubmissionType>(SUBMISSION_TYPES, req.query.type);
    const status = asEnumValue<SubmissionStatus>(SUBMISSION_STATUSES, req.query.status);
    if (type) {
      filter.type = type;
    }
    if (status) {
      filter.status = status;
    }
    res.json(await this.submissions.list(filter, page, pageSize));
  };

  setStatus = async (req: Request, res: Response): Promise<void> => {
    const { status } = parseWith(updateSubmissionStatusSchema, req.body);
    res.json(await this.submissions.setStatus(pathParam(req, 'id'), status));
  };

  listSubscribers = async (req: Request, res: Response): Promise<void> => {
    const { page, pageSize } = parseWith(paginationQuerySchema, req.query);
    res.json(await this.submissions.listSubscribers(page, pageSize));
  };
}
