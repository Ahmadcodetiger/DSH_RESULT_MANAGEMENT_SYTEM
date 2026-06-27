import { Schema, model } from 'mongoose';

const SubjectSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
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

export default model('Subject', SubjectSchema);
