import { Schema, model } from 'mongoose';

const ExpenseSchema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    category: {
      type: String,
      enum: ['salary', 'utility', 'maintenance', 'books', 'other'],
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
      required: true,
    },
    description: {
      type: String,
    },
    term: {
      type: String,
      required: true,
    },
    academicYear: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

ExpenseSchema.index({ tenantId: 1, term: 1, academicYear: 1 });
ExpenseSchema.index({ tenantId: 1, category: 1 });

export default model('Expense', ExpenseSchema);
