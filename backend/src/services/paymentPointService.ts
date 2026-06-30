import crypto from 'crypto';

export interface InitializePaymentResult {
  checkoutUrl: string;
  reference: string;
}

export interface VerifyPaymentResult {
  status: 'success' | 'failed' | 'pending';
  amount: number;
  currency: string;
  reference: string;
  metadata: {
    tenantId: string;
    planId: string;
    billingCycle: 'monthly' | 'yearly';
  };
}

/**
 * PaymentPoint Service
 * 
 * Handles interactions with PaymentPoint.com payment gateway.
 * Implements transaction initialization, verification, and webhook checking.
 * Supports local mock mode if environment variables are not set.
 */
class PaymentPointService {
  private mockDatabase = new Map<string, any>();

  private getSecretKey(): string | undefined {
    return process.env.PAYMENTPOINT_SECRET_KEY;
  }

  private getWebhookSecret(): string | undefined {
    return process.env.PAYMENTPOINT_WEBHOOK_SECRET;
  }

  private getApiUrl(): string {
    return process.env.PAYMENTPOINT_API_URL || 'https://api.paymentpoint.com/v1';
  }

  /**
   * Initializes a Checkout Session for Subscription Upgrade
   * 
   * @param email School admin email
   * @param amount Charge amount in NGN
   * @param metadata Subscription details (tenantId, planId, billingCycle)
   * @param callbackUrl Redirect URL after payment completion
   */
  async initializePayment(
    email: string,
    amount: number,
    metadata: any,
    callbackUrl: string
  ): Promise<InitializePaymentResult> {
    const secretKey = this.getSecretKey();
    const reference = `pp_ref_${crypto.randomBytes(12).toString('hex')}`;

    // If keys are not set, fall back to mock sandbox flow automatically for easy testing
    if (!secretKey || secretKey.includes('_sandbox_') || secretKey === 'placeholder') {
      console.log(`[PaymentPoint Mock] Initializing payment reference ${reference} for ${email} of amount ₦${amount}`);
      
      // Cache details dynamically for verification
      this.mockDatabase.set(reference, {
        status: 'success',
        amount,
        currency: 'NGN',
        reference,
        metadata: {
          tenantId: metadata.tenantId,
          planId: metadata.planId,
          billingCycle: metadata.billingCycle,
        },
      });

      const mockCheckoutUrl = `http://localhost:5000/api/billing/mock-checkout?reference=${reference}&amount=${amount}&email=${encodeURIComponent(email)}&tenantId=${metadata.tenantId}&planId=${metadata.planId}&billingCycle=${metadata.billingCycle}&callbackUrl=${encodeURIComponent(callbackUrl)}`;
      return {
        checkoutUrl: mockCheckoutUrl,
        reference,
      };
    }

    try {
      const response = await fetch(`${this.getApiUrl()}/checkout/initialize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          amount, // PaymentPoint expects minor units (kobo) or major units depending on spec. We assume major units (naira).
          currency: 'NGN',
          reference,
          callbackUrl,
          metadata,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`PaymentPoint API error: ${response.status} - ${errorText}`);
      }

      const resJson = await response.json() as any;
      if (resJson.status && resJson.data?.authorizationUrl) {
        return {
          checkoutUrl: resJson.data.authorizationUrl,
          reference: resJson.data.reference || reference,
        };
      }

      throw new Error(resJson.message || 'Failed to initialize payment session with PaymentPoint');
    } catch (error: any) {
      console.error('PaymentPoint initializePayment error:', error.message);
      throw error;
    }
  }

  /**
   * Verifies the status of a specific transaction
   * 
   * @param reference Transaction reference code
   */
  async verifyPayment(reference: string): Promise<VerifyPaymentResult> {
    const secretKey = this.getSecretKey();

    // Mock verification fallback
    if (!secretKey || secretKey === 'placeholder') {
      console.log(`[PaymentPoint Mock] Verifying reference ${reference}`);
      
      const cached = this.mockDatabase.get(reference);
      if (cached) {
        return cached;
      }

      // Default fallback representing tenant 0
      return {
        status: 'success',
        amount: 50000,
        currency: 'NGN',
        reference,
        metadata: {
          tenantId: '6a42c6a44e310656889e47ef', // Default school ObjectId
          planId: 'professional',
          billingCycle: 'monthly',
        },
      };
    }

    try {
      const response = await fetch(`${this.getApiUrl()}/transactions/verify/${reference}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${secretKey}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`PaymentPoint API error: ${response.status} - ${errorText}`);
      }

      const resJson = await response.json() as any;
      if (resJson.status && resJson.data) {
        const data = resJson.data;
        return {
          status: data.status === 'success' ? 'success' : data.status === 'failed' ? 'failed' : 'pending',
          amount: data.amount,
          currency: data.currency || 'NGN',
          reference: data.reference,
          metadata: data.metadata || {},
        };
      }

      throw new Error(resJson.message || 'Failed to verify transaction status');
    } catch (error: any) {
      console.error('PaymentPoint verifyPayment error:', error.message);
      throw error;
    }
  }

  /**
   * Validates the webhook signature header sent by PaymentPoint
   * 
   * @param signature X-PaymentPoint-Signature header value
   * @param rawBody Raw JSON string body
   */
  verifyWebhookSignature(signature: string, rawBody: string): boolean {
    const webhookSecret = this.getWebhookSecret();
    if (!webhookSecret) {
      // If webhook secret is not configured, bypass signature check in dev mode for easy webhook testing
      if (process.env.NODE_ENV !== 'production') {
        console.warn('WARNING: PAYMENTPOINT_WEBHOOK_SECRET is not defined. Webhook signature checking bypassed.');
        return true;
      }
      return false;
    }

    const calculatedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    return calculatedSignature === signature;
  }
}

export const paymentPointService = new PaymentPointService();
export default paymentPointService;
