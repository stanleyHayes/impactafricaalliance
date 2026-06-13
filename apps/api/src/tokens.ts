/**
 * Dependency-injection tokens for values and interface-typed services.
 *
 * Interfaces have no runtime representation, so anything injected by interface
 * (config, logger, providers) is resolved through one of these explicit tokens.
 * Concrete classes (services, repositories) are injected by their class reference.
 */
export const TOKENS = {
  Config: Symbol('Config'),
  Logger: Symbol('Logger'),
  EmailProvider: Symbol('EmailProvider'),
  MediaProvider: Symbol('MediaProvider'),
  StripeGateway: Symbol('StripeGateway'),
  PaystackGateway: Symbol('PaystackGateway'),
} as const;
