import { Schema, model } from 'mongoose';

import { baseSchemaOptions } from '../../common/model-helpers.js';

export interface PaymentSettingDocument {
  key: 'payments';
  stripeEnabled: boolean;
  paystackEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSettingSchema = new Schema<PaymentSettingDocument>(
  {
    key: { type: String, required: true, unique: true, index: true, default: 'payments' },
    // Both default OFF: a provider only accepts donations once an admin explicitly
    // enables it (and only takes effect when the API keys are configured).
    stripeEnabled: { type: Boolean, default: false },
    paystackEnabled: { type: Boolean, default: false },
  },
  baseSchemaOptions,
);

export const PaymentSettingModel = model<PaymentSettingDocument>(
  'PaymentSetting',
  paymentSettingSchema,
);
