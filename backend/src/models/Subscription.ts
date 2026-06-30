import { Schema, model, Document, Types } from 'mongoose';

export interface ISubscriptionInvoice {
  amount: number;
  currency: string;
  paidAt: Date;
  receiptUrl: string;
  gatewayRef: string;
  description: string;
}

export interface ISubscription extends Document {
  tenantId: Types.ObjectId;
  planId: string;
  status: 'active' | 'trial' | 'past_due' | 'cancelled' | 'suspended';
  
  // Billing
  amount: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly';
  
  // Period
  trialEndsAt: Date | null;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelledAt: Date | null;
  
  // Payment Gateway
  paymentGateway: 'paystack' | 'flutterwave' | 'manual' | 'paymentpoint';
  gatewayCustomerId: string;
  gatewaySubscriptionId: string;
  
  // Usage Tracking
  usage: {
    studentsCount: number;
    teachersCount: number;
    storageUsedMB: number;
    aiCallsThisMonth: number;
    aiCallsResetAt: Date;
  };
  
  // Billing History
  invoices: ISubscriptionInvoice[];
  
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      unique: true,
      index: true,
    },
    planId: {
      type: String,
      required: true,
      default: 'starter',
    },
    status: {
      type: String,
      enum: ['active', 'trial', 'past_due', 'cancelled', 'suspended'],
      default: 'trial',
      required: true,
    },

    // Billing
    amount: { type: Number, required: true, default: 20000 },
    currency: { type: String, default: 'NGN' },
    billingCycle: {
      type: String,
      enum: ['monthly', 'yearly'],
      default: 'monthly',
    },

    // Period
    trialEndsAt: { type: Date, default: null },
    currentPeriodStart: { type: Date, default: Date.now },
    currentPeriodEnd: {
      type: Date,
      default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
    cancelledAt: { type: Date, default: null },

    // Payment Gateway
    paymentGateway: {
      type: String,
      enum: ['paystack', 'flutterwave', 'manual', 'paymentpoint'],
      default: 'manual',
    },
    gatewayCustomerId: { type: String, default: '' },
    gatewaySubscriptionId: { type: String, default: '' },

    // Usage Tracking
    usage: {
      studentsCount: { type: Number, default: 0 },
      teachersCount: { type: Number, default: 0 },
      storageUsedMB: { type: Number, default: 0 },
      aiCallsThisMonth: { type: Number, default: 0 },
      aiCallsResetAt: { type: Date, default: Date.now },
    },

    // Billing History
    invoices: [
      {
        amount: { type: Number, required: true },
        currency: { type: String, default: 'NGN' },
        paidAt: { type: Date, default: Date.now },
        receiptUrl: { type: String, default: '' },
        gatewayRef: { type: String, default: '' },
        description: { type: String, default: '' },
      },
    ],
  },
  {
    timestamps: true,
  }
);

SubscriptionSchema.index({ status: 1 });
SubscriptionSchema.index({ currentPeriodEnd: 1 });

export default model<ISubscription>('Subscription', SubscriptionSchema);
