import { Schema, model } from 'mongoose';

const SubjectSchema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      // e.g. "Science", "Numeracy", "Al-Qur'an Karem (Hifz)"
    },
    nameArabic: {
      type: String,
      default: '',
      trim: true,
      // e.g. "علوم", "الحساب", "القرآن الكريم ( حفظ )"
    },
    section: {
      type: String,
      enum: ['academic', 'tahfeezh', 'islamic'],
      required: true,
      // Grouping category
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index: subject name unique within a tenant
SubjectSchema.index({ tenantId: 1, name: 1 }, { unique: true });
SubjectSchema.index({ tenantId: 1, section: 1, isActive: 1 });

export default model('Subject', SubjectSchema);
