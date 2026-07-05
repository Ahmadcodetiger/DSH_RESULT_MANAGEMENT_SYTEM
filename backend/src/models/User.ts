import { Schema, model } from 'mongoose';

const UserSchema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'PARENT', 'ACCOUNTANT', 'DIRECTOR'],
      default: 'TEACHER',
      required: true,
    },
    assignedClasses: [
      {
        level: { type: String, required: true }, // e.g. "5" or "Early Years 1"
        section: { type: String, required: true }, // e.g. "ALLO"
        subjectName: { type: String, required: true }, // e.g. "Literacy"
      },
    ],
    classTeacherClasses: [
      {
        level: { type: String, required: true }, // e.g. "5"
        section: { type: String, required: true }, // e.g. "ALLO"
      }
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index: username must be unique WITHIN a tenant
UserSchema.index({ tenantId: 1, username: 1 }, { unique: true });
UserSchema.index({ tenantId: 1, role: 1 });

export default model('User', UserSchema);
