import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticateToken, requireRole, tenantGuard } from '../middleware/auth';
import { requireTenant } from '../middleware/tenantResolver';
import { requireFeature } from '../middleware/featureGate';
import { registerAdmin, loginUser, parentLogin, platformLogin } from '../controllers/authController';
import {
  registerSchool,
  getTenantDetails,
  updateTenantSettings,
  getTenantLandingPage,
  checkSlugAvailability,
  getAvailablePlans,
  getTenantThemeCss,
  verifyCustomDomain,
  getPlatformAdminDashboard,
} from '../controllers/tenantController';
import {
  createTeacher,
  getTeachers,
  updateTeacher,
  deleteTeacher,
  uploadStudents,
  getStudents,
  deleteStudent,
  updateStudent,
  deleteResult,
  toggleResultApproval,
  updateAdminProfile,
  getResults,
  getAdminProfile,
  sendNotification,
  getAllNotifications,
  deleteNotification,
  getNotificationsForRole,
  getPublicNotifications,
  getSchoolSettings,
  updateSchoolSettings,
  promoteStudents,
  createSchoolClass,
  getSchoolClasses,
  updateSchoolClass,
  deleteSchoolClass,
  updateAnnexes,
  createSubject,
  getSubjects,
  updateSubject,
  deleteSubject,
} from '../controllers/adminController';
import {
  getStudentsForTeacher,
  submitOrUpdateResult,
  getStudentResults,
  getResultById,
  getParentStudentResults,
  getClassProgress,
  submitClassResultsForApproval,
  verifyResultPublicly,
} from '../controllers/gradeController';
import {
  createInvoice,
  recordPayment,
  getInvoices,
  createExpense,
  getExpenses,
  getFinanceSummary,
  getStaffList,
  paySalary,
  getSalaries,
  getMySalaries,
  getParentInvoices,
} from '../controllers/financeController';
import { getExecutiveOverview } from '../controllers/directorController';
import {
  generateReportFeedback,
  generateFinancialForecast,
  generateExecutiveBriefing,
  generateHeadTeacherFeedback,
  getAIJobStatus,
  detectAtRiskStudents,
  generateClassScoreSummary,
} from '../controllers/aiController';
import { generateResultPdf, generateInvoicePdf, generateReceiptPdf } from '../controllers/pdfController';
import { SURAHS } from '../utils/surahs';
import { requireActiveSubscription } from '../middleware/requireActiveSubscription';
import {
  initializeSubscriptionCheckout,
  handlePaymentPointWebhook,
  getBillingPortalDetails,
  mockCheckoutEndpoint,
} from '../controllers/billingController';

const router = Router();

// Interceptor to enforce active subscription on write operations (POST, PUT, DELETE, PATCH)
// for all private, tenant-scoped paths, except billing checkout initialization.
router.use(async (req, res, next) => {
  const path = req.path;
  
  const isDashboardPath =
    path.startsWith('/admin') ||
    path.startsWith('/tenant') ||
    path.startsWith('/grading') ||
    path.startsWith('/finance') ||
    path.startsWith('/director') ||
    path.startsWith('/ai') ||
    path.startsWith('/parent') ||
    path.startsWith('/notifications');

  // Skip check for public checkout initialization to allow upgrading
  const isBillingInitialization = path.includes('/billing/subscribe/initialize');

  if (isDashboardPath && !isBillingInitialization) {
    return requireActiveSubscription(req, res, next);
  }

  next();
});

// Rate limiter for authentication and registration routes
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,
  message: { message: 'Too many authentication or registration attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// --- Public / Platform Level Routes ---
router.post('/auth/register-school', authRateLimiter, registerSchool);
router.get('/public/plans', getAvailablePlans);
router.get('/public/check-slug', checkSlugAvailability);
router.get('/surahs', (req, res) => {
  return res.status(200).json(SURAHS);
});

// --- Public Billing Gateway Routes ---
router.post('/billing/webhook', handlePaymentPointWebhook);
router.get('/billing/mock-checkout', mockCheckoutEndpoint);

// --- Tenant-Aware Public Routes (Resolved by domain/subdomain/header) ---
router.post('/auth/register-admin', requireTenant, authRateLimiter, registerAdmin);
router.post('/auth/login-staff', requireTenant, authRateLimiter, loginUser);
router.post('/auth/login-parent', requireTenant, authRateLimiter, parentLogin);
router.post('/auth/platform-login', authRateLimiter, platformLogin);
router.get('/public/notifications', requireTenant, getPublicNotifications);
router.get('/public/settings', requireTenant, getSchoolSettings);
router.get('/public/classes', requireTenant, getSchoolClasses);
router.get('/public/subjects', requireTenant, getSubjects);
router.get('/public/theme', requireTenant, getTenantThemeCss);
router.get('/public/results/:id/verify', requireTenant, verifyResultPublicly);

// --- School Billing Portal Routes ---
router.post('/billing/subscribe/initialize', requireTenant, authenticateToken, tenantGuard, requireRole(['ADMIN']), initializeSubscriptionCheckout);
router.get('/billing/portal', requireTenant, authenticateToken, tenantGuard, requireRole(['ADMIN', 'DIRECTOR']), getBillingPortalDetails);

// --- Admin Only Routes ---
router.get('/tenant/settings', requireTenant, authenticateToken, tenantGuard, requireRole(['ADMIN']), getTenantDetails);
router.put('/tenant/settings', requireTenant, authenticateToken, tenantGuard, requireRole(['ADMIN']), updateTenantSettings);
router.post('/tenant/domain/verify', requireTenant, authenticateToken, tenantGuard, requireRole(['ADMIN']), verifyCustomDomain);

router.post('/admin/teachers', requireTenant, authenticateToken, tenantGuard, requireRole(['ADMIN']), createTeacher);
router.get('/admin/teachers', requireTenant, authenticateToken, tenantGuard, requireRole(['ADMIN']), getTeachers);
router.put('/admin/teachers/:id', requireTenant, authenticateToken, tenantGuard, requireRole(['ADMIN']), updateTeacher);
router.delete('/admin/teachers/:id', requireTenant, authenticateToken, tenantGuard, requireRole(['ADMIN']), deleteTeacher);
router.put('/admin/profile', requireTenant, authenticateToken, tenantGuard, requireRole(['ADMIN']), updateAdminProfile);
router.get('/admin/profile', requireTenant, authenticateToken, tenantGuard, requireRole(['ADMIN']), getAdminProfile);
router.get('/admin/results', requireTenant, authenticateToken, tenantGuard, requireRole(['ADMIN']), getResults);

// Legacy Settings aliases (redirects to Tenant settings under the hood)
router.get('/admin/settings', requireTenant, authenticateToken, tenantGuard, requireRole(['ADMIN']), getSchoolSettings);
router.put('/admin/settings', requireTenant, authenticateToken, tenantGuard, requireRole(['ADMIN']), updateSchoolSettings);

router.post('/admin/students/upload', requireTenant, authenticateToken, tenantGuard, requireRole(['ADMIN']), uploadStudents);
router.get('/admin/students', requireTenant, authenticateToken, tenantGuard, requireRole(['ADMIN', 'ACCOUNTANT', 'DIRECTOR']), getStudents);
router.put('/admin/students/:id', requireTenant, authenticateToken, tenantGuard, requireRole(['ADMIN']), updateStudent);
router.delete('/admin/students/:id', requireTenant, authenticateToken, tenantGuard, requireRole(['ADMIN']), deleteStudent);
router.post('/admin/students/promote', requireTenant, authenticateToken, tenantGuard, requireRole(['ADMIN']), promoteStudents);

// --- School Class Management (Admin Only) ---
router.post('/admin/classes', requireTenant, authenticateToken, tenantGuard, requireRole(['ADMIN']), createSchoolClass);
router.get('/admin/classes', requireTenant, authenticateToken, tenantGuard, requireRole(['ADMIN']), getSchoolClasses);
router.put('/admin/classes/:id', requireTenant, authenticateToken, tenantGuard, requireRole(['ADMIN']), updateSchoolClass);
router.delete('/admin/classes/:id', requireTenant, authenticateToken, tenantGuard, requireRole(['ADMIN']), deleteSchoolClass);
router.put('/admin/annexes', requireTenant, authenticateToken, tenantGuard, requireRole(['ADMIN']), updateAnnexes);

// --- Subject CRUD Management (Admin Only) ---
router.post('/admin/subjects', requireTenant, authenticateToken, tenantGuard, requireRole(['ADMIN']), createSubject);
router.get('/admin/subjects', requireTenant, authenticateToken, tenantGuard, requireRole(['ADMIN']), getSubjects);
router.put('/admin/subjects/:id', requireTenant, authenticateToken, tenantGuard, requireRole(['ADMIN']), updateSubject);
router.delete('/admin/subjects/:id', requireTenant, authenticateToken, tenantGuard, requireRole(['ADMIN']), deleteSubject);

router.delete('/admin/results/:id', requireTenant, authenticateToken, tenantGuard, requireRole(['ADMIN']), deleteResult);
router.patch('/admin/results/:id/status', requireTenant, authenticateToken, tenantGuard, requireRole(['ADMIN']), toggleResultApproval);

// --- Teacher/Admin Routes ---
router.get('/teacher/students', requireTenant, authenticateToken, tenantGuard, requireRole(['ADMIN', 'TEACHER']), getStudentsForTeacher);
router.get('/teacher/class-progress', requireTenant, authenticateToken, tenantGuard, requireRole(['ADMIN', 'TEACHER']), getClassProgress);
router.post('/teacher/class-submit', requireTenant, authenticateToken, tenantGuard, requireRole(['ADMIN', 'TEACHER']), submitClassResultsForApproval);
router.post('/grading/submit', requireTenant, authenticateToken, tenantGuard, requireRole(['ADMIN', 'TEACHER']), submitOrUpdateResult);
router.get('/grading/student/:studentId', requireTenant, authenticateToken, tenantGuard, requireRole(['ADMIN', 'TEACHER']), getStudentResults);

// --- Finance/Accountant Routes ---
router.post('/finance/invoices', requireTenant, authenticateToken, tenantGuard, requireRole(['ADMIN', 'ACCOUNTANT']), createInvoice);
router.post('/finance/invoices/:invoiceId/payment', requireTenant, authenticateToken, tenantGuard, requireRole(['ADMIN', 'ACCOUNTANT']), recordPayment);
router.get('/finance/invoices', requireTenant, authenticateToken, tenantGuard, requireRole(['ADMIN', 'ACCOUNTANT', 'DIRECTOR', 'PARENT']), getInvoices);
router.post('/finance/expenses', requireTenant, authenticateToken, tenantGuard, requireRole(['ADMIN', 'ACCOUNTANT']), createExpense);
router.get('/finance/expenses', requireTenant, authenticateToken, tenantGuard, requireRole(['ADMIN', 'ACCOUNTANT', 'DIRECTOR']), getExpenses);
router.get('/finance/summary', requireTenant, authenticateToken, tenantGuard, requireRole(['ADMIN', 'ACCOUNTANT', 'DIRECTOR']), getFinanceSummary);

// Salary Management Routes
router.get('/finance/staff', requireTenant, authenticateToken, tenantGuard, requireRole(['ADMIN', 'ACCOUNTANT', 'DIRECTOR']), getStaffList);
router.get('/finance/salaries', requireTenant, authenticateToken, tenantGuard, requireRole(['ADMIN', 'ACCOUNTANT', 'DIRECTOR']), getSalaries);
router.post('/finance/salaries', requireTenant, authenticateToken, tenantGuard, requireRole(['ADMIN', 'ACCOUNTANT']), paySalary);
router.get('/staff/my-salaries', requireTenant, authenticateToken, tenantGuard, requireRole(['ADMIN', 'TEACHER', 'ACCOUNTANT', 'DIRECTOR']), getMySalaries);

// --- Director Only Routes ---
router.get('/director/overview', requireTenant, authenticateToken, tenantGuard, requireRole(['DIRECTOR']), getExecutiveOverview);

// --- AI Generation Routes ---
router.post('/ai/feedback', requireTenant, authenticateToken, tenantGuard, requireRole(['ADMIN', 'TEACHER']), requireFeature('aiRemarks'), generateReportFeedback);
router.post('/ai/head-teacher-feedback', requireTenant, authenticateToken, tenantGuard, requireRole(['ADMIN']), requireFeature('aiPrincipalRemarks'), generateHeadTeacherFeedback);
router.get('/ai/finance-forecast', requireTenant, authenticateToken, tenantGuard, requireRole(['ADMIN', 'ACCOUNTANT']), requireFeature('aiFinancialInsights'), generateFinancialForecast);
router.get('/ai/director-briefing', requireTenant, authenticateToken, tenantGuard, requireRole(['DIRECTOR']), requireFeature('aiExecutiveBriefings'), generateExecutiveBriefing);
router.get('/ai/job/:jobId', requireTenant, authenticateToken, tenantGuard, getAIJobStatus);
router.get('/ai/at-risk', requireTenant, authenticateToken, tenantGuard, requireRole(['ADMIN', 'DIRECTOR']), requireFeature('aiRemarks'), detectAtRiskStudents);
router.post('/ai/class-summary', requireTenant, authenticateToken, tenantGuard, requireRole(['ADMIN', 'DIRECTOR']), generateClassScoreSummary);

// --- Super Admin Platform Routes ---
router.get('/platform/admin/dashboard', authenticateToken, requireRole(['SUPER_ADMIN']), getPlatformAdminDashboard);

// --- Secure PDF and Result Views (Shared Roles) ---
router.get('/results/:id', authenticateToken, requireTenant, tenantGuard, getResultById);
router.get('/results/:id/pdf', authenticateToken, requireTenant, tenantGuard, generateResultPdf);
router.get('/finance/invoices/:invoiceId/pdf', authenticateToken, requireTenant, tenantGuard, requireRole(['ADMIN', 'ACCOUNTANT', 'DIRECTOR', 'PARENT']), generateInvoicePdf);
router.get('/finance/invoices/:invoiceId/payments/:paymentId/pdf', authenticateToken, requireTenant, tenantGuard, requireRole(['ADMIN', 'ACCOUNTANT', 'DIRECTOR', 'PARENT']), generateReceiptPdf);

// --- Parent Portal Routes ---
router.get('/parent/results', requireTenant, authenticateToken, tenantGuard, requireRole(['PARENT']), getParentStudentResults);
router.get('/parent/invoices', requireTenant, authenticateToken, tenantGuard, requireRole(['PARENT']), getParentInvoices);

// --- Notification Routes ---
// Admin: send, list, delete
router.post('/admin/notifications', requireTenant, authenticateToken, tenantGuard, requireRole(['ADMIN']), sendNotification);
router.get('/admin/notifications', requireTenant, authenticateToken, tenantGuard, requireRole(['ADMIN']), getAllNotifications);
router.delete('/admin/notifications/:id', requireTenant, authenticateToken, tenantGuard, requireRole(['ADMIN']), deleteNotification);

// Teacher and Parent: get their notifications
router.get('/notifications', requireTenant, authenticateToken, tenantGuard, requireRole(['TEACHER', 'PARENT', 'ADMIN', 'ACCOUNTANT', 'DIRECTOR']), getNotificationsForRole);

export default router;
