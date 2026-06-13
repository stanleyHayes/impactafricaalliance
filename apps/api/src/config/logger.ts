import { pino, type Logger } from 'pino';

export type AppLogger = Logger;

/** Build the root pino logger. Pretty in dev, structured JSON in production. */
export const createLogger = (env: string): AppLogger => {
  const isProduction = env === 'production';
  return pino({
    level: process.env.LOG_LEVEL ?? (env === 'test' ? 'silent' : 'info'),
    base: undefined,
    redact: {
      paths: ['req.headers.authorization', 'req.headers.cookie', '*.password', '*.secret'],
      remove: true,
    },
    transport: isProduction
      ? undefined
      : { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } },
  });
};
