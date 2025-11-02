'use client';

import { useState } from 'react';
import { CreditCard, Smartphone, Building, Shield, Clock, CheckCircle } from 'lucide-react';

interface PaymentGuideProps {
  isOpen: boolean;
  onClose: () => void;
  amount?: number;
  appointmentTitle?: string;
}

export default function PaymentGuide({ isOpen, onClose, amount, appointmentTitle }: PaymentGuideProps) {
  const [activeTab, setActiveTab] = useState<'methods' | 'steps' | 'security'>('methods');

  if (!isOpen) return null;

  const paymentMethods = [
    {
      icon: <CreditCard className="w-6 h-6" />,
      title: 'Credit/Debit Card',
      description: 'Visa, Mastercard, American Express',
      supported: true,
    },
    {
      icon: <Smartphone className="w-6 h-6" />,
      title: 'Online Banking',
      description: 'Maybank, CIMB, Public Bank, RHB, and more',
      supported: true,
    },
    {
      icon: <Smartphone className="w-6 h-6" />,
      title: 'E-Wallet',
      description: 'Touch \'n Go eWallet, GrabPay, Boost',
      supported: true,
    },
    {
      icon: <Building className="w-6 h-6" />,
      title: 'Bank Transfer',
      description: 'Direct bank transfer (FPX)',
      supported: true,
    },
  ];

  const paymentSteps = [
    {
      step: 1,
      title: 'Click Pay Now',
      description: 'Click the "Pay Now" button on your appointment',
    },
    {
      step: 2,
      title: 'Choose Payment Method',
      description: 'Select your preferred payment method from the available options',
    },
    {
      step: 3,
      title: 'Enter Payment Details',
      description: 'Fill in your payment information securely',
    },
    {
      step: 4,
      title: 'Confirm Payment',
      description: 'Review and confirm your payment details',
    },
    {
      step: 5,
      title: 'Payment Complete',
      description: 'Your appointment will be confirmed automatically',
    },
  ];

  const securityFeatures = [
    {
      icon: <Shield className="w-5 h-5 text-green-600" />,
      title: 'SSL Encryption',
      description: 'All payment data is encrypted with 256-bit SSL',
    },
    {
      icon: <Shield className="w-5 h-5 text-green-600" />,
      title: 'PCI DSS Compliant',
      description: 'Meets international payment security standards',
    },
    {
      icon: <Shield className="w-5 h-5 text-green-600" />,
      title: 'Bank-Level Security',
      description: 'Same security standards used by major banks',
    },
    {
      icon: <Clock className="w-5 h-5 text-blue-600" />,
      title: 'Instant Processing',
      description: 'Payments are processed immediately',
    },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Payment Guide</h2>
              {appointmentTitle && (
                <p className="text-sm text-gray-600 mt-1">{appointmentTitle}</p>
              )}
              {amount && (
                <p className="text-lg font-semibold text-blue-600 mt-2">
                  Amount: RM {amount.toFixed(2)}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('methods')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === 'methods'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Payment Methods
          </button>
          <button
            onClick={() => setActiveTab('steps')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === 'steps'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            How to Pay
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === 'security'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Security
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'methods' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Available Payment Methods
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paymentMethods.map((method, index) => (
                  <div
                    key={index}
                    className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="text-blue-600">{method.icon}</div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-800">{method.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{method.description}</p>
                        {method.supported && (
                          <div className="flex items-center mt-2">
                            <CheckCircle className="w-4 h-4 text-green-600 mr-1" />
                            <span className="text-xs text-green-600 font-medium">Supported</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'steps' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Payment Process
              </h3>
              <div className="space-y-4">
                {paymentSteps.map((step, index) => (
                  <div key={index} className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                      {step.step}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-800">{step.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                <div className="flex items-start space-x-3">
                  <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-800">Payment Processing Time</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Most payments are processed instantly. Bank transfers may take 1-2 minutes.
                      You'll receive a confirmation once payment is successful.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Payment Security
              </h3>
              <div className="space-y-4">
                {securityFeatures.map((feature, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    {feature.icon}
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-800">{feature.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-6">
                <div className="flex items-start space-x-3">
                  <Shield className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-green-800">Your Data is Safe</h4>
                    <p className="text-sm text-green-700 mt-1">
                      We never store your payment information. All transactions are processed
                      securely through BayarCash, a trusted Malaysian payment gateway.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Need help? Contact our support team.
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}