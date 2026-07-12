import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';

import { ORG } from '@iaa/shared';
import { compareSync, hashSync } from 'bcryptjs';
import { TOTP, Secret } from 'otpauth';
import QRCode from 'qrcode';
import { inject, injectable } from 'tsyringe';

import type { AppConfig } from '../../config/env.js';
import { TOKENS } from '../../tokens.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const RECOVERY_CODE_COUNT = 8;

/** Generate a human-readable recovery code (e.g. a1b2-c3d4-e5f6). */
const generateRecoveryCode = (): string => {
  const bytes = randomBytes(6);
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}`.toLowerCase();
};

/**
 * MFA helpers: TOTP generation/verification, secret encryption, recovery codes,
 * and QR-code provisioning. Secrets are encrypted at rest with the key from
 * MFA_ENCRYPTION_KEY using AES-256-GCM.
 */
@injectable()
export class MfaService {
  constructor(@inject(TOKENS.Config) private readonly config: AppConfig) {}

  private get key(): Buffer {
    return this.config.mfa.encryptionKey;
  }

  isRequiredForRole(role: string): boolean {
    return this.config.mfa.requiredForRoles.length > 0 && this.config.mfa.requiredForRoles.includes(role);
  }

  async generateProvisioningUri(email: string): Promise<{
    secret: string;
    uri: string;
    qrCodeUrl: string;
  }> {
    const secret = new Secret({ size: 20 });
    const base32 = secret.base32;
    const totp = new TOTP({
      issuer: ORG.shortName,
      label: email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret,
    });
    const uri = totp.toString();
    const qrCodeUrl = await QRCode.toDataURL(uri, { width: 280, margin: 2 });
    return { secret: base32, uri, qrCodeUrl };
  }

  verifyTotp(secret: string, code: string): boolean {
    const totp = new TOTP({
      secret: Secret.fromBase32(secret),
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
    });
    // Allow a single step of clock drift in either direction.
    return totp.validate({ token: code, window: 1 }) !== null;
  }

  encryptSecret(secret: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    const combined = Buffer.concat([iv, tag, encrypted]);
    return combined.toString('base64');
  }

  decryptSecret(encryptedBase64: string): string {
    const combined = Buffer.from(encryptedBase64, 'base64');
    if (combined.length < IV_LENGTH + TAG_LENGTH) {
      throw new Error('Invalid encrypted secret');
    }
    const iv = combined.subarray(0, IV_LENGTH);
    const tag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const encrypted = combined.subarray(IV_LENGTH + TAG_LENGTH);
    const decipher = createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  }

  generateRecoveryCodes(): { plain: string[]; hashed: string[] } {
    const plain = Array.from({ length: RECOVERY_CODE_COUNT }, generateRecoveryCode);
    const hashed = plain.map((code) => hashSync(code, 10));
    return { plain, hashed };
  }

  verifyRecoveryCode(code: string, hashedCodes: (string | null)[]): { index: number } | null {
    for (let index = 0; index < hashedCodes.length; index += 1) {
      const hashed = hashedCodes[index];
      if (hashed && compareSync(code, hashed)) {
        return { index };
      }
    }
    return null;
  }
}
