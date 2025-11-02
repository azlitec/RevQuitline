import { NextRequest, NextResponse } from 'next/server';
import { bayarCashService } from '@/lib/payment/bayarcash';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Testing BayarCash payment creation...');
    
    // Test payment request
    const testPaymentRequest = {
      orderId: `test_${Date.now()}`,
      amount: 5000, // RM 50.00 in cents
      currency: 'MYR',
      description: 'Test payment for healthcare appointment',
      customerName: 'John Doe',
      customerEmail: 'john.doe@example.com',
      customerPhone: '+60123456789',
      metadata: {
        appointmentId: 'test_appointment_123',
        testMode: true,
      }
    };

    console.log('📝 Test payment request:', {
      orderId: testPaymentRequest.orderId,
      amount: testPaymentRequest.amount,
      currency: testPaymentRequest.currency,
    });

    const paymentResponse = await bayarCashService.createPayment(testPaymentRequest);

    console.log('📋 Payment response:', {
      success: paymentResponse.success,
      hasPaymentUrl: !!paymentResponse.paymentUrl,
      hasTransactionId: !!paymentResponse.transactionId,
      errorCode: paymentResponse.error?.code,
    });

    return NextResponse.json({
      success: paymentResponse.success,
      message: paymentResponse.success 
        ? 'Payment creation test successful!' 
        : `Payment creation failed: ${paymentResponse.error?.message}`,
      data: {
        orderId: testPaymentRequest.orderId,
        amount: testPaymentRequest.amount,
        hasPaymentUrl: !!paymentResponse.paymentUrl,
        hasTransactionId: !!paymentResponse.transactionId,
        paymentUrl: paymentResponse.paymentUrl,
        transactionId: paymentResponse.transactionId,
        error: paymentResponse.error,
      },
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('❌ Payment creation test error:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Payment creation test failed with error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}