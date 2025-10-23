'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

type Props = {
  patientId?: string; // If provided (EMR context), form is scoped to this patient
  appointmentId?: string;
  onClose?: () => void;
  onCreated?: (prescriptionId: string) => void; // Called after submit (ACTIVE) succeeds
  context?: 'emr' | 'global';
  initialDraft?: InitialDraft;
};

type PatientOption = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
};

type DraftStatus = 'idle' | 'saving' | 'saved' | 'error';

type InitialDraft = {
  id: string;
  patientId: string;
  appointmentId?: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  refills: number;
  instructions: string;
  prescribedDate: string;
  startDate: string;
  endDate?: string;
  pharmacy?: string | null;
  pharmacyPhone?: string | null;
  notes?: string | null;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
};

const PHONE_REGEX = /^[+()\-\s\d]{7,20}$/;

const MED_SUGGESTIONS = [
  { name: 'Nicotine Patch 7 mg', dosage: '7 mg patch', frequency: 'Once daily' },
  { name: 'Nicotine Patch 14 mg', dosage: '14 mg patch', frequency: 'Once daily' },
  { name: 'Nicotine Patch 21 mg', dosage: '21 mg patch', frequency: 'Once daily' },
  { name: 'Varenicline 0.5 mg', dosage: '0.5 mg', frequency: 'Twice daily' },
  { name: 'Varenicline 1 mg', dosage: '1 mg', frequency: 'Twice daily' },
  { name: 'Bupropion SR 150 mg', dosage: '150 mg', frequency: 'Twice daily' },
];

function isoNow(): string {
  return new Date().toISOString();
}

// Add days to ISO date string; return ISO date string (end of day)
function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

// Attempt to parse duration like "14 days", "12 weeks", "3 months", "14d", "8w", "2m"
function parseDurationToDays(input?: string): number | undefined {
  if (!input) return undefined;
  const s = String(input).trim().toLowerCase();
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  const m = s.match(/^(\d+)\s*(days?|d|weeks?|w|months?|m)$/i);
  if (!m) return undefined;
  const val = parseInt(m[1], 10);
  if (!Number.isFinite(val) || val <= 0) return undefined;
  const unit = m[2];
  if (!unit) return undefined;
  if (unit.startsWith('d')) return val;
  if (unit.startsWith('w')) return val * 7;
  if (unit.startsWith('m')) return val * 30;
  return undefined;
}

export default function PrescriptionForm(props: Props) {
  const context = props.context ?? (props.patientId ? 'emr' : 'global');

  // Patients for global context
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(false);

  // Core fields
  const [patientId, setPatientId] = useState(props.patientId ?? '');
  const [medicationName, setMedicationName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('Once daily');
  const [duration, setDuration] = useState('28 days');
  const [quantity, setQuantity] = useState<number | ''>(30);
  const [refills, setRefills] = useState<number | ''>(0);
  const [instructions, setInstructions] = useState('');
  const [pharmacy, setPharmacy] = useState('');
  const [pharmacyPhone, setPharmacyPhone] = useState('');
  const [notes, setNotes] = useState('');

  // Dates
  const [prescribedDate, setPrescribedDate] = useState(isoNow());
  const [startDate, setStartDate] = useState(isoNow());
  const [endDate, setEndDate] = useState<string | undefined>(undefined);

  // Draft lifecycle
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState<DraftStatus>('idle');
  const [draftError, setDraftError] = useState<string | null>(null);

  // Pre-fill from initialDraft when provided
  useEffect(() => {
    const d = props.initialDraft;
    if (d) {
      setPatientId(d.patientId);
      setMedicationName(d.medicationName);
      setDosage(d.dosage);
      setFrequency(d.frequency);
      setDuration(d.duration);
      setQuantity(d.quantity);
      setRefills(d.refills);
      setInstructions(d.instructions);
      setPharmacy(d.pharmacy ?? '');
      setPharmacyPhone(d.pharmacyPhone ?? '');
      setNotes(d.notes ?? '');
      setPrescribedDate(d.prescribedDate);
      setStartDate(d.startDate);
      setEndDate(d.endDate);
      setDraftId(d.id);
    }
  }, [props.initialDraft]);

  const [submitBusy, setSubmitBusy] = useState(false);
  const autoSaveTimer = useRef<any>(null);

  // Compute endDate automatically from duration when possible
  useEffect(() => {
    const days = parseDurationToDays(duration);
    if (!days) {
      setEndDate(undefined);
      return;
    }
    setEndDate(addDaysISO(startDate, days));
  }, [duration, startDate]);

  // Load patients for global mode
  useEffect(() => {
    if (context !== 'global') return;
    let mounted = true;
    (async () => {
      try {
        setPatientsLoading(true);
        const res = await fetch('/api/provider/patients');
        if (!res.ok) return;
        const json = await res.json();
        // Expect envelope { success, data: { items } } or fallback to items
        const items = json?.data?.items ?? json?.items ?? [];
        if (mounted) setPatients(items);
      } finally {
        if (mounted) setPatientsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [context]);

  const patientOptions = useMemo(() => {
    return patients.map((p) => {
      const name = [p.firstName, p.lastName].filter(Boolean).join(' ') || p.email || p.id;
      return { label: name, value: p.id };
    });
  }, [patients]);

  function validateClient(): string[] {
    const errors: string[] = [];
    if (!patientId) errors.push('Patient is required');
    if (!medicationName.trim()) errors.push('Medication name is required');
    if (!dosage.trim()) errors.push('Dosage is required');
    if (!frequency.trim()) errors.push('Frequency is required');
    if (!duration.trim()) errors.push('Duration is required');
    if (quantity === '' || quantity <= 0) errors.push('Quantity must be > 0');
    if (refills !== '' && (refills < 0 || refills > 5)) errors.push('Refills must be between 0 and 5');
    if (!instructions.trim()) errors.push('Instructions are required');
    if (pharmacyPhone && !PHONE_REGEX.test(pharmacyPhone)) errors.push('Pharmacy phone format is invalid');
    // Dates sanity
    const sd = new Date(startDate).getTime();
    if (Number.isNaN(sd)) errors.push('Start date invalid');
    if (endDate) {
      const ed = new Date(endDate).getTime();
      if (Number.isNaN(ed)) errors.push('End date invalid');
      if (!Number.isNaN(sd) && ed < sd) errors.push('End date must be on or after start date');
    }
    return errors;
  }

  const canAutoSave = useMemo(() => {
    // Auto-save only when minimum viable fields present and patient known
    if (!patientId) return false;
    if (!medicationName.trim()) return false;
    if (!dosage.trim()) return false;
    if (!frequency.trim()) return false;
    if (!duration.trim()) return false;
    if (quantity === '' || quantity <= 0) return false;
    if (!instructions.trim()) return false;
    return true;
  }, [patientId, medicationName, dosage, frequency, duration, quantity, instructions]);

  async function createDraft(): Promise<string | null> {
    const payload = {
      patientId,
      appointmentId: props.appointmentId,
      medicationName,
      dosage,
      frequency,
      duration,
      quantity: Number(quantity),
      refills: refills === '' ? 0 : Number(refills),
      instructions,
      status: 'DRAFT' as const,
      prescribedDate,
      startDate,
      endDate,
      pharmacy: pharmacy || undefined,
      pharmacyPhone: pharmacyPhone || undefined,
      notes: notes || undefined,
    };
    const url =
      context === 'emr'
        ? `/api/provider/patients/${encodeURIComponent(patientId)}/emr/prescriptions`
        : `/api/provider/prescriptions`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      let msg = 'Failed to auto-save draft';
      try {
        const err = await res.json();
        msg = err?.detail || err?.error || msg;
      } catch {}
      throw new Error(msg);
    }
    const json = await res.json();
    const created = json?.data ?? json; // envelope vs passthrough
    const id = created?.prescription?.id ?? created?.id ?? null;
    return id;
  }

  async function updateDraft(id: string): Promise<void> {
    const payload: any = {
      id,
      appointmentId: props.appointmentId,
      medicationName,
      dosage,
      frequency,
      duration,
      quantity: Number(quantity),
      refills: refills === '' ? 0 : Number(refills),
      instructions,
      // keep status DRAFT while editing
      startDate,
      endDate,
      pharmacy: pharmacy || undefined,
      pharmacyPhone: pharmacyPhone || undefined,
      notes: notes || undefined,
    };
    const url = `/api/provider/patients/${encodeURIComponent(patientId)}/emr/prescriptions`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      let msg = 'Failed to update draft';
      try {
        const err = await res.json();
        msg = err?.detail || err?.error || msg;
      } catch {}
      throw new Error(msg);
    }
  }

  // Auto-save with debounce
  useEffect(() => {
    if (!canAutoSave) return;
    setDraftError(null);
    setDraftStatus('idle');
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      setDraftStatus('saving');
      try {
        let id = draftId;
        if (!id) {
          id = await createDraft();
          if (id) setDraftId(id);
        } else {
          await updateDraft(id);
        }
        setDraftStatus('saved');
        // reset status to idle after a short delay
        setTimeout(() => setDraftStatus('idle'), 1200);
      } catch (e: any) {
        setDraftStatus('error');
        setDraftError(e?.message ?? 'Auto-save error');
      }
    }, 800); // 800ms debounce
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    canAutoSave,
    patientId,
    props.appointmentId,
    medicationName,
    dosage,
    frequency,
    duration,
    quantity,
    refills,
    instructions,
    startDate,
    endDate,
    pharmacy,
    pharmacyPhone,
    notes,
  ]);

  async function handleSubmitActivate() {
    const errs = validateClient();
    if (errs.length > 0) {
      alert(errs.join('\n'));
      return;
    }
    try {
      setSubmitBusy(true);
      let id = draftId;

      // If no draft exists yet, create directly as ACTIVE for robustness
      if (!id) {
        const payload = {
          patientId,
          appointmentId: props.appointmentId,
          medicationName,
          dosage,
          frequency,
          duration,
          quantity: Number(quantity),
          refills: refills === '' ? 0 : Number(refills),
          instructions,
          status: 'ACTIVE' as const,
          prescribedDate,
          startDate,
          endDate,
          pharmacy: pharmacy || undefined,
          pharmacyPhone: pharmacyPhone || undefined,
          notes: notes || undefined,
        };
        const url =
          context === 'emr'
            ? `/api/provider/patients/${encodeURIComponent(patientId)}/emr/prescriptions`
            : `/api/provider/prescriptions`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => null);
          throw new Error(err?.detail || 'Failed to create prescription');
        }
        const json = await res.json();
        const created = json?.data ?? json;
        id = created?.prescription?.id ?? created?.id ?? null;
        if (!id) throw new Error('Missing created prescription id');
        setDraftId(id);
      } else {
        // Transition status to ACTIVE
        const res = await fetch(`/api/prescriptions/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'ACTIVE' }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => null);
          throw new Error(err?.detail || 'Failed to activate prescription');
        }
      }

      // Notify parent and close
      props.onCreated?.(id!);
      props.onClose?.();
    } catch (e: any) {
      alert(e?.message ?? 'Submit error');
    } finally {
      setSubmitBusy(false);
    }
  }

  const draftBadge = draftStatus === 'saving'
    ? 'Saving…'
    : draftStatus === 'saved'
    ? 'Saved'
    : draftStatus === 'error'
    ? (draftError ?? 'Error')
    : '';

  return (
    <div className="space-y-4">
      {/* Patient selector (global context) */}
      {context === 'global' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Patient</label>
          <select
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">{patientsLoading ? 'Loading patients…' : 'Select Patient'}</option>
            {patientOptions.map((p) => (
              <option value={p.value} key={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Medication name with quick suggestions */}
      <div>
        <label htmlFor="medicationName" className="block text-sm font-medium text-gray-700 mb-2">Medication</label>
        <input
          id="medicationName"
          type="text"
          value={medicationName}
          onChange={(e) => setMedicationName(e.target.value)}
          placeholder="e.g., Nicotine Patch 21 mg"
          className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          {MED_SUGGESTIONS.map((sug) => (
            <button
              key={sug.name}
              type="button"
              onClick={() => {
                setMedicationName(sug.name);
                if (!dosage) setDosage(sug.dosage);
                if (!frequency) setFrequency(sug.frequency);
              }}
              className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50"
            >
              {sug.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="dosage" className="block text-sm font-medium text-gray-700 mb-2">Dosage</label>
          <input
            id="dosage"
            type="text"
            value={dosage}
            onChange={(e) => setDosage(e.target.value)}
            placeholder="e.g., 150 mg"
            className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <div>
          <label htmlFor="frequency" className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
          <select
            id="frequency"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option>Once daily</option>
            <option>Twice daily</option>
            <option>Three times daily</option>
            <option>As needed</option>
          </select>
        </div>
        <div>
          <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">Duration</label>
          <input
            id="duration"
            type="text"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="e.g., 28 days"
            className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <div>
          <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
          <input
            id="quantity"
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="30"
            min={1}
            className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <div>
          <label htmlFor="refills" className="block text-sm font-medium text-gray-700 mb-2">Refills</label>
          <input
            id="refills"
            type="number"
            value={refills}
            onChange={(e) => setRefills(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="0"
            min={0}
            max={5}
            className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
          <input
            id="startDate"
            type="datetime-local"
            value={new Date(startDate).toISOString().slice(0, 16)}
            onChange={(e) => {
              // Convert local back to ISO
              const val = e.target.value;
              const d = new Date(val);
              setStartDate(d.toISOString());
            }}
            className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <div>
          <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">End Date (auto)</label>
          <input
            id="endDate"
            type="datetime-local"
            value={(endDate ? new Date(endDate) : new Date()).toISOString().slice(0, 16)}
            onChange={(e) => {
              const d = new Date(e.target.value);
              setEndDate(d.toISOString());
            }}
            className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      <div>
        <label htmlFor="instructions" className="block text-sm font-medium text-gray-700 mb-2">Instructions</label>
        <textarea
          id="instructions"
          rows={3}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="Special instructions for patient…"
          className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="pharmacy" className="block text-sm font-medium text-gray-700 mb-2">Pharmacy (optional)</label>
          <input
            id="pharmacy"
            type="text"
            value={pharmacy}
            onChange={(e) => setPharmacy(e.target.value)}
            placeholder="Preferred pharmacy name"
            className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <div>
          <label htmlFor="pharmacyPhone" className="block text-sm font-medium text-gray-700 mb-2">Pharmacy Phone (optional)</label>
          <input
            id="pharmacyPhone"
            type="tel"
            value={pharmacyPhone}
            onChange={(e) => setPharmacyPhone(e.target.value)}
            placeholder="+1 (555) 123-4567"
            className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">Notes (optional)</label>
        <textarea
          id="notes"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Internal notes"
          className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      <div className="flex items-center justify-between pt-2">
        <div className="text-xs text-gray-500">
          {draftId ? <>Draft ID: {draftId}</> : 'Draft not created yet'}
          {draftBadge && <span className="ml-2">• {draftBadge}</span>}
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={props.onClose}
            className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            disabled={submitBusy}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmitActivate}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-medium hover:shadow-strong disabled:opacity-60"
            disabled={submitBusy || !patientId}
            title={!patientId ? 'Select a patient to submit' : 'Submit prescription'}
          >
            {submitBusy ? 'Submitting…' : 'Submit & Activate'}
          </button>
        </div>
      </div>
    </div>
  );
}