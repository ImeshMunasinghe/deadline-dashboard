import React, { useState, useEffect, useRef } from 'react';
import type { AppAction } from '../types';
import { generateId, parseSmartInput } from '../utils';

interface QuickCaptureProps {
  dispatch: React.Dispatch<AppAction>;
  autoOpen?: boolean;
}

export function QuickCapture({ dispatch, autoOpen = false }: QuickCaptureProps) {
  const [isOpen, setIsOpen] = useState(autoOpen);
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen(true);
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setText('');
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  function handleAdd() {
    if (!text.trim()) return;
    const parsed = parseSmartInput(text);
    if (!parsed.text) return;
    const task = {
      id: generateId(),
      text: parsed.text,
      completed: false,
      priority: parsed.priority,
      dueDate: parsed.dueDate,
      subtasks: [],
      createdAt: new Date().toISOString(),
      completedAt: null,
      estimatedMinutes: parsed.estimatedMinutes,
      actualMinutes: 0,
      recurrence: parsed.recurrence,
      blockedBy: parsed.blockedBy,
    };
    dispatch({ type: 'ADD_TO_INBOX', payload: { task } });
    setText('');
    setIsOpen(false);
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-start justify-center pt-[20vh] px-4">
      <div className="floating-surface w-full max-w-lg p-4">
        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="text"
            placeholder="Quick capture a task... (e.g. Call mom !high tomorrow)"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
            }}
            className="w-full bg-slate-100 dark:bg-neutral-800 text-slate-800 dark:text-neutral-200 placeholder-slate-400 dark:placeholder-neutral-500 rounded-lg px-4 py-3 outline-none border border-slate-400 dark:border-neutral-600 focus:border-blue-600 transition-colors text-lg"
          />
          <div className="flex justify-between items-center px-1">
            <span className="text-xs text-slate-400 dark:text-neutral-500">Press Enter to save to Inbox</span>
            <span className="text-xs text-slate-400 dark:text-neutral-500">Esc to cancel</span>
          </div>
        </div>
      </div>
    </div>
  );
}
