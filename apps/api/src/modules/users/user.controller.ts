import { createUserSchema, updateUserPermissionsSchema, updateUserSchema } from '@iaa/shared';
import type { Request, Response } from 'express';
import { inject, injectable } from 'tsyringe';

import { UnauthorizedError } from '../../common/errors.js';
import { pathParam } from '../../common/http.js';
import { parseWith } from '../../common/validate.js';

import { UserService } from './user.service.js';

@injectable()
export class UserController {
  constructor(@inject(UserService) private readonly users: UserService) {}

  list = async (_req: Request, res: Response): Promise<void> => {
    res.json(await this.users.list());
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const input = parseWith(createUserSchema, req.body);
    res.status(201).json(await this.users.create(input));
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const input = parseWith(updateUserSchema, req.body);
    res.json(await this.users.update(pathParam(req, 'id'), input));
  };

  updatePermissions = async (req: Request, res: Response): Promise<void> => {
    const input = parseWith(updateUserPermissionsSchema, req.body);
    res.json(await this.users.updatePermissions(pathParam(req, 'id'), input));
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      throw new UnauthorizedError();
    }
    await this.users.remove(pathParam(req, 'id'), req.user.sub);
    res.status(204).send();
  };
}
