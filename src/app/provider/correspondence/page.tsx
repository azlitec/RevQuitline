'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import RichTextEditor from '@/components/editor/RichTextEditor';

/**
 * Provider Correspondence UI
 *
 * Features:
 * - Tabs: Inbound / Outbound
 * - Search by recipient/sender and keywords (subject/body)
 * - Quick preview list with chips (direction/category/sent)
 * - Template selection, merge-field resolution, WYSIWYG editor
 * - Autosave drafts (localStorage + optional server save)
 * - Accessibility labels and keyboard shortcuts (Ctrl/Cmd+S autosave)
 * - PDF export via backend (if puppeteer installed)
 *
 * Backend endpoints leveraged:
 * - GET/POST/PUT /api/correspondence
 * - POST /api/correspondence/render
 * - GET /api/templates
 * - POST /api/correspondence/send/[id]
 */

type CorrespondenceItem = {
  id: string;
  encounterId: string | null;
  patientId: string;
  senderId: string | null;
  recipients: any[];
  subject: string;
  body: string;
  mergeFields: Record<string, any> | null;
  attachments: any[] | null;
  direction: 'inbound' | 'outbound';
  category: 'referral' | 'reply' | 'discharge' | 'memo';
  transmissionChannel: 'email' | 'fax' | 'portal' | 'print' | 'other' | null;
  sentById: string | null;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
  sender?: { id: string; name: string | null; email: string | null; specialty: string | null } | null;
};

type TemplateItem = {
  id: string;
  name: string;
  subject: string | null;
  category: 'referral' | 'reply' | 'discharge' | 'memo' | null;
  htmlContent: string;
  fields: Record<string, any> | null;
  active: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

type TabKey = 'inbound' | 'outbound';

const FILTERS_LS_KEY = 'correspondence_filters_v1';
const DRAFT_LS_KEY = 'correspondence_draft_v1';

export default function ProviderCorrespondencePage() {
  const { data: session } = useSession();
  const providerId = session?.user?.id;

  const [tab, setTab] = useState<TabKey>('outbound');

  // Common filters
  const [keywords, setKeywords] = useState<string>('');
  const [page, setPage] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(20);

  // Inbound filters
  const [inboundItems, setInboundItems] = useState<CorrespondenceItem[]>([]);
  const [inboundTotal, setInboundTotal] = useState<number>(0);
  const [inboundLoading, setInboundLoading] = useState<boolean>(false);
  const [inboundSenderId, setInboundSenderId] = useState<string>('');

  // Outbound filters
  const [outboundItems, setOutboundItems] = useState<CorrespondenceItem[]>([]);
  const [outboundTotal, setOutboundTotal] = useState<number>(0);
  const [outboundLoading, setOutboundLoading] = useState<boolean>(false);
  const [outboundRecipientFilter, setOutboundRecipientFilter] = useState<string>('');
  const [outboundSenderFilter, setOutboundSenderFilter] = useState<string>('');

  // Templates and editor
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [mergeFields, setMergeFields] = useState<Record<string, any>>({});
  const [resolvedHtml, setResolvedHtml] = useState<string>('');
  const [editorHtml, setEditorHtml] = useState<string>('');
  const [editorSaving, setEditorSaving] = useState<boolean>(false);
  const [currentOutboundId, setCurrentOutboundId] = useState<string | null>(null);

  // Create outbound fields
  const [patientId, setPatientId] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [category, setCategory] = useState<'referral' | 'reply' | 'discharge' | 'memo'>('referral');
  const [transmissionChannel, setTransmissionChannel] = useState<'email' | 'fax' | 'portal' | 'print' | 'other'>('email');
  const [recipients, setRecipients] = useState<Array<{ type?: string; name?: string; address?: string; contact?: string; email?: string; fax?: string }>>([]);

  // Persist filters to localStorage and restore
  useEffect(() => {
    try {
      const raw = localStorage.getItem(FILTERS_LS_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (typeof saved.keywords === 'string') setKeywords(saved.keywords);
        if (typeof saved.pageSize === 'number') setPageSize(saved.pageSize);
      }
    } catch {
      // ignore
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(FILTERS_LS_KEY, JSON.stringify({ keywords, pageSize }));
    } catch {
      // ignore
    }
  }, [keywords, pageSize]);

  // Load templates
  const fetchTemplates = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set('page', '0');
      params.set('pageSize', '100');
      const res = await fetch(`/api/templates?${params.toString()}`);
      if (!res.ok) {
        setTemplates([]);
        return;
      }
      const json = await res.json();
      const items: TemplateItem[] = json.items ?? [];
      setTemplates(items);
      const def = items.find((t) => t.isDefault) ?? items[0];
      if (def) {
        setSelectedTemplateId(def.id);
        // Initialize merge fields from template fields if present
        if (def.fields) {
          setMergeFields(def.fields);
          setSubject(def.subject ?? '');
        }
      }
    } catch {
      setTemplates([]);
    }
  }, []);
  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Render template with merge fields
  const renderTemplate = useCallback(async () => {
    if (!selectedTemplateId) {
      setResolvedHtml('');
      setEditorHtml('');
      return;
    }
    try {
      const res = await fetch('/api/correspondence/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedTemplateId,
          mergeFields,
          format: 'html',
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('Render failed', err);
        return;
      }
      const json = await res.json();
      setResolvedHtml(json.resolvedHtml ?? '');
      // Initialize editor html if not yet edited
      if (!editorHtml || editorHtml.trim().length === 0) {
        setEditorHtml(json.resolvedHtml ?? '');
      }
    } catch (e) {
      console.error('Render error', e);
    }
  }, [selectedTemplateId, mergeFields, editorHtml]);
  useEffect(() => {
    renderTemplate();
    // Reset page on filter changes
  }, [renderTemplate]);

  // Load inbound list
  const fetchInbound = useCallback(async () => {
    setInboundLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      params.set('direction', 'inbound');
      if (keywords) params.set('keywords', keywords);
      if (inboundSenderId) params.set('senderId', inboundSenderId);
      const res = await fetch(`/api/correspondence?${params.toString()}`);
      if (!res.ok) {
        setInboundItems([]);
        setInboundTotal(0);
        return;
      }
      const json = await res.json();
      setInboundItems(json.items ?? []);
      setInboundTotal(json.total ?? 0);
    } catch {
      setInboundItems([]);
      setInboundTotal(0);
    } finally {
      setInboundLoading(false);
    }
  }, [page, pageSize, keywords, inboundSenderId]);
  // Load outbound list
  const fetchOutbound = useCallback(async () => {
    setOutboundLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      params.set('direction', 'outbound');
      if (keywords) params.set('keywords', keywords);
      if (outboundRecipientFilter) params.set('keywords', outboundRecipientFilter); // basic filter fallback
      if (outboundSenderFilter) params.set('senderId', outboundSenderFilter);
      const res = await fetch(`/api/correspondence?${params.toString()}`);
      if (!res.ok) {
        setOutboundItems([]);
        setOutboundTotal(0);
        return;
      }
      const json = await res.json();
      setOutboundItems(json.items ?? []);
      setOutboundTotal(json.total ?? 0);
    } catch {
      setOutboundItems([]);
      setOutboundTotal(0);
    } finally {
      setOutboundLoading(false);
    }
  }, [page, pageSize, keywords, outboundRecipientFilter, outboundSenderFilter]);

  useEffect(() => {
    if (tab === 'inbound') {
      fetchInbound();
    } else {
      fetchOutbound();
    }
  }, [tab, fetchInbound, fetchOutbound]);

  // Reset page on filter change or tab change
  useEffect(() => {
    setPage(0);
  }, [keywords, pageSize, tab, inboundSenderId, outboundRecipientFilter, outboundSenderFilter]);

  // Autosave editor drafts locally
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_LS_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (typeof saved.editorHtml === 'string') setEditorHtml(saved.editorHtml);
        if (typeof saved.subject === 'string') setSubject(saved.subject);
        if (typeof saved.patientId === 'string') setPatientId(saved.patientId);
        if (saved.mergeFields && typeof saved.mergeFields === 'object') setMergeFields(saved.mergeFields);
        if (Array.isArray(saved.recipients)) setRecipients(saved.recipients);
        if (typeof saved.category === 'string') setCategory(saved.category);
      }
    } catch {
      // ignore
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(
        DRAFT_LS_KEY,
        JSON.stringify({ editorHtml, subject, patientId, mergeFields, recipients, category })
      );
    } catch {
      // ignore
    }
  }, [editorHtml, subject, patientId, mergeFields, recipients, category]);

  // Server save outbound draft (create or update)
  const serverSaveOutbound = useCallback(async (html: string) => {
    if (!providerId) return;
    setEditorSaving(true);
    try {
      if (!currentOutboundId) {
        // Create new outbound correspondence
        const res = await fetch('/api/correspondence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patientId,
            direction: 'outbound',
            category,
            recipients,
            subject,
            body: html,
            mergeFields,
            attachments: [],
            transmissionChannel,
          }),
        });
        if (!res.ok) {
          console.error('Create outbound failed', await res.text());
          return;
        }
        const json = await res.json();
        setCurrentOutboundId(json.correspondence?.id ?? null);
      } else {
        // Update existing (only if unsent)
        const res = await fetch('/api/correspondence', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: currentOutboundId,
            subject,
            body: html,
            mergeFields,
            recipients,
            category,
          }),
        });
        if (!res.ok) {
          console.error('Update outbound failed', await res.text());
          return;
        }
      }
      // Refresh list
      fetchOutbound();
    } catch (e) {
      console.error('Server save failed', e);
    } finally {
      setEditorSaving(false);
    }
  }, [providerId, currentOutboundId, patientId, category, recipients, subject, mergeFields, transmissionChannel, fetchOutbound]);

  // Send outbound
  const sendOutbound = useCallback(async () => {
    if (!currentOutboundId) {
      alert('Please save the correspondence first');
      return;
    }
    try {
      const res = await fetch(`/api/correspondence/send/${encodeURIComponent(currentOutboundId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transmissionChannel,
        }),
      });
      if (!res.ok) {
        alert('Failed to send correspondence');
        return;
      }
      alert('Correspondence sent successfully');
      // Refresh list to reflect sent state
      fetchOutbound();
    } catch {
      alert('Error sending correspondence');
    }
  }, [currentOutboundId, transmissionChannel, fetchOutbound]);

  // Render PDF
  const renderPdf = useCallback(async () => {
    try {
      const res = await fetch('/api/correspondence/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          htmlContent: editorHtml,
          mergeFields,
          format: 'pdf',
        }),
      });
      const json = await res.json();
      if (res.status === 200 && json.pdfBase64) {
        const blob = b64ToBlob(json.pdfBase64, 'application/pdf');
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `correspondence-${currentOutboundId ?? 'draft'}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      } else {
        alert(json.error || 'PDF generation not available');
      }
    } catch (e) {
      alert('Failed to generate PDF');
    }
  }, [editorHtml, mergeFields, currentOutboundId]);

  function b64ToBlob(base64: string, mime: string) {
    const byteChars = atob(base64);
    const byteNumbers = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteNumbers[i] = byteChars.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mime });
  }

  const totalLabel = useMemo(() => {
    return tab === 'inbound' ? inboundTotal : outboundTotal;
  }, [tab, inboundTotal, outboundTotal]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Correspondence</h1>
          <p className="text-gray-600">Inbound and Outbound communications with templates and merge fields</p>
        </div>
        <div className="flex items-center gap-2" aria-label="Totals">
          <span className="text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded-full">
            {totalLabel} {tab === 'inbound' ? 'Inbound' : 'Outbound'}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div role="tablist" aria-label="Correspondence tabs" className="flex gap-2">
        <button
          role="tab"
          aria-selected={tab === 'inbound'}
          aria-controls="inbound-panel"
          className={`px-4 py-2 rounded-lg border ${tab === 'inbound' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
          onClick={() => setTab('inbound')}
        >
          Inbound
        </button>
        <button
          role="tab"
          aria-selected={tab === 'outbound'}
          aria-controls="outbound-panel"
          className={`px-4 py-2 rounded-lg border ${tab === 'outbound' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
          onClick={() => setTab('outbound')}
        >
          Outbound
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        {tab === 'inbound' ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label htmlFor="keywords" className="block text-sm font-medium text-gray-700">Keywords</label>
              <input
                id="keywords"
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="Subject/body keywords"
                className="mt-1 w-full p-2 rounded border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="senderId" className="block text-sm font-medium text-gray-700">Sender ID</label>
              <input
                id="senderId"
                type="text"
                value={inboundSenderId}
                onChange={(e) => setInboundSenderId(e.target.value)}
                placeholder="Filter by sender"
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
                onClick={() => { setKeywords(''); setInboundSenderId(''); }}
                className="ml-auto px-3 py-2 rounded border border-gray-300 hover:bg-gray-50"
                aria-label="Clear filters"
              >
                Clear
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label htmlFor="keywords" className="block text-sm font-medium text-gray-700">Keywords</label>
              <input
                id="keywords"
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="Subject/body keywords"
                className="mt-1 w-full p-2 rounded border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="recipientFilter" className="block text-sm font-medium text-gray-700">Recipient filter</label>
              <input
                id="recipientFilter"
                type="text"
                value={outboundRecipientFilter}
                onChange={(e) => setOutboundRecipientFilter(e.target.value)}
                placeholder="Name/email/fax"
                className="mt-1 w-full p-2 rounded border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="senderFilter" className="block text-sm font-medium text-gray-700">Sender filter</label>
              <input
                id="senderFilter"
                type="text"
                value={outboundSenderFilter}
                onChange={(e) => setOutboundSenderFilter(e.target.value)}
                placeholder="Your ID/email"
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
                onClick={() => { setKeywords(''); setOutboundRecipientFilter(''); setOutboundSenderFilter(''); }}
                className="ml-auto px-3 py-2 rounded border border-gray-300 hover:bg-gray-50"
                aria-label="Clear filters"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Panels */}
      {tab === 'inbound' ? (
        <div id="inbound-panel" role="tabpanel" aria-labelledby="inbound" className="bg-white border border-gray-200 rounded-lg">
          {/* Inbound list */}
          {inboundLoading ? (
            <div className="p-6">Loading inbound...</div>
          ) : inboundItems.length === 0 ? (
            <div className="p-6 text-gray-600">No inbound correspondence</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {inboundItems.map((c) => (
                <div key={c.id} className="p-4 flex items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-800 font-medium">{c.subject}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{c.category}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      From: {c.sender?.name ?? c.senderId ?? 'Unknown'} • Received: {c.sentAt ? new Date(c.sentAt).toLocaleString() : 'N/A'}
                    </div>
                    <div className="text-sm text-gray-700 mt-1 line-clamp-2">
                      {stripHtml(c.body).slice(0, 360)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="px-3 py-1 text-sm rounded border border-gray-300 hover:bg-gray-50"
                      aria-label="View inbound correspondence"
                      onClick={() => alert(`Inbound ${c.id}`)}
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
              Page {page + 1} of {Math.max(1, Math.ceil(inboundTotal / pageSize))}
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
                disabled={(page + 1) * pageSize >= inboundTotal}
                aria-label="Next page"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div id="outbound-panel" role="tabpanel" aria-labelledby="outbound" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Outbound list */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="p-4 border-b border-gray-100">
              <h3 className="text-gray-800 font-semibold">Outbound Letters</h3>
            </div>
            {outboundLoading ? (
              <div className="p-6">Loading outbound...</div>
            ) : outboundItems.length === 0 ? (
              <div className="p-6 text-gray-600">No outbound correspondence</div>
            ) : (
              <div className="divide-y divide-gray-100 max-h-[520px] overflow-y-auto">
                {outboundItems.map((c) => (
                  <div key={c.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-800 font-medium">{c.subject}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{c.category}</span>
                        {c.sentAt ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Sent</span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">Draft</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {!c.sentAt && (
                          <button
                            className="px-3 py-1 text-sm rounded border border-gray-300 hover:bg-gray-50"
                            aria-label="Edit draft"
                            onClick={() => {
                              setCurrentOutboundId(c.id);
                              setSubject(c.subject);
                              setEditorHtml(c.body);
                              setMergeFields(c.mergeFields ?? {});
                              setPatientId(c.patientId);
                              setCategory(c.category);
                              setRecipients(c.recipients ?? []);
                            }}
                          >
                            Edit
                          </button>
                        )}
                        <button
                          className="px-3 py-1 text-sm rounded border border-gray-300 hover:bg-gray-50"
                          aria-label="View letter"
                          onClick={() => {
                            alert(`Correspondence ${c.id}`);
                          }}
                        >
                          View
                        </button>
                      </div>
                    </div>
                    <div className="text-sm text-gray-700 mt-1 line-clamp-2">
                      {stripHtml(c.body).slice(0, 200)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            <div className="flex items-center justify-between p-4 border-t border-gray-100">
              <div className="text-sm text-gray-600">
                Page {page + 1} of {Math.max(1, Math.ceil(outboundTotal / pageSize))}
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
                  disabled={(page + 1) * pageSize >= outboundTotal}
                  aria-label="Next page"
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          {/* Template + Merge fields */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-gray-800 font-semibold mb-4">Template & Merge Fields</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Template</label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full p-2 rounded border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="" disabled>Select template...</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.isDefault ? '(Default)' : ''}
                    </option>
                  ))}
                </select>
                {resolvedHtml && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm text-gray-600">Preview resolved template</summary>
                    <div
                      className="mt-2 p-3 rounded border border-gray-200 bg-gray-50 prose max-w-none"
                      dangerouslySetInnerHTML={{ __html: resolvedHtml }}
                    />
                  </details>
                )}
              </div>

              {/* Basic merge fields form (users can extend) */}
              <fieldset className="border border-gray-200 rounded p-3">
                <legend className="text-sm text-gray-700 px-2">Specialist</legend>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input className="p-2 border rounded" placeholder="Name" value={mergeFields?.specialist?.name ?? ''} onChange={(e) => setMergeFields((mf) => ({ ...mf, specialist: { ...(mf.specialist ?? {}), name: e.target.value } }))} />
                  <input className="p-2 border rounded" placeholder="Salutation" value={mergeFields?.specialist?.salutation ?? ''} onChange={(e) => setMergeFields((mf) => ({ ...mf, specialist: { ...(mf.specialist ?? {}), salutation: e.target.value } }))} />
                  <input className="p-2 border rounded md:col-span-2" placeholder="Address" value={mergeFields?.specialist?.address ?? ''} onChange={(e) => setMergeFields((mf) => ({ ...mf, specialist: { ...(mf.specialist ?? {}), address: e.target.value } }))} />
                  <input className="p-2 border rounded md:col-span-2" placeholder="Contact" value={mergeFields?.specialist?.contact ?? ''} onChange={(e) => setMergeFields((mf) => ({ ...mf, specialist: { ...(mf.specialist ?? {}), contact: e.target.value } }))} />
                </div>
              </fieldset>

              <fieldset className="border border-gray-200 rounded p-3">
                <legend className="text-sm text-gray-700 px-2">Patient</legend>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input className="p-2 border rounded" placeholder="Full Name" value={mergeFields?.patient?.name ?? ''} onChange={(e) => setMergeFields((mf) => ({ ...mf, patient: { ...(mf.patient ?? {}), name: e.target.value } }))} />
                  <input className="p-2 border rounded" placeholder="Short Name" value={mergeFields?.patient?.shortName ?? ''} onChange={(e) => setMergeFields((mf) => ({ ...mf, patient: { ...(mf.patient ?? {}), shortName: e.target.value } }))} />
                  <input className="p-2 border rounded" placeholder="DOB" value={mergeFields?.patient?.dob ?? ''} onChange={(e) => setMergeFields((mf) => ({ ...mf, patient: { ...(mf.patient ?? {}), dob: e.target.value } }))} />
                  <input className="p-2 border rounded" placeholder="Identifier" value={mergeFields?.patient?.identifier ?? ''} onChange={(e) => setMergeFields((mf) => ({ ...mf, patient: { ...(mf.patient ?? {}), identifier: e.target.value } }))} />
                  <input className="p-2 border rounded md:col-span-2" placeholder="Age" value={mergeFields?.patient?.age ?? ''} onChange={(e) => setMergeFields((mf) => ({ ...mf, patient: { ...(mf.patient ?? {}), age: e.target.value } }))} />
                </div>
              </fieldset>

              <fieldset className="border border-gray-200 rounded p-3">
                <legend className="text-sm text-gray-700 px-2">Encounter</legend>
                <div className="grid grid-cols-1 gap-3">
                  <input className="p-2 border rounded" placeholder="Summary" value={mergeFields?.encounter?.summary ?? ''} onChange={(e) => setMergeFields((mf) => ({ ...mf, encounter: { ...(mf.encounter ?? {}), summary: e.target.value } }))} />
                </div>
              </fieldset>

              <fieldset className="border border-gray-200 rounded p-3">
                <legend className="text-sm text-gray-700 px-2">Provider</legend>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input className="p-2 border rounded" placeholder="Email" value={mergeFields?.provider?.email ?? ''} onChange={(e) => setMergeFields((mf) => ({ ...mf, provider: { ...(mf.provider ?? {}), email: e.target.value } }))} />
                  <input className="p-2 border rounded" placeholder="Full Name" value={mergeFields?.provider?.fullName ?? ''} onChange={(e) => setMergeFields((mf) => ({ ...mf, provider: { ...(mf.provider ?? {}), fullName: e.target.value } }))} />
                  <input className="p-2 border rounded" placeholder="MMC" value={mergeFields?.provider?.MMC ?? ''} onChange={(e) => setMergeFields((mf) => ({ ...mf, provider: { ...(mf.provider ?? {}), MMC: e.target.value } }))} />
                  <input className="p-2 border rounded" placeholder="Signature Hash" value={mergeFields?.provider?.signatureImageHash ?? ''} onChange={(e) => setMergeFields((mf) => ({ ...mf, provider: { ...(mf.provider ?? {}), signatureImageHash: e.target.value } }))} />
                </div>
              </fieldset>

              <button
                type="button"
                onClick={renderTemplate}
                className="px-3 py-2 rounded border border-gray-300 hover:bg-gray-50"
                aria-label="Refresh resolved template"
              >
                Refresh resolved template
              </button>
            </div>
          </div>

          {/* Editor */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 lg:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <input
                className="p-2 border rounded"
                placeholder="Patient ID"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                aria-label="Patient ID"
              />
              <input
                className="p-2 border rounded"
                placeholder="Subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                aria-label="Subject"
              />
              <select
                className="p-2 border rounded"
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                aria-label="Category"
              >
                <option value="referral">Referral</option>
                <option value="reply">Reply</option>
                <option value="discharge">Discharge</option>
                <option value="memo">Memo</option>
              </select>
              <select
                className="p-2 border rounded"
                value={transmissionChannel}
                onChange={(e) => setTransmissionChannel(e.target.value as any)}
                aria-label="Transmission channel"
              >
                <option value="email">Email</option>
                <option value="fax">Fax</option>
                <option value="portal">Portal</option>
                <option value="print">Print</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Recipients */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Recipients</label>
              {recipients.map((r, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                  <input className="p-2 border rounded" placeholder="Name" value={r.name ?? ''} onChange={(e) => {
                    const arr = [...recipients]; arr[idx] = { ...arr[idx], name: e.target.value }; setRecipients(arr);
                  }} />
                  <input className="p-2 border rounded" placeholder="Email" value={r.email ?? ''} onChange={(e) => {
                    const arr = [...recipients]; arr[idx] = { ...arr[idx], email: e.target.value }; setRecipients(arr);
                  }} />
                  <input className="p-2 border rounded" placeholder="Fax" value={r.fax ?? ''} onChange={(e) => {
                    const arr = [...recipients]; arr[idx] = { ...arr[idx], fax: e.target.value }; setRecipients(arr);
                  }} />
                </div>
              ))}
              <button
                type="button"
                className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50"
                onClick={() => setRecipients((arr) => [...arr, {}])}
                aria-label="Add recipient"
              >
                + Add recipient
              </button>
            </div>

            <RichTextEditor
              value={editorHtml}
              onChange={setEditorHtml}
              onAutosave={(html) => serverSaveOutbound(html)}
              autosaveDelayMs={1500}
              ariaLabel="Correspondence editor"
              placeholder="Compose your letter..."
              mergeFields={[
                { key: 'specialist.name', label: 'Specialist Name' },
                { key: 'specialist.address', label: 'Specialist Address' },
                { key: 'specialist.contact', label: 'Specialist Contact' },
                { key: 'specialist.salutation', label: 'Specialist Salutation' },
                { key: 'patient.name', label: 'Patient Name' },
                { key: 'patient.shortName', label: 'Patient Short Name' },
                { key: 'patient.dob', label: 'Patient DOB' },
                { key: 'patient.identifier', label: 'Patient Identifier' },
                { key: 'patient.age', label: 'Patient Age' },
                { key: 'today', label: 'Today' },
                { key: 'encounter.summary', label: 'Encounter Summary' },
                { key: 'medications.list', label: 'Medications' },
                { key: 'allergies.list', label: 'Allergies' },
                { key: 'pmh.list', label: 'Past Medical History' },
                { key: 'provider.email', label: 'Provider Email' },
                { key: 'provider.fullName', label: 'Provider Name' },
                { key: 'provider.MMC', label: 'Provider MMC' },
                { key: 'provider.signatureImageHash', label: 'Signature Hash' },
                { key: 'mmc.details', label: 'MMC Details' },
              ]}
              persistKey={DRAFT_LS_KEY}
              className=""
              toolbarClassName=""
              editorClassName=""
              statusClassName=""
            />

            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => serverSaveOutbound(editorHtml)}
                className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                aria-label="Save correspondence"
                disabled={editorSaving}
              >
                {editorSaving ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={sendOutbound}
                className="px-3 py-2 rounded bg-green-600 text-white hover:bg-green-700"
                aria-label="Send correspondence"
              >
                Send
              </button>
              <button
                type="button"
                onClick={renderPdf}
                className="px-3 py-2 rounded border border-gray-300 hover:bg-gray-50"
                aria-label="Export PDF"
              >
                Export PDF
              </button>
              <button
                type="button"
                className="px-3 py-2 rounded border border-gray-300 hover:bg-gray-50 ml-auto"
                aria-label="Clear draft"
                onClick={() => {
                  setCurrentOutboundId(null);
                  setEditorHtml('');
                  setMergeFields((mf) => ({ ...mf }));
                  setRecipients([]);
                  setSubject('');
                  try { localStorage.removeItem(DRAFT_LS_KEY); } catch {}
                }}
              >
                Clear Draft
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function stripHtml(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html || '';
  return (div.textContent || div.innerText || '').trim();
}