import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
  tenantId: mongoose.Types.ObjectId;
  title: string;
  message: string;
  targetRole: 'TEACHER' | 'PARENT' | 'ALL'; // who to show it to
  sentAt: Date;
  createdBy: string; // admin name
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema: Schema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    targetRole: {
      type: String,
      enum: ['TEACHER', 'PARENT', 'ALL'],
      default: 'ALL',
    },
    createdBy: { type: String, default: 'Admin' },
  },
  { timestamps: true }
);

NotificationSchema.index({ tenantId: 1, targetRole: 1, createdAt: -1 });

export default mongoose.model<INotification>('Notification', NotificationSchema);
