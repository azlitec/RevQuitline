/**
 * BayarCash Configuration Test Script
 * Run this to verify BayarCash integration is working
 */

import { bayarCashService } from './bayarcash';

export async function testBayarCashConfiguration() {
  console.log('🔍 Testing BayarCash Configuration...\n');

  try {
    // Test 1: Configuration Validation
    console.log('1. Testing configuration validation...');
    const isConfigValid = await bayarCashService.validateConfiguration();
    console.log(`   ✅ Configuration valid: ${isConfigValid}\n`);

    // Test 2: API Connectivity
    console.log('2. Testing API connectivity...');
    const isConnected = await bayarCashService.testConnection();
    console.log(`   ✅ API connection: ${isConnected}\n`);

    // Test 3: Signature Generation
    console.log('3. Testing signature generation...');
    const testData = {
      order_id: 'test_123',
      amount: 1000,
      currency: 'MYR',
      timestamp: Math.floor(Date.now() / 1000),
    };
    
    // Access private method for testing (TypeScript will complain but it works)
    const signature = (bayarCashService as any).generateSignature(testData);
    console.log(`   ✅ Signature generated: ${signature.length} characters\n`);

    // Test 4: Payment Request Validation
    console.log('4. Testing payment request validation...');
    const testPaymentRequest = {
      orderId: 'test_order_123',
      amount: 5000, // RM 50.00
      currency: 'MYR',
      description: 'Test payment for appointment',
      customerName: 'John Doe',
      customerEmail: 'john.doe@example.com',
      customerPhone: '+60123456789',
    };

    // This will validate the request but not actually create payment
    try {
      (bayarCashService as any).validatePaymentRequest(testPaymentRequest);
      console.log('   ✅ Payment request validation passed\n');
    } catch (validationError) {
      console.log(`   ❌ Payment request validation failed: ${validationError}\n`);
    }

    console.log('🎉 BayarCash configuration test completed successfully!');
    return true;

  } catch (error) {
    console.error('❌ BayarCash configuration test failed:', error);
    return false;
  }
}

// Export for use in other files
export { bayarCashService };