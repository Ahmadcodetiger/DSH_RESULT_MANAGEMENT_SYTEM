import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import Tenant from '../models/Tenant';

/**
 * Middleware that blocks write operations (POST, PUT, DELETE, PATCH)
 * if the tenant does not have an active subscription or is in a suspended state.
 * Allows GET requests so schools have read-only access to their data when suspended.
 */
export const requireActiveSubscription = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant context required' });
    }

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return res.status(404).json({ message: 'School profile not found' });
    }

    const status = tenant.subscription.status;
    const expiry = tenant.subscription.currentPeriodEnd;
    const isExpired = expiry && new Date() > new Date(expiry);

    // If subscription is suspended, or trial has ended, or payment is past-due/expired
    const isSubscriptionInvalid = 
      status === 'suspended' || 
      status === 'cancelled' ||
      (status === 'trial' && tenant.subscription.trialEndsAt && new Date() > new Date(tenant.subscription.trialEndsAt)) ||
      isExpired;

    if (isSubscriptionInvalid) {
      // Only block modifying write operations
      if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
        // Exempt billing initialization and custom domain verification so suspended schools can manage them
        if (
          req.path.includes('/billing/subscribe/initialize') ||
          req.path.includes('/tenant/domain/verify')
        ) {
          return next();
        }

        return res.status(403).json({
          message: 'Write operations disabled. Your school subscription has expired or is suspended. Please renew or upgrade in the billing settings to resume write actions.',
          code: 'SUBSCRIPTION_EXPIRED',
          status: status,
        });
      }
    }

    return next();
  } catch (error: any) {
    console.error('requireActiveSubscription middleware error:', error);
    return res.status(500).json({ message: 'Internal server error validating subscription status' });
  }
};
