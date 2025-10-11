/**
 * Domain Events Bus
 * Singleton EventEmitter for EMR domain events across Next.js hot reloads.
 * Exposes helpers for 'note.finalized' events.
 */
import { EventEmitter } from 'events';

export interface NoteFinalizedEvent {
  noteId: string;
  encounterId?: string | null;
  patientId: string;
  authorId: string;
  finalizedAt: string; // ISO timestamp
  signatureHash?: string;
}

export type NoteFinalizedHandler = (event: NoteFinalizedEvent) => void | Promise<void>;

export const NOTE_FINALIZED_EVENT = 'note.finalized';

declare global {
  // eslint-disable-next-line no-var
  var __emrEventEmitter: EventEmitter | undefined;
}

const emitter: EventEmitter = global.__emrEventEmitter ?? new EventEmitter();

if (!global.__emrEventEmitter) {
  emitter.setMaxListeners(50);
  global.__emrEventEmitter = emitter;
}

export function emitNoteFinalized(event: NoteFinalizedEvent): void {
  try {
    emitter.emit(NOTE_FINALIZED_EVENT, event);
  } catch (err) {
    // Do not throw to avoid disrupting clinical workflows
    // eslint-disable-next-line no-console
    console.error('[Events] emitNoteFinalized error', err);
  }
}

export function onNoteFinalized(handler: NoteFinalizedHandler): void {
  emitter.on(NOTE_FINALIZED_EVENT, handler);
}

export function onceNoteFinalized(handler: NoteFinalizedHandler): void {
  emitter.once(NOTE_FINALIZED_EVENT, handler);
}

export function offNoteFinalized(handler: NoteFinalizedHandler): void {
  emitter.off(NOTE_FINALIZED_EVENT, handler);
}

export function removeAllNoteFinalizedListeners(): void {
  emitter.removeAllListeners(NOTE_FINALIZED_EVENT);
}

export function getNoteFinalizedListenerCount(): number {
  return emitter.listenerCount(NOTE_FINALIZED_EVENT);
}

export const EVENTS = {
  NOTE_FINALIZED: NOTE_FINALIZED_EVENT,
};

// Optional generic accessor (e.g., for testing or advanced integrations)
export function getEventEmitter(): EventEmitter {
  return emitter;
}

// Example subscription:
// onNoteFinalized(async (e) => {
//   // Handle finalized note event, e.g., refresh caches, send notifications, etc.
// });