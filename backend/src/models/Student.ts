import { Schema, model } from 'mongoose';
import bcrypt from 'bcryptjs';

const StudentSchema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    admissionNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true, // Auto uppercase to make lookup consistent e.g., dsh/123 -> DSH/123
    },
    name: {
      type: String,
      required: true,
    },
    nameArabic: {
      type: String,
      default: '',
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
    schoolFees: {
      type: Number,
      default: 0,
    },
    picture: {
      type: String,
      default: '',
    },
    dob: {
      type: String,
      default: '',
    },
    gender: {
      type: String,
      default: '',
    },
    house: {
      type: String,
      default: '',
    },
    club: {
      type: String,
      default: '',
    },
    isDeleted: {
      type: Boolean,
      default: false,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compare parent PIN method (supports legacy bcrypt hashes and plaintext PINs)
StudentSchema.methods.comparePin = async function (enteredPin: string): Promise<boolean> {
  if (this.parentPin.startsWith('$2a$') || this.parentPin.startsWith('$2b$')) {
    return bcrypt.compare(enteredPin, this.parentPin);
  }
  return enteredPin === this.parentPin;
};

// Compound unique index: admissionNumber unique WITHIN a tenant
StudentSchema.index({ tenantId: 1, admissionNumber: 1 }, { unique: true });
StudentSchema.index({ tenantId: 1, level: 1, section: 1 });
StudentSchema.index({ tenantId: 1, isDeleted: 1 });
StudentSchema.index({ tenantId: 1, academicYear: 1 });

export default model('Student', StudentSchema);
