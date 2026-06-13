/**
 * Mongoose 9 removed the public `FilterQuery` type export. Our query filters are
 * always built from validated scalar values, so a structural object type is a
 * faithful and forward-compatible replacement. The unused `TDoc` parameter keeps
 * call sites expressive (`QueryFilter<ArticleDocument>`).
 */
export type QueryFilter<TDoc = unknown> = { [K in keyof TDoc | string]?: unknown };
