import { Response, NextFunction } from 'express';
import { TenantRequest } from './tenantResolver';

/**
 * Feature Gate Middleware Factory
 * 
 * Creates middleware that checks whether the current tenant's plan
 * includes a specific feature. Returns 403 if the feature is disabled.
 * 
 * Usage in routes:
 *   router.post('/ai/feedback', requireFeature('aiRemarks'), generateReportFeedback);
 *   router.get('/director/overview', requireFeature('directorDashboard'), getExecutiveOverview);
 */
export const requireFeature = (featureKey: string) => {
  return (req: TenantRequest, res: Response, next: NextFunction) => {
    if (!req.tenant) {
      return res.status(400).json({ message: 'Tenant context required' });
    }

    const features = req.tenant.features as any;
    if (!features[featureKey]) {
      return res.status(403).json({
        message: `This feature (${featureKey}) is not available on your current plan. Please upgrade to access it.`,
        feature: featureKey,
        currentPlan: req.tenant.subscription?.planId || 'starter',
        upgradeRequired: true,
      });
    }

    next();
  };
};

/**
 * Subscription Guard Middleware
 * 
 * Checks that the tenant's subscription is active (not expired/suspended).
 * Allows read operations for suspended tenants but blocks writes.
 */
export const requireActiveSubscription = (req: TenantRequest, res: Response, next: NextFunction) => {
  if (!req.tenant) {
    return res.status(400).json({ message: 'Tenant context required' });
  }

  const subStatus = req.tenant.subscription?.status;
  const tenantStatus = req.tenant.status;

  // Active tenants can proceed immediately
  if (subStatus === 'active') {
    return next();
  }

  // Trial tenants can proceed if their trial hasn't expired
  if (subStatus === 'trial') {
    if (req.tenant.subscription?.trialEndsAt && new Date() > new Date(req.tenant.subscription.trialEndsAt)) {
      return res.status(402).json({
        message: 'Your free trial has expired. Please subscribe to continue using the platform.',
        trialExpired: true,
        currentPlan: req.tenant.subscription?.planId,
      });
    }
    return next();
  }

  // Past due — allow with warning
  if (subStatus === 'past_due') {
    // Let request proceed but add a header warning
    res.setHeader('X-Subscription-Warning', 'Payment overdue. Please update your payment method.');
    return next();
  }

  // Suspended — read-only
  if (tenantStatus === 'suspended' || subStatus === 'suspended') {
    const method = req.method.toUpperCase();
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
      res.setHeader('X-Subscription-Warning', 'Account suspended. Read-only access. Please resolve payment to restore full access.');
      return next();
    }
    return res.status(403).json({
      message: 'Your account is suspended due to unpaid subscription. Only read access is available. Please resolve your payment to restore full access.',
      suspended: true,
    });
  }

  // Cancelled
  return res.status(403).json({
    message: 'Your subscription has been cancelled. Please resubscribe to access the platform.',
    cancelled: true,
  });
};

/**
 * Usage Limit Middleware Factory
 * 
 * Creates middleware that checks a specific usage metric against the tenant's plan limit.
 * Used to enforce student count, teacher count, storage, and AI call limits.
 * 
 * Usage:
 *   router.post('/admin/students/upload', checkUsageLimit('students'), uploadStudents);
 *   router.post('/ai/feedback', checkUsageLimit('aiCalls'), generateReportFeedback);
 */
export const checkUsageLimit = (resource: 'students' | 'teachers' | 'admins' | 'aiCalls') => {
  return (req: TenantRequest, res: Response, next: NextFunction) => {
    if (!req.tenant) {
      return res.status(400).json({ message: 'Tenant context required' });
    }

    const sub = req.tenant.subscription;
    if (!sub) return next(); // No subscription data — allow (shouldn't happen)

    // Only enforce on write operations
    const method = req.method.toUpperCase();
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
      return next();
    }

    // Resource-specific checks will be done in the controllers themselves
    // since they need to query current counts from the database.
    // This middleware just attaches the limit info for controllers to use.
    (req as any).usageLimits = {
      maxStudents: sub.maxStudents,
      maxTeachers: sub.maxTeachers,
      maxAdmins: sub.maxAdmins,
      maxAiCallsPerMonth: sub.maxAiCallsPerMonth,
      maxStorageMB: sub.maxStorageMB,
    };

    next();
  };
};
