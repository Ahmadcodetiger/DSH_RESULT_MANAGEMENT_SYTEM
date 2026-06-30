import { Schema, model, Document, Types } from 'mongoose';

export interface IAICache extends Document {
  tenantId: Types.ObjectId;
  promptHash: string;
  promptText: string;
  responseText: string;
  expiresAt: Date;
  createdAt: Date;
}

const AICacheSchema = new Schema<IAICache>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true
    },
    promptHash: {
      type: String,
      required: true,
      index: true
    },
    promptText: {
      type: String,
      required: true
    },
    responseText: {
      type: String,
      required: true
    },
    expiresAt: {
      type: Date,
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Auto-delete expired cache entries
AICacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// Compound index to ensure scoped uniqueness
AICacheSchema.index({ tenantId: 1, promptHash: 1 }, { unique: true });

export default model<IAICache>('AICache', AICacheSchema);
