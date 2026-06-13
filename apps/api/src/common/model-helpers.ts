import { Schema, type SchemaOptions } from 'mongoose';

/** Embedded Cloudinary asset, reused by any content type that carries an image/file. */
export const mediaSubSchema = new Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    width: { type: Number },
    height: { type: Number },
    alt: { type: String },
  },
  { _id: false },
);

/**
 * Shared Mongoose schema options. Produces clean JSON for clients:
 * `_id` → `id`, no `__v`, ISO timestamps. Applied to every model so the
 * wire shape always matches the DTO interfaces in `@iaa/shared`.
 */
export const baseSchemaOptions = {
  timestamps: true,
  versionKey: false,
  toJSON: {
    virtuals: true,
    transform(_doc: unknown, ret: Record<string, unknown>) {
      ret.id = ret._id?.toString();
      delete ret._id;
      return ret;
    },
  },
  toObject: { virtuals: true },
} satisfies SchemaOptions;
