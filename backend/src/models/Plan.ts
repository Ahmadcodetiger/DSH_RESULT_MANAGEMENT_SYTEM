import { Schema, model, Document } from 'mongoose';

export interface IPlanLimits {
  maxStudents: number;
  maxTeachers: number;
  maxAdmins: number;
  maxStorageMB: number;
  maxAiCallsPerMonth: number;
}

export interface IPlanFeatures {
  studentManagement: boolean;
  teacherManagement: boolean;
  resultManagement: boolean;
  pdfReportCards: boolean;
  parentPortal: boolean;
  teacherPortal: boolean;
  basicAnalytics: boolean;
  financeModule: boolean;
  payrollModule: boolean;
  aiRemarks: boolean;
  aiPrincipalRemarks: boolean;
  aiFinancialInsights: boolean;
  aiAtRiskDetection: boolean;
  advancedAnalytics: boolean;
  attendanceTracking: boolean;
  directorDashboard: boolean;
  multiCampus: boolean;
  customBranding: boolean;
  customDomain: boolean;
  apiAccess: boolean;
  whiteLabel: boolean;
  smsNotifications: boolean;
  whatsappNotifications: boolean;
}

export interface IPlan extends Document {
  planId: string;
  name: string;
  nameArabic: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  isActive: boolean;
  sortOrder: number;
  limits: IPlanLimits;
  features: IPlanFeatures;
  createdAt: Date;
  updatedAt: Date;
}

const PlanSchema = new Schema<IPlan>(
  {
    planId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    name: { type: String, required: true, trim: true },
    nameArabic: { type: String, default: '', trim: true },
    description: { type: String, default: '' },
    priceMonthly: { type: Number, required: true },
    priceYearly: { type: Number, required: true },
    currency: { type: String, default: 'NGN' },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },

    limits: {
      maxStudents: { type: Number, required: true },
      maxTeachers: { type: Number, required: true },
      maxAdmins: { type: Number, required: true, default: 2 },
      maxStorageMB: { type: Number, required: true, default: 500 },
      maxAiCallsPerMonth: { type: Number, required: true, default: 100 },
    },

    features: {
      studentManagement: { type: Boolean, default: true },
      teacherManagement: { type: Boolean, default: true },
      resultManagement: { type: Boolean, default: true },
      pdfReportCards: { type: Boolean, default: true },
      parentPortal: { type: Boolean, default: true },
      teacherPortal: { type: Boolean, default: true },
      basicAnalytics: { type: Boolean, default: true },
      financeModule: { type: Boolean, default: false },
      payrollModule: { type: Boolean, default: false },
      aiRemarks: { type: Boolean, default: false },
      aiPrincipalRemarks: { type: Boolean, default: false },
      aiFinancialInsights: { type: Boolean, default: false },
      aiAtRiskDetection: { type: Boolean, default: false },
      advancedAnalytics: { type: Boolean, default: false },
      attendanceTracking: { type: Boolean, default: false },
      directorDashboard: { type: Boolean, default: false },
      multiCampus: { type: Boolean, default: false },
      customBranding: { type: Boolean, default: false },
      customDomain: { type: Boolean, default: false },
      apiAccess: { type: Boolean, default: false },
      whiteLabel: { type: Boolean, default: false },
      smsNotifications: { type: Boolean, default: false },
      whatsappNotifications: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
  }
);

PlanSchema.index({ isActive: 1, sortOrder: 1 });

export default model<IPlan>('Plan', PlanSchema);
