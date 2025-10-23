'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import RichTextEditor from '@/components/editor/RichTextEditor';
import PrescriptionForm from '@/components/provider/PrescriptionForm';

/**
 * Patient-scoped EMR Dashboard (Provider view)
 * Organizes all EMR modules under a single patient context: Today's Notes, Past Visits, Investigations, Correspondence.
 *
 * Rationale:
 * - All modules must be scoped to a specific patient to ensure unique, patient-specific records and safer workflows.
 * - This page consolidates per-patient views and actions to avoid cross-patient mixing.
 *
 * Tabs:
 * - Notes (Today's Notes): shows in-progress encounters and latest note status; quick actions for SOAP draft/finalize via module.
 * - Past Visits: chronological encounter timeline for the patient, with key excerpts.
 * - Investigations: Orders/Results filtered by patient, flags abnormal/critical; review action.
 * - Correspondence: Inbound/Outbound communications for the patient with search and basic preview.
 *
 * Accessibility: ARIA roles/labels on tabs/panels and controls.
 */

type TabKey = 'notes' | 'past' | 'investigations' | 'prescriptions' | 'correspondence';

type EncounterItem = {
  id: string;
  patientId: string;
  providerId: string;
  appointmentId: string | null;
  type: string;
  mode: string;
  startTime: string;
  endTime: string | null;
  location: string | null;
  renderingProviderId: string | null;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  latestNote: {
    id: string;
    status: 'draft' | 'finalized' | 'amended';
    summary: string | null;
    updatedAt: string;
  } | null;
};

type TimelineItem = {
  encounterId: string;
  providerId: string;
  date: string;
  mode: string;
  type: string;
  summary: string | null;
  assessment: string | null;
  plan: string | null;
  activeMedications?: string[] | null;
};

type InvestigationOrderItem = {
  id: string;
  patientId: string;
  providerId: string;
  code: string | null;
  name: string;
  status: 'ordered' | 'cancelled' | 'completed';
  orderedAt: string;
  lastResult?: {
    id: string;
    observedAt: string | null;
    interpretation: 'normal' | 'abnormal' | 'critical' | null;
    value: string | null;
    units: string | null;
    referenceRangeText: string | null;
  } | null;
};

type InvestigationResultItem = {
  id: string;
  orderId: string;
  name: string | null;
  value: string | null;
  units: string | null;
  interpretation: 'normal' | 'abnormal' | 'critical' | null;
  performer: string | null;
  observedAt: string | null;
  reviewed: boolean;
  reviewedAt: string | null;
};

type CorrespondenceItem = {
  id: string;
  patientId: string;
  direction: 'inbound' | 'outbound';
  category: 'referral' | 'reply' | 'discharge' | 'memo';
  subject: string;
  body: string;
  sentAt: string | null;
  transmissionChannel: 'email' | 'fax' | 'portal' | 'print' | 'other' | null;
};

export default function PatientEmrPage() {
  const { data: session } = useSession();
  const providerId = session?.user?.id;
  const router = useRouter();
  const params = useParams();
  const patientId = params.id as string;

  const [tab, setTab] = useState<TabKey>('notes');

  // Counters/status chips
  const [notesDraftCount, setNotesDraftCount] = useState(0);
  const [pastVisitsCount, setPastVisitsCount] = useState(0);
  const [investigationsCriticalCount, setInvestigationsCriticalCount] = useState(0);
  const [correspondenceInboundCount, setCorrespondenceInboundCount] = useState(0);

  // Notes (Encounters + latest note)
  const [encounters, setEncounters] = useState<EncounterItem[]>([]);
  const [encLoading, setEncLoading] = useState(false);

   // Past Visits Timeline
   const [timeline, setTimeline] = useState<TimelineItem[]>([]);
   const [timelineLoading, setTimelineLoading] = useState(false);
   // Past Visits filters (patient-scoped)
   const [timelineKeyword, setTimelineKeyword] = useState('');
   const [timelineFrom, setTimelineFrom] = useState('');
   const [timelineTo, setTimelineTo] = useState('');

  // Investigations
  const [orders, setOrders] = useState<InvestigationOrderItem[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [results, setResults] = useState<InvestigationResultItem[]>([]);
  const [resultsLoading, setResultsLoading] = useState(false);

  // Correspondence
  const [inbound, setInbound] = useState<CorrespondenceItem[]>([]);
  const [outbound, setOutbound] = useState<CorrespondenceItem[]>([]);
  const [corrLoading, setCorrLoading] = useState(false);

  // Prescriptions (patient-scoped)
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [rxLoading, setRxLoading] = useState(false);
  const [showRxModal, setShowRxModal] = useState(false);

  // Inbound uploads (client-side only view; persisted via /api/uploads)
  const [recentUploads, setRecentUploads] = useState<Array<{
    id: string;
    originalName: string;
    filename: string;
    mimeType: string;
    size: number;
    path: string;
  }>>([]);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Live Notes Editor (per in-progress encounter)
  const [editingEncounterId, setEditingEncounterId] = useState<string | null>(null);
  const [noteId, setNoteId] = useState<string | null>(null);
  const [noteSummaryHtml, setNoteSummaryHtml] = useState<string>('');
  const [noteSubjective, setNoteSubjective] = useState<string>('');
  const [noteObjective, setNoteObjective] = useState<string>('');
  const [noteAssessment, setNoteAssessment] = useState<string>('');
  const [notePlan, setNotePlan] = useState<string>('');
  const [noteSaving, setNoteSaving] = useState<boolean>(false);

  // Investigations - quick order form (patient-scoped; optional encounter link)
  const [invName, setInvName] = useState<string>('');
  const [invCode, setInvCode] = useState<string>('');
  const [invNotes, setInvNotes] = useState<string>('');
  const [invEncounterId, setInvEncounterId] = useState<string>('');

  // Correspondence - compose outbound
  const [corrSubject, setCorrSubject] = useState<string>('');
  const [corrCategory, setCorrCategory] = useState<'referral' | 'reply' | 'discharge' | 'memo'>('memo');
  const [corrBodyHtml, setCorrBodyHtml] = useState<string>('');
  const [corrChannel, setCorrChannel] = useState<'email' | 'fax' | 'portal' | 'print' | 'other'>('email');

  // Data loaders (moved above to satisfy TS ordering and avoid TDZ/TypeScript errors)

  // Load counters scoped to patient
  const fetchCounters = useCallback(async () => {
    if (!providerId || !patientId) return;
    try {
      const totalFrom = async (url: string) => {
        const res = await fetch(url);
        if (!res.ok) return 0;
        const json = await res.json();
        if (typeof json.total === 'number') return json.total;
        if (Array.isArray(json.items)) return json.items.length;
        return 0;
      };
      const notesCount = await totalFrom(`/api/progress-notes?page=0&pageSize=1&authorId=${encodeURIComponent(providerId)}&patientId=${encodeURIComponent(patientId)}&status=draft`);
      setNotesDraftCount(notesCount);

      const pastCount = await totalFrom(`/api/encounters?page=0&pageSize=1&providerId=${encodeURIComponent(providerId)}&patientId=${encodeURIComponent(patientId)}&status=completed`);
      setPastVisitsCount(pastCount);

      const critCount = await totalFrom(`/api/investigations/results?page=0&pageSize=1&providerId=${encodeURIComponent(providerId)}&patientId=${encodeURIComponent(patientId)}&interpretation=critical`);
      setInvestigationsCriticalCount(critCount);

      const inboundCount = await totalFrom(`/api/correspondence?page=0&pageSize=1&direction=inbound&patientId=${encodeURIComponent(patientId)}`);
      setCorrespondenceInboundCount(inboundCount);
    } catch {
      // ignore counters failure
    }
  }, [providerId, patientId]);

  useEffect(() => {
    fetchCounters();
  }, [fetchCounters]);

  // Notes: Load in-progress encounters for this patient
  const fetchEncounters = useCallback(async () => {
    if (!providerId || !patientId) return;
    setEncLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', '0');
      params.set('pageSize', '50');
      params.set('providerId', providerId);
      params.set('patientId', patientId);
      params.set('status', 'in_progress');
      const res = await fetch(`/api/encounters?${params.toString()}`);
      const json = await res.json();
      const items: EncounterItem[] = json.items ?? [];
      setEncounters(items);
    } catch {
      setEncounters([]);
    } finally {
      setEncLoading(false);
    }
  }, [providerId, patientId]);

  // Past Visits: patient timeline with patient-scoped filters (fallback to encounters if dedicated API not filtering)
  const fetchTimeline = useCallback(async () => {
    if (!patientId) return;
    setTimelineLoading(true);
    try {
      // Prefer dedicated past-visits endpoint (patient-scoped) with filters
      const pvParams = new URLSearchParams();
      pvParams.set('page', '0');
      pvParams.set('pageSize', '50');
      pvParams.set('patientId', patientId);
      if (timelineKeyword) pvParams.set('keywords', timelineKeyword);
      if (timelineFrom) pvParams.set('dateFrom', timelineFrom);
      if (timelineTo) pvParams.set('dateTo', timelineTo);
      const res = await fetch(`/api/past-visits?${pvParams.toString()}`);
      if (res.ok) {
        const json = await res.json();
        let items: TimelineItem[] = json.items ?? [];
        // Defensive client-side filtering (date range + keyword)
        items = items.filter((t) => {
          const d = new Date(t.date).getTime();
          const fromOk = timelineFrom ? d >= new Date(timelineFrom).getTime() : true;
          const toOk = timelineTo ? d <= new Date(timelineTo).getTime() : true;
          const kw = timelineKeyword.trim().toLowerCase();
          const kwOk = kw
            ? ((t.summary ?? '').toLowerCase().includes(kw) ||
               (t.assessment ?? '').toLowerCase().includes(kw) ||
               (t.plan ?? '').toLowerCase().includes(kw))
            : true;
          return fromOk && toOk && kwOk;
        });
        setTimeline(items);
      } else {
        // Fallback: derive from patient encounters (all clinicians), then filter locally
        const ecParams = new URLSearchParams();
        ecParams.set('page', '0');
        ecParams.set('pageSize', '50');
        ecParams.set('patientId', patientId);
        ecParams.set('status', 'completed');
        const ecRes = await fetch(`/api/encounters?${ecParams.toString()}`);
        const ecJson = await ecRes.json();
        let derived: TimelineItem[] = (ecJson.items ?? []).map((e: EncounterItem) => ({
          encounterId: e.id,
          providerId: e.providerId,
          date: e.startTime,
          mode: e.mode,
          type: e.type,
          summary: e.latestNote?.summary ?? null,
          assessment: null,
          plan: null,
          activeMedications: null,
        }));
        // Apply filters locally
        derived = derived.filter((t) => {
          const d = new Date(t.date).getTime();
          const fromOk = timelineFrom ? d >= new Date(timelineFrom).getTime() : true;
          const toOk = timelineTo ? d <= new Date(timelineTo).getTime() : true;
          const kw = timelineKeyword.trim().toLowerCase();
          const kwOk = kw
            ? ((t.summary ?? '').toLowerCase().includes(kw) ||
               (t.assessment ?? '').toLowerCase().includes(kw) ||
               (t.plan ?? '').toLowerCase().includes(kw))
            : true;
          return fromOk && toOk && kwOk;
        });
        setTimeline(derived);
      }
    } catch {
      setTimeline([]);
    } finally {
      setTimelineLoading(false);
    }
  }, [patientId, timelineKeyword, timelineFrom, timelineTo]);

  // Investigations: orders and results for patient
  const fetchInvestigations = useCallback(async () => {
    if (!providerId || !patientId) return;
    setOrdersLoading(true);
    setResultsLoading(true);
    try {
      const oParams = new URLSearchParams();
      oParams.set('page', '0');
      oParams.set('pageSize', '50');
      oParams.set('patientId', patientId);
      oParams.set('providerId', providerId);
      const oRes = await fetch(`/api/investigations/orders?${oParams.toString()}`);
      const oJson = await oRes.json();
      setOrders(oJson.items ?? []);
    } catch {
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
    try {
      const rParams = new URLSearchParams();
      rParams.set('page', '0');
      rParams.set('pageSize', '50');
      rParams.set('patientId', patientId);
      rParams.set('providerId', providerId);
      const rRes = await fetch(`/api/investigations/results?${rParams.toString()}`);
      const rJson = await rRes.json();
      setResults(rJson.items ?? []);
    } catch {
      setResults([]);
    } finally {
      setResultsLoading(false);
    }
  }, [providerId, patientId]);

  // Correspondence: inbound/outbound for patient
  const fetchCorrespondence = useCallback(async () => {
    if (!patientId) return;
    setCorrLoading(true);
    try {
      const inParams = new URLSearchParams();
      inParams.set('page', '0');
      inParams.set('pageSize', '50');
      inParams.set('direction', 'inbound');
      inParams.set('patientId', patientId);
      const inRes = await fetch(`/api/correspondence?${inParams.toString()}`);
      const inJson = await inRes.json();
      setInbound(inJson.items ?? []);
    } catch {
      setInbound([]);
    }
    try {
      const outParams = new URLSearchParams();
      outParams.set('page', '0');
      outParams.set('pageSize', '50');
      outParams.set('direction', 'outbound');
      outParams.set('patientId', patientId);
      const outRes = await fetch(`/api/correspondence?${outParams.toString()}`);
      const outJson = await outRes.json();
      setOutbound(outJson.items ?? []);
    } catch {
      setOutbound([]);
    } finally {
      setCorrLoading(false);
    }
  }, [patientId]);

// Inbound Uploads: client-side helper to send files to /api/uploads with 1MB limit and allowed types
const uploadFiles = useCallback(async (files: FileList | File[]) => {
  try {
    setUploadError(null);
    setUploading(true);

    const MAX_BYTES = 1_000_000; // 1MB
    const filesArr: File[] = files instanceof FileList ? Array.from(files) : (files as File[]);

    // Validate size and type on client
    for (const f of filesArr) {
      if (f.size > MAX_BYTES) {
        throw new Error(`"${f.name}" exceeds 1MB limit`);
      }
      const type = f.type || '';
      const name = f.name || '';
      const ext = name.toLowerCase().split('.').pop() || '';
      const isAllowed =
        type.startsWith('image/') ||
        type === 'application/pdf' ||
        type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        ext === 'pdf' || ext === 'docx'; // fallback by extension if type missing
      if (!isAllowed) {
        throw new Error(`"${f.name}" is not a supported file type`);
      }
    }

    const form = new FormData();
    for (const f of filesArr) {
      form.append('file', f, f.name);
    }

    const res = await fetch('/api/uploads', {
      method: 'POST',
      body: form,
    });

    if (!res.ok) {
      let msg = 'Upload failed';
      try {
        const err = await res.json();
        if (err?.error) msg = err.error;
      } catch {}
      throw new Error(msg);
    }

    const data = await res.json();
    // Support either { files: Uploaded[] } or Uploaded[] response shapes
    const uploaded = Array.isArray(data?.files) ? data.files : (Array.isArray(data) ? data : []);
    if (!Array.isArray(uploaded)) {
      throw new Error('Unexpected upload response');
    }

    setRecentUploads((prev) => [...uploaded, ...prev].slice(0, 10));
  } catch (e: any) {
    setUploadError(e?.message ?? 'Upload error');
  } finally {
    setUploading(false);
  }
}, []);
  // Helpers for Progress Notes (SOAP)
  const createDraftNote = useCallback(async (encId: string) => {
    if (!patientId) return null;
    try {
      const res = await fetch('/api/progress-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          encounterId: encId,
          summary: '',
          assessment: '',
          plan: '',
        }),
      });
      if (!res.ok) return null;
      const json = await res.json();
      const nid: string | null = json?.note?.id ?? null;
      return nid;
    } catch {
      return null;
    }
  }, [patientId]);

  const startEditNote = useCallback(async (enc: EncounterItem) => {
    // If existing latest note, populate editor; else create a draft first
    let nid = enc.latestNote?.id ?? null;
    if (!nid) {
      nid = await createDraftNote(enc.id);
    }
    if (!nid) {
      alert('Unable to create draft note');
      return;
    }
    setEditingEncounterId(enc.id);
    setNoteId(nid);
    setNoteSummaryHtml(enc.latestNote?.summary ?? '');
    // For brevity, assessment/plan are not included in EncounterItem.latestNote; start as blank and let provider fill
    setNoteSubjective('');
    setNoteObjective('');
    setNoteAssessment('');
    setNotePlan('');
  }, [createDraftNote]);

  const saveNotePartial = useCallback(async (fields: { summaryHtml?: string; subjective?: string; objective?: string; assessment?: string; plan?: string }) => {
    if (!noteId) return;
    setNoteSaving(true);
    try {
      const res = await fetch('/api/progress-notes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: noteId,
          subjective: fields.subjective ?? undefined,
          objective: fields.objective ?? undefined,
          summary: fields.summaryHtml ?? undefined,
          assessment: fields.assessment ?? undefined,
          plan: fields.plan ?? undefined,
        }),
      });
      if (!res.ok) {
        console.warn('Failed to save note');
      } else {
        // Refresh encounters to reflect latest summary/status
        await fetchEncounters();
      }
    } finally {
      setNoteSaving(false);
    }
  }, [noteId, fetchEncounters]);

  const finalizeCurrentNote = useCallback(async () => {
    if (!noteId) return;
    try {
      const res = await fetch('/api/progress-notes/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: noteId,
          signatureHash: `SIGNED-BY-${providerId ?? 'provider'}`,
        }),
      });
      if (res.ok) {
        setEditingEncounterId(null);
        setNoteId(null);
        setNoteSummaryHtml('');
        setNoteSubjective('');
        setNoteObjective('');
        setNoteAssessment('');
        setNotePlan('');
        await fetchEncounters();
        fetchCounters();
      } else {
        const err = await res.json().catch(() => null);
        alert(`Finalize failed${err?.error ? `: ${err.error}` : ''}`);
      }
    } catch {
      alert('Error finalizing note');
    }
  }, [noteId, providerId, fetchEncounters, fetchCounters]);

  // Investigations quick order creation
  const createInvestigationOrder = useCallback(async () => {
    if (!providerId || !patientId) return;
    if (!invName.trim()) {
      alert('Investigation name is required');
      return;
    }
    try {
      const res = await fetch('/api/investigations/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          providerId,
          encounterId: invEncounterId || undefined,
          code: invCode || undefined,
          name: invName,
          notes: invNotes || undefined,
        }),
      });
      if (res.ok) {
        setInvName('');
        setInvCode('');
        setInvNotes('');
        setInvEncounterId('');
        await fetchInvestigations();
        fetchCounters();
      } else {
        alert('Failed to create order');
      }
    } catch {
      alert('Error creating order');
    }
  }, [providerId, patientId, invName, invCode, invNotes, invEncounterId, fetchInvestigations, fetchCounters]);

  // Correspondence compose + send
  const sendOutboundCorrespondence = useCallback(async () => {
    if (!patientId) return;
    if (!corrSubject.trim()) {
      alert('Subject is required');
      return;
    }
    if (!corrBodyHtml.trim()) {
      alert('Body is required');
      return;
    }
    try {
      // Create draft correspondence (outbound)
      const createRes = await fetch('/api/correspondence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          direction: 'outbound',
          category: corrCategory,
          subject: corrSubject,
          body: corrBodyHtml,
        }),
      });
      if (!createRes.ok) {
        alert('Failed to create correspondence');
        return;
      }
      const createJson = await createRes.json();
      const id: string | null = createJson?.correspondence?.id ?? null;
      if (!id) {
        alert('Missing correspondence id');
        return;
      }
      // Send (record transmission)
      const sendRes = await fetch(`/api/correspondence/send/${encodeURIComponent(id)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transmissionChannel: corrChannel,
        }),
      });
      if (sendRes.ok) {
        setCorrSubject('');
        setCorrBodyHtml('');
        setCorrCategory('memo');
        setCorrChannel('email');
        await fetchCorrespondence();
        fetchCounters();
      } else {
        alert('Failed to send correspondence');
      }
    } catch {
      alert('Error sending correspondence');
    }
  }, [patientId, corrSubject, corrBodyHtml, corrCategory, corrChannel, fetchCorrespondence, fetchCounters]);

   // Persist selected tab per patient
   useEffect(() => {
     try {
       const key = `patient_emr_tab_${patientId}`;
       const saved = localStorage.getItem(key);
       if (saved && (saved === 'notes' || saved === 'past' || saved === 'investigations' || saved === 'prescriptions' || saved === 'correspondence')) {
         setTab(saved as TabKey);
       }
     } catch {}
   }, [patientId]);
   useEffect(() => {
     try {
       const key = `patient_emr_tab_${patientId}`;
       localStorage.setItem(key, tab);
     } catch {}
   }, [tab, patientId]);
  
   // Load saved Past Visits filters for this patient
   useEffect(() => {
     try {
       const k = `patient_emr_past_filters_${patientId}`;
       const raw = localStorage.getItem(k);
       if (raw) {
         const parsed = JSON.parse(raw);
         if (typeof parsed.keyword === 'string') setTimelineKeyword(parsed.keyword);
         if (typeof parsed.from === 'string') setTimelineFrom(parsed.from);
         if (typeof parsed.to === 'string') setTimelineTo(parsed.to);
       }
     } catch {}
   }, [patientId]);
  
   // Persist Past Visits filters when they change
   useEffect(() => {
     try {
       const k = `patient_emr_past_filters_${patientId}`;
       const payload = JSON.stringify({ keyword: timelineKeyword, from: timelineFrom, to: timelineTo });
       localStorage.setItem(k, payload);
     } catch {}
   }, [patientId, timelineKeyword, timelineFrom, timelineTo]);

  // Load counters scoped to patient (moved above)

  // useEffect moved above with fetchCounters

  // fetchEncounters moved above

   // fetchTimeline moved above

  // fetchInvestigations moved above

  // fetchCorrespondence moved above

  useEffect(() => {
    // Load data for active tab
    if (tab === 'notes') fetchEncounters();
    if (tab === 'past') fetchTimeline();
    if (tab === 'investigations') fetchInvestigations();
    if (tab === 'correspondence') fetchCorrespondence();
    if (tab === 'prescriptions') {
      if (!providerId || !patientId) return;
      setRxLoading(true);
      const params = new URLSearchParams();
      params.set('page', '0');
      params.set('pageSize', '50');
      fetch(`/api/provider/patients/${encodeURIComponent(patientId)}/emr/prescriptions?${params.toString()}`)
        .then((res) => res.json().catch(() => ({})))
        .then((json) => {
          const items = json?.data?.items ?? json?.items ?? [];
          setPrescriptions(Array.isArray(items) ? items : []);
        })
        .catch(() => setPrescriptions([]))
        .finally(() => setRxLoading(false));
    }
  }, [tab, fetchEncounters, fetchTimeline, fetchInvestigations, fetchCorrespondence, providerId, patientId]);

  const activeRxCount = useMemo(() => prescriptions.filter((p: any) => p.status === 'ACTIVE').length, [prescriptions]);

  const totalLabel = useMemo(() => {
    switch (tab) {
      case 'notes': return notesDraftCount;
      case 'past': return pastVisitsCount;
      case 'investigations': return investigationsCriticalCount;
      case 'prescriptions': return activeRxCount;
      case 'correspondence': return correspondenceInboundCount;
      default: return 0;
    }
  }, [tab, notesDraftCount, pastVisitsCount, investigationsCriticalCount, correspondenceInboundCount, activeRxCount]);

  // Actions
  const markResultReviewed = useCallback(async (resultId: string) => {
    try {
      const res = await fetch(`/api/investigations/results/${encodeURIComponent(resultId)}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        fetchInvestigations();
      } else {
        alert('Failed to mark reviewed');
      }
    } catch {
      alert('Error marking reviewed');
    }
  }, [fetchInvestigations]);

  const handleCancelRx = useCallback(async (rxId: string) => {
    try {
      const reason = window.prompt('Enter cancellation reason', 'Cancelled by provider') || '';
      if (!reason.trim()) return;
      const res = await fetch(`/api/prescriptions/${encodeURIComponent(rxId)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) {
        // Refresh list
        if (tab === 'prescriptions') {
          setRxLoading(true);
          const params = new URLSearchParams();
          params.set('page', '0');
          params.set('pageSize', '50');
          const r = await fetch(`/api/provider/patients/${encodeURIComponent(patientId)}/emr/prescriptions?${params.toString()}`);
          const j = await r.json().catch(() => ({}));
          const items = j?.data?.items ?? j?.items ?? [];
          setPrescriptions(Array.isArray(items) ? items : []);
          setRxLoading(false);
        }
      } else {
        const err = await res.json().catch(() => null);
        alert(err?.detail || 'Failed to cancel prescription');
      }
    } catch {
      alert('Error cancelling prescription');
    }
  }, [patientId, tab]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Patient EMR</h1>
          <p className="text-gray-600">All modules scoped to patient: unique records and actions</p>
        </div>
        <div className="flex items-center gap-2" aria-label="Patient EMR counters">
          <span className="text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded-full">
            {totalLabel} {tab === 'notes' ? 'Draft Notes' : tab === 'past' ? 'Past Visits' : tab === 'investigations' ? 'Critical Results' : 'Inbound Messages'}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div role="tablist" aria-label="Patient EMR tabs" className="flex gap-2">
        {([
          { key: 'notes', label: "Today's Notes" },
          { key: 'past', label: 'Past Visits' },
          { key: 'investigations', label: 'Investigations' },
          { key: 'prescriptions', label: 'Prescriptions' },
          { key: 'correspondence', label: 'Correspondence' },
        ] as Array<{ key: TabKey; label: string }>).map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            aria-controls={`${t.key}-panel`}
            className={`px-4 py-2 rounded-lg border ${tab === t.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Panels */}
      {tab === 'notes' && (
        <div id="notes-panel" role="tabpanel" aria-labelledby="notes" className="bg-white border border-gray-200 rounded-lg">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-gray-800 font-semibold">In-progress Encounters (Patient)</h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchEncounters}
                className="px-3 py-2 rounded border border-gray-300 hover:bg-gray-50"
                aria-label="Refresh"
              >
                Refresh
              </button>
              <button
                type="button"
                className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                aria-label="Start today's note"
                onClick={async () => {
                  if (!patientId || !providerId) return;
                  try {
                    // try load latest draft
                    const qp = new URLSearchParams();
                    qp.set('page', '0');
                    qp.set('pageSize', '1');
                    qp.set('patientId', patientId);
                    qp.set('authorId', providerId);
                    qp.set('status', 'draft');
                    const res = await fetch(`/api/progress-notes?${qp.toString()}`);
                    let nid: string | null = null;
                    if (res.ok) {
                      const js = await res.json();
                      const n = Array.isArray(js.items) ? js.items[0] : null;
                      if (n) {
                        nid = n.id;
                        setNoteSummaryHtml(n.summary ?? '');
                        setNoteSubjective(n.subjective ?? '');
                        setNoteObjective(n.objective ?? '');
                        setNoteAssessment(n.assessment ?? '');
                        setNotePlan(n.plan ?? '');
                      }
                    }
                    // create if none
                    if (!nid) {
                      const createRes = await fetch('/api/progress-notes', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          patientId,
                          summary: '',
                          assessment: '',
                          plan: '',
                        }),
                      });
                      if (!createRes.ok) {
                        alert('Unable to start note');
                        return;
                      }
                      const cj = await createRes.json();
                      nid = cj?.note?.id ?? null;
                      setNoteSummaryHtml('');
                      setNoteSubjective('');
                      setNoteObjective('');
                      setNoteAssessment('');
                      setNotePlan('');
                    }
                    if (nid) {
                      setNoteId(nid);
                      // editor is shown when noteId exists (no need for encounter id)
                      setEditingEncounterId(null);
                    }
                  } catch {
                    alert('Error starting note');
                  }
                }}
              >
                Start Today's Note
              </button>
            </div>
          </div>
          {encLoading ? (
            <div className="p-4">Loading encounters…</div>
          ) : encounters.length === 0 ? (
            <div className="p-4 text-gray-600">No in-progress encounters for this patient</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {encounters.map((e) => (
                <div key={e.id} className="p-4 flex items-start justify-between">
                  <div>
                    <div className="text-sm text-gray-700">
                      <span className="font-medium">{e.type}</span> • <span>{e.mode}</span>
                    </div>
                    <div className="text-xs text-gray-600">
                      Started: {new Date(e.startTime).toLocaleString()}
                    </div>
                    <div className="mt-1 text-xs">
                      {e.latestNote?.status ? (
                        <span className={`px-2 py-0.5 rounded-full ${e.latestNote.status === 'finalized' ? 'bg-green-100 text-green-700' : e.latestNote.status === 'draft' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>
                          {e.latestNote.status}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">no note</span>
                      )}
                    </div>
                    {e.latestNote?.summary && (
                      <div className="text-sm text-gray-700 mt-2 line-clamp-2">
                        {e.latestNote.summary}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {editingEncounterId === e.id ? (
                      <>
                        <button
                          type="button"
                          className="px-3 py-2 rounded border border-gray-300 hover:bg-gray-50"
                          onClick={() => {
                            setEditingEncounterId(null);
                            setNoteId(null);
                          }}
                          aria-label="Close editor"
                        >
                          Close Editor
                        </button>
                        <button
                          type="button"
                          className="px-3 py-2 rounded bg-green-600 text-white hover:bg-green-700"
                          onClick={finalizeCurrentNote}
                          aria-label="Finalize note"
                          disabled={!noteId || noteSaving}
                        >
                          {noteSaving ? 'Saving…' : 'Finalize Note'}
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="px-3 py-2 rounded border border-gray-300 hover:bg-gray-50"
                        onClick={() => startEditNote(e)}
                        aria-label="Edit note inline"
                      >
                        Edit Note Inline
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* Inline Note Editor (SOAP summary + assessment/plan) */}
          {(editingEncounterId || noteId) && (
            <div className="border-t border-gray-200">
              <div className="p-4">
                <h4 className="text-gray-800 font-semibold mb-2">Today's Note (Patient-scoped)</h4>
                <div className="text-xs text-gray-600 mb-2">
                  Note ID: {noteId ?? '—'} {noteSaving ? '• Saving…' : ''}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Summary</label>
                    {/* Inline rich text editor for summary with autosave */}
                    <RichTextEditor
                      value={noteSummaryHtml}
                      onChange={(html: string) => setNoteSummaryHtml(html)}
                      onAutosave={async (html: string) => {
                        await saveNotePartial({ summaryHtml: html });
                      }}
                      ariaLabel="Progress note summary"
                      persistKey={noteId ? `progress_note_summary_${noteId}` : undefined}
                      editorClassName="min-h-[180px] p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border border-gray-200 rounded-lg p-3">
                      <h5 className="text-xs font-semibold text-gray-700 mb-1">Subjective</h5>
                      <textarea
                        value={noteSubjective}
                        onChange={(e) => setNoteSubjective(e.target.value)}
                        onBlur={() => saveNotePartial({ subjective: noteSubjective })}
                        className="w-full min-h-[100px] p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="border border-gray-200 rounded-lg p-3">
                      <h5 className="text-xs font-semibold text-gray-700 mb-1">Objective</h5>
                      <textarea
                        value={noteObjective}
                        onChange={(e) => setNoteObjective(e.target.value)}
                        onBlur={() => saveNotePartial({ objective: noteObjective })}
                        className="w-full min-h-[100px] p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="border border-gray-200 rounded-lg p-3">
                      <h5 className="text-xs font-semibold text-gray-700 mb-1">Assessment</h5>
                      <textarea
                        value={noteAssessment}
                        onChange={(e) => setNoteAssessment(e.target.value)}
                        onBlur={() => saveNotePartial({ assessment: noteAssessment })}
                        className="w-full min-h-[100px] p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="border border-gray-200 rounded-lg p-3">
                      <h5 className="text-xs font-semibold text-gray-700 mb-1">Plan</h5>
                      <textarea
                        value={notePlan}
                        onChange={(e) => setNotePlan(e.target.value)}
                        onBlur={() => saveNotePartial({ plan: notePlan })}
                        className="w-full min-h-[100px] p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'past' && (
        <div id="past-panel" role="tabpanel" aria-labelledby="past" className="bg-white border border-gray-200 rounded-lg">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-gray-800 font-semibold">Past Visits Timeline</h3>
            <button
              type="button"
              onClick={fetchTimeline}
              className="px-3 py-2 rounded border border-gray-300 hover:bg-gray-50"
              aria-label="Refresh"
            >
              Refresh
            </button>
          </div>
          {/* Patient-scoped filters */}
          <div className="p-4 border-b border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Keywords</label>
                <input
                  type="text"
                  value={timelineKeyword}
                  onChange={(e) => setTimelineKeyword(e.target.value)}
                  placeholder="Diagnoses, plans, notes…"
                  aria-label="Past visits keywords"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">From</label>
                <input
                  type="date"
                  value={timelineFrom}
                  onChange={(e) => setTimelineFrom(e.target.value)}
                  aria-label="Past visits from date"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">To</label>
                <input
                  type="date"
                  value={timelineTo}
                  onChange={(e) => setTimelineTo(e.target.value)}
                  aria-label="Past visits to date"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={fetchTimeline}
                  className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                  aria-label="Apply filters"
                >
                  Apply
                </button>
                <button
                  type="button"
                  onClick={() => { setTimelineKeyword(''); setTimelineFrom(''); setTimelineTo(''); fetchTimeline(); }}
                  className="px-3 py-2 rounded border border-gray-300 hover:bg-gray-50"
                  aria-label="Clear filters"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
          {timelineLoading ? (
            <div className="p-4">Loading timeline…</div>
          ) : timeline.length === 0 ? (
            <div className="p-4 text-gray-600">No past encounters for this patient</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {timeline.map((t) => (
                <div key={t.encounterId} className="p-4">
                  <div className="text-sm text-gray-700">
                    <span className="font-medium">{t.type}</span> • <span>{t.mode}</span>
                  </div>
                  <div className="text-xs text-gray-600">
                    Date: {new Date(t.date).toLocaleString()}
                  </div>
                  <div className="mt-2 text-sm text-gray-700">
                    {t.summary ? <div className="line-clamp-2">{t.summary}</div> : <span className="text-gray-500">No summary</span>}
                  </div>
                  {(t.assessment || t.plan) && (
                    <div className="mt-2 text-xs text-gray-600">
                      {t.assessment && <div><strong>Assessment:</strong> {t.assessment}</div>}
                      {t.plan && <div><strong>Plan:</strong> {t.plan}</div>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'investigations' && (
        <div id="investigations-panel" role="tabpanel" aria-labelledby="investigations" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Orders */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-gray-800 font-semibold">Orders</h3>
              <button
                type="button"
                onClick={fetchInvestigations}
                className="px-3 py-2 rounded border border-gray-300 hover:bg-gray-50"
                aria-label="Refresh"
              >
                Refresh
              </button>
            </div>
            {/* Quick create order */}
            <div className="p-4 border-b border-gray-100">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={invName}
                    onChange={(e) => setInvName(e.target.value)}
                    placeholder="e.g., Full Blood Count"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Code</label>
                  <input
                    type="text"
                    value={invCode}
                    onChange={(e) => setInvCode(e.target.value)}
                    placeholder="LOINC/Custom"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Encounter (optional)</label>
                  <select
                    value={invEncounterId}
                    onChange={(e) => setInvEncounterId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">None</option>
                    {encounters.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.type} • {new Date(e.startTime).toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={createInvestigationOrder}
                    className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 w-full"
                  >
                    Create Order
                  </button>
                </div>
                <div className="md:col-span-5">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Notes (optional)</label>
                  <textarea
                    value={invNotes}
                    onChange={(e) => setInvNotes(e.target.value)}
                    className="w-full min-h-[60px] p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
            {ordersLoading ? (
              <div className="p-4">Loading orders…</div>
            ) : orders.length === 0 ? (
              <div className="p-4 text-gray-600">No orders for this patient</div>
            ) : (
              <div className="divide-y divide-gray-100 max-h-[420px] overflow-y-auto">
                {orders.map((o) => (
                  <div key={o.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-800 font-medium">{o.name}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{o.status}</span>
                        {o.lastResult?.interpretation === 'critical' && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">Critical</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-600">
                        Ordered: {new Date(o.orderedAt).toLocaleString()}
                      </div>
                    </div>
                    {o.lastResult && (
                      <div className="text-sm text-gray-700 mt-1">
                        Last: {o.lastResult.value ?? '—'} {o.lastResult.units ?? ''} ({o.lastResult.referenceRangeText ?? 'range N/A'})
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Results */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="p-4 border-b border-gray-100">
              <h3 className="text-gray-800 font-semibold">Results</h3>
            </div>
            {resultsLoading ? (
              <div className="p-4">Loading results…</div>
            ) : results.length === 0 ? (
              <div className="p-4 text-gray-600">No results for this patient</div>
            ) : (
              <div className="divide-y divide-gray-100 max-h-[420px] overflow-y-auto">
                {results.map((r) => (
                  <div key={r.id} className="p-4 flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-800 font-medium">{r.name ?? 'Result'}</span>
                        {r.interpretation && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            r.interpretation === 'critical' ? 'bg-red-100 text-red-700' :
                            r.interpretation === 'abnormal' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {r.interpretation}
                          </span>
                        )}
                        {r.reviewed ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Reviewed</span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">Unreviewed</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-700 mt-1">
                        {r.value ?? '—'} {r.units ?? ''} • Observed: {r.observedAt ? new Date(r.observedAt).toLocaleString() : 'N/A'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!r.reviewed && (
                        <button
                          type="button"
                          onClick={() => markResultReviewed(r.id)}
                          className="px-3 py-1 text-sm rounded border border-gray-300 hover:bg-gray-50"
                          aria-label="Mark as reviewed"
                        >
                          Mark Reviewed
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'prescriptions' && (
        <div id="prescriptions-panel" role="tabpanel" aria-labelledby="prescriptions" className="bg-white border border-gray-200 rounded-lg">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-gray-800 font-semibold">Prescriptions</h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  if (!providerId || !patientId) return;
                  setRxLoading(true);
                  const params = new URLSearchParams();
                  params.set('page', '0');
                  params.set('pageSize', '50');
                  try {
                    const res = await fetch(`/api/provider/patients/${encodeURIComponent(patientId)}/emr/prescriptions?${params.toString()}`);
                    const json = await res.json().catch(() => ({}));
                    const items = json?.data?.items ?? json?.items ?? [];
                    setPrescriptions(Array.isArray(items) ? items : []);
                  } finally {
                    setRxLoading(false);
                  }
                }}
                className="px-3 py-2 rounded border border-gray-300 hover:bg-gray-50"
                aria-label="Refresh"
              >
                Refresh
              </button>
              <button
                type="button"
                onClick={() => setShowRxModal(true)}
                className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                aria-label="New Prescription"
              >
                New Prescription
              </button>
            </div>
          </div>

          {/* Active medications */}
          <div className="p-4 border-b border-gray-100">
            <h4 className="text-gray-800 font-semibold mb-2">Active Medications</h4>
            {rxLoading ? (
              <div className="text-sm text-gray-600">Loading…</div>
            ) : (
              <>
                {prescriptions.filter((p: any) => p.status === 'ACTIVE').length === 0 ? (
                  <div className="text-sm text-gray-600">No active prescriptions</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {prescriptions.filter((p: any) => p.status === 'ACTIVE').map((p: any) => (
                      <span key={p.id} className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                        {p.medicationName} • {p.dosage}
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* All prescriptions table */}
          {rxLoading ? (
            <div className="p-4">Loading prescriptions…</div>
          ) : prescriptions.length === 0 ? (
            <div className="p-4 text-gray-600">No prescriptions for this patient</div>
          ) : (
            <div className="p-4 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-gray-700">Medication</th>
                    <th className="text-left py-2 px-3 text-gray-700">Dosage</th>
                    <th className="text-left py-2 px-3 text-gray-700">Duration</th>
                    <th className="text-left py-2 px-3 text-gray-700">Prescribed</th>
                    <th className="text-left py-2 px-3 text-gray-700">Status</th>
                    <th className="text-left py-2 px-3 text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {prescriptions.map((p: any) => (
                    <tr key={p.id} className="border-b border-gray-100">
                      <td className="py-3 px-3 font-medium text-gray-800">{p.medicationName}</td>
                      <td className="py-3 px-3 text-gray-700">{p.dosage}</td>
                      <td className="py-3 px-3 text-gray-700">{p.duration}</td>
                      <td className="py-3 px-3 text-gray-700">{p.prescribedDate ? new Date(p.prescribedDate).toLocaleDateString() : '-'}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          p.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-700'
                          : p.status === 'ACTIVE' ? 'bg-green-100 text-green-700'
                          : p.status === 'COMPLETED' ? 'bg-blue-100 text-blue-700'
                          : p.status === 'CANCELLED' ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-700'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          {p.status === 'DRAFT' && (
                            <button
                              type="button"
                              className="px-2 py-1 text-xs rounded border border-gray-300 hover:bg-gray-50"
                              title="Edit draft in modal"
                              onClick={() => setShowRxModal(true)}
                            >
                              Edit
                            </button>
                          )}
                          {p.status === 'ACTIVE' && (
                            <button
                              type="button"
                              className="px-2 py-1 text-xs rounded border border-red-300 text-red-700 hover:bg-red-50"
                              title="Cancel prescription"
                              onClick={() => handleCancelRx(p.id)}
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* New Prescription Modal */}
          {showRxModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl shadow-strong w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                  <h4 className="text-gray-800 font-semibold">New Prescription</h4>
                  <button
                    type="button"
                    onClick={() => setShowRxModal(false)}
                    className="px-2 py-1 text-sm rounded border border-gray-300 hover:bg-gray-50"
                  >
                    Close
                  </button>
                </div>
                <div className="p-4">
                  <PrescriptionForm
                    context="emr"
                    patientId={patientId}
                    onClose={() => setShowRxModal(false)}
                    onCreated={async () => {
                      setShowRxModal(false);
                      // Refresh after creation
                      if (!providerId || !patientId) return;
                      setRxLoading(true);
                      const params = new URLSearchParams();
                      params.set('page', '0');
                      params.set('pageSize', '50');
                      try {
                        const res = await fetch(`/api/provider/patients/${encodeURIComponent(patientId)}/emr/prescriptions?${params.toString()}`);
                        const json = await res.json().catch(() => ({}));
                        const items = json?.data?.items ?? json?.items ?? [];
                        setPrescriptions(Array.isArray(items) ? items : []);
                      } finally {
                        setRxLoading(false);
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'correspondence' && (
        <div id="correspondence-panel" role="tabpanel" aria-labelledby="correspondence" className="bg-white border border-gray-200 rounded-lg">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-gray-800 font-semibold">Correspondence</h3>
            <button
              type="button"
              onClick={fetchCorrespondence}
              className="px-3 py-2 rounded border border-gray-300 hover:bg-gray-50"
              aria-label="Refresh"
            >
              Refresh
            </button>
          </div>
          {/* Compose outbound correspondence */}
          <div className="p-4 border-b border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Subject</label>
                <input
                  type="text"
                  value={corrSubject}
                  onChange={(e) => setCorrSubject(e.target.value)}
                  placeholder="Subject"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={corrCategory}
                  onChange={(e) => setCorrCategory(e.target.value as any)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="memo">Memo</option>
                  <option value="referral">Referral</option>
                  <option value="reply">Reply</option>
                  <option value="discharge">Discharge</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Channel</label>
                <select
                  value={corrChannel}
                  onChange={(e) => setCorrChannel(e.target.value as any)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="email">Email</option>
                  <option value="fax">Fax</option>
                  <option value="portal">Portal</option>
                  <option value="print">Print</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={sendOutboundCorrespondence}
                  className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 w-full"
                >
                  Send
                </button>
              </div>
              <div className="md:col-span-5">
                <label className="block text-xs font-medium text-gray-700 mb-1">Body</label>
                <RichTextEditor
                  value={corrBodyHtml}
                  onChange={(html: string) => setCorrBodyHtml(html)}
                  ariaLabel="Correspondence body"
                  editorClassName="min-h-[120px] p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
          {corrLoading ? (
            <div className="p-4">Loading correspondence…</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2">
              {/* Inbound */}
              <div className="border-r border-gray-100">
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-gray-800 font-semibold">Inbound</h4>
                    <div className="flex items-center gap-2">
                      <input
                        id="inboundUpload"
                        type="file"
                        multiple
                        accept=".pdf,.docx,image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files;
                          if (f) uploadFiles(f);
                          // reset so same file can be re-selected
                          (e.target as HTMLInputElement).value = '';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => document.getElementById('inboundUpload')?.click()}
                        className="px-3 py-1 text-sm rounded border border-gray-300 hover:bg-gray-50"
                        aria-label="Upload attachments"
                      >
                        Upload
                      </button>
                      <span className="text-[11px] text-gray-500">Max 1MB per file</span>
                    </div>
                  </div>
                  {uploading && <div className="text-xs text-gray-600 mt-2">Uploading…</div>}
                  {uploadError && <div className="text-xs text-red-600 mt-2">{uploadError}</div>}
                  {recentUploads.length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs font-semibold text-gray-700 mb-1">Recent uploads</div>
                      <ul className="text-xs text-gray-700 space-y-1">
                        {recentUploads.map((u) => (
                          <li key={u.id}>
                            <a
                              href={u.path}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              {u.originalName}
                            </a>
                            <span className="ml-1 text-gray-500">({Math.ceil(u.size / 1024)} KB)</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                {inbound.length === 0 ? (
                  <div className="px-4 pb-4 text-gray-600">No inbound correspondence</div>
                ) : (
                  <div className="divide-y divide-gray-100 max-h-[420px] overflow-y-auto">
                    {inbound.map((c) => (
                      <div key={c.id} className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-800 font-medium">{c.subject}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{c.category}</span>
                        </div>
                        <div className="text-xs text-gray-600">Received: {c.sentAt ? new Date(c.sentAt).toLocaleString() : 'N/A'}</div>
                        <div className="text-sm text-gray-700 mt-1 line-clamp-2">{stripHtml(c.body).slice(0, 200)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* Outbound */}
              <div>
                <div className="p-4">
                  <h4 className="text-gray-800 font-semibold">Outbound</h4>
                </div>
                {outbound.length === 0 ? (
                  <div className="px-4 pb-4 text-gray-600">No outbound correspondence</div>
                ) : (
                  <div className="divide-y divide-gray-100 max-h-[420px] overflow-y-auto">
                    {outbound.map((c) => (
                      <div key={c.id} className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-800 font-medium">{c.subject}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{c.category}</span>
                          {c.sentAt ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Sent</span>
                          ) : (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">Draft</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-600">
                          {c.sentAt ? `Sent via ${c.transmissionChannel ?? 'unknown'}` : 'Not sent'}
                        </div>
                        <div className="text-sm text-gray-700 mt-1 line-clamp-2">{stripHtml(c.body).slice(0, 200)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
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