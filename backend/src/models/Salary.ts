import { Schema, model } from 'mongoose';

const SalarySchema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    staffId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    month: {
      type: String, // e.g. "January", "February", etc.
      required: true,
    },
    year: {
      type: String, // e.g. "2026"
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['paid', 'unpaid'],
      default: 'paid',
    },
    paymentDate: {
      type: Date,
      default: Date.now,
    },
    transactionReference: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate salary payments per staff per month within a tenant
SalarySchema.index({ tenantId: 1, staffId: 1, month: 1, year: 1 }, { unique: true });
SalarySchema.index({ tenantId: 1, year: 1 });

export default model('Salary', SalarySchema);
