import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
  title: string;
  message: string;
  targetRole: 'TEACHER' | 'PARENT' | 'ALL'; // who to show it to
  sentAt: Date;
  createdBy: string; // admin name
}

const NotificationSchema: Schema = new Schema(
  {
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

export default mongoose.model<INotification>('Notification', NotificationSchema);
