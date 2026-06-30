import { Schema, model, Document, Types } from 'mongoose';

export interface IAuditLog extends Document {
  tenantId: Types.ObjectId;
  userId: Types.ObjectId | null;
  userName: string;
  userRole: string;
  action: string;
  resource: string;
  resourceId: Types.ObjectId | string | null;
  description: string;
  changes: {
    before: Record<string, any>;
    after: Record<string, any>;
  };
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    userName: { type: String, default: 'System' },
    userRole: { type: String, default: '' },
    action: {
      type: String,
      required: true,
      // e.g., STUDENT_CREATED, RESULT_APPROVED, PAYMENT_RECORDED, LOGIN_SUCCESS, LOGIN_FAILED,
      //       SETTINGS_UPDATED, TEACHER_CREATED, USER_DELETED, SUBSCRIPTION_CHANGED, etc.
    },
    resource: {
      type: String,
      required: true,
      // e.g., Student, Result, Invoice, User, Tenant, Settings, etc.
    },
    resourceId: {
      type: Schema.Types.Mixed,
      default: null,
    },
    description: {
      type: String,
      default: '',
    },
    changes: {
      before: { type: Schema.Types.Mixed, default: {} },
      after: { type: Schema.Types.Mixed, default: {} },
    },
    ipAddress: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now },
  },
  {
    timestamps: false, // We use our own timestamp field
  }
);

// Compound indexes for efficient audit queries
AuditLogSchema.index({ tenantId: 1, timestamp: -1 });
AuditLogSchema.index({ tenantId: 1, action: 1, timestamp: -1 });
AuditLogSchema.index({ tenantId: 1, userId: 1, timestamp: -1 });
AuditLogSchema.index({ tenantId: 1, resource: 1, resourceId: 1 });

// TTL index: auto-delete audit logs older than 2 years (730 days)
AuditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 730 * 24 * 60 * 60 });

export default model<IAuditLog>('AuditLog', AuditLogSchema);
