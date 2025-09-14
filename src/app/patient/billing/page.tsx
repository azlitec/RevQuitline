
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

// Enhanced Icon component with fallbacks
const IconWithFallback = ({ icon, emoji, className = '' }: { 
  icon: string; 
  emoji: string; 
  className?: string;
}) => {
  return (
    <span className={`icon-container ${className}`}>
      <span 
        className="material-icons"
        style={{ 
          fontSize: '24px',
          fontWeight: 'normal',
          fontStyle: 'normal',
          lineHeight: '1',
          letterSpacing: 'normal',
          textTransform: 'none',
          display: 'inline-block',
          whiteSpace: 'nowrap',
          wordWrap: 'normal',
          direction: 'ltr',
          WebkitFontFeatureSettings: '"liga"',
          WebkitFontSmoothing: 'antialiased'
        }}
      >
        {icon}
      </span>
      <span 
        className="emoji-fallback"
        style={{ 
          fontSize: '20px',
          display: 'none'
        }}
      >
        {emoji}
      </span>
    </span>
  );
};

interface Bill {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  doctorName: string;
  serviceType: string;
  description: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue' | 'cancelled';
  paymentDate?: string;
  paymentMethod?: string;
}

interface PaymentMethod {
  id: string;
  type: 'card' | 'bank';
  cardNumber?: string;
  cardType?: string;
  bankName?: string;
  accountNumber?: string;
  isDefault: boolean;
}

export default function PatientBillingPage() {
  const { data: session } = useSession();
  const [bills, setBills] = useState<Bill[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'bills' | 'history' | 'methods'>('bills');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [showAddMethodModal, setShowAddMethodModal] = useState(false);

  useEffect(() => {
    if (session?.user?.id) {
      fetchBills();
      fetchPaymentMethods();
    }
  }, [session]);

  const fetchBills = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/patient/billing');
      
      if (response.ok) {
        const data = await response.json();
        setBills(data.bills || []);
      } else {
        // Show empty state - no bills yet
        setBills([]);
      }
    } catch (err) {
      // Show empty state instead of error - API not yet implemented
      console.log('Billing API not yet implemented - showing empty state');
      setBills([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      const response = await fetch('/api/patient/payment-methods');
      if (response.ok) {
        const data = await response.json();
        setPaymentMethods(data.methods || []);
      } else {
        // Show empty state - no payment methods yet
        setPaymentMethods([]);
      }
    } catch (err) {
      // Show empty state instead of error
      console.log('Payment methods API not yet implemented - showing empty state');
      setPaymentMethods([]);
    }
  };

  const payBill = async (billId: string, paymentMethodId: string) => {
    try {
      const response = await fetch('/api/patient/billing/pay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ billId, paymentMethodId }),
      });

      if (!response.ok) {
        throw new Error('Payment failed');
      }

      await fetchBills();
      setShowPaymentModal(false);
      setSelectedBill(null);
    } catch (err) {
      console.error('Error processing payment:', err);
      setError('Payment failed. Please try again.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'overdue': return 'bg-red-100 text-red-700';
      case 'cancelled': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return { icon: 'check_circle', emoji: '✅' };
      case 'pending': return { icon: 'schedule', emoji: '⏰' };
      case 'overdue': return { icon: 'warning', emoji: '⚠️' };
      case 'cancelled': return { icon: 'cancel', emoji: '❌' };
      default: return { icon: 'help', emoji: '❓' };
    }
  };

  // Calculate billing statistics
  const stats = {
    totalOutstanding: bills.filter(b => b.status === 'pending' || b.status === 'overdue').reduce((sum, b) => sum + b.amount, 0),
    overdueBills: bills.filter(b => b.status === 'overdue').length,
    paidThisMonth: bills.filter(b => {
      if (b.status !== 'paid' || !b.paymentDate) return false;
      const paymentDate = new Date(b.paymentDate);
      const now = new Date();
      return paymentDate.getMonth() === now.getMonth() && paymentDate.getFullYear() === now.getFullYear();
    }).reduce((sum, b) => sum + b.amount, 0),
    totalPaid: bills.filter(b => b.status === 'paid').reduce((sum, b) => sum + b.amount, 0)
  };

  const pendingBills = bills.filter(b => b.status === 'pending' || b.status === 'overdue');
  const paidBills = bills.filter(b => b.status === 'paid');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex items-center space-x-3">
          <div className="animate-spin">
            <IconWithFallback icon="refresh" emoji="🔄" className="text-blue-600" />
          </div>
          <span className="text-gray-600 font-medium">Loading billing information...</span>
        </div>
      </div>
    );
  }


  return (
    <>
      {/* Enhanced Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 md:mb-8 space-y-4 md:space-y-0">
        <div>
          <h2 className="text-xl md:text-2xl font-bold gradient-text">Billing & Payments</h2>
          <p className="text-sm md:text-base text-gray-500 flex items-center">
            Manage your medical bills and payment methods
            <span className="ml-2 text-sm text-gray-400">•</span>
            <span className="ml-2 text-sm text-red-600 font-medium">RM {stats.totalOutstanding.toFixed(2)} outstanding</span>
          </p>
        </div>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          <button
            onClick={() => setShowAddMethodModal(true)}
            className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white px-6 py-3 rounded-lg font-semibold shadow-medium hover:shadow-strong transition-all duration-300 hover:scale-105 flex items-center justify-center space-x-2 text-sm touch-friendly"
          >
            <IconWithFallback icon="credit_card" emoji="💳" className="text-white" />
            <span>Add Payment Method</span>
          </button>
        </div>
      </div>

      {/* Enhanced Billing Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
        <div className="card p-3 md:p-6 shadow-soft hover:shadow-strong transition-all duration-300 hover:scale-105">
          <div className="flex items-center space-x-2 md:space-x-4">
            <div className="bg-gradient-to-r from-red-100 to-red-200 p-2 md:p-3 rounded-lg md:rounded-xl shadow-sm">
              <IconWithFallback icon="account_balance_wallet" emoji="💰" className="text-red-600 text-sm md:text-base" />
            </div>
            <div>
              <p className="text-xs md:text-sm text-gray-500 font-medium">Outstanding</p>
              <p className="text-lg md:text-2xl font-bold text-gray-800">RM {stats.totalOutstanding.toFixed(2)}</p>
              <p className="text-xs text-gray-400 mt-1">Needs attention</p>
            </div>
          </div>
        </div>
        <div className="card p-3 md:p-6 shadow-soft hover:shadow-strong transition-all duration-300 hover:scale-105">
          <div className="flex items-center space-x-2 md:space-x-4">
            <div className="bg-gradient-to-r from-yellow-100 to-yellow-200 p-2 md:p-3 rounded-lg md:rounded-xl shadow-sm">
              <IconWithFallback icon="warning" emoji="⚠️" className="text-yellow-600 text-sm md:text-base" />
            </div>
            <div>
              <p className="text-xs md:text-sm text-gray-500 font-medium">Overdue</p>
              <p className="text-lg md:text-2xl font-bold text-gray-800">{stats.overdueBills}</p>
              <p className="text-xs text-gray-400 mt-1">Past due date</p>
            </div>
          </div>
        </div>
        <div className="card p-3 md:p-6 shadow-soft hover:shadow-strong transition-all duration-300 hover:scale-105">
          <div className="flex items-center space-x-2 md:space-x-4">
            <div className="bg-gradient-to-r from-green-100 to-green-200 p-2 md:p-3 rounded-lg md:rounded-xl shadow-sm">
              <IconWithFallback icon="payments" emoji="💸" className="text-green-600 text-sm md:text-base" />
            </div>
            <div>
              <p className="text-xs md:text-sm text-gray-500 font-medium">Paid This Month</p>
              <p className="text-lg md:text-2xl font-bold text-gray-800">RM {stats.paidThisMonth.toFixed(2)}</p>
              <p className="text-xs text-gray-400 mt-1">Recent payments</p>
            </div>
          </div>
        </div>
        <div className="card p-3 md:p-6 shadow-soft hover:shadow-strong transition-all duration-300 hover:scale-105">
          <div className="flex items-center space-x-2 md:space-x-4">
            <div className="bg-gradient-to-r from-blue-100 to-blue-200 p-2 md:p-3 rounded-lg md:rounded-xl shadow-sm">
              <IconWithFallback icon="receipt" emoji="🧾" className="text-blue-600 text-sm md:text-base" />
            </div>
            <div>
              <p className="text-xs md:text-sm text-gray-500 font-medium">Total Paid</p>
              <p className="text-lg md:text-2xl font-bold text-gray-800">RM {stats.totalPaid.toFixed(2)}</p>
              <p className="text-xs text-gray-400 mt-1">All time</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-4 md:mb-6 w-full md:w-fit overflow-x-auto">
        {[
          { key: 'bills', label: 'Outstanding Bills', shortLabel: 'Bills', icon: 'receipt_long', emoji: '📋' },
          { key: 'history', label: 'Payment History', shortLabel: 'History', icon: 'history', emoji: '📜' },
          { key: 'methods', label: 'Payment Methods', shortLabel: 'Methods', icon: 'credit_card', emoji: '💳' }
        ].map((tab) => (
          <button
            key={tab.key}
            className={`px-3 md:px-6 py-2 md:py-3 rounded-md font-medium transition-all duration-300 flex items-center space-x-1 md:space-x-2 text-sm md:text-base whitespace-nowrap touch-friendly ${
              selectedTab === tab.key
                ? 'bg-white text-blue-600 shadow-soft'
                : 'text-gray-600 hover:text-gray-800 hover:bg-white/50 active:bg-white/70'
            }`}
            onClick={() => setSelectedTab(tab.key as any)}
          >
            <IconWithFallback
              icon={tab.icon}
              emoji={tab.emoji}
              className={selectedTab === tab.key ? 'text-blue-600' : 'text-gray-500'}
            />
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.shortLabel}</span>
          </button>
        ))}
      </div>

      {/* Enhanced Content based on selected tab */}
      <div className="card p-4 md:p-6 shadow-strong hover:shadow-xl transition-all duration-300">
        {selectedTab === 'bills' && (
          <>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Outstanding Bills</h3>
            {pendingBills.length > 0 ? (
              <div className="space-y-4">
                {pendingBills.map((bill) => {
                  const statusIcon = getStatusIcon(bill.status);
                  return (
                    <div key={bill.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-strong bg-gradient-to-r from-white to-gray-50 hover:from-blue-50 hover:to-purple-50 transition-all duration-300 hover:border-blue-300 hover:scale-102">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="font-semibold text-gray-800">Invoice #{bill.invoiceNumber}</h4>
                            <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(bill.status)}`}>
                              <IconWithFallback
                                icon={statusIcon.icon}
                                emoji={statusIcon.emoji}
                                className="text-xs"
                              />
                              <span>{bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}</span>
                            </span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                            <div>
                              <span className="text-gray-500">Doctor:</span>
                              <span className="text-gray-800 font-medium ml-2">{bill.doctorName}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Service:</span>
                              <span className="text-gray-800 font-medium ml-2">{bill.serviceType}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Due Date:</span>
                              <span className="text-gray-800 font-medium ml-2">
                                {new Date(bill.dueDate).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <p className="text-gray-600 text-sm mt-2">{bill.description}</p>
                        </div>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                          <div className="text-right">
                            <p className="text-2xl font-bold text-gray-800">RM {bill.amount.toFixed(2)}</p>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedBill(bill);
                              setShowPaymentModal(true);
                            }}
                            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 shadow-medium hover:shadow-strong transition-all duration-300 hover:scale-105 text-sm touch-friendly"
                          >
                            Pay Now
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gradient-to-r from-green-100 to-green-200 rounded-full flex items-center justify-center mx-auto mb-6 shadow-medium">
                  <IconWithFallback icon="receipt_long" emoji="📋" className="text-green-600 text-3xl" />
                </div>
                <h3 className="text-xl font-bold text-gray-700 mb-3">No outstanding bills</h3>
                <p className="text-gray-500 text-lg">You're all caught up with your payments!</p>
              </div>
            )}
          </>
        )}

        {selectedTab === 'history' && (
          <>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Payment History</h3>
            {paidBills.length > 0 ? (
              <div className="space-y-4">
                {paidBills.map((bill) => (
                  <div key={bill.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-strong bg-gradient-to-r from-white to-gray-50 hover:from-green-50 hover:to-blue-50 transition-all duration-300 hover:border-green-300 hover:scale-102">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-semibold text-gray-800">Invoice #{bill.invoiceNumber}</h4>
                          <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                            <IconWithFallback icon="check_circle" emoji="✅" className="text-xs" />
                            <span>Paid</span>
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-sm">
                          <div>
                            <span className="text-gray-500">Doctor:</span>
                            <span className="text-gray-800 font-medium ml-2">{bill.doctorName}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Service:</span>
                            <span className="text-gray-800 font-medium ml-2">{bill.serviceType}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Payment Date:</span>
                            <span className="text-gray-800 font-medium ml-2">
                              {bill.paymentDate ? new Date(bill.paymentDate).toLocaleDateString() : '-'}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">Method:</span>
                            <span className="text-gray-800 font-medium ml-2">{bill.paymentMethod || 'Card'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-800">RM {bill.amount.toFixed(2)}</p>
                        <button className="text-blue-600 hover:text-blue-800 text-sm transition-colors">
                          Download Receipt
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <IconWithFallback icon="history" emoji="📜" className="text-gray-400 text-2xl" />
                </div>
                <h3 className="text-lg font-medium text-gray-600 mb-2">No payment history</h3>
                <p className="text-gray-500">Your payment history will appear here</p>
              </div>
            )}
          </>
        )}

        {selectedTab === 'methods' && (
          <>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Payment Methods</h3>
              <button
                onClick={() => setShowAddMethodModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors text-sm touch-friendly"
              >
                Add Method
              </button>
            </div>
            {paymentMethods.length > 0 ? (
              <div className="space-y-4">
                {paymentMethods.map((method) => (
                  <div key={method.id} className="border border-gray-200 rounded-xl p-4 flex items-center justify-between hover:shadow-strong bg-gradient-to-r from-white to-gray-50 hover:from-blue-50 hover:to-purple-50 transition-all duration-300 hover:border-blue-300 hover:scale-102">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                        <IconWithFallback 
                          icon={method.type === 'card' ? 'credit_card' : 'account_balance'} 
                          emoji={method.type === 'card' ? '💳' : '🏦'} 
                          className="text-gray-600" 
                        />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-800">
                          {method.type === 'card' ? 
                            `${method.cardType} ending in ${method.cardNumber?.slice(-4)}` :
                            `${method.bankName} - ${method.accountNumber?.slice(-4)}`
                          }
                        </h4>
                        {method.isDefault && (
                          <span className="text-sm text-blue-600 font-medium">Default</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button className="text-gray-600 hover:text-gray-800 p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <IconWithFallback icon="edit" emoji="✏️" />
                      </button>
                      <button className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded-lg transition-colors">
                        <IconWithFallback icon="delete" emoji="🗑️" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6 shadow-medium">
                  <IconWithFallback icon="credit_card" emoji="💳" className="text-gray-400 text-3xl" />
                </div>
                <h3 className="text-xl font-bold text-gray-700 mb-3">No payment methods</h3>
                <p className="text-gray-500 text-lg mb-6">Add a payment method to pay your bills</p>
                <button
                  onClick={() => setShowAddMethodModal(true)}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-3 rounded-lg font-semibold shadow-medium hover:shadow-strong transition-all duration-300 hover:scale-105"
                >
                  Add Payment Method
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedBill && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl md:rounded-2xl shadow-strong w-full max-w-md">
            <div className="p-4 md:p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg md:text-xl font-semibold text-gray-800">Pay Bill</h3>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="text-gray-400 hover:text-gray-600 active:text-gray-800 p-2 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors touch-friendly"
                >
                  <IconWithFallback icon="close" emoji="❌" />
                </button>
              </div>
            </div>
            <div className="p-4 md:p-6">
              <div className="mb-4">
                <h4 className="font-medium text-gray-800 mb-2">Invoice #{selectedBill.invoiceNumber}</h4>
                <p className="text-2xl font-bold text-gray-800">RM {selectedBill.amount.toFixed(2)}</p>
                <p className="text-gray-600">{selectedBill.description}</p>
              </div>
              
              <div className="space-y-3">
                <h5 className="font-medium text-gray-800">Select Payment Method:</h5>
                {paymentMethods.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => payBill(selectedBill.id, method.id)}
                    className="w-full p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
                  >
                    <div className="flex items-center space-x-3">
                      <IconWithFallback 
                        icon={method.type === 'card' ? 'credit_card' : 'account_balance'} 
                        emoji={method.type === 'card' ? '💳' : '🏦'} 
                        className="text-gray-600" 
                      />
                      <div>
                        <p className="font-medium text-gray-800">
                          {method.type === 'card' ? 
                            `${method.cardType} ending in ${method.cardNumber?.slice(-4)}` :
                            `${method.bankName} - ${method.accountNumber?.slice(-4)}`
                          }
                        </p>
                        {method.isDefault && (
                          <p className="text-sm text-blue-600">Default</p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
                {paymentMethods.length === 0 && (
                  <p className="text-gray-500 text-center py-4">
                    No payment methods available. Please add one first.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Payment Method Modal */}
      {showAddMethodModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl md:rounded-2xl shadow-strong w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 md:p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg md:text-xl font-semibold text-gray-800">Add Payment Method</h3>
                <button
                  onClick={() => setShowAddMethodModal(false)}
                  className="text-gray-400 hover:text-gray-600 active:text-gray-800 p-2 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors touch-friendly"
                >
                  <IconWithFallback icon="close" emoji="❌" />
                </button>
              </div>
            </div>
            <div className="p-4 md:p-6">
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Type</label>
                  <select className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300">
                    <option value="card">Credit/Debit Card</option>
                    <option value="bank">Bank Account</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Card Number</label>
                  <input type="text" placeholder="1234 5678 9012 3456" className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300" />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Expiry Date</label>
                    <input type="text" placeholder="MM/YY" className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">CVV</label>
                    <input type="text" placeholder="123" className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300" />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cardholder Name</label>
                  <input type="text" placeholder="Full name on card" className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300" />
                </div>
                
                <div className="flex items-center">
                  <input type="checkbox" className="mr-2" />
                  <label className="text-sm text-gray-700">Set as default payment method</label>
                </div>
                
                <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddMethodModal(false)}
                    className="px-4 md:px-6 py-2 text-sm md:text-base text-gray-600 hover:text-gray-800 active:text-gray-900 transition-colors touch-friendly"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 md:px-6 py-2 text-sm md:text-base bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-medium hover:shadow-strong touch-friendly"
                  >
                    Add Payment Method
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
                  