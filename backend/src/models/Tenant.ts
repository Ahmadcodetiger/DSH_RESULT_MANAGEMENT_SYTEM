import { Schema, model, Document, Types } from 'mongoose';

export interface ITenantBranding {
  logo: string;
  favicon: string;
  primaryColor: string;
  secondaryColor: string;
  loginBanner: string;
  schoolStamp: string;
  principalSignature: string;
  islamicLogo?: string;
}

export interface ITenantContact {
  address: string;
  phoneNumbers: string;
  email: string;
  website: string;
  socialMedia: {
    facebook: string;
    instagram: string;
    whatsapp: string;
    twitter: string;
    youtube: string;
  };
}

export interface ITenantLandingPage {
  heroTitle: string;
  heroSubtitle: string;
  heroBanner: string;
  motto: string;
  principalMessage: string;
  principalName: string;
  principalPhoto: string;
  vision: string;
  mission: string;
  aboutText: string;
  showAdmissions: boolean;
  admissionText: string;
  galleryImages: string[];
  announcements: {
    title: string;
    body: string;
    date: Date;
    isActive: boolean;
  }[];
  events: {
    title: string;
    description: string;
    date: Date;
    isActive: boolean;
  }[];
}

export interface ITenantAcademicConfig {
  currentAcademicYear: string;
  currentTerm: string;
  terms: string[];
  sections: string[];
  gradingScale: {
    A: number;
    B: number;
    C: number;
    D: number;
    F: number;
  };
  bankDetails: {
    bankName: string;
    accountName: string;
    accountNumber: string;
  };
  annexes: string[];
  accountantWhatsApp: string;
  allowMultipleClassTeacherAssignments?: boolean;
  allowClassTeacherNextTermEdit?: boolean;
}

export interface ITenantFeatures {
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

export interface ITenantSubscription {
  planId: string;
  status: 'active' | 'trial' | 'past_due' | 'suspended' | 'cancelled';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEndsAt: Date | null;
  cancelledAt: Date | null;
  maxStudents: number;
  maxTeachers: number;
  maxAdmins: number;
  maxStorageMB: number;
  maxAiCallsPerMonth: number;
}

export interface ITenant extends Document {
  slug: string;
  name: string;
  nameArabic: string;
  subHeader: string;
  status: 'active' | 'trial' | 'suspended' | 'cancelled' | 'pending';
  branding: ITenantBranding;
  contact: ITenantContact;
  domains: {
    subdomain: string;
    customDomain: string;
    customDomainVerified: boolean;
    customDomainStatus: 'active' | 'pending';
  };
  landingPage: ITenantLandingPage;
  academicConfig: ITenantAcademicConfig;
  subscription: ITenantSubscription;
  features: ITenantFeatures;
  curriculumType: 'dual' | 'conventional';
  onboardedBy: Types.ObjectId | null;
  onboardingCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TenantSchema = new Schema<ITenant>(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, 'Slug must be lowercase alphanumeric with optional hyphens'],
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    nameArabic: {
      type: String,
      default: '',
      trim: true,
    },
    subHeader: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'trial', 'suspended', 'cancelled', 'pending'],
      default: 'trial',
      required: true,
    },

    // Branding
    branding: {
      logo: { type: String, default: '' },
      favicon: { type: String, default: '' },
      primaryColor: { type: String, default: '#1a7a4c' },
      secondaryColor: { type: String, default: '#f0c14b' },
      loginBanner: { type: String, default: '' },
      schoolStamp: { type: String, default: '' },
      principalSignature: { type: String, default: '' },
      islamicLogo: { type: String, default: '' },
    },

    // Contact Info
    contact: {
      address: { type: String, default: '' },
      phoneNumbers: { type: String, default: '' },
      email: { type: String, default: '' },
      website: { type: String, default: '' },
      socialMedia: {
        facebook: { type: String, default: '' },
        instagram: { type: String, default: '' },
        whatsapp: { type: String, default: '' },
        twitter: { type: String, default: '' },
        youtube: { type: String, default: '' },
      },
    },

    // Domain Configuration
    domains: {
      subdomain: { type: String, default: '', trim: true, lowercase: true },
      customDomain: { type: String, default: '', trim: true, lowercase: true },
      customDomainVerified: { type: Boolean, default: false },
      customDomainStatus: { type: String, enum: ['active', 'pending'], default: 'pending' },
    },

    // Public Landing Page Content
    landingPage: {
      heroTitle: { type: String, default: '' },
      heroSubtitle: { type: String, default: '' },
      heroBanner: { type: String, default: '' },
      motto: { type: String, default: '' },
      principalMessage: { type: String, default: '' },
      principalName: { type: String, default: '' },
      principalPhoto: { type: String, default: '' },
      vision: { type: String, default: '' },
      mission: { type: String, default: '' },
      aboutText: { type: String, default: '' },
      showAdmissions: { type: Boolean, default: false },
      admissionText: { type: String, default: '' },
      galleryImages: { type: [String], default: [] },
      announcements: [
        {
          title: { type: String, required: true },
          body: { type: String, required: true },
          date: { type: Date, default: Date.now },
          isActive: { type: Boolean, default: true },
        },
      ],
      events: [
        {
          title: { type: String, required: true },
          description: { type: String, default: '' },
          date: { type: Date, required: true },
          isActive: { type: Boolean, default: true },
        },
      ],
    },

    // Academic Configuration
    academicConfig: {
      currentAcademicYear: { type: String, default: '2025/2026' },
      currentTerm: { type: String, default: 'First Term' },
      terms: { type: [String], default: ['First Term', 'Second Term', 'Third Term'] },
      sections: { type: [String], default: ['academic', 'tahfeezh', 'islamic'] },
      gradingScale: {
        A: { type: Number, default: 80 },
        B: { type: Number, default: 70 },
        C: { type: Number, default: 60 },
        D: { type: Number, default: 50 },
        F: { type: Number, default: 0 },
      },
      bankDetails: {
        bankName: { type: String, default: '' },
        accountName: { type: String, default: '' },
        accountNumber: { type: String, default: '' },
      },
      annexes: { type: [String], default: [] },
      accountantWhatsApp: { type: String, default: '' },
      allowMultipleClassTeacherAssignments: { type: Boolean, default: false },
      allowClassTeacherNextTermEdit: { type: Boolean, default: true },
    },

    // Subscription Info (denormalized from Subscription model for fast access)
    subscription: {
      planId: { type: String, default: 'starter' },
      status: {
        type: String,
        enum: ['active', 'trial', 'past_due', 'suspended', 'cancelled'],
        default: 'trial',
      },
      currentPeriodStart: { type: Date, default: Date.now },
      currentPeriodEnd: {
        type: Date,
        default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14-day trial
      },
      trialEndsAt: {
        type: Date,
        default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
      cancelledAt: { type: Date, default: null },
      maxStudents: { type: Number, default: 200 },
      maxTeachers: { type: Number, default: 15 },
      maxAdmins: { type: Number, default: 2 },
      maxStorageMB: { type: Number, default: 500 },
      maxAiCallsPerMonth: { type: Number, default: 100 },
    },

    // Feature Flags
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

    onboardedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    onboardingCompleted: { type: Boolean, default: false },
    curriculumType: { type: String, enum: ['dual', 'conventional'], default: 'dual' },
  },
  {
    timestamps: true,
  }
);

TenantSchema.index({ 'domains.subdomain': 1 }, { sparse: true });
TenantSchema.index({ 'domains.customDomain': 1 }, { sparse: true });
TenantSchema.index({ status: 1 });

export default model<ITenant>('Tenant', TenantSchema);
