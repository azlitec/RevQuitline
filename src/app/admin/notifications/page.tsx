'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';

type BroadcastStats = {
  since: string;
  until: string;
  total: number;
  sent: number;
  invalid: number;
  failed: number;
  failureRatePercent: number;
};

type BroadcastSummary = {
  targeted: number;
  sent: number;
  invalid: number;
  failed: number;
};

type RoleOption = 'ALL' | 'USER' | 'PROVIDER';

export default function AdminNotificationsPage() {
  const { data: session, status } = useSession();

  const [stats, setStats] = useState<BroadcastStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [errorStats, setErrorStats] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [role, setRole] = useState<RoleOption>('ALL');
  const [dataJson, setDataJson] = useState('{}');

  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSummary, setSendSummary] = useState<BroadcastSummary | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user?.isAdmin) {
      // Protect page: only admins can access
      redirect('/admin/dashboard');
      return;
    }
    fetchStats();
  }, [session, status]);

  const parsedDataObject = useMemo(() => {
    try {
      const obj = JSON.parse(dataJson || '{}');
      if (obj && typeof obj === 'object') return obj as Record<string, string>;
      return {};
    } catch {
      return {};
    }
  }, [dataJson]);

  async function fetchStats() {
    setLoadingStats(true);
    setErrorStats(null);
    setStats(null);
    try {
      const res = await fetch('/api/admin/notifications/broadcast', { method: 'GET', credentials: 'include' });
      if (!res.ok) {
        const problem = await res.json().catch(() => null);
        const message = problem?.title || problem?.error || res.statusText || 'Failed to load stats';
        throw new Error(message);
      }
      const json = await res.json();
      const payload: BroadcastStats | null =
        json?.success ? json?.data?.stats : json?.stats ?? null;
      setStats(payload);
    } catch (err: any) {
      setErrorStats(err?.message ?? 'Failed to load stats');
    } finally {
      setLoadingStats(false);
    }
  }

  async function sendBroadcast() {
    setSending(true);
    setSendError(null);
    setSendSummary(null);
    try {
      // Basic validation
      if (!title.trim() || !body.trim()) {
        throw new Error('Title and body are required');
      }
      // Validate JSON data
      let dataObj: Record<string, string> | undefined = undefined;
      if (dataJson.trim()) {
        try {
          const obj = JSON.parse(dataJson);
          if (obj && typeof obj === 'object') {
            // Coerce values to strings for FCM data payload
            dataObj = Object.fromEntries(
              Object.entries(obj).map(([k, v]) => [k, String(v)])
            );
          }
        } catch (e: any) {
          throw new Error('Data JSON is invalid');
        }
      }

      const res = await fetch('/api/admin/notifications/broadcast', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          role,
          imageUrl: imageUrl.trim() || undefined,
          data: dataObj,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = json?.title || json?.error || res.statusText || 'Failed to send broadcast';
        throw new Error(message);
      }

      const summary: BroadcastSummary | null =
        json?.success
          ? (json?.data as BroadcastSummary)
          : (json as BroadcastSummary);

      setSendSummary(summary);
      // Refresh stats after broadcast
      await fetchStats();
    } catch (err: any) {
      setSendError(err?.message ?? 'Failed to send broadcast');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Admin Notifications</h1>
        <p className="text-gray-600">Send broadcast push notifications and view delivery stats.</p>
      </div>

      <section className="mb-8">
        <div className="card p-6 shadow-soft">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Broadcast Notification</h2>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="System Maintenance, New Feature, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Body</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Your message to all users or selected role"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as RoleOption)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="ALL">All Users</option>
                  <option value="USER">Patients (USER)</option>
                  <option value="PROVIDER">Providers</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Image URL (optional)</label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="https://example.com/banner.png"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Data JSON (optional)
                <span className="text-gray-500 font-normal"> — key-value pairs added to notification data payload</span>
              </label>
              <textarea
                value={dataJson}
                onChange={(e) => setDataJson(e.target.value)}
                rows={4}
                className="mt-1 block w-full font-mono text-sm rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder='{"url":"/patient/messages","campaign":"october"}'
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={sendBroadcast}
                disabled={sending}
                className={`px-4 py-2 rounded-md text-white ${sending ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'} transition-colors`}
              >
                {sending ? 'Sending…' : 'Send Broadcast'}
              </button>

              <button
                onClick={fetchStats}
                disabled={loadingStats}
                className={`px-4 py-2 rounded-md text-white ${loadingStats ? 'bg-gray-400' : 'bg-gray-700 hover:bg-gray-800'} transition-colors`}
              >
                {loadingStats ? 'Refreshing…' : 'Refresh Stats'}
              </button>
            </div>

            {sendError && (
              <div className="p-3 rounded-md bg-red-50 text-red-700 border border-red-200">
                {sendError}
              </div>
            )}

            {sendSummary && (
              <div className="p-3 rounded-md bg-green-50 text-green-700 border border-green-200">
                <p className="font-medium">Broadcast sent</p>
                <p className="text-sm">
                  Targeted {sendSummary.targeted}, Sent {sendSummary.sent}, Invalid {sendSummary.invalid}, Failed {sendSummary.failed}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section>
        <div className="card p-6 shadow-soft">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Delivery Stats (last 24h)</h2>

          {errorStats && (
            <div className="p-3 rounded-md bg-red-50 text-red-700 border border-red-200 mb-4">
              {errorStats}
            </div>
          )}

          {loadingStats ? (
            <div className="text-gray-600">Loading stats…</div>
          ) : stats ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border">
                <p className="text-sm text-gray-500">Window</p>
                <p className="font-medium text-gray-800">{new Date(stats.since).toLocaleString()} → {new Date(stats.until).toLocaleString()}</p>
              </div>
              <div className="p-4 rounded-lg border">
                <p className="text-sm text-gray-500">Total Attempts</p>
                <p className="font-medium text-gray-800">{stats.total}</p>
              </div>
              <div className="p-4 rounded-lg border">
                <p className="text-sm text-gray-500">Delivered</p>
                <p className="font-medium text-gray-800">{stats.sent}</p>
              </div>
              <div className="p-4 rounded-lg border">
                <p className="text-sm text-gray-500">Invalid Tokens</p>
                <p className="font-medium text-gray-800">{stats.invalid}</p>
              </div>
              <div className="p-4 rounded-lg border">
                <p className="text-sm text-gray-500">Failed</p>
                <p className="font-medium text-gray-800">{stats.failed}</p>
              </div>
              <div className="p-4 rounded-lg border">
                <p className="text-sm text-gray-500">Failure Rate</p>
                <p className={`font-medium ${stats.failureRatePercent > 10 ? 'text-red-600' : 'text-gray-800'}`}>
                  {stats.failureRatePercent.toFixed(2)}%
                </p>
              </div>
            </div>
          ) : (
            <div className="text-gray-600">No stats available.</div>
          )}
        </div>
      </section>
    </div>
  );
}