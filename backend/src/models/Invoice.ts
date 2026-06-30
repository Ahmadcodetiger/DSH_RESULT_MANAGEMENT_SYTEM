import { Schema, model } from 'mongoose';

const InvoiceSchema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['paid', 'unpaid', 'partially_paid'],
      default: 'unpaid',
      required: true,
    },
    paidAmount: {
      type: Number,
      default: 0,
      required: true,
    },
    payments: [
      {
        amount: { type: Number, required: true },
        date: { type: Date, default: Date.now, required: true },
        method: { type: String, enum: ['cash', 'bank_transfer', 'card'], required: true },
        transactionRef: { type: String },
      },
    ],
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

InvoiceSchema.index({ tenantId: 1, studentId: 1 });
InvoiceSchema.index({ tenantId: 1, term: 1, academicYear: 1 });
InvoiceSchema.index({ tenantId: 1, status: 1 });

export default model('Invoice', InvoiceSchema);
