import { z } from 'zod';

/**
 * Validated, typed application configuration.
 * Parsing happens once at boot; an invalid environment fails fast and loud
 * rather than surfacing as a confusing runtime error later.
 */
const csv = (value: string): string[] =>
  value
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

const deriveJwtSecrets = (raw: RawEnv): AppConfig['jwt'] => {
  const accessSecret = raw.JWT_ACCESS_SECRET ?? raw.JWT_SECRET;
  const refreshSecret = raw.JWT_REFRESH_SECRET ?? raw.JWT_SECRET;
  if (!accessSecret || accessSecret.length < 32) {
    throw new Error('JWT_ACCESS_SECRET (or JWT_SECRET fallback) must be at least 32 characters');
  }
  if (!refreshSecret || refreshSecret.length < 32) {
    throw new Error('JWT_REFRESH_SECRET (or JWT_SECRET fallback) must be at least 32 characters');
  }
  if (raw.NODE_ENV === 'production' && accessSecret === refreshSecret) {
    throw new Error('Production requires distinct JWT_ACCESS_SECRET and JWT_REFRESH_SECRET values');
  }
  return {
    accessSecret,
    refreshSecret,
    accessTtlSeconds: raw.JWT_ACCESS_TTL,
    refreshTtlSeconds: raw.JWT_REFRESH_TTL,
  };
};

const parseTrustProxy = (value: string): boolean | number | string => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  const asNumber = Number(value);
  if (!Number.isNaN(asNumber)) return asNumber;
  return value;
};

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),

  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  CORS_ORIGINS: z.string().default('http://localhost:5173,http://localhost:5174'),
  PUBLIC_SITE_URL: z.string().url().default('http://localhost:5173'),
  ADMIN_URL: z.string().url().default('http://localhost:5174'),

  // Separate signing secrets for access and refresh tokens. For local/test
  // convenience, JWT_SECRET is accepted as a fallback for both, but production
  // must use distinct secrets to limit blast radius of a leak.
  JWT_ACCESS_SECRET: z.string().min(32).optional(),
  JWT_REFRESH_SECRET: z.string().min(32).optional(),
  // Deprecated fallback — kept only for local/test backwards compatibility.
  JWT_SECRET: z.string().min(32).optional(),
  JWT_ACCESS_TTL: z.coerce.number().int().positive().default(900),
  JWT_REFRESH_TTL: z.coerce.number().int().positive().default(2_592_000),

  TRUST_PROXY: z.string().default('1'),

  SEED_ADMIN_EMAIL: z.string().email().default('admin@impactafricaalliance.org'),
  SEED_ADMIN_PASSWORD: z.string().min(10, 'SEED_ADMIN_PASSWORD must be at least 10 characters'),
  SEED_ADMIN_NAME: z.string().min(2).default('IAA Administrator'),
  SEED_EDITOR_PASSWORD: z.string().min(10).optional(),

  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('Impact Africa Alliance <no-reply@impactafricaalliance.org>'),
  EMAIL_NOTIFY_TO: z.string().email().default('info@impactafricaalliance.org'),

  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CLOUDINARY_UPLOAD_FOLDER: z.string().default('iaa'),

  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  PAYSTACK_SECRET_KEY: z.string().optional(),
  PAYSTACK_WEBHOOK_SECRET: z.string().optional(),

  ANTHROPIC_API_KEY: z.string().optional(),

  // MFA: 32-byte key for AES-256-GCM encryption of TOTP secrets.
  // In dev/test a deterministic fallback is used if absent; production must set this.
  MFA_ENCRYPTION_KEY: z.string().optional(),
  // Comma-separated list of roles that must enable MFA (e.g. admin,superadmin).
  MFA_REQUIRED_FOR_ROLES: z.string().default(''),

  // Data protection retention windows (days). Set to 0 to disable automatic purge.
  SUBMISSION_RETENTION_DAYS: z.coerce.number().int().min(0).default(1095),
  UNSUBSCRIBED_RETENTION_DAYS: z.coerce.number().int().min(0).default(90),
  FAILED_DONATION_RETENTION_DAYS: z.coerce.number().int().min(0).default(30),

  LINKEDIN_ACCESS_TOKEN: z.string().optional(),
  LINKEDIN_ORGANIZATION_URN: z.string().optional(),
  META_PAGE_ACCESS_TOKEN: z.string().optional(),
  META_PAGE_ID: z.string().optional(),
  META_INSTAGRAM_BUSINESS_ACCOUNT_ID: z.string().optional(),
});

export type RawEnv = z.infer<typeof envSchema>;

export interface AppConfig {
  readonly env: RawEnv['NODE_ENV'];
  readonly isProduction: boolean;
  readonly isTest: boolean;
  readonly port: number;
  readonly mongoUri: string;
  readonly corsOrigins: string[];
  readonly siteUrl: string;
  readonly adminUrl: string;
  readonly jwt: {
    readonly accessSecret: string;
    readonly refreshSecret: string;
    readonly accessTtlSeconds: number;
    readonly refreshTtlSeconds: number;
  };
  readonly trustProxy: boolean | number | string;
  readonly seedAdmin: { email: string; password: string; name: string };
  readonly seedEditorPassword?: string;
  readonly email: { apiKey?: string; from: string; notifyTo: string };
  readonly cloudinary: {
    cloudName?: string;
    apiKey?: string;
    apiSecret?: string;
    folder: string;
  };
  readonly stripe: { secretKey?: string; webhookSecret?: string };
  readonly paystack: { secretKey?: string; webhookSecret?: string };
  readonly anthropic: { apiKey?: string };
  readonly mfa: {
    encryptionKey: Buffer;
    requiredForRoles: string[];
  };
  readonly retention: {
    submissionDays: number;
    unsubscribedDays: number;
    failedDonationDays: number;
  };
  readonly social: {
    linkedinAccessToken?: string;
    linkedinOrganizationUrn?: string;
    metaPageAccessToken?: string;
    metaPageId?: string;
    metaInstagramBusinessAccountId?: string;
  };
}

const deriveMfaConfig = (raw: RawEnv): AppConfig['mfa'] => {
  const requiredForRoles = csv(raw.MFA_REQUIRED_FOR_ROLES);
  if (raw.MFA_ENCRYPTION_KEY) {
    const key = Buffer.from(raw.MFA_ENCRYPTION_KEY, 'base64');
    if (key.length !== 32) {
      throw new Error('MFA_ENCRYPTION_KEY must be a base64-encoded 32-byte key');
    }
    return { encryptionKey: key, requiredForRoles };
  }
  if (raw.NODE_ENV === 'production') {
    throw new Error('MFA_ENCRYPTION_KEY is required in production');
  }
  // Deterministic fallback for local/test only. Not secure for multi-tenant or production use.
  return { encryptionKey: Buffer.alloc(32, 0xab), requiredForRoles };
};

const buildConfig = (raw: RawEnv): AppConfig => ({
  env: raw.NODE_ENV,
  isProduction: raw.NODE_ENV === 'production',
  isTest: raw.NODE_ENV === 'test',
  port: raw.PORT,
  mongoUri: raw.MONGODB_URI,
  corsOrigins: csv(raw.CORS_ORIGINS),
  siteUrl: raw.PUBLIC_SITE_URL,
  adminUrl: raw.ADMIN_URL,
  jwt: deriveJwtSecrets(raw),
  trustProxy: parseTrustProxy(raw.TRUST_PROXY),
  seedAdmin: {
    email: raw.SEED_ADMIN_EMAIL,
    password: raw.SEED_ADMIN_PASSWORD,
    name: raw.SEED_ADMIN_NAME,
  },
  seedEditorPassword: raw.SEED_EDITOR_PASSWORD,
  email: { apiKey: raw.RESEND_API_KEY, from: raw.EMAIL_FROM, notifyTo: raw.EMAIL_NOTIFY_TO },
  cloudinary: {
    cloudName: raw.CLOUDINARY_CLOUD_NAME,
    apiKey: raw.CLOUDINARY_API_KEY,
    apiSecret: raw.CLOUDINARY_API_SECRET,
    folder: raw.CLOUDINARY_UPLOAD_FOLDER,
  },
  stripe: { secretKey: raw.STRIPE_SECRET_KEY, webhookSecret: raw.STRIPE_WEBHOOK_SECRET },
  paystack: { secretKey: raw.PAYSTACK_SECRET_KEY, webhookSecret: raw.PAYSTACK_WEBHOOK_SECRET },
  anthropic: { apiKey: raw.ANTHROPIC_API_KEY },
  mfa: deriveMfaConfig(raw),
  retention: {
    submissionDays: raw.SUBMISSION_RETENTION_DAYS,
    unsubscribedDays: raw.UNSUBSCRIBED_RETENTION_DAYS,
    failedDonationDays: raw.FAILED_DONATION_RETENTION_DAYS,
  },
  social: {
    linkedinAccessToken: raw.LINKEDIN_ACCESS_TOKEN,
    linkedinOrganizationUrn: raw.LINKEDIN_ORGANIZATION_URN,
    metaPageAccessToken: raw.META_PAGE_ACCESS_TOKEN,
    metaPageId: raw.META_PAGE_ID,
    metaInstagramBusinessAccountId: raw.META_INSTAGRAM_BUSINESS_ACCOUNT_ID,
  },
});

/** Parse `process.env` into a typed config, throwing a readable error on failure. */
export const loadConfig = (source: NodeJS.ProcessEnv = process.env): AppConfig => {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  const config = buildConfig(parsed.data);
  if (config.isProduction && config.corsOrigins.length === 0) {
    throw new Error('Invalid environment configuration:\n  - CORS_ORIGINS is required in production');
  }
  return config;
};
