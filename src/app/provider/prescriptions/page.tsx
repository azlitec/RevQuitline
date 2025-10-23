'use client';

import { useState, useEffect } from 'react';
import PrescriptionForm from '@/components/provider/PrescriptionForm';

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

interface Prescription {
  id: string;
  patientName: string;
  patientInitials: string;
  medication: string;
  dosage: string;
  duration: string;
  date: string;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
  raw?: any;
}

export default function ProviderPrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewPrescriptionModal, setShowNewPrescriptionModal] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState<any | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [patientSearch, setPatientSearch] = useState<string>('');

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  const fetchPrescriptions = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      params.set('page', '0');
      params.set('pageSize', '50');
      if (statusFilter) params.set('status', statusFilter);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);

      const response = await fetch(`/api/provider/prescriptions?${params.toString()}`);

      if (response.ok) {
        const data = await response.json();
        const items = Array.isArray(data?.data?.items)
          ? data.data.items
          : (Array.isArray(data?.items) ? data.items : []);
        const mapped: Prescription[] = items
          .map((it: any) => {
            const first = it.patient?.firstName ?? '';
            const last = it.patient?.lastName ?? '';
            const patientName = [first, last].filter(Boolean).join(' ').trim() || 'Unknown';
            const initials = `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase() || 'PT';
            return {
              id: it.id,
              patientName,
              patientInitials: initials,
              medication: it.medicationName,
              dosage: it.dosage,
              duration: it.duration,
              date: new Date(it.prescribedDate).toLocaleDateString(),
              status: it.status,
              raw: it,
            };
          })
          .filter((p: Prescription) => {
            const q = patientSearch.trim().toLowerCase();
            return q ? p.patientName.toLowerCase().includes(q) : true;
          });
        setPrescriptions(mapped);
      } else {
        setPrescriptions([]);
      }
    } catch (error) {
      console.error('Error fetching prescriptions:', error);
      setPrescriptions([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-yellow-100 text-yellow-700';
      case 'ACTIVE': return 'bg-green-100 text-green-700';
      case 'COMPLETED': return 'bg-blue-100 text-blue-700';
      case 'CANCELLED': return 'bg-red-100 text-red-700';
      case 'EXPIRED': return 'bg-gray-200 text-gray-700';
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
          <span className="text-gray-600 font-medium">Loading prescriptions...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Prescription Management</h2>
          <p className="text-gray-500">Create and manage patient prescriptions</p>
        </div>
        <button
          onClick={() => { setSelectedDraft(null); setShowNewPrescriptionModal(true); }}
          className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors shadow-medium hover:shadow-strong flex items-center space-x-2"
        >
          <IconWithFallback icon="add" emoji="➕" className="text-white" />
          <span>New Prescription</span>
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6 shadow-soft">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">All</option>
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="EXPIRED">Expired</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Date From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Date To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Patient Search</label>
            <input
              type="text"
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              placeholder="Search patient name"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={fetchPrescriptions}
            className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            Apply Filters
          </button>
          <button
            onClick={() => { setStatusFilter(''); setDateFrom(''); setDateTo(''); setPatientSearch(''); fetchPrescriptions(); }}
            className="px-3 py-2 rounded border border-gray-300 hover:bg-gray-50"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Prescription Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card p-6 hover-effect shadow-soft">
          <div className="flex items-center space-x-4">
            <div className="bg-purple-100 p-4 rounded-xl">
              <IconWithFallback icon="medication" emoji="💊" className="text-purple-600 text-2xl" />
            </div>
            <div>
              <p className="text-sm text-gray-500">This Week</p>
              <p className="text-3xl font-bold text-gray-800">{prescriptions.length}</p>
              <p className="text-sm text-green-600">Prescriptions issued</p>
            </div>
          </div>
        </div>
        <div className="card p-6 hover-effect shadow-soft">
          <div className="flex items-center space-x-4">
            <div className="bg-yellow-100 p-4 rounded-xl">
              <IconWithFallback icon="pending" emoji="⏳" className="text-yellow-600 text-2xl" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-3xl font-bold text-gray-800">{prescriptions.filter(p => p.status === 'DRAFT').length}</p>
              <p className="text-sm text-yellow-600">Draft prescriptions</p>
            </div>
          </div>
        </div>
        <div className="card p-6 hover-effect shadow-soft">
          <div className="flex items-center space-x-4">
            <div className="bg-green-100 p-4 rounded-xl">
              <IconWithFallback icon="check_circle" emoji="✅" className="text-green-600 text-2xl" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active</p>
              <p className="text-3xl font-bold text-gray-800">{prescriptions.filter(p => p.status === 'ACTIVE').length}</p>
              <p className="text-sm text-green-600">Currently active</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Prescriptions */}
      <div className="card p-6 shadow-soft">
        <h3 className="text-lg font-semibold text-gray-800 mb-6">Recent Prescriptions</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Patient</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Medication</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Dosage</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Duration</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {prescriptions.map((prescription) => (
                <tr key={prescription.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 patient-avatar rounded-full flex items-center justify-center text-white font-semibold">
                        {prescription.patientInitials}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{prescription.patientName}</p>
                        <p className="text-sm text-gray-500">#P{prescription.id.padStart(3, '0')}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <p className="font-medium text-gray-800">{prescription.medication}</p>
                    <p className="text-sm text-gray-500">{prescription.medication.includes('Patch') ? 'Transdermal' : 'Oral'}</p>
                  </td>
                  <td className="py-4 px-4">
                    <p className="font-medium text-gray-800">{prescription.dosage}</p>
                  </td>
                  <td className="py-4 px-4">
                    <p className="font-medium text-gray-800">{prescription.duration}</p>
                  </td>
                  <td className="py-4 px-4">
                    <p className="font-medium text-gray-800">{prescription.date}</p>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(prescription.status)}`}>
                      {prescription.status.charAt(0).toUpperCase() + prescription.status.slice(1)}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex space-x-2">
                      <button
                        className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Print"
                        onClick={() => window.open(`/api/prescriptions/${encodeURIComponent(prescription.id)}/print`, '_blank')}
                      >
                        <IconWithFallback icon="print" emoji="🖨️" className="text-sm" />
                      </button>
                      {prescription.status === 'DRAFT' && (
                        <button
                          className="text-gray-600 hover:text-gray-800 p-2 hover:bg-gray-50 rounded-lg transition-colors"
                          title="Edit"
                          onClick={() => {
                            const it: any = prescription;
                            const raw = it.raw ?? {};
                            setSelectedDraft({
                              id: raw.id ?? it.id,
                              patientId: raw.patientId ?? '',
                              appointmentId: raw.appointmentId ?? undefined,
                              medicationName: raw.medicationName ?? it.medication,
                              dosage: raw.dosage ?? it.dosage,
                              frequency: raw.frequency ?? 'Once daily',
                              duration: raw.duration ?? it.duration,
                              quantity: Number(raw.quantity ?? 30),
                              refills: Number(raw.refills ?? 0),
                              instructions: raw.instructions ?? '',
                              prescribedDate: raw.prescribedDate ?? new Date().toISOString(),
                              startDate: raw.startDate ?? new Date().toISOString(),
                              endDate: raw.endDate ?? undefined,
                              pharmacy: raw.pharmacy ?? '',
                              pharmacyPhone: raw.pharmacyPhone ?? '',
                              notes: raw.notes ?? '',
                              status: raw.status ?? 'DRAFT',
                            });
                            setShowNewPrescriptionModal(true);
                          }}
                        >
                          <IconWithFallback icon="edit" emoji="✏️" className="text-sm" />
                        </button>
                      )}
                      {prescription.status === 'ACTIVE' && (
                        <button
                          className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded-lg transition-colors"
                          title="Cancel"
                          onClick={async () => {
                            const reason = window.prompt('Enter cancellation reason', 'Cancelled by provider') || '';
                            if (!reason.trim()) return;
                            try {
                              const res = await fetch(`/api/prescriptions/${encodeURIComponent(prescription.id)}`, {
                                method: 'DELETE',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ reason }),
                              });
                              if (res.ok) {
                                fetchPrescriptions();
                              } else {
                                const err = await res.json().catch(() => null);
                                alert(err?.detail || 'Failed to cancel prescription');
                              }
                            } catch {
                              alert('Error cancelling prescription');
                            }
                          }}
                        >
                          <IconWithFallback icon="cancel" emoji="❌" className="text-sm" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Prescription Modal */}
      {showNewPrescriptionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-strong w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-gray-800">New Prescription</h3>
                <button 
                  onClick={() => setShowNewPrescriptionModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <IconWithFallback icon="close" emoji="❌" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <PrescriptionForm
                context="global"
                initialDraft={selectedDraft ?? undefined}
                onClose={() => setShowNewPrescriptionModal(false)}
                onCreated={() => {
                  setShowNewPrescriptionModal(false);
                  setSelectedDraft(null);
                  fetchPrescriptions();
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}