import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

import { inject, injectable } from 'tsyringe';

import type { AppConfig } from '../../config/env.js';
import { TOKENS } from '../../tokens.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

/**
 * AES-256-GCM encryption for social OAuth tokens stored at rest.
 * Mirrors the MFA secret encryption pattern so both subsystems share
 * the same key-derivation and format.
 */
@injectable()
export class TokenCrypto {
  constructor(@inject(TOKENS.Config) private readonly config: AppConfig) {}

  private get key(): Buffer {
    return this.config.social.tokenEncryptionKey;
  }

  encrypt(plain: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]).toString('base64');
  }

  decrypt(encryptedBase64: string): string {
    const combined = Buffer.from(encryptedBase64, 'base64');
    if (combined.length < IV_LENGTH + TAG_LENGTH) {
      throw new Error('Invalid encrypted token');
    }
    const iv = combined.subarray(0, IV_LENGTH);
    const tag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const encrypted = combined.subarray(IV_LENGTH + TAG_LENGTH);
    const decipher = createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  }
}
