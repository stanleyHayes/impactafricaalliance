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

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),

  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  CORS_ORIGINS: z.string().default('http://localhost:5173,http://localhost:5174'),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_ACCESS_TTL: z.coerce.number().int().positive().default(900),
  JWT_REFRESH_TTL: z.coerce.number().int().positive().default(2_592_000),

  SEED_ADMIN_EMAIL: z.string().email().default('admin@impactafricaalliance.org'),
  SEED_ADMIN_PASSWORD: z.string().min(10).default('ChangeMe!2026'),
  SEED_ADMIN_NAME: z.string().min(2).default('IAA Administrator'),

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
});

export type RawEnv = z.infer<typeof envSchema>;

export interface AppConfig {
  readonly env: RawEnv['NODE_ENV'];
  readonly isProduction: boolean;
  readonly isTest: boolean;
  readonly port: number;
  readonly mongoUri: string;
  readonly corsOrigins: string[];
  readonly jwt: {
    readonly secret: string;
    readonly accessTtlSeconds: number;
    readonly refreshTtlSeconds: number;
  };
  readonly seedAdmin: { email: string; password: string; name: string };
  readonly email: { apiKey?: string; from: string; notifyTo: string };
  readonly cloudinary: {
    cloudName?: string;
    apiKey?: string;
    apiSecret?: string;
    folder: string;
  };
  readonly stripe: { secretKey?: string; webhookSecret?: string };
  readonly paystack: { secretKey?: string; webhookSecret?: string };
}

const buildConfig = (raw: RawEnv): AppConfig => ({
  env: raw.NODE_ENV,
  isProduction: raw.NODE_ENV === 'production',
  isTest: raw.NODE_ENV === 'test',
  port: raw.PORT,
  mongoUri: raw.MONGODB_URI,
  corsOrigins: csv(raw.CORS_ORIGINS),
  jwt: {
    secret: raw.JWT_SECRET,
    accessTtlSeconds: raw.JWT_ACCESS_TTL,
    refreshTtlSeconds: raw.JWT_REFRESH_TTL,
  },
  seedAdmin: {
    email: raw.SEED_ADMIN_EMAIL,
    password: raw.SEED_ADMIN_PASSWORD,
    name: raw.SEED_ADMIN_NAME,
  },
  email: { apiKey: raw.RESEND_API_KEY, from: raw.EMAIL_FROM, notifyTo: raw.EMAIL_NOTIFY_TO },
  cloudinary: {
    cloudName: raw.CLOUDINARY_CLOUD_NAME,
    apiKey: raw.CLOUDINARY_API_KEY,
    apiSecret: raw.CLOUDINARY_API_SECRET,
    folder: raw.CLOUDINARY_UPLOAD_FOLDER,
  },
  stripe: { secretKey: raw.STRIPE_SECRET_KEY, webhookSecret: raw.STRIPE_WEBHOOK_SECRET },
  paystack: { secretKey: raw.PAYSTACK_SECRET_KEY, webhookSecret: raw.PAYSTACK_WEBHOOK_SECRET },
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
  return buildConfig(parsed.data);
};
