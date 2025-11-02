import { NextRequest, NextResponse } from 'next/server';
import { bayarCashService } from '@/lib/payment/bayarcash';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Debug BayarCash payment creation...');
    
    // Test basic API connectivity first
    console.log('1. Testing API connectivity...');
    const isConnected = await bayarCashService.testConnection();
    console.log(`   API Connected: ${isConnected}`);

    // Test signature generation
    console.log('2. Testing signature generation...');
    const testData = {
      order_id: 'test_123',
      amount: 1000,
      currency: 'MYR',
      timestamp: Math.floor(Date.now() / 1000),
    };
    
    const signature = (bayarCashService as any).generateSignature(testData);
    console.log(`   Signature: ${signature}`);
    console.log(`   Signature length: ${signature.length}`);

    // Test direct API call
    console.log('3. Testing direct API call...');
    const testPayload = {
      order_id: `debug_${Date.now()}`,
      amount: 1000, // RM 10.00
      currency: 'MYR',
      description: 'Debug test payment',
      customer_name: 'Debug User',
      customer_email: 'debug@example.com',
      customer_phone: '+60123456789',
      return_url: process.env.BAYARCASH_RETURN_URL,
      callback_url: process.env.BAYARCASH_CALLBACK_URL,
      timestamp: Math.floor(Date.now() / 1000),
    };

    const payloadSignature = (bayarCashService as any).generateSignature(testPayload);
    const finalPayload = { ...testPayload, signature: payloadSignature };

    console.log('   Final payload keys:', Object.keys(finalPayload));
    console.log('   API URL:', process.env.BAYARCASH_API_URL);

    // Make direct fetch call for debugging
    const response = await fetch(`${process.env.BAYARCASH_API_URL}/payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${process.env.BAYARCASH_PAT}`,
        'X-Portal-Key': process.env.BAYARCASH_PORTAL_KEY,
        'User-Agent': 'Healthcare-Platform/1.0',
      },
      body: JSON.stringify(finalPayload),
    });

    const responseText = await response.text();
    console.log('   Response status:', response.status);
    console.log('   Response headers:', Object.fromEntries(response.headers.entries()));
    console.log('   Response body:', responseText);

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = { raw: responseText };
    }

    return NextResponse.json({
      debug: {
        apiConnected: isConnected,
        signatureGenerated: !!signature,
        signatureLength: signature.length,
        apiUrl: process.env.BAYARCASH_API_URL,
        responseStatus: response.status,
        responseHeaders: Object.fromEntries(response.headers.entries()),
        responseData,
        payloadKeys: Object.keys(finalPayload),
      },
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('❌ Debug test error:', error);
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}