import { Schema, model } from 'mongoose';

const SalarySchema = new Schema(
  {
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

export default model('Salary', SalarySchema);
