import { NextRequest, NextResponse } from 'next/server';
import { testBayarCashConfiguration } from '@/lib/payment/test-bayarcash';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Starting BayarCash configuration test...');
    
    const testResult = await testBayarCashConfiguration();
    
    return NextResponse.json({
      success: testResult,
      message: testResult 
        ? 'BayarCash configuration test passed successfully!' 
        : 'BayarCash configuration test failed. Check server logs for details.',
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('❌ BayarCash test API error:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Test failed with error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}