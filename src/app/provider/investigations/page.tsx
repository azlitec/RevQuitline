'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';

/**
 * Investigations UI
 * - Tabs: Orders / Results
 * - Filters: keywords, date range
 * - Flags: abnormal/critical chips for Results
 * - Pagination with counters
 * - Accessibility labels and keyboard shortcuts:
 *   * Ctrl/Cmd+1 => Orders tab
 *   * Ctrl/Cmd+2 => Results tab
 * - Persist filters in localStorage
 */

type OrderItem = {
  id: string;
  patientId: string;
  providerId: string;
  encounterId: string | null;
  code: string | null;
  name: string;
  status: 'ordered' | 'cancelled' | 'completed';
  orderedAt: string;
  notes: string | null;
  attachments: unknown | null;
  lastResult: {
    id: string;
    name: string | null;
    value: string | null;
    units: string | null;
    interpretation: 'normal' | 'abnormal' | 'critical' | null;
    observedAt: string | null;
    reviewed: boolean;
    reviewedAt: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
};

type ResultItem = {
  id: string;
  orderId: string;
  code: string | null;
  name: string | null;
  value: string | null;
  units: string | null;
  referenceRangeLow: number | null;
  referenceRangeHigh: number | null;
  referenceRangeText: string | null;
  interpretation: 'normal' | 'abnormal' | 'critical' | null;
  performer: string | null;
  observedAt: string | null;
  reviewed: boolean;
  reviewerId: string | null;
  reviewedAt: string | null;
  attachments: unknown | null;
  createdAt: string;
  updatedAt: string;
  order: {
    id: string;
    patientId: string;
    providerId: string;
    encounterId: string | null;
    name: string;
    status: 'ordered' | 'cancelled' | 'completed';
    orderedAt: string;
  } | null;
};

type TabKey = 'orders' | 'results';

const LS_KEY = 'investigations_filters_v1';

export default function ProviderInvestigationsPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<TabKey>('orders');

  // Filters
  const [keywords, setKeywords] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>(''); // ISO
  const [dateTo, setDateTo] = useState<string>('');
  const [page, setPage] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(20);

  // Data
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [ordersTotal, setOrdersTotal] = useState<number>(0);
  const [ordersLoading, setOrdersLoading] = useState<boolean>(false);

  const [results, setResults] = useState<ResultItem[]>([]);
  const [resultsTotal, setResultsTotal] = useState<number>(0);
  const [resultsLoading, setResultsLoading] = useState<boolean>(false);

  // Detail view states
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);
  const [selectedResult, setSelectedResult] = useState<ResultItem | null>(null);
  const [showOrderDetail, setShowOrderDetail] = useState(false);
  const [showResultDetail, setShowResultDetail] = useState(false);

  // Persist filters to localStorage and restore
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (typeof saved.keywords === 'string') setKeywords(saved.keywords);
        if (typeof saved.dateFrom === 'string') setDateFrom(saved.dateFrom);
        if (typeof saved.dateTo === 'string') setDateTo(saved.dateTo);
        if (typeof saved.pageSize === 'number') setPageSize(saved.pageSize);
      }
    } catch {
      // ignore
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(
        LS_KEY,
        JSON.stringify({ keywords, dateFrom, dateTo, pageSize })
      );
    } catch {
      // ignore
    }
  }, [keywords, dateFrom, dateTo, pageSize]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      if (e.key === '1') {
        e.preventDefault();
        setActiveTab('orders');
      } else if (e.key === '2') {
        e.preventDefault();
        setActiveTab('results');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const providerId = session?.user?.id;

  // Detail view handlers
  const handleViewOrder = (order: OrderItem) => {
    setSelectedOrder(order);
    setShowOrderDetail(true);
  };

  const handleViewResult = (result: ResultItem) => {
    setSelectedResult(result);
    setShowResultDetail(true);
  };

  const closeOrderDetail = () => {
    setShowOrderDetail(false);
    setSelectedOrder(null);
  };

  const closeResultDetail = () => {
    setShowResultDetail(false);
    setSelectedResult(null);
  };

  const fetchOrders = useCallback(async () => {
    if (!providerId) return;
    setOrdersLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      params.set('providerId', providerId);
      if (keywords) params.set('keywords', keywords);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);

      const res = await fetch(`/api/investigations/orders?${params.toString()}`);
      if (!res.ok) {
        setOrders([]);
        setOrdersTotal(0);
        return;
      }
      const json = await res.json();
      setOrders(json.items ?? []);
      setOrdersTotal(json.total ?? 0);
    } catch {
      setOrders([]);
      setOrdersTotal(0);
    } finally {
      setOrdersLoading(false);
    }
  }, [providerId, page, pageSize, keywords, dateFrom, dateTo]);

  const fetchResults = useCallback(async () => {
    if (!providerId) return;
    setResultsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      params.set('providerId', providerId);
      if (keywords) params.set('keywords', keywords);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);

      const res = await fetch(`/api/investigations/results?${params.toString()}`);
      if (!res.ok) {
        setResults([]);
        setResultsTotal(0);
        return;
      }
      const json = await res.json();
      setResults(json.items ?? []);
      setResultsTotal(json.total ?? 0);
    } catch {
      setResults([]);
      setResultsTotal(0);
    } finally {
      setResultsLoading(false);
    }
  }, [providerId, page, pageSize, keywords, dateFrom, dateTo]);

  // Load data when tab or filters change
  useEffect(() => {
    if (activeTab === 'orders') {
      fetchOrders();
    } else {
      fetchResults();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, fetchOrders, fetchResults]);

  // Reset page on filter change
  useEffect(() => {
    setPage(0);
  }, [keywords, dateFrom, dateTo, activeTab]);

  const totalLabel = useMemo(() => {
    return activeTab === 'orders' ? ordersTotal : resultsTotal;
  }, [activeTab, ordersTotal, resultsTotal]);

  // Helpers
  const interpretationChip = (i: 'normal' | 'abnormal' | 'critical' | null) => {
    if (!i) return null;
    const base = 'text-xs px-2 py-0.5 rounded-full';
    if (i === 'normal') return <span className={`${base} bg-gray-200 text-gray-700`} aria-label="Normal">Normal</span>;
    if (i === 'abnormal') return <span className={`${base} bg-yellow-100 text-yellow-700`} aria-label="Abnormal">Abnormal</span>;
    return <span className={`${base} bg-red-100 text-red-700`} aria-label="Critical">Critical</span>;
  };

  const reviewedChip = (reviewed: boolean) => {
    const base = 'text-xs px-2 py-0.5 rounded-full';
    return reviewed
      ? <span className={`${base} bg-green-100 text-green-700`} aria-label="Reviewed">Reviewed</span>
      : <span className={`${base} bg-blue-100 text-blue-700`} aria-label="Unreviewed">Unreviewed</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Investigations</h1>
          <p className="text-gray-600">Orders and Results with abnormal/critical flags</p>
        </div>
        <div className="flex items-center gap-3" aria-label="Actions and Totals">
          <button
            onClick={() => alert('Create New Order functionality to be implemented')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create New Order
          </button>
          <span className="text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded-full">
            {totalLabel} {activeTab === 'orders' ? 'Orders' : 'Results'}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div role="tablist" aria-label="Investigations tabs" className="flex gap-2">
        <button
          role="tab"
          aria-selected={activeTab === 'orders'}
          aria-controls="orders-panel"
          className={`px-4 py-2 rounded-lg border ${activeTab === 'orders' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
          onClick={() => setActiveTab('orders')}
        >
          Orders
          {/* Chip shows count of critical on lastResult in current page */}
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'results'}
          aria-controls="results-panel"
          className={`px-4 py-2 rounded-lg border ${activeTab === 'results' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
          onClick={() => setActiveTab('results')}
        >
          Results
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label htmlFor="keywords" className="block text-sm font-medium text-gray-700">Keywords</label>
            <input
              id="keywords"
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="e.g. HbA1c, CBC"
              className="mt-1 w-full p-2 rounded border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="dateFrom" className="block text-sm font-medium text-gray-700">From</label>
            <input
              id="dateFrom"
              type="datetime-local"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="mt-1 w-full p-2 rounded border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="dateTo" className="block text-sm font-medium text-gray-700">To</label>
            <input
              id="dateTo"
              type="datetime-local"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="mt-1 w-full p-2 rounded border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="pageSize" className="text-sm font-medium text-gray-700">Page size</label>
            <select
              id="pageSize"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="p-2 rounded border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <button
              type="button"
              onClick={() => {
                setKeywords(''); setDateFrom(''); setDateTo('');
              }}
              className="ml-auto px-3 py-2 rounded border border-gray-300 hover:bg-gray-50"
              aria-label="Clear filters"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Panels */}
      {activeTab === 'orders' ? (
        <div id="orders-panel" role="tabpanel" aria-labelledby="orders" className="bg-white border border-gray-200 rounded-lg">
          {/* Orders list */}
          {ordersLoading ? (
            <div className="p-6">Loading orders...</div>
          ) : orders.length === 0 ? (
            <div className="p-6 text-gray-600">No orders found</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {orders.map((o) => (
                <div key={o.id} className="p-4 flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-800 font-medium">{o.name}</span>
                      {o.code && <span className="text-xs text-gray-500">[{o.code}]</span>}
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{o.status}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      Ordered: {new Date(o.orderedAt).toLocaleString()}
                      {o.encounterId && <> • Encounter: {o.encounterId}</>}
                    </div>
                    {o.lastResult && (
                      <div className="mt-1 text-sm">
                        Last result: {o.lastResult.value ?? '-'} {o.lastResult.units ?? ''}
                        {' '}
                        {interpretationChip(o.lastResult.interpretation)}
                        {' '}
                        {reviewedChip(o.lastResult.reviewed)}
                        {o.lastResult.observedAt && (
                          <span className="ml-2 text-gray-500">
                            at {new Date(o.lastResult.observedAt).toLocaleString()}
                          </span>
                        )}
                      </div>
                    )}
                    {o.notes && (
                      <div className="text-xs text-gray-500 mt-1">Note: {o.notes}</div>
                    )}
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      className="px-3 py-1 text-sm rounded border border-gray-300 hover:bg-gray-50"
                      aria-label="View order details"
                      onClick={() => handleViewOrder(o)}
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between p-4 border-t border-gray-100">
            <div className="text-sm text-gray-600">
              Page {page + 1} of {Math.max(1, Math.ceil(ordersTotal / pageSize))}
            </div>
            <div className="flex gap-2">
              <button
                className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                aria-label="Previous page"
              >
                Prev
              </button>
              <button
                className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50"
                onClick={() => setPage((p) => p + 1)}
                disabled={(page + 1) * pageSize >= ordersTotal}
                aria-label="Next page"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div id="results-panel" role="tabpanel" aria-labelledby="results" className="bg-white border border-gray-200 rounded-lg">
          {/* Results list */}
          {resultsLoading ? (
            <div className="p-6">Loading results...</div>
          ) : results.length === 0 ? (
            <div className="p-6 text-gray-600">No results found</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {results.map((r) => (
                <div key={r.id} className="p-4 flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-800 font-medium">{r.name ?? r.code ?? 'Result'}</span>
                      {interpretationChip(r.interpretation)}
                      {reviewedChip(r.reviewed)}
                    </div>
                    <div className="text-sm text-gray-600">
                      Value: {r.value ?? '-'} {r.units ?? ''}
                      {r.referenceRangeText && <span className="ml-2 text-gray-500">({r.referenceRangeText})</span>}
                    </div>
                    <div className="text-sm text-gray-600">
                      Observed: {r.observedAt ? new Date(r.observedAt).toLocaleString() : 'N/A'}
                      {r.performer && <> • Performer: {r.performer}</>}
                    </div>
                    {r.order && (
                      <div className="text-xs text-gray-500 mt-1">
                        Order: {r.order.name} • Ordered {new Date(r.order.orderedAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {!r.reviewed && (
                      <button
                        className="px-3 py-1 text-sm rounded border border-gray-300 hover:bg-gray-50"
                        aria-label="Mark reviewed"
                        onClick={async () => {
                          try {
                            const res = await fetch(`/api/investigations/results/${encodeURIComponent(r.id)}/review`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ reviewed: true }),
                            });
                            if (res.ok) {
                              fetchResults();
                            } else {
                              alert('Failed to mark reviewed');
                            }
                          } catch {
                            alert('Error marking reviewed');
                          }
                        }}
                      >
                        Mark reviewed
                      </button>
                    )}
                    <button
                      className="px-3 py-1 text-sm rounded border border-gray-300 hover:bg-gray-50"
                      aria-label="View result details"
                      onClick={() => handleViewResult(r)}
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between p-4 border-t border-gray-100">
            <div className="text-sm text-gray-600">
              Page {page + 1} of {Math.max(1, Math.ceil(resultsTotal / pageSize))}
            </div>
            <div className="flex gap-2">
              <button
                className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                aria-label="Previous page"
              >
                Prev
              </button>
              <button
                className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50"
                onClick={() => setPage((p) => p + 1)}
                disabled={(page + 1) * pageSize >= resultsTotal}
                aria-label="Next page"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {showOrderDetail && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Investigation Order Details</h2>
                <button
                  onClick={closeOrderDetail}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Close"
                >
                  <span className="text-2xl">&times;</span>
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Investigation Name</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedOrder.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Code</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedOrder.code || 'N/A'}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <span className={`mt-1 inline-block px-2 py-1 text-xs rounded-full ${
                      selectedOrder.status === 'completed' ? 'bg-green-100 text-green-800' :
                      selectedOrder.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {selectedOrder.status}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Ordered Date</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {new Date(selectedOrder.orderedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Patient ID</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedOrder.patientId}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Encounter ID</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedOrder.encounterId || 'N/A'}</p>
                  </div>
                </div>
                
                {selectedOrder.notes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Notes</label>
                    <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-3 rounded">
                      {selectedOrder.notes}
                    </p>
                  </div>
                )}
                
                {selectedOrder.lastResult && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Latest Result</label>
                    <div className="mt-1 bg-gray-50 p-3 rounded">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Value:</span> {selectedOrder.lastResult.value || 'N/A'}
                        </div>
                        <div>
                          <span className="font-medium">Units:</span> {selectedOrder.lastResult.units || 'N/A'}
                        </div>
                        <div>
                          <span className="font-medium">Interpretation:</span> {interpretationChip(selectedOrder.lastResult.interpretation)}
                        </div>
                        <div>
                          <span className="font-medium">Reviewed:</span> {reviewedChip(selectedOrder.lastResult.reviewed)}
                        </div>
                      </div>
                      {selectedOrder.lastResult.observedAt && (
                        <div className="mt-2 text-sm text-gray-600">
                          Observed: {new Date(selectedOrder.lastResult.observedAt).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Created:</span> {new Date(selectedOrder.createdAt).toLocaleString()}
                  </div>
                  <div>
                    <span className="font-medium">Updated:</span> {new Date(selectedOrder.updatedAt).toLocaleString()}
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={closeOrderDetail}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Result Detail Modal */}
      {showResultDetail && selectedResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Investigation Result Details</h2>
                <button
                  onClick={closeResultDetail}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Close"
                >
                  <span className="text-2xl">&times;</span>
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Test Name</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedResult.name || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Code</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedResult.code || 'N/A'}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Value</label>
                    <p className="mt-1 text-sm text-gray-900 font-semibold">
                      {selectedResult.value || 'N/A'} {selectedResult.units || ''}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Interpretation</label>
                    <div className="mt-1">{interpretationChip(selectedResult.interpretation)}</div>
                  </div>
                </div>
                
                {(selectedResult.referenceRangeLow !== null || selectedResult.referenceRangeHigh !== null) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Reference Range</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedResult.referenceRangeLow || 'N/A'} - {selectedResult.referenceRangeHigh || 'N/A'}
                    </p>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Observed Date</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedResult.observedAt ? new Date(selectedResult.observedAt).toLocaleString() : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Review Status</label>
                    <div className="mt-1">{reviewedChip(selectedResult.reviewed)}</div>
                  </div>
                </div>
                
                {selectedResult.reviewed && selectedResult.reviewedAt && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Reviewed Date</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {new Date(selectedResult.reviewedAt).toLocaleString()}
                    </p>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Order ID:</span> {selectedResult.orderId}
                  </div>
                  <div>
                    <span className="font-medium">Result ID:</span> {selectedResult.id}
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                {!selectedResult.reviewed && (
                  <button
                    onClick={() => {
                      // TODO: Implement mark as reviewed functionality
                      alert('Mark as reviewed functionality to be implemented');
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Mark as Reviewed
                  </button>
                )}
                <button
                  onClick={closeResultDetail}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}