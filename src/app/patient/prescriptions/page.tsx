'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import { RefreshCw, HelpCircle, ChevronDown, Pill, History } from 'lucide-react';

/**
 * Local Icon component with emoji fallback for environments without Material Icons.
 */
const IconWithFallback = ({
  icon,
  emoji,
  className = '',
}: {
  icon: string;
  emoji: string;
  className?: string;
}) => {
  return (
    <span className={`icon-container ${className}`}>
      <HelpCircle />
      <span className="emoji-fallback hidden">{emoji}</span>
    </span>
  );
};

type PersonLite = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
};

type AppointmentLite = {
  id: string;
  title?: string | null;
  date?: string | Date | null;
};

type PrescriptionItem = {
  id: string;
  patientId: string;
  providerId: string;
  appointmentId?: string | null;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  refills: number;
  instructions: string;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
  prescribedDate: string | Date;
  startDate: string | Date;
  endDate?: string | Date | null;
  pharmacy?: string | null;
  pharmacyPhone?: string | null;
  notes?: string | null;
  patient?: PersonLite | null;
  provider?: PersonLite | null;
  appointment?: AppointmentLite | null;
};

type ListEnvelope<T> = {
  success: boolean;
  data: {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
  };
  requestId?: string;
};

function formatDate(d?: string | Date | null): string {
  if (!d) return '-';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (!date || isNaN(date.getTime())) return '-';
  return date.toLocaleDateString();
}

function providerName(p?: PersonLite | null): string {
  if (!p) return '-';
  return [p.firstName, p.lastName].filter(Boolean).join(' ') || '-';
}

export default function PatientPrescriptionsPage() {
  const [activeItems, setActiveItems] = useState<PrescriptionItem[]>([]);
  const [pastItems, setPastItems] = useState<PrescriptionItem[]>([]);
  const [loadingActive, setLoadingActive] = useState<boolean>(true);
  const [loadingPast, setLoadingPast] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showPast, setShowPast] = useState<boolean>(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const activeCount = useMemo(() => activeItems.length, [activeItems]);

  useEffect(() => {
    let cancelled = false;

    async function fetchActive() {
      try {
        setLoadingActive(true);
        const params = new URLSearchParams();
        params.set('page', '0');
        params.set('pageSize', '50');
        params.set('status', 'ACTIVE');
        const res = await fetch(`/api/patient/prescriptions?${params.toString()}`, {
          cache: 'no-store',
        });
        if (!res.ok) throw new Error('Failed to fetch active prescriptions');
        const json = (await res.json()) as ListEnvelope<PrescriptionItem>;
        if (!cancelled) {
          setActiveItems(json?.data?.items ?? []);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Failed to load active prescriptions');
        }
      } finally {
        if (!cancelled) setLoadingActive(false);
      }
    }

    async function fetchPast() {
      try {
        setLoadingPast(true);
        const params = new URLSearchParams();
        params.set('page', '0');
        params.set('pageSize', '50');
        // No status filter -> fetch all then filter locally to past (COMPLETED, CANCELLED, EXPIRED)
        const res = await fetch(`/api/patient/prescriptions?${params.toString()}`, {
          cache: 'no-store',
        });
        if (!res.ok) throw new Error('Failed to fetch prescriptions');
        const json = (await res.json()) as ListEnvelope<PrescriptionItem>;
        const all = json?.data?.items ?? [];
        const past = all.filter(
          (p) => p.status !== 'ACTIVE' && p.status !== 'DRAFT'
        );
        if (!cancelled) {
          setPastItems(past);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Failed to load past prescriptions');
        }
      } finally {
        if (!cancelled) setLoadingPast(false);
      }
    }

    fetchActive();
    fetchPast();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loadingActive && !error && activeItems.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-80">
        <div className="flex items-center space-x-3">
          <div className="animate-spin">
            <RefreshCw className="text-blue-600" />
          </div>
          <span className="text-gray-600 font-medium">Loading prescriptions...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 md:p-8 bg-red-50 text-red-700 rounded-xl shadow-soft max-w-3xl mx-auto">
        <div className="flex items-center space-x-3 mb-4">
          <HelpCircle className="text-red-600" />
          <h2 className="text-xl font-bold">Error Loading Prescriptions</h2>
        </div>
        <p className="mb-4">{error}</p>
        <div className="flex gap-3">
          <Link
            href="/patient/dashboard"
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium transition-colors touch-friendly"
          >
            Back to Dashboard
          </Link>
          <button
            onClick={() => {
              setError(null);
              // retry both
              setLoadingActive(true);
              setLoadingPast(true);
              const paramsA = new URLSearchParams({ page: '0', pageSize: '50', status: 'ACTIVE' });
              fetch(`/api/patient/prescriptions?${paramsA.toString()}`, { cache: 'no-store' })
                .then((r) => r.json())
                .then((j: ListEnvelope<PrescriptionItem>) => setActiveItems(j?.data?.items ?? []))
                .finally(() => setLoadingActive(false));
              const paramsP = new URLSearchParams({ page: '0', pageSize: '50' });
              fetch(`/api/patient/prescriptions?${paramsP.toString()}`, { cache: 'no-store' })
                .then((r) => r.json())
                .then((j: ListEnvelope<PrescriptionItem>) => {
                  const all = j?.data?.items ?? [];
                  const past = all.filter(
                    (p) => p.status !== 'ACTIVE' && p.status !== 'DRAFT'
                  );
                  setPastItems(past);
                })
                .finally(() => setLoadingPast(false));
            }}
            className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white px-6 py-2 rounded-lg font-medium transition-colors touch-friendly"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center">
        <div className="mb-4 md:mb-0">
          <h1 className="text-2xl md:text-3xl font-bold gradient-text">My Prescriptions</h1>
          <p className="text-sm md:text-base text-gray-500 flex items-center">
            Review your medications and instructions
            <ChevronDown className="ml-1 text-sm text-gray-400" />
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/patient/dashboard"
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 md:px-5 py-2 md:py-2.5 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-medium hover:shadow-strong text-sm md:text-base touch-friendly hover:scale-105"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>

      {/* Active Prescriptions */}
      <div>
        <div className="flex items-center justify-between mb-3 md:mb-4">
          <h2 className="text-lg md:text-xl font-semibold text-gray-800 flex items-center">
            <Pill className="text-purple-600 mr-2" />
            Active Prescriptions
          </h2>
          <div className="text-xs md:text-sm px-3 py-1 rounded-full bg-purple-100 text-purple-700 font-semibold">
            {activeCount} active
          </div>
        </div>

        {activeItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {activeItems.map((rx) => {
              const isExpanded = expandedId === rx.id;
              return (
                <div
                  key={rx.id}
                  className="p-4 md:p-6 rounded-xl shadow-soft hover:shadow-strong bg-gradient-to-r from-gray-50 to-gray-100 hover:from-blue-50 hover:to-purple-50 transition-all duration-300 hover:scale-[1.01]"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-100 rounded-full flex items-center justify-center">
                        <Pill className="text-purple-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base md:text-lg font-semibold text-gray-800">
                            {rx.medicationName}
                          </h3>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                            {rx.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-0.5">{rx.dosage}</p>
                        <p className="text-xs text-gray-500">
                          {rx.frequency} • {rx.duration}
                        </p>
                      </div>
                    </div>
                    <button
                      className="text-blue-600 text-xs md:text-sm font-semibold hover:underline"
                      onClick={() => setExpandedId(isExpanded ? null : rx.id)}
                    >
                      {isExpanded ? 'Hide Details' : 'View Details'}
                    </button>
                  </div>

                  <div className="mt-3">
                    <p className="text-gray-700 text-sm">
                      <span className="font-medium">Instructions: </span>
                      <span>{rx.instructions || '-'}</span>
                    </p>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 space-y-2 text-sm">
                      <div className="flex">
                        <span className="text-gray-500 w-32">Prescribed</span>
                        <span className="font-medium">{formatDate(rx.prescribedDate)}</span>
                      </div>
                      <div className="flex">
                        <span className="text-gray-500 w-32">Start</span>
                        <span className="font-medium">{formatDate(rx.startDate)}</span>
                      </div>
                      <div className="flex">
                        <span className="text-gray-500 w-32">End</span>
                        <span className="font-medium">{formatDate(rx.endDate)}</span>
                      </div>
                      <div className="flex">
                        <span className="text-gray-500 w-32">Quantity</span>
                        <span className="font-medium">{rx.quantity}</span>
                      </div>
                      <div className="flex">
                        <span className="text-gray-500 w-32">Refills</span>
                        <span className="font-medium">{rx.refills}</span>
                      </div>
                      <div className="flex">
                        <span className="text-gray-500 w-32">Prescriber</span>
                        <span className="font-medium">{providerName(rx.provider)}</span>
                      </div>
                      <div className="flex">
                        <span className="text-gray-500 w-32">Pharmacy</span>
                        <span className="font-medium">
                          {rx.pharmacy || '-'}
                          {rx.pharmacyPhone ? ` • ${rx.pharmacyPhone}` : ''}
                        </span>
                      </div>
                      {rx.notes && (
                        <div className="flex">
                          <span className="text-gray-500 w-32">Notes</span>
                          <span className="font-medium whitespace-pre-wrap">{rx.notes}</span>
                        </div>
                      )}
                      {rx.appointment && (
                        <div className="flex">
                          <span className="text-gray-500 w-32">Appointment</span>
                          <span className="font-medium">
                            {(rx.appointment.title || rx.appointment.id) + ' • ' + formatDate(rx.appointment.date)}
                          </span>
                        </div>
                      )}
                      <div className="pt-2 flex items-center gap-3">
                        <Link
                          href={`/api/prescriptions/${rx.id}/print`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-xs font-semibold hover:underline"
                        >
                          Print Prescription
                        </Link>
                        <Link
                          href={`/api/prescriptions/${rx.id}`}
                          className="text-gray-600 hover:text-gray-800 text-xs font-semibold hover:underline"
                        >
                          Open API record
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
              <Pill className="text-purple-600 text-lg md:text-2xl" />
            </div>
            <h3 className="text-base md:text-lg font-medium text-gray-600 mb-2">No active prescriptions</h3>
            <p className="text-sm md:text-base text-gray-500 mb-4">
              Your provider will add prescriptions when necessary.
            </p>
            <Link
              href="/patient/doctors"
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 shadow-medium hover:shadow-strong transition-all duration-300 hover:scale-105 text-sm font-medium touch-friendly"
            >
              Find Providers
            </Link>
          </div>
        )}
      </div>

      {/* Past Prescriptions (collapsed by default) */}
      <div className="mt-6 md:mt-8">
        <div className="flex items-center justify-between mb-3 md:mb-4">
          <h2 className="text-lg md:text-xl font-semibold text-gray-800 flex items-center">
            <History className="text-gray-600 mr-2" />
            Past Prescriptions
          </h2>
          <button
            className="text-blue-600 text-xs md:text-sm font-semibold hover:underline"
            onClick={() => setShowPast((v) => !v)}
          >
            {showPast ? 'Hide' : 'View'}
          </button>
        </div>

        {showPast && (
          <>
            {loadingPast ? (
              <div className="flex items-center space-x-3 py-6">
                <div className="animate-spin">
                  <RefreshCw className="text-blue-600" />
                </div>
                <span className="text-gray-600 font-medium">Loading past prescriptions...</span>
              </div>
            ) : pastItems.length > 0 ? (
              <div className="space-y-3 md:space-y-4">
                {pastItems.map((rx) => (
                  <div
                    key={rx.id}
                    className="flex items-start justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg hover:from-blue-50 hover:to-purple-50 transition-all duration-300 hover:shadow-medium"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <HelpCircle className="text-gray-600 text-sm" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-800 text-sm md:text-base">{rx.medicationName}</h4>
                        <p className="text-xs md:text-sm text-gray-500">{rx.dosage}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                              rx.status === 'COMPLETED'
                                ? 'bg-green-100 text-green-700'
                                : rx.status === 'CANCELLED'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {rx.status}
                          </span>
                          <span className="text-[11px] text-gray-500">
                            Ended {formatDate(rx.endDate)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs md:text-sm text-gray-500">Prescriber</p>
                      <p className="text-xs md:text-sm font-medium">{providerName(rx.provider)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-500 text-sm">No past prescriptions</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}