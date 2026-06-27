import { Schema, model } from 'mongoose';

const SchoolClassSchema = new Schema(
  {
    className: {
      type: String,
      required: true,
      trim: true,
      // e.g. "Foundation 1", "Basic 1", "JSS 3A"
    },
    section: {
      type: String,
      required: true,
      trim: true,
      // Category grouping, e.g. "Foundation", "Primary", "Secondary"
    },
    annex: {
      type: String,
      default: '',
      trim: true,
      // Optional school branch/annex label, e.g. "Main Campus", "Takushara Annex"
    },
    order: {
      type: Number,
      default: 0,
      // Sort order for display within a section
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

// Compound index for fast lookups and preventing duplicates within same annex
SchoolClassSchema.index({ className: 1, section: 1, annex: 1 }, { unique: true });

export default model('SchoolClass', SchoolClassSchema);
