import { Schema, model, Document, Types } from 'mongoose';

export interface IAIJob extends Document {
  tenantId: Types.ObjectId;
  userId: Types.ObjectId | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  taskType: 'report_feedback' | 'head_teacher_feedback' | 'finance_forecast' | 'director_briefing' | 'class_summary' | 'at_risk_detection';
  payload: any;
  result: any;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const AIJobSchema = new Schema<IAIJob>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
      index: true
    },
    taskType: {
      type: String,
      required: true
    },
    payload: {
      type: Schema.Types.Mixed,
      default: {}
    },
    result: {
      type: Schema.Types.Mixed,
      default: null
    },
    error: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

export default model<IAIJob>('AIJob', AIJobSchema);
