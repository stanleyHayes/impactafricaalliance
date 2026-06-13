import bcrypt from 'bcryptjs';
import { injectable } from 'tsyringe';

const SALT_ROUNDS = 12;

/** Hashes and verifies passwords with bcrypt. */
@injectable()
export class PasswordService {
  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, SALT_ROUNDS);
  }

  compare(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
