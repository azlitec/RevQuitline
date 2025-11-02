/**
 * BayarCash Payment Gateway Integration
 * Documentation: https://docs.bayarcash.com/
 */

export interface BayarCashConfig {
  pat: string; // Personal Access Token
  apiSecret: string; // API Secret Key
  portalKey: string; // Portal Key
  apiUrl: string;
  returnUrl: string;
  callbackUrl: string;
}

export interface PaymentRequest {
  orderId: string;
  amount: number; // in cents (RM 1.00 = 100)
  currency: string; // MYR
  description: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
}

export interface PaymentResponse {
  success: boolean;
  paymentUrl?: string;
  transactionId?: string;
  error?: string;
}

export class BayarCashService {
  private config: BayarCashConfig;

  constructor(config: BayarCashConfig) {
    this.config = config;
    this.validateConfig();
  }

  private validateConfig(): void {
    const required = ['pat', 'apiSecret', 'portalKey', 'apiUrl'];
    const missing = required.filter(key => !this.config[key as keyof BayarCashConfig]);
    
    if (missing.length > 0) {
      throw new Error(`Missing BayarCash configuration: ${missing.join(', ')}. Please check your environment variables.`);
    }
  }

  /**
   * Create payment request to BayarCash
   */
  async createPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      const payload = {
        order_id: request.orderId,
        amount: request.amount,
        currency: request.currency,
        description: request.description,
        customer_name: request.customerName,
        customer_email: request.customerEmail,
        customer_phone: request.customerPhone || '',
        return_url: this.config.returnUrl,
        callback_url: this.config.callbackUrl,
        timestamp: Math.floor(Date.now() / 1000),
      };

      // Generate signature
      const signature = this.generateSignature(payload);
      payload.signature = signature;

      const response = await fetch(`${this.config.apiUrl}/payment/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${this.config.pat}`,
          'X-Portal-Key': this.config.portalKey,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok && data.status === 'success') {
        return {
          success: true,
          paymentUrl: data.payment_url,
          transactionId: data.transaction_id,
        };
      } else {
        return {
          success: false,
          error: data.message || 'Payment creation failed',
        };
      }
    } catch (error) {
      console.error('BayarCash payment creation error:', error);
      return {
        success: false,
        error: 'Network error occurred',
      };
    }
  }

  /**
   * Verify payment callback from BayarCash
   */
  verifyCallback(callbackData: any): boolean {
    try {
      const { signature, ...data } = callbackData;
      const expectedSignature = this.generateSignature(data);
      return signature === expectedSignature;
    } catch (error) {
      console.error('Signature verification error:', error);
      return false;
    }
  }

  /**
   * Generate signature for API requests
   */
  private generateSignature(data: any): string {
    // Sort keys alphabetically
    const sortedKeys = Object.keys(data).sort();
    
    // Create query string
    const queryString = sortedKeys
      .map(key => `${key}=${data[key]}`)
      .join('&');
    
    // Append API secret
    const stringToSign = queryString + '&api_secret=' + this.config.apiSecret;
    
    // Generate SHA256 hash
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(stringToSign).digest('hex');
  }

  /**
   * Check payment status
   */
  async checkPaymentStatus(transactionId: string): Promise<any> {
    try {
      const payload = {
        transaction_id: transactionId,
        timestamp: Math.floor(Date.now() / 1000),
      };

      const signature = this.generateSignature(payload);
      payload.signature = signature;

      const response = await fetch(`${this.config.apiUrl}/payment/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${this.config.pat}`,
          'X-Portal-Key': this.config.portalKey,
        },
        body: JSON.stringify(payload),
      });

      return await response.json();
    } catch (error) {
      console.error('Payment status check error:', error);
      return { status: 'error', message: 'Failed to check payment status' };
    }
  }
}

// Initialize BayarCash service
export const bayarCashService = new BayarCashService({
  pat: process.env.BAYARCASH_PAT || '',
  apiSecret: process.env.BAYARCASH_API_SECRET || '',
  portalKey: process.env.BAYARCASH_PORTAL_KEY || '',
  apiUrl: process.env.BAYARCASH_API_URL || 'https://api.bayarcash.com',
  returnUrl: process.env.BAYARCASH_RETURN_URL || `${process.env.NEXTAUTH_URL}/patient/payment/return`,
  callbackUrl: process.env.BAYARCASH_CALLBACK_URL || `${process.env.NEXTAUTH_URL}/api/payment/callback`,
});