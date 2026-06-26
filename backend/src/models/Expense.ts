import { Schema, model } from 'mongoose';

const ExpenseSchema = new Schema(
  {
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
  },
  {
    timestamps: true,
  }
);

export default model('Expense', ExpenseSchema);
