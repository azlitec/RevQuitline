'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

type MergeField = { key: string; label: string };

type Props = {
  value: string;
  onChange: (html: string) => void;
  onAutosave?: (html: string) => void;
  autosaveDelayMs?: number;
  ariaLabel?: string;
  placeholder?: string;
  mergeFields?: MergeField[];
  persistKey?: string;
  className?: string;
  toolbarClassName?: string;
  editorClassName?: string;
  statusClassName?: string;
};

export default function RichTextEditor(props: Props) {
  const {
    value,
    onChange,
    onAutosave,
    autosaveDelayMs = 1500,
    ariaLabel = 'Editor',
    placeholder = 'Start typing...',
    mergeFields = [],
    persistKey,
    className = '',
    toolbarClassName = '',
    editorClassName = '',
    statusClassName = '',
  } = props;

  const [html, setHtml] = useState<string>(value || '');
  const [saving, setSaving] = useState<boolean>(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setHtml(value || '');
  }, [value]);

  useEffect(() => {
    if (persistKey) {
      try {
        if (!value) {
          const raw = localStorage.getItem(persistKey);
          if (raw) {
            setHtml(raw);
            onChange(raw);
          }
        }
      } catch {}
    }
  }, [persistKey]);

  const exec = useCallback((cmd: string, arg?: any) => {
    document.execCommand(cmd, false, arg);
  }, []);

  const onInput = useCallback(() => {
    const newHtml = editorRef.current?.innerHTML || '';
    setHtml(newHtml);
    onChange(newHtml);
    if (persistKey) {
      try {
        localStorage.setItem(persistKey, newHtml);
      } catch {}
    }
    if (onAutosave) {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }
      setSaving(true);
      saveTimeoutRef.current = window.setTimeout(async () => {
        try {
          await onAutosave(newHtml);
          setLastSavedAt(Date.now());
        } finally {
          setSaving(false);
        }
      }, autosaveDelayMs);
    }
  }, [onAutosave, autosaveDelayMs, persistKey, onChange]);

  const insertMergeField = useCallback((token: string) => {
    const sel = window.getSelection();
    if (!sel) return;
    const range = sel.getRangeAt(0);
    range.deleteContents();
    const span = document.createElement('span');
    span.textContent = `{{${token}}}`;
    span.className = 'bg-yellow-100 text-yellow-800 px-1 rounded';
    range.insertNode(span);
    range.setStartAfter(span);
    range.setEndAfter(span);
    sel.removeAllRanges();
    sel.addRange(range);
    onInput();
  }, [onInput]);

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const isMac = navigator.platform.toUpperCase().includes('MAC');
    const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;
    if (ctrlOrCmd) {
      if (e.key.toLowerCase() === 'b') {
        e.preventDefault();
        exec('bold');
      } else if (e.key.toLowerCase() === 'i') {
        e.preventDefault();
        exec('italic');
      } else if (e.key.toLowerCase() === 'u') {
        e.preventDefault();
        exec('underline');
      } else if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (onAutosave) {
          setSaving(true);
          Promise.resolve(onAutosave(html))
            .then(() => {
              setLastSavedAt(Date.now());
              setSaving(false);
            })
            .catch(() => setSaving(false));
        }
      }
    }
  }, [exec, onAutosave, html]);

  useEffect(() => () => {
    if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);
  }, []);

  return (
    <div className={className}>
      <div className={toolbarClassName ? toolbarClassName : 'flex items-center gap-2 mb-2'}>
        <button type="button" onClick={() => exec('bold')} aria-label="Bold" className="px-2 py-1 border rounded hover:bg-gray-50">B</button>
        <button type="button" onClick={() => exec('italic')} aria-label="Italic" className="px-2 py-1 border rounded hover:bg-gray-50">I</button>
        <button type="button" onClick={() => exec('underline')} aria-label="Underline" className="px-2 py-1 border rounded hover:bg-gray-50">U</button>
        <button type="button" onClick={() => exec('insertOrderedList')} aria-label="Numbered list" className="px-2 py-1 border rounded hover:bg-gray-50">1.</button>
        <button type="button" onClick={() => exec('insertUnorderedList')} aria-label="Bulleted list" className="px-2 py-1 border rounded hover:bg-gray-50">•</button>
        <div className="ml-2">
          <label className="sr-only" htmlFor="mergeFieldSelect">Insert merge field</label>
          <select
            id="mergeFieldSelect"
            onChange={(e) => {
              const v = e.target.value;
              if (v) {
                insertMergeField(v);
                e.target.selectedIndex = 0;
              }
            }}
            className="p-1 border rounded"
          >
            <option value="">Insert merge field…</option>
            {mergeFields?.map((mf) => (<option key={mf.key} value={mf.key}>{mf.label}</option>))}
          </select>
        </div>
        <div className={statusClassName ? statusClassName : 'ml-auto text-sm text-gray-600'}>
          {saving ? 'Saving…' : (lastSavedAt ? `Autosaved ${new Date(lastSavedAt).toLocaleTimeString()}` : '')}
        </div>
      </div>
      <div
        ref={editorRef}
        contentEditable
        role="textbox"
        aria-label={ariaLabel}
        tabIndex={0}
        onInput={onInput}
        onKeyDown={onKeyDown}
        className={editorClassName ? editorClassName : 'min-h-[240px] p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500'}
        dangerouslySetInnerHTML={{ __html: html || `<p class="text-gray-400">${placeholder}</p>` }}
      />
    </div>
  );
}