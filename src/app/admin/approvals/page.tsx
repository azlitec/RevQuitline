'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useDebounce } from '@/hooks/useDebounce'; // Create this hook

interface Applicant {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  image?: string | null;
  role?: string | null;
  isProvider: boolean;
  providerApprovalStatus?: 'pending' | 'approved' | 'rejected' | null;
  licenseNumber?: string | null;
  specialty?: string | null;
  yearsOfExperience?: number | null;
  availability?: any;
  createdAt: string;
}

interface ApiResponse {
  applicants: Applicant[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

export default function AdminApprovalsPage() {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const [viewApplicant, setViewApplicant] = useState<Applicant | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Debounce search to avoid too many requests
  const debouncedSearch = useDebounce(search, 500);

  // Fetch data function
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        search: debouncedSearch,
        page: String(page),
        pageSize: '10',
      });

      console.log('[Frontend] Fetching with params:', params.toString());

      const res = await fetch(`/api/admin/approvals?${params.toString()}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('[Frontend] Response status:', res.status);

      if (!res.ok) {
        const errorText = await res.text();
        console.error('[Frontend] Error response:', errorText);
        throw new Error(errorText || `Failed to fetch approvals (${res.status})`);
      }

      const data: ApiResponse = await res.json();
      console.log('[Frontend] Data received:', data);

      setApplicants(data.applicants || []);
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.totalCount || 0);
    } catch (err) {
      console.error('[Frontend] Fetch error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchData();
  }, [debouncedSearch, page]); // Only re-fetch when debounced search or page changes

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  const getName = (a: Applicant) => {
    const first = (a.firstName || '').trim();
    const last = (a.lastName || '').trim();
    const name = `${first} ${last}`.trim();
    return name || a.email;
  };

  const getStatusBadge = (a: Applicant) => {
    const status = a.providerApprovalStatus || 'pending';
    switch (status) {
      case 'approved':
        return <span className="px-2 inline-flex text-xs font-semibold rounded-full bg-green-100 text-green-800">Approved</span>;
      case 'rejected':
        return <span className="px-2 inline-flex text-xs font-semibold rounded-full bg-red-100 text-red-800">Rejected</span>;
      default:
        return <span className="px-2 inline-flex text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Pending</span>;
    }
  };

  const approveProvider = async (applicantId: string) => {
    if (actionLoading) return;
    setActionLoading(applicantId);
    setActionSuccess(null);
    try {
      const res = await fetch(`/api/admin/users/${applicantId}/provider-approval`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });
      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        const message = payload?.message || 'Failed to approve provider';
        throw new Error(message);
      }

      // Refresh list
      await fetchData();
      setActionSuccess('Provider approved successfully');
      setTimeout(() => setActionSuccess(null), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while approving');
    } finally {
      setActionLoading(null);
    }
  };

  const rejectProvider = async (applicantId: string, reason: string) => {
    if (actionLoading) return;
    setActionLoading(applicantId);
    setActionSuccess(null);
    try {
      const res = await fetch(`/api/admin/users/${applicantId}/provider-approval`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', reason }),
      });
      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        const message = payload?.message || 'Failed to reject provider';
        throw new Error(message);
      }

      // Refresh list
      await fetchData();
      setActionSuccess('Provider application rejected');
      setTimeout(() => setActionSuccess(null), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while rejecting');
    } finally {
      setActionLoading(null);
    }
  };

  const submitReject = async () => {
    if (!viewApplicant) return;
    await rejectProvider(viewApplicant.id, rejectReason || '');
    setViewApplicant(null);
    setRejectReason('');
  };

  if (loading && applicants.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Doctor Approvals</h1>
        <div className="flex justify-center p-12">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-t-transparent border-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading applications...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Doctor Approvals</h1>

      {/* Success Message */}
      {actionSuccess && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-md flex items-center">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          {actionSuccess}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md flex items-center justify-between">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            ✕
          </button>
        </div>
      )}

      {/* Search & Stats */}
      <div className="bg-white p-4 rounded-lg shadow mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="w-full md:w-1/2">
          <div className="relative">
            <input
              type="search"
              className="block w-full pl-3 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Search by name, email or ID..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1); // Reset to page 1 on search
              }}
            />
            {loading && (
              <div className="absolute right-3 top-2.5">
                <div className="w-5 h-5 border-2 border-t-transparent border-indigo-600 rounded-full animate-spin"></div>
              </div>
            )}
          </div>
        </div>
        <div className="text-sm text-gray-600">
          Pending applications: <span className="font-bold">{totalCount}</span>
        </div>
      </div>

      {/* Table */}
      {applicants.length === 0 && !loading ? (
        <div className="p-6 bg-white rounded-lg shadow text-center text-gray-600">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <p className="text-lg font-medium">No pending doctor applications</p>
          {search && (
            <p className="text-sm text-gray-500 mt-2">
              Try adjusting your search term
            </p>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applicant</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">License</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Specialty</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Experience</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {applicants.map(applicant => (
                  <tr key={applicant.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                          {getName(applicant).charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {getName(applicant)}
                          </div>
                          <div className="text-xs text-gray-500">
                            Role: {applicant.role || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {applicant.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {applicant.licenseNumber || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {applicant.specialty || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {applicant.yearsOfExperience != null ? `${applicant.yearsOfExperience} yrs` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(applicant.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(applicant)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => { setViewApplicant(applicant); setRejectReason(''); }}
                          className="px-3 py-1 text-xs text-indigo-600 hover:text-indigo-900 border border-indigo-300 hover:bg-indigo-50 rounded transition-colors"
                        >
                          View
                        </button>
                        <button
                          onClick={() => approveProvider(applicant.id)}
                          disabled={!!actionLoading}
                          className="px-3 py-1 text-xs text-white bg-green-600 hover:bg-green-700 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {actionLoading === applicant.id ? 'Processing...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => { setViewApplicant(applicant); }}
                          disabled={!!actionLoading}
                          className="px-3 py-1 text-xs text-white bg-red-600 hover:bg-red-700 rounded disabled:opacity-50 transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Page <span className="font-medium">{page}</span> of <span className="font-medium">{totalPages}</span>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Details / Reject Modal */}
      {viewApplicant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-xl p-6 rounded-lg shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Application Details</h2>
              <button
                onClick={() => { setViewApplicant(null); setRejectReason(''); }}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600 font-medium">Name</span>
                <span className="text-gray-900">{getName(viewApplicant)}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600 font-medium">Email</span>
                <span className="text-gray-900">{viewApplicant.email}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600 font-medium">License</span>
                <span className="text-gray-900">{viewApplicant.licenseNumber || '-'}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600 font-medium">Specialty</span>
                <span className="text-gray-900">{viewApplicant.specialty || '-'}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600 font-medium">Experience</span>
                <span className="text-gray-900">
                  {viewApplicant.yearsOfExperience != null ? `${viewApplicant.yearsOfExperience} years` : '-'}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600 font-medium">Submitted</span>
                <span className="text-gray-900">{formatDate(viewApplicant.createdAt)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600 font-medium">Status</span>
                <span className="text-gray-900 font-semibold">
                  {(viewApplicant.providerApprovalStatus || 'pending').toUpperCase()}
                </span>
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rejection Reason (optional)
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={4}
                placeholder="Provide a reason for rejecting this application..."
              />
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => { setViewApplicant(null); setRejectReason(''); }}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded border border-gray-300 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => approveProvider(viewApplicant.id)}
                disabled={!!actionLoading}
                className="px-4 py-2 text-sm text-white bg-green-600 hover:bg-green-700 rounded disabled:opacity-50 transition-colors"
              >
                Approve
              </button>
              <button
                onClick={submitReject}
                disabled={!!actionLoading}
                className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded disabled:opacity-50 transition-colors"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action loading overlay */}
      {actionLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl">
            <div className="flex items-center">
              <div className="w-8 h-8 border-4 border-t-transparent border-indigo-600 rounded-full animate-spin mr-3"></div>
              <p className="text-gray-700 font-medium">Processing...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
