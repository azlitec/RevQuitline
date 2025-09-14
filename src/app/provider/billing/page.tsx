'use client';

import { useState, useEffect } from 'react';

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

interface Invoice {
  id: string;
  invoiceNumber: string;
  patientName: string;
  patientInitials: string;
  service: string;
  amount: string;
  date: string;
  status: 'paid' | 'pending' | 'overdue';
}

export default function ProviderBillingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showNewInvoiceModal, setShowNewInvoiceModal] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      
      // Mock data for demonstration
      const mockInvoices: Invoice[] = [
        {
          id: '1',
          invoiceNumber: '#INV001',
          patientName: 'Ahmad Rahman',
          patientInitials: 'AR',
          service: 'Free-smoking Session',
          amount: 'RM 150.00',
          date: 'Sept 9, 2025',
          status: 'paid'
        },
        {
          id: '2',
          invoiceNumber: '#INV002',
          patientName: 'Siti Nurhaliza',
          patientInitials: 'SN',
          service: 'General Consultation',
          amount: 'RM 80.00',
          date: 'Sept 9, 2025',
          status: 'pending'
        },
        {
          id: '3',
          invoiceNumber: '#INV003',
          patientName: 'Raj Kumar',
          patientInitials: 'RK',
          service: 'Follow-up Session',
          amount: 'RM 100.00',
          date: 'Sept 8, 2025',
          status: 'paid'
        },
        {
          id: '4',
          invoiceNumber: '#INV004',
          patientName: 'Lim Wei Ming',
          patientInitials: 'LW',
          service: 'Free-smoking Session',
          amount: 'RM 150.00',
          date: 'Sept 7, 2025',
          status: 'overdue'
        }
      ];
      
      setInvoices(mockInvoices);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = 
      invoice.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'overdue': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex items-center space-x-3">
          <div className="animate-spin">
            <IconWithFallback icon="refresh" emoji="🔄" className="text-blue-600" />
          </div>
          <span className="text-gray-600 font-medium">Loading billing data...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Billing & Invoicing</h2>
          <p className="text-gray-500">Manage payments and financial transactions</p>
        </div>
        <button 
          onClick={() => setShowNewInvoiceModal(true)}
          className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors shadow-medium hover:shadow-strong flex items-center space-x-2"
        >
          <IconWithFallback icon="receipt" emoji="🧾" className="text-white" />
          <span>Create Invoice</span>
        </button>
      </div>

      {/* Billing Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card p-6 hover-effect shadow-soft">
          <div className="flex items-center space-x-4">
            <div className="bg-green-100 p-3 rounded-xl">
              <IconWithFallback icon="account_balance_wallet" emoji="💰" className="text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-800">RM 18,450</p>
              <p className="text-sm text-green-600">+24% this month</p>
            </div>
          </div>
        </div>
        <div className="card p-6 hover-effect shadow-soft">
          <div className="flex items-center space-x-4">
            <div className="bg-blue-100 p-3 rounded-xl">
              <IconWithFallback icon="pending" emoji="⏳" className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-2xl font-bold text-gray-800">RM 2,340</p>
              <p className="text-sm text-gray-500">8 invoices</p>
            </div>
          </div>
        </div>
        <div className="card p-6 hover-effect shadow-soft">
          <div className="flex items-center space-x-4">
            <div className="bg-yellow-100 p-3 rounded-xl">
              <IconWithFallback icon="schedule" emoji="⏰" className="text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Overdue</p>
              <p className="text-2xl font-bold text-gray-800">RM 450</p>
              <p className="text-sm text-red-600">2 invoices</p>
            </div>
          </div>
        </div>
        <div className="card p-6 hover-effect shadow-soft">
          <div className="flex items-center space-x-4">
            <div className="bg-purple-100 p-3 rounded-xl">
              <IconWithFallback icon="trending_up" emoji="📈" className="text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Paid</p>
              <p className="text-2xl font-bold text-gray-800">RM 15,660</p>
              <p className="text-sm text-green-600">142 invoices</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="card p-6 mb-8 shadow-soft">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-800">Recent Transactions</h3>
          <div className="flex space-x-3">
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                <IconWithFallback icon="search" emoji="🔍" className="text-gray-400" />
              </div>
              <input 
                type="text" 
                placeholder="Search transactions..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
              />
            </div>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
            >
              <option value="all">All Status</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Invoice #</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Patient</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Service</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Amount</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.length > 0 ? (
                filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-4">
                      <p className="font-medium text-blue-600">{invoice.invoiceNumber}</p>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 patient-avatar rounded-full flex items-center justify-center text-white text-sm font-semibold">
                          {invoice.patientInitials}
                        </div>
                        <span className="font-medium text-gray-800">{invoice.patientName}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-gray-800">{invoice.service}</p>
                    </td>
                    <td className="py-4 px-4">
                      <p className="font-semibold text-gray-800">{invoice.amount}</p>
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-gray-800">{invoice.date}</p>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(invoice.status)}`}>
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex space-x-2">
                        <button className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded-lg transition-colors" title="View Invoice">
                          <IconWithFallback icon="visibility" emoji="👁️" className="text-sm" />
                        </button>
                        <button className="text-gray-600 hover:text-gray-800 p-2 hover:bg-gray-50 rounded-lg transition-colors" title="Download">
                          <IconWithFallback icon="download" emoji="💾" className="text-sm" />
                        </button>
                        <button className="text-purple-600 hover:text-purple-800 p-2 hover:bg-purple-50 rounded-lg transition-colors" title="Send Email">
                          <IconWithFallback icon="email" emoji="📧" className="text-sm" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <div className="flex flex-col items-center space-y-3">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                        <IconWithFallback icon="receipt_long" emoji="🧾" className="text-gray-400 text-2xl" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-600">No transactions found</h3>
                      <p className="text-gray-500">Try adjusting your search or filter criteria</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Invoice Modal */}
      {showNewInvoiceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-strong w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-gray-800">Create New Invoice</h3>
                <button 
                  onClick={() => setShowNewInvoiceModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <IconWithFallback icon="close" emoji="❌" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <form className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Patient</label>
                    <select className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-300">
                      <option>Select Patient</option>
                      <option>Ahmad Rahman</option>
                      <option>Siti Nurhaliza</option>
                      <option>Raj Kumar</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Service</label>
                    <select className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-300">
                      <option>Free-smoking Session</option>
                      <option>General Consultation</option>
                      <option>Follow-up Session</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                    <input type="text" className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-300" placeholder="RM 0.00" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                    <input type="date" className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-300" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea rows={3} className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-300" placeholder="Service description..."></textarea>
                </div>
              </form>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button 
                onClick={() => setShowNewInvoiceModal(false)}
                className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-medium hover:shadow-strong">
                Create Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}