import { Schema, model } from 'mongoose';

const SchoolClassSchema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
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

// Compound index: prevent duplicates within same tenant + annex
SchoolClassSchema.index({ tenantId: 1, className: 1, section: 1, annex: 1 }, { unique: true });
SchoolClassSchema.index({ tenantId: 1, isActive: 1 });

export default model('SchoolClass', SchoolClassSchema);
