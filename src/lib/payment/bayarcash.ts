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
  debug?: boolean;
  timeout?: number;
  retryAttempts?: number;
}

export interface PaymentRequest {
  orderId: string;
  amount: number; // in cents (RM 1.00 = 100)
  currency: string; // MYR
  description: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  metadata?: Record<string, any>;
}

export interface PaymentError {
  code: string;
  message: string;
  details?: any;
  retryable: boolean;
}

export interface PaymentResponse {
  success: boolean;
  paymentUrl?: string;
  transactionId?: string;
  error?: PaymentError;
  debugInfo?: any;
}

export interface PaymentStatusResponse {
  status: string;
  transactionId?: string;
  amount?: number;
  currency?: string;
  paidAt?: Date;
  error?: PaymentError;
}

export class BayarCashService {
  private config: BayarCashConfig;
  private correlationId: string;

  constructor(config: BayarCashConfig) {
    this.config = {
      ...config,
      debug: config.debug ?? process.env.NODE_ENV === 'development',
      timeout: config.timeout ?? 30000,
      retryAttempts: config.retryAttempts ?? 3,
    };
    this.correlationId = this.generateCorrelationId();
    this.validateConfig();
  }

  private generateCorrelationId(): string {
    return `bc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private log(level: 'info' | 'error' | 'debug', message: string, data?: any): void {
    const logData = {
      correlationId: this.correlationId,
      service: 'BayarCash',
      message,
      ...(data && { data }),
      timestamp: new Date().toISOString(),
    };

    if (level === 'error') {
      console.error('[BayarCash Error]', logData);
    } else if (level === 'debug' && this.config.debug) {
      console.log('[BayarCash Debug]', logData);
    } else if (level === 'info') {
      console.log('[BayarCash Info]', logData);
    }
  }

  private validateConfig(): void {
    const required = ['pat', 'apiSecret', 'portalKey', 'apiUrl'];
    const missing = required.filter(key => !this.config[key as keyof BayarCashConfig]);
    
    if (missing.length > 0) {
      const error = `Missing BayarCash configuration: ${missing.join(', ')}. Please check your environment variables.`;
      this.log('error', 'Configuration validation failed', { missing });
      throw new Error(error);
    }

    // Validate URL formats
    try {
      new URL(this.config.apiUrl);
      new URL(this.config.returnUrl);
      new URL(this.config.callbackUrl);
    } catch (urlError) {
      const error = 'Invalid URL format in BayarCash configuration';
      this.log('error', error, { urlError });
      throw new Error(error);
    }

    // Validate credential formats
    if (!this.config.pat.startsWith('eyJ') && !this.config.pat.startsWith('pat_')) {
      this.log('error', 'Invalid PAT format - should be JWT or start with pat_');
      throw new Error('Invalid Personal Access Token format');
    }

    if (this.config.apiSecret.length < 20) {
      this.log('error', 'API Secret appears to be too short');
      throw new Error('Invalid API Secret - appears to be too short');
    }

    if (this.config.portalKey.length < 20) {
      this.log('error', 'Portal Key appears to be too short');
      throw new Error('Invalid Portal Key - appears to be too short');
    }

    this.log('info', 'BayarCash configuration validated successfully');
  }

  /**
   * Test API connectivity
   */
  async testConnection(): Promise<boolean> {
    try {
      this.log('debug', 'Testing BayarCash API connectivity');
      
      // ✅ Only PAT in Authorization header
      const response = await fetch(`${this.config.apiUrl}/test`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.pat}`,
          'User-Agent': 'Healthcare-Platform/1.0',
        },
        signal: AbortSignal.timeout(this.config.timeout!),
      });

      const isConnected = response.status < 500; // Accept 4xx as "connected but auth issue"
      this.log('info', 'API connectivity test completed', { 
        status: response.status, 
        connected: isConnected 
      });
      
      return isConnected;
    } catch (error) {
      this.log('error', 'API connectivity test failed', { error });
      return false;
    }
  }

  /**
   * Validate configuration and test connectivity
   */
  async validateConfiguration(): Promise<boolean> {
    try {
      this.validateConfig();
      return await this.testConnection();
    } catch (error) {
      this.log('error', 'Configuration validation failed', { error });
      return false;
    }
  }

  /**
   * Create payment request to BayarCash
   */
  async createPayment(request: PaymentRequest): Promise<PaymentResponse> {
    const requestId = this.generateCorrelationId();
    this.log('info', 'Creating payment request', { 
      requestId, 
      orderId: request.orderId, 
      amount: request.amount 
    });

    try {
      // Validate request data
      this.validatePaymentRequest(request);

      const payload = {
        portal_key: this.config.portalKey, // ✅ Portal key in request body
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
        ...(request.metadata && { metadata: request.metadata }),
      };

      // Generate signature
      const signature = this.generateSignature(payload);
      const payloadWithSignature = { ...payload, signature };

      this.log('debug', 'Payment payload prepared', { 
        requestId,
        payloadKeys: Object.keys(payloadWithSignature),
        signatureLength: signature.length
      });

      const response = await this.makeApiRequest('/payment', {
        method: 'POST',
        body: JSON.stringify(payloadWithSignature),
      });

      const data = await response.json();

      this.log('debug', 'BayarCash API response received', { 
        requestId,
        status: response.status,
        responseKeys: Object.keys(data)
      });

      if (response.ok && data.status === 'success') {
        this.log('info', 'Payment created successfully', { 
          requestId,
          transactionId: data.transaction_id 
        });
        
        return {
          success: true,
          paymentUrl: data.payment_url,
          transactionId: data.transaction_id,
          debugInfo: this.config.debug ? { requestId, payload: payloadWithSignature } : undefined,
        };
      } else {
        const error: PaymentError = {
          code: data.error_code || 'PAYMENT_CREATION_FAILED',
          message: data.message || 'Payment creation failed',
          details: data,
          retryable: response.status >= 500 || response.status === 429,
        };

        this.log('error', 'Payment creation failed', { 
          requestId, 
          error,
          responseStatus: response.status 
        });

        return {
          success: false,
          error,
          debugInfo: this.config.debug ? { requestId, response: data } : undefined,
        };
      }
    } catch (error) {
      const paymentError: PaymentError = {
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Network error occurred',
        details: error,
        retryable: true,
      };

      this.log('error', 'Payment creation network error', { 
        requestId, 
        error: paymentError 
      });

      return {
        success: false,
        error: paymentError,
        debugInfo: this.config.debug ? { requestId, originalError: error } : undefined,
      };
    }
  }

  private validatePaymentRequest(request: PaymentRequest): void {
    if (!request.orderId || request.orderId.trim().length === 0) {
      throw new Error('Order ID is required');
    }
    if (!request.amount || request.amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }
    if (!request.currency || request.currency !== 'MYR') {
      throw new Error('Currency must be MYR');
    }
    if (!request.customerName || request.customerName.trim().length === 0) {
      throw new Error('Customer name is required');
    }
    if (!request.customerEmail || !this.isValidEmail(request.customerEmail)) {
      throw new Error('Valid customer email is required');
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private async makeApiRequest(endpoint: string, options: RequestInit): Promise<Response> {
    const url = `${this.config.apiUrl}${endpoint}`;
    
    // ✅ Only PAT in Authorization header, NO X-Portal-Key header
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${this.config.pat}`,
      'User-Agent': 'Healthcare-Platform/1.0',
    };

    const requestOptions: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
      signal: AbortSignal.timeout(this.config.timeout!),
    };

    return fetch(url, requestOptions);
  }

  /**
   * Verify payment callback from BayarCash
   */
  verifyCallback(callbackData: any): boolean {
    const verificationId = this.generateCorrelationId();
    this.log('debug', 'Verifying callback signature', { 
      verificationId,
      dataKeys: Object.keys(callbackData)
    });

    try {
      if (!callbackData || typeof callbackData !== 'object') {
        this.log('error', 'Invalid callback data format', { verificationId });
        return false;
      }

      const { signature, ...data } = callbackData;
      
      if (!signature) {
        this.log('error', 'Missing signature in callback data', { verificationId });
        return false;
      }

      const expectedSignature = this.generateSignature(data);
      const isValid = signature === expectedSignature;

      this.log(isValid ? 'info' : 'error', 'Callback signature verification completed', { 
        verificationId,
        isValid,
        signatureLength: signature.length,
        expectedSignatureLength: expectedSignature.length
      });

      if (!isValid) {
        this.log('error', 'Signature mismatch detected', { 
          verificationId,
          receivedSignature: signature.substring(0, 10) + '...',
          expectedSignature: expectedSignature.substring(0, 10) + '...'
        });
      }

      return isValid;
    } catch (error) {
      this.log('error', 'Signature verification error', { 
        verificationId, 
        error 
      });
      return false;
    }
  }

  /**
   * Generate signature for API requests
   */
  private generateSignature(data: any): string {
    try {
      // Sort keys alphabetically
      const sortedKeys = Object.keys(data).sort();
      
      // Create query string with proper encoding
      const queryString = sortedKeys
        .map(key => {
          const value = data[key];
          // Handle different data types properly
          const encodedValue = typeof value === 'object' 
            ? JSON.stringify(value) 
            : String(value);
          return `${key}=${encodedValue}`;
        })
        .join('&');
      
      // Append API secret
      const stringToSign = queryString + '&api_secret=' + this.config.apiSecret;
      
      this.log('debug', 'Generating signature', {
        keysCount: sortedKeys.length,
        queryStringLength: queryString.length,
        stringToSignLength: stringToSign.length
      });
      
      // Generate SHA256 hash
      const crypto = require('crypto');
      const signature = crypto.createHash('sha256').update(stringToSign).digest('hex');
      
      this.log('debug', 'Signature generated successfully', {
        signatureLength: signature.length
      });
      
      return signature;
    } catch (error) {
      this.log('error', 'Signature generation failed', { error });
      throw new Error('Failed to generate signature');
    }
  }

  /**
   * Check payment status
   */
  async checkPaymentStatus(transactionId: string): Promise<PaymentStatusResponse> {
    const statusCheckId = this.generateCorrelationId();
    this.log('info', 'Checking payment status', { 
      statusCheckId, 
      transactionId 
    });

    try {
      if (!transactionId || transactionId.trim().length === 0) {
        throw new Error('Transaction ID is required');
      }

      const payload = {
        portal_key: this.config.portalKey, // ✅ Portal key in request body
        transaction_id: transactionId,
        timestamp: Math.floor(Date.now() / 1000),
      };

      const signature = this.generateSignature(payload);
      const payloadWithSignature = { ...payload, signature };

      this.log('debug', 'Status check payload prepared', { 
        statusCheckId,
        transactionId 
      });

      const response = await this.makeApiRequest('/payment/status', {
        method: 'POST',
        body: JSON.stringify(payloadWithSignature),
      });

      const data = await response.json();

      this.log('debug', 'Status check response received', { 
        statusCheckId,
        status: response.status,
        paymentStatus: data.status
      });

      if (response.ok) {
        return {
          status: data.status,
          transactionId: data.transaction_id,
          amount: data.amount,
          currency: data.currency,
          paidAt: data.paid_at ? new Date(data.paid_at) : undefined,
        };
      } else {
        const error: PaymentError = {
          code: data.error_code || 'STATUS_CHECK_FAILED',
          message: data.message || 'Failed to check payment status',
          details: data,
          retryable: response.status >= 500,
        };

        this.log('error', 'Payment status check failed', { 
          statusCheckId, 
          error 
        });

        return { status: 'error', error };
      }
    } catch (error) {
      const paymentError: PaymentError = {
        code: 'STATUS_CHECK_ERROR',
        message: error instanceof Error ? error.message : 'Failed to check payment status',
        details: error,
        retryable: true,
      };

      this.log('error', 'Payment status check error', { 
        statusCheckId, 
        error: paymentError 
      });

      return { status: 'error', error: paymentError };
    }
  }
}

// Initialize BayarCash service with enhanced configuration
export const bayarCashService = new BayarCashService({
  pat: process.env.BAYARCASH_PAT || '',
  apiSecret: process.env.BAYARCASH_API_SECRET || '',
  portalKey: process.env.BAYARCASH_PORTAL_KEY || '',
  apiUrl: process.env.BAYARCASH_API_URL || 'https://console.bayarcash-sandbox.com/api/v2',
  returnUrl: process.env.BAYARCASH_RETURN_URL || `${process.env.NEXTAUTH_URL}/patient/payment/return`,
  callbackUrl: process.env.BAYARCASH_CALLBACK_URL || `${process.env.NEXTAUTH_URL}/api/payment/callback`,
  debug: process.env.BAYARCASH_DEBUG === 'true' || process.env.NODE_ENV === 'development',
  timeout: parseInt(process.env.BAYARCASH_TIMEOUT || '30000'),
  retryAttempts: parseInt(process.env.BAYARCASH_RETRY_ATTEMPTS || '3'),
});