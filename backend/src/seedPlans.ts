import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';
import Plan from './models/Plan';
import { connectDB } from './config/db';

dns.setDefaultResultOrder('ipv4first');
dotenv.config();

/**
 * Seeds the three subscription plans: Starter, Professional, Enterprise.
 * Safe to run multiple times — uses upsert.
 */
const seedPlans = async () => {
  try {
    await connectDB();

    const plans = [
      {
        planId: 'starter',
        name: 'Starter',
        nameArabic: 'المبتدئ',
        description: 'For small schools with up to 200 students. Includes core management features.',
        priceMonthly: 20000,
        priceYearly: 200000,
        currency: 'NGN',
        isActive: true,
        sortOrder: 1,
        limits: {
          maxStudents: 200,
          maxTeachers: 15,
          maxAdmins: 2,
          maxStorageMB: 500,
          maxAiCallsPerMonth: 100,
        },
        features: {
          studentManagement: true,
          teacherManagement: true,
          resultManagement: true,
          pdfReportCards: true,
          parentPortal: true,
          teacherPortal: true,
          basicAnalytics: true,
          financeModule: false,
          payrollModule: false,
          aiRemarks: false,
          aiPrincipalRemarks: false,
          aiFinancialInsights: false,
          aiAtRiskDetection: false,
          advancedAnalytics: false,
          attendanceTracking: false,
          directorDashboard: false,
          multiCampus: false,
          customBranding: false,
          customDomain: false,
          apiAccess: false,
          whiteLabel: false,
          smsNotifications: false,
          whatsappNotifications: false,
        },
      },
      {
        planId: 'professional',
        name: 'Professional',
        nameArabic: 'المحترف',
        description: 'For growing schools with up to 500 students. Includes finance, AI, and advanced features.',
        priceMonthly: 50000,
        priceYearly: 500000,
        currency: 'NGN',
        isActive: true,
        sortOrder: 2,
        limits: {
          maxStudents: 500,
          maxTeachers: 50,
          maxAdmins: 5,
          maxStorageMB: 2000,
          maxAiCallsPerMonth: 500,
        },
        features: {
          studentManagement: true,
          teacherManagement: true,
          resultManagement: true,
          pdfReportCards: true,
          parentPortal: true,
          teacherPortal: true,
          basicAnalytics: true,
          financeModule: true,
          payrollModule: true,
          aiRemarks: true,
          aiPrincipalRemarks: true,
          aiFinancialInsights: true,
          aiAtRiskDetection: true,
          advancedAnalytics: true,
          attendanceTracking: true,
          directorDashboard: false,
          multiCampus: false,
          customBranding: true,
          customDomain: false,
          apiAccess: false,
          whiteLabel: false,
          smsNotifications: true,
          whatsappNotifications: false,
        },
      },
      {
        planId: 'enterprise',
        name: 'Enterprise',
        nameArabic: 'المؤسسة',
        description: 'For large schools and school groups. Unlimited students, full white-label, API access, and dedicated support.',
        priceMonthly: 150000,
        priceYearly: 1500000,
        currency: 'NGN',
        isActive: true,
        sortOrder: 3,
        limits: {
          maxStudents: 99999, // Effectively unlimited
          maxTeachers: 99999,
          maxAdmins: 99999,
          maxStorageMB: 50000,
          maxAiCallsPerMonth: 99999,
        },
        features: {
          studentManagement: true,
          teacherManagement: true,
          resultManagement: true,
          pdfReportCards: true,
          parentPortal: true,
          teacherPortal: true,
          basicAnalytics: true,
          financeModule: true,
          payrollModule: true,
          aiRemarks: true,
          aiPrincipalRemarks: true,
          aiFinancialInsights: true,
          aiAtRiskDetection: true,
          advancedAnalytics: true,
          attendanceTracking: true,
          directorDashboard: true,
          multiCampus: true,
          customBranding: true,
          customDomain: true,
          apiAccess: true,
          whiteLabel: true,
          smsNotifications: true,
          whatsappNotifications: true,
        },
      },
    ];

    for (const planData of plans) {
      await Plan.findOneAndUpdate(
        { planId: planData.planId },
        planData,
        { upsert: true, new: true }
      );
      console.log(`✓ Plan "${planData.name}" (₦${planData.priceMonthly.toLocaleString()}/mo) seeded`);
    }

    console.log('\n✅ All subscription plans seeded successfully.');
    mongoose.connection.close();
  } catch (error) {
    console.error('Plan seeding error:', error);
    mongoose.connection.close();
    process.exit(1);
  }
};

seedPlans();
