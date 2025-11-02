'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';
import Link from 'next/link';

interface PaymentStatus {
  status: 'success' | 'failed' | 'pending' | 'unknown';
  message: string;
  invoiceId?: string;
  amount?: number;
  transactionId?: string;
}

export default function PaymentReturnPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkPaymentStatus = async () => {
      try {
        const orderId = searchParams.get('order_id');
        const status = searchParams.get('status');
        const transactionId = searchParams.get('transaction_id');

        if (!orderId) {
          setPaymentStatus({
            status: 'unknown',
            message: 'Invalid payment reference'
          });
          setLoading(false);
          return;
        }

        // Check payment status from our database
        const response = await fetch(`/api/payment/status?invoiceId=${orderId}`);
        const data = await response.json();

        if (response.ok) {
          setPaymentStatus({
            status: data.status === 'paid' ? 'success' : data.status === 'failed' ? 'failed' : 'pending',
            message: getStatusMessage(data.status),
            invoiceId: orderId,
            amount: data.amount,
            transactionId: transactionId || data.transactionId,
          });
        } else {
          setPaymentStatus({
            status: 'unknown',
            message: 'Unable to verify payment status'
          });
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
        setPaymentStatus({
          status: 'unknown',
          message: 'Error occurred while checking payment status'
        });
      } finally {
        setLoading(false);
      }
    };

    checkPaymentStatus();
  }, [searchParams]);

  const getStatusMessage = (status: string): string => {
    switch (status) {
      case 'paid':
        return 'Your payment has been processed successfully!';
      case 'failed':
        return 'Your payment could not be processed. Please try again.';
      case 'pending':
        return 'Your payment is being processed. Please wait...';
      default:
        return 'Payment status unknown. Please contact support.';
    }
  };

  const getStatusIcon = () => {
    if (loading) {
      return <Loader2 className="w-16 h-16 animate-spin text-blue-600" />;
    }

    switch (paymentStatus?.status) {
      case 'success':
        return <CheckCircle className="w-16 h-16 text-green-600" />;
      case 'failed':
        return <XCircle className="w-16 h-16 text-red-600" />;
      case 'pending':
        return <Clock className="w-16 h-16 text-yellow-600" />;
      default:
        return <XCircle className="w-16 h-16 text-gray-600" />;
    }
  };

  const getStatusColor = () => {
    switch (paymentStatus?.status) {
      case 'success':
        return 'text-green-800 bg-green-50 border-green-200';
      case 'failed':
        return 'text-red-800 bg-red-50 border-red-200';
      case 'pending':
        return 'text-yellow-800 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-800 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center">
          {/* Status Icon */}
          <div className="flex justify-center mb-6">
            {getStatusIcon()}
          </div>

          {/* Status Message */}
          <div className={`p-4 rounded-lg border mb-6 ${getStatusColor()}`}>
            <h1 className="text-xl font-bold mb-2">
              {loading ? 'Processing...' : 
               paymentStatus?.status === 'success' ? 'Payment Successful!' :
               paymentStatus?.status === 'failed' ? 'Payment Failed' :
               paymentStatus?.status === 'pending' ? 'Payment Pending' :
               'Payment Status Unknown'}
            </h1>
            <p className="text-sm">
              {loading ? 'Please wait while we verify your payment...' : paymentStatus?.message}
            </p>
          </div>

          {/* Payment Details */}
          {paymentStatus && !loading && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <h3 className="font-semibold text-gray-800 mb-3">Payment Details</h3>
              <div className="space-y-2 text-sm">
                {paymentStatus.invoiceId && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Invoice ID:</span>
                    <span className="font-mono">{paymentStatus.invoiceId}</span>
                  </div>
                )}
                {paymentStatus.transactionId && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Transaction ID:</span>
                    <span className="font-mono">{paymentStatus.transactionId}</span>
                  </div>
                )}
                {paymentStatus.amount && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-semibold">RM {paymentStatus.amount.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {paymentStatus?.status === 'success' && (
              <Link
                href="/patient/appointments"
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-lg font-semibold transition-colors block text-center"
              >
                View My Appointments
              </Link>
            )}
            
            {paymentStatus?.status === 'failed' && (
              <button
                onClick={() => router.back()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-semibold transition-colors"
              >
                Try Again
              </button>
            )}

            {paymentStatus?.status === 'pending' && (
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-3 px-6 rounded-lg font-semibold transition-colors"
              >
                Refresh Status
              </button>
            )}

            <Link
              href="/patient/dashboard"
              className="w-full bg-gray-600 hover:bg-gray-700 text-white py-3 px-6 rounded-lg font-semibold transition-colors block text-center"
            >
              Back to Dashboard
            </Link>
          </div>

          {/* Support Info */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Having issues? Contact our support team for assistance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}