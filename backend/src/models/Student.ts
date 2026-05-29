import { Schema, model } from 'mongoose';
import bcrypt from 'bcryptjs';

const StudentSchema = new Schema(
  {
    admissionNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true, // Auto uppercase to make lookup consistent e.g., dsh/123 -> DSH/123
    },
    name: {
      type: String,
      required: true,
    },
    level: {
      type: String,
      required: true, // e.g. "5"
    },
    section: {
      type: String,
      required: true, // e.g. "ALLO"
    },
    academicYear: {
      type: String,
      required: true, // e.g. "2025/2026"
    },
    parentPin: {
      type: String,
      required: true, // Secure 4-6 digit numeric PIN for parents
    },
  },
  {
    timestamps: true,
  }
);

// Hash the parentPin before saving
StudentSchema.pre('save', async function (next) {
  if (!this.isModified('parentPin')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.parentPin = await bcrypt.hash(this.parentPin, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Compare parent PIN method
StudentSchema.methods.comparePin = async function (enteredPin: string): Promise<boolean> {
  return bcrypt.compare(enteredPin, this.parentPin);
};

export default model('Student', StudentSchema);
