import { Request, Response } from 'express';
import crypto from 'crypto';
import { AuthRequest } from '../middleware/auth';
import Tenant from '../models/Tenant';
import Plan from '../models/Plan';
import Subscription from '../models/Subscription';
import AuditLog from '../models/AuditLog';
import User from '../models/User';
import Student from '../models/Student';
import paymentPointService from '../services/paymentPointService';

/**
 * Initializes a checkout session for subscription upgrades/renewals
 */
export const initializeSubscriptionCheckout = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant context required' });
    }

    const { planId, billingCycle } = req.body;
    if (!planId || !['starter', 'professional', 'enterprise'].includes(planId)) {
      return res.status(400).json({ message: 'Invalid plan selected. Choose starter, professional, or enterprise.' });
    }

    const cycle = billingCycle === 'yearly' ? 'yearly' : 'monthly';

    // 1. Fetch Plan details
    const plan = await Plan.findOne({ planId, isActive: true });
    if (!plan) {
      return res.status(404).json({ message: 'Selected plan is not available.' });
    }

    // 2. Fetch Tenant details
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return res.status(404).json({ message: 'School details not found.' });
    }

    // 3. Determine price
    const amount = cycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;

    // 4. Formulate callback URL (pointing back to school's dashboard)
    const callbackUrl = req.body.callbackUrl || `http://${tenant.slug}.smartschool.africa/admin/billing/callback`;

    // 5. Initialize payment with PaymentPoint
    const metadata = {
      tenantId: tenant._id.toString(),
      planId,
      billingCycle: cycle,
    };

    const checkoutData = await paymentPointService.initializePayment(
      tenant.contact.email || 'admin@school.com',
      amount,
      metadata,
      callbackUrl
    );

    return res.status(200).json({
      message: 'Checkout session initialized',
      checkoutUrl: checkoutData.checkoutUrl,
      reference: checkoutData.reference,
      amount,
      currency: 'NGN',
    });
  } catch (error: any) {
    console.error('Initialize subscription checkout error:', error);
    return res.status(500).json({ message: 'Server error during payment initialization', error: error.message });
  }
};

/**
 * Receives webhook event notifications from PaymentPoint
 */
export const handlePaymentPointWebhook = async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-paymentpoint-signature'] as string;
    const rawBody = JSON.stringify(req.body);

    // Verify webhook authenticity
    const isAuthentic = paymentPointService.verifyWebhookSignature(signature, rawBody);
    if (!isAuthentic) {
      return res.status(400).json({ message: 'Invalid webhook signature' });
    }

    const event = req.body.event;
    console.log(`[PaymentPoint Webhook] Received event: ${event}`);

    if (event === 'transaction.success') {
      const reference = req.body.data.reference;
      
      // Double check status with gateway directly to prevent spoofing
      const verification = await paymentPointService.verifyPayment(reference);
      if (verification.status === 'success') {
        const { tenantId, planId, billingCycle } = verification.metadata;

        // Fetch upgraded plan & tenant
        const plan = await Plan.findOne({ planId });
        const tenant = await Tenant.findById(tenantId);

        if (plan && tenant) {
          const durationDays = billingCycle === 'yearly' ? 365 : 30;
          const expiryDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

          const oldSubscriptionState = { ...tenant.subscription };

          // 1. Update Tenant subscription details
          tenant.subscription.planId = planId;
          tenant.subscription.status = 'active';
          tenant.subscription.currentPeriodStart = new Date();
          tenant.subscription.currentPeriodEnd = expiryDate;
          tenant.subscription.trialEndsAt = null;
          
          tenant.subscription.maxStudents = plan.limits.maxStudents;
          tenant.subscription.maxTeachers = plan.limits.maxTeachers;
          tenant.subscription.maxAdmins = plan.limits.maxAdmins;
          tenant.subscription.maxStorageMB = plan.limits.maxStorageMB;
          tenant.subscription.maxAiCallsPerMonth = plan.limits.maxAiCallsPerMonth;

          // 2. Map new Plan feature flags
          tenant.features = plan.features;
          tenant.status = 'active'; // Reactivate school if suspended
          await tenant.save();

          // 3. Update/Create Subscription record
          let subscription = await Subscription.findOne({ tenantId: tenant._id });
          if (!subscription) {
            subscription = new Subscription({
              tenantId: tenant._id,
              planId,
              status: 'active',
              amount: verification.amount,
              currency: verification.currency,
              billingCycle,
              currentPeriodStart: new Date(),
              currentPeriodEnd: expiryDate,
              paymentGateway: 'paymentpoint',
              invoices: [],
            });
          } else {
            subscription.planId = planId;
            subscription.status = 'active';
            subscription.amount = verification.amount;
            subscription.billingCycle = billingCycle;
            subscription.currentPeriodStart = new Date();
            subscription.currentPeriodEnd = expiryDate;
            subscription.paymentGateway = 'paymentpoint';
          }

          // Append payment entry to history
          subscription.invoices.push({
            amount: verification.amount,
            currency: verification.currency,
            paidAt: new Date(),
            receiptUrl: '',
            gatewayRef: reference,
            description: `Subscription Upgrade/Renewal - ${plan.name} (${billingCycle})`,
          });

          await subscription.save();

          // 4. Log audit log trail
          await AuditLog.create({
            tenantId: tenant._id,
            userId: null,
            userName: 'PaymentPoint Webhook',
            userRole: 'SYSTEM',
            action: 'SUBSCRIPTION_UPGRADED',
            resource: 'Tenant',
            resourceId: tenant._id,
            description: `School upgraded to ${plan.name} (${billingCycle}) via reference ${reference}`,
            changes: { before: oldSubscriptionState, after: tenant.subscription },
            ipAddress: req.ip || '',
            userAgent: req.headers['user-agent'] || '',
          });

          console.log(`[Billing Engine] Successfully upgraded tenant ${tenant.name} (${tenant._id}) to ${plan.name}`);
        }
      }
    }

    return res.status(200).json({ status: 'success' });
  } catch (error: any) {
    console.error('Webhook processing failed:', error);
    return res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

/**
 * Gets subscription metadata, current limits, and invoices history
 */
export const getBillingPortalDetails = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant context required' });
    }

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return res.status(404).json({ message: 'School not found' });
    }

    // 1. Fetch Subscription history
    const subscription = await Subscription.findOne({ tenantId });

    // 2. Count actual active counts for limits checks
    const studentsCount = await Student.countDocuments({ tenantId, isDeleted: { $ne: true } });
    const teachersCount = await User.countDocuments({ tenantId, role: 'TEACHER' });
    const adminsCount = await User.countDocuments({ tenantId, role: 'ADMIN' });

    // 3. Look up active billing plan info
    const plan = await Plan.findOne({ planId: tenant.subscription.planId });

    return res.status(200).json({
      plan: {
        id: tenant.subscription.planId,
        name: plan?.name || 'Starter',
        nameArabic: plan?.nameArabic || 'المبتدئ',
        priceMonthly: plan?.priceMonthly || 20000,
        priceYearly: plan?.priceYearly || 200000,
      },
      subscription: {
        status: tenant.subscription.status,
        currentPeriodStart: tenant.subscription.currentPeriodStart,
        currentPeriodEnd: tenant.subscription.currentPeriodEnd,
        trialEndsAt: tenant.subscription.trialEndsAt,
      },
      usage: {
        students: {
          current: studentsCount,
          limit: tenant.subscription.maxStudents,
        },
        teachers: {
          current: teachersCount,
          limit: tenant.subscription.maxTeachers,
        },
        admins: {
          current: adminsCount,
          limit: tenant.subscription.maxAdmins,
        },
        aiCalls: {
          current: subscription?.usage?.aiCallsThisMonth || 0,
          limit: tenant.subscription.maxAiCallsPerMonth,
        },
        storageMB: {
          current: subscription?.usage?.storageUsedMB || 0,
          limit: tenant.subscription.maxStorageMB,
        },
      },
      billingHistory: subscription?.invoices || [],
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error retrieving billing details', error: error.message });
  }
};

/**
 * Interactive Mock Checkout page for developers/clients
 */
export const mockCheckoutEndpoint = async (req: Request, res: Response) => {
  const { reference, amount, email, tenantId, planId, billingCycle, callbackUrl } = req.query;

  // Render a responsive HTML checkout mock UI
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>PaymentPoint - Sandbox Checkout</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f7fafc; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; padding: 20px; }
        .card { background-color: white; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); width: 100%; max-width: 450px; border: 1.5px solid #e2e8f0; overflow: hidden; }
        .header { background-color: #1A365D; color: white; padding: 24px; text-align: center; }
        .logo { font-size: 22px; font-weight: bold; letter-spacing: 1px; color: #48BB78; }
        .body { padding: 24px; }
        .title { font-size: 18px; font-weight: 600; color: #2d3748; margin-bottom: 20px; text-align: center; }
        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #edf2f7; font-size: 14px; }
        .label { color: #718096; }
        .value { color: #2d3748; font-weight: 500; }
        .amount-box { text-align: center; padding: 20px; background-color: #f0fff4; border: 1px dashed #48bb78; border-radius: 6px; margin: 20px 0; }
        .amount-val { font-size: 28px; font-weight: 700; color: #276749; }
        .btn { display: block; width: 100%; padding: 12px; background-color: #48BB78; color: white; border: none; border-radius: 6px; font-size: 16px; font-weight: 600; cursor: pointer; text-align: center; text-decoration: none; box-sizing: border-box; transition: background-color 0.2s; }
        .btn:hover { background-color: #38a169; }
        .btn-cancel { display: block; width: 100%; margin-top: 10px; padding: 10px; background-color: transparent; color: #a0aec0; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 14px; cursor: pointer; text-align: center; text-decoration: none; box-sizing: border-box; }
        .btn-cancel:hover { background-color: #f7fafc; color: #718096; }
        .badge { background-color: #fed7d7; color: #9b2c2c; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold; }
      </style>
      <script>
        async function completeMockPayment() {
          const btn = document.getElementById('pay-btn');
          btn.innerHTML = 'Processing Payment...';
          btn.style.backgroundColor = '#a0aec0';
          btn.disabled = true;

          // Simulate sending webhook transaction.success call back to server
          const webhookUrl = 'http://localhost:5000/api/billing/webhook';
          const webhookPayload = {
            event: 'transaction.success',
            data: {
              reference: '${reference}',
              amount: ${amount},
              status: 'success'
            }
          };

          try {
            // Trigger webhook directly (bypass signature in development/mock mode)
            const response = await fetch(webhookUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-PaymentPoint-Signature': 'mock_signature' // bypassed by webhook parser
              },
              body: JSON.stringify(webhookPayload)
            });

            if (response.ok) {
              // Redirect back to admin portal callback url
              window.location.href = '${callbackUrl}?reference=${reference}&status=success';
            } else {
              alert('Payment processing failed. Check backend logs.');
              btn.innerHTML = 'Pay ₦${Number(amount).toLocaleString()}';
              btn.style.backgroundColor = '#48BB78';
              btn.disabled = false;
            }
          } catch(e) {
            alert('Connection error occurred during payment processing: ' + e.message);
            btn.innerHTML = 'Pay ₦${Number(amount).toLocaleString()}';
            btn.style.backgroundColor = '#48BB78';
            btn.disabled = false;
          }
        }
      </script>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div class="logo">PaymentPoint <span class="badge">SANDBOX</span></div>
          <div style="font-size: 12px; margin-top: 5px; color: #a0aec0;">Secured Gateway Payment Checkout</div>
        </div>
        <div class="body">
          <div class="title">SmartSchool Africa SaaS Subscription</div>
          
          <div class="detail-row">
            <span class="label">Plan Tier:</span>
            <span class="value" style="text-transform: capitalize; font-weight: bold;">${planId} Plan (${billingCycle})</span>
          </div>
          <div class="detail-row">
            <span class="label">School Account (Tenant ID):</span>
            <span class="value">${tenantId}</span>
          </div>
          <div class="detail-row">
            <span class="label">Admin Email:</span>
            <span class="value">${email}</span>
          </div>
          <div class="detail-row">
            <span class="label">Payment Reference:</span>
            <span class="value" style="font-family: monospace;">${reference}</span>
          </div>

          <div class="amount-box">
            <div style="font-size: 12px; color: #718096; margin-bottom: 5px;">Total Amount Due</div>
            <div class="amount-val">₦${Number(amount).toLocaleString()}</div>
          </div>

          <button id="pay-btn" class="btn" onclick="completeMockPayment()">Pay ₦${Number(amount).toLocaleString()}</button>
          <a class="btn-cancel" href="${callbackUrl}?reference=${reference}&status=cancelled">Cancel Payment</a>
        </div>
      </div>
    </body>
    </html>
  `;

  res.setHeader('Content-Type', 'text/html');
  return res.status(200).send(html);
};
