'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';

/**
 * Today's Notes (SOAP) UI
 * - Default open landing for EMR documentation
 * - Shows provider's in-progress encounters
 * - For selected encounter: loads/creates draft ProgressNote and provides SOAP tabs
 * - Autosave with visual indicator; Finalize workflow captures signature hash and locks content
 * - Accessibility labels and keyboard shortcuts:
 *   - Ctrl/Cmd+1..4: switch tabs (S,O,A,P)
 *   - Ctrl/Cmd+S: manual save
 */

type EncounterItem = {
  id: string;
  patientId: string;
  providerId: string;
  type: string;
  mode: string;
  startTime: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  latestNote?: {
    id: string;
    status: 'draft' | 'finalized' | 'amended';
    summary: string | null;
    updatedAt: string;
  } | null;
};

type ProgressNoteItem = {
  id: string;
  encounterId: string | null;
  patientId: string;
  authorId: string;
  status: 'draft' | 'finalized' | 'amended';
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
  summary: string | null;
  autosavedAt: string | null;
  finalizedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type TabKey = 'S' | 'O' | 'A' | 'P';

const DEFAULT_TITLE = 'SOAP Note';

export default function ProviderNotesPage() {
  const { data: session } = useSession();
  const providerId = session?.user?.id;

  // Encounters
  const [encounters, setEncounters] = useState<EncounterItem[]>([]);
  const [encLoading, setEncLoading] = useState<boolean>(false);
  const [selectedEncounterId, setSelectedEncounterId] = useState<string>('');

  // Note
  const [note, setNote] = useState<ProgressNoteItem | null>(null);
  const [subjective, setSubjective] = useState<string>('');
  const [objective, setObjective] = useState<string>('');
  const [assessment, setAssessment] = useState<string>('');
  const [plan, setPlan] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const saveTimeoutRef = useRef<number | null>(null);
  const [signatureHash, setSignatureHash] = useState<string>('');
  const [tab, setTab] = useState<TabKey>('S');

  const persistKey = useMemo(() => {
    return note?.id ? `progress_note_draft_${note.id}` : '';
  }, [note?.id]);

  // Load provider in-progress encounters
  const fetchEncounters = useCallback(async () => {
    if (!providerId) return;
    setEncLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', '0');
      params.set('pageSize', '50');
      params.set('providerId', providerId);
      params.set('status', 'in_progress');
      const res = await fetch(`/api/encounters?${params.toString()}`);
      if (!res.ok) {
        setEncounters([]);
        return;
      }
      const json = await res.json();
      const items: EncounterItem[] = json.items ?? [];
      setEncounters(items);
      // Select first encounter by default if none selected
      if (!selectedEncounterId && items.length > 0) {
        setSelectedEncounterId(items[0].id);
      }
    } catch {
      setEncounters([]);
    } finally {
      setEncLoading(false);
    }
  }, [providerId, selectedEncounterId]);

  useEffect(() => {
    fetchEncounters();
  }, [fetchEncounters]);

  // Load/create draft note for selected encounter
  const ensureDraftNote = useCallback(async (encounterId: string) => {
    if (!encounterId || !providerId) return;
    try {
      // Try to find a draft for this encounter
      const params = new URLSearchParams();
      params.set('page', '0');
      params.set('pageSize', '1');
      params.set('encounterId', encounterId);
      params.set('status', 'draft');
      const res = await fetch(`/api/progress-notes?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch notes: ${res.status}`);
      }
      const json = await res.json();
      const item: ProgressNoteItem | undefined = json.items?.[0];
      if (item) {
        setNote(item);
        setSubjective(item.subjective ?? '');
        setObjective(item.objective ?? '');
        setAssessment(item.assessment ?? '');
        setPlan(item.plan ?? '');
        // Try restore local persisted content overlay
        try {
          const raw = persistKey ? localStorage.getItem(persistKey) : null;
          if (raw) {
            const saved = JSON.parse(raw);
            if (typeof saved.subjective === 'string') setSubjective(saved.subjective);
            if (typeof saved.objective === 'string') setObjective(saved.objective);
            if (typeof saved.assessment === 'string') setAssessment(saved.assessment);
            if (typeof saved.plan === 'string') setPlan(saved.plan);
          }
        } catch {}
        return;
      }

      // No draft found; create one
      const enc = encounters.find((e) => e.id === encounterId);
      if (!enc) {
        throw new Error('Encounter not found in list');
      }
      const createRes = await fetch('/api/progress-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          encounterId,
          patientId: enc.patientId,
          title: DEFAULT_TITLE,
          subjective: '',
          objective: '',
          assessment: '',
          plan: '',
          summary: '',
        }),
      });
      if (!createRes.ok) {
        throw new Error(`Failed to create draft note: ${createRes.status}`);
      }
      const created = await createRes.json();
      const n: ProgressNoteItem = created.note;
      setNote(n);
      setSubjective(n.subjective ?? '');
      setObjective(n.objective ?? '');
      setAssessment(n.assessment ?? '');
      setPlan(n.plan ?? '');
    } catch (e) {
      console.error('ensureDraftNote error', e);
      setNote(null);
    }
  }, [providerId, encounters, persistKey]);

  // When selected encounter changes, load note
  useEffect(() => {
    if (selectedEncounterId) {
      ensureDraftNote(selectedEncounterId);
    }
  }, [selectedEncounterId, ensureDraftNote]);

  // Persist drafts locally to avoid loss
  useEffect(() => {
    if (!persistKey) return;
    try {
      localStorage.setItem(
        persistKey,
        JSON.stringify({ subjective, objective, assessment, plan })
      );
    } catch {}
  }, [persistKey, subjective, objective, assessment, plan]);

  // Autosave handler (debounced)
  const autosave = useCallback(() => {
    if (!note) return;
    if (note.status !== 'draft') return;
    if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);
    setSaving(true);
    saveTimeoutRef.current = window.setTimeout(async () => {
      try {
        const res = await fetch('/api/progress-notes', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: note.id,
            patientId: note.patientId,
            title: DEFAULT_TITLE,
            subjective,
            objective,
            assessment,
            plan,
            summary: '', // optional short excerpt; could be generated server-side later
          }),
        });
        if (res.ok) {
          const json = await res.json();
          const updated: ProgressNoteItem = json.note;
          setNote((prev) => (prev ? { ...prev, ...updated } : updated));
          setLastSavedAt(Date.now());
        } else {
          console.warn('Autosave failed', await res.text());
        }
      } catch (e) {
        console.error('Autosave error', e);
      } finally {
        setSaving(false);
      }
    }, 900);
  }, [note, subjective, objective, assessment, plan]);

  // Trigger autosave when fields change
  useEffect(() => {
    autosave();
    return () => {
      if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);
    };
  }, [autosave, subjective, objective, assessment, plan]);

  // Manual save
  const manualSave = useCallback(async () => {
    if (!note || note.status !== 'draft') return;
    setSaving(true);
    try {
      const res = await fetch('/api/progress-notes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: note.id,
          patientId: note.patientId,
          title: DEFAULT_TITLE,
          subjective,
          objective,
          assessment,
          plan,
          summary: '',
        }),
      });
      if (res.ok) {
        const json = await res.json();
        const updated: ProgressNoteItem = json.note;
        setNote((prev) => (prev ? { ...prev, ...updated } : updated));
        setLastSavedAt(Date.now());
      } else {
        alert('Save failed');
      }
    } catch {
      alert('Save error');
    } finally {
      setSaving(false);
    }
  }, [note, subjective, objective, assessment, plan]);

  // Finalize note
  const finalizeNote = useCallback(async () => {
    if (!note) return;
    if (!signatureHash || signatureHash.trim().length < 16) {
      alert('Enter a valid signature hash (min 16 chars)');
      return;
    }
    try {
      const res = await fetch('/api/progress-notes/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: note.id,
          signatureHash,
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        alert(`Finalize failed: ${txt}`);
        return;
      }
      const json = await res.json();
      const updated: ProgressNoteItem = json.note;
      setNote(updated);
      alert('Note finalized. Content is now read-only.');
    } catch (e) {
      alert('Finalize error');
    }
  }, [note, signatureHash]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;
      if (ctrlOrCmd) {
        const key = e.key.toLowerCase();
        if (key === '1') { e.preventDefault(); setTab('S'); }
        else if (key === '2') { e.preventDefault(); setTab('O'); }
        else if (key === '3') { e.preventDefault(); setTab('A'); }
        else if (key === '4') { e.preventDefault(); setTab('P'); }
        else if (key === 's') { e.preventDefault(); manualSave(); }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [manualSave]);

  const selectedEncounter = useMemo(
    () => encounters.find((e) => e.id === selectedEncounterId),
    [encounters, selectedEncounterId]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Today's Notes</h1>
          <p className="text-gray-600">SOAP documentation with autosave and finalization</p>
        </div>
        <div className="flex items-center gap-2" aria-label="Autosave status">
          {saving ? (
            <span className="text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full">Saving…</span>
          ) : lastSavedAt ? (
            <span className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded-full">
              Autosaved {new Date(lastSavedAt).toLocaleTimeString()}
            </span>
          ) : (
            <span className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-full">Idle</span>
          )}
        </div>
      </div>

      {/* Encounter selector */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-gray-800 font-semibold">In-progress Encounters</h3>
          <button
            type="button"
            onClick={fetchEncounters}
            className="px-3 py-2 rounded border border-gray-300 hover:bg-gray-50"
            aria-label="Refresh encounters"
          >
            Refresh
          </button>
        </div>
        {encLoading ? (
          <div className="p-4">Loading encounters…</div>
        ) : encounters.length === 0 ? (
          <div className="p-4 text-gray-600">No in-progress encounters</div>
        ) : (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {encounters.map((e) => {
              const isActive = e.id === selectedEncounterId;
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => setSelectedEncounterId(e.id)}
                  className={`text-left p-3 rounded border ${isActive ? 'border-blue-600 bg-blue-50' : 'border-gray-300 hover:bg-gray-50'}`}
                  aria-label={`Select encounter ${e.id}`}
                >
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
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Note editor */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-gray-800 font-semibold">SOAP Note</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">
              Status: {note?.status ?? '—'}
            </span>
            <input
              type="text"
              value={signatureHash}
              onChange={(e) => setSignatureHash(e.target.value)}
              className="p-2 border border-gray-300 rounded"
              placeholder="Signature hash (min 16 chars)"
              aria-label="Signature hash"
              disabled={!note || note.status !== 'draft'}
            />
            <button
              type="button"
              onClick={manualSave}
              className="px-3 py-2 rounded border border-gray-300 hover:bg-gray-50"
              aria-label="Save"
              disabled={!note || note.status !== 'draft' || saving}
            >
              Save
            </button>
            <button
              type="button"
              onClick={finalizeNote}
              className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
              aria-label="Finalize note"
              disabled={!note || note.status !== 'draft'}
            >
              Finalize
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div role="tablist" aria-label="SOAP sections" className="flex gap-2 mt-3">
          {(['S', 'O', 'A', 'P'] as TabKey[]).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              aria-controls={`panel-${t}`}
              className={`px-4 py-2 rounded-lg border ${tab === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
              onClick={() => setTab(t)}
            >
              {t === 'S' ? 'Subjective' : t === 'O' ? 'Objective' : t === 'A' ? 'Assessment' : 'Plan'}
            </button>
          ))}
        </div>

        {/* Panels */}
        <div className="mt-4">
          {tab === 'S' && (
            <div id="panel-S" role="tabpanel" aria-labelledby="Subjective">
              <label className="block text-sm font-medium text-gray-700 mb-2">Subjective</label>
              <textarea
                rows={8}
                value={subjective}
                onChange={(e) => setSubjective(e.target.value)}
                placeholder="Patient-reported symptoms and history…"
                aria-label="Subjective"
                className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={!note || note.status !== 'draft'}
              />
            </div>
          )}
          {tab === 'O' && (
            <div id="panel-O" role="tabpanel" aria-labelledby="Objective">
              <label className="block text-sm font-medium text-gray-700 mb-2">Objective</label>
              <textarea
                rows={8}
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                placeholder="Physical exam, lab values, imaging…"
                aria-label="Objective"
                className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={!note || note.status !== 'draft'}
              />
            </div>
          )}
          {tab === 'A' && (
            <div id="panel-A" role="tabpanel" aria-labelledby="Assessment">
              <label className="block text-sm font-medium text-gray-700 mb-2">Assessment</label>
              <textarea
                rows={8}
                value={assessment}
                onChange={(e) => setAssessment(e.target.value)}
                placeholder="Clinical reasoning, differential diagnoses…"
                aria-label="Assessment"
                className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={!note || note.status !== 'draft'}
              />
            </div>
          )}
          {tab === 'P' && (
            <div id="panel-P" role="tabpanel" aria-labelledby="Plan">
              <label className="block text-sm font-medium text-gray-700 mb-2">Plan</label>
              <textarea
                rows={8}
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
                placeholder="Medications, investigations, referrals, follow-up…"
                aria-label="Plan"
                className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={!note || note.status !== 'draft'}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}