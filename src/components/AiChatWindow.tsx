import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  Clock,
  Loader2,
  SendHorizontal,
  WifiOff,
} from 'lucide-react';
import type { AiChatMessage, ConnectionStatus } from '../types/chat';

interface AiChatWindowProps {
  messages: AiChatMessage[];
  connectionStatus: ConnectionStatus;
  queuedCount: number;
  isSyncing: boolean;
  onSendMessage: (text: string) => void;
}

const STARTER_PROMPTS = [
  'Summarize how offline message queuing works',
  'Give me 3 quick resilience tips for field apps',
];

function renderFormattedText(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={idx} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

export const AiChatWindow: React.FC<AiChatWindowProps> = ({
  messages,
  connectionStatus,
  queuedCount,
  isSyncing,
  onSendMessage,
}) => {
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isSyncing]);

  const isOffline = connectionStatus === 'Offline';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;
    onSendMessage(trimmed);
    setDraft('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const trimmed = draft.trim();
      if (!trimmed) return;
      onSendMessage(trimmed);
      setDraft('');
    }
  };

  return (
    <section
      aria-label="AI chat window"
      className="flex-1 min-w-0 flex flex-col rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden h-[64vh] min-h-[420px] lg:h-full"
    >
      {/* Minimalist Chat Header */}
      <div className="shrink-0 px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            AI Assistant
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isOffline
              ? 'Disconnected · Outgoing prompts queue locally until Online'
              : isSyncing
                ? 'Syncing queued messages...'
                : 'Connected · Ready for live responses'}
          </p>
        </div>

        {queuedCount > 0 && (
          <span className="text-xs font-mono-tabular font-medium text-amber-700 dark:text-amber-300">
            {queuedCount} queued
          </span>
        )}
      </div>

      {/* Chat History Feed */}
      <div
        className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-4 bg-slate-50/50 dark:bg-slate-950/40"
        data-testid="chat-history"
      >
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                data-testid={`chat-msg-${msg.id}`}
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 border text-sm leading-relaxed ${
                  isUser
                    ? 'bg-slate-900 dark:bg-emerald-600 text-white border-slate-900 dark:border-emerald-600 rounded-br-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-slate-200/90 dark:border-slate-700 rounded-bl-sm'
                }`}
              >
                <p className="whitespace-pre-wrap break-words">
                  {renderFormattedText(msg.text)}
                </p>

                {msg.errorNote && (
                  <p className="mt-1.5 text-xs text-rose-200 dark:text-rose-200 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{msg.errorNote}</span>
                  </p>
                )}

                <div
                  className={`mt-1.5 flex items-center justify-end gap-1.5 text-[11px] font-mono-tabular ${
                    isUser
                      ? 'text-slate-300 dark:text-emerald-100'
                      : 'text-slate-400 dark:text-slate-400'
                  }`}
                >
                  {isUser && msg.syncState === 'queued' && (
                    <span className="inline-flex items-center gap-1 text-amber-300 dark:text-amber-200 font-sans font-medium">
                      <Clock className="w-3 h-3" />
                      Queued
                    </span>
                  )}
                  {isUser && msg.syncState === 'sending' && (
                    <span className="inline-flex items-center gap-1 font-sans">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Sending
                    </span>
                  )}
                  {isUser && msg.syncState === 'sent' && (
                    <Check
                      className="w-3.5 h-3.5 text-emerald-300 dark:text-white"
                      aria-label="Sent"
                    />
                  )}
                  {isUser && msg.syncState === 'failed' && (
                    <span className="text-rose-300 font-sans font-medium">
                      Failed
                    </span>
                  )}
                  <span>{msg.timestamp}</span>
                </div>
              </div>
            </div>
          );
        })}

        {isSyncing && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-300 inline-flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600 dark:text-emerald-400" />
              <span>AI is responding...</span>
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Disconnect Banner */}
      {isOffline && (
        <div
          role="alert"
          data-testid="offline-banner"
          className="shrink-0 px-4 sm:px-5 py-2.5 bg-rose-50 dark:bg-rose-950/60 border-t border-rose-200 dark:border-rose-900/70 text-rose-800 dark:text-rose-200 text-xs font-medium flex items-center gap-2"
        >
          <WifiOff className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
          <span>Offline - Messages will queue or fail to send</span>
        </div>
      )}

      {/* Starter Prompt Suggestions (when conversation is fresh) */}
      {messages.length <= 1 && (
        <div className="shrink-0 px-4 sm:px-5 pt-2.5 pb-1 flex flex-wrap gap-2 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800/80">
          {STARTER_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => onSendMessage(prompt)}
              className="px-3 py-1.5 min-h-[34px] rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs text-slate-700 dark:text-slate-200 transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Message Input Composer */}
      <form
        onSubmit={handleSubmit}
        className="shrink-0 p-3 sm:p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-end gap-2.5"
      >
        <textarea
          rows={1}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isOffline
              ? 'Type a message to queue for auto-sync...'
              : 'Ask the AI assistant...'
          }
          aria-label="Chat message input"
          className="flex-1 min-h-[44px] max-h-28 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-200 dark:border-slate-700 focus:border-slate-900 dark:focus:border-emerald-400 focus:outline-none resize-none leading-snug"
        />

        <button
          type="submit"
          disabled={!draft.trim()}
          aria-label={isOffline ? 'Queue message while offline' : 'Send message'}
          className={`min-w-[44px] min-h-[44px] px-4 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
            isOffline
              ? 'bg-amber-600 hover:bg-amber-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white focus-visible:outline-amber-600'
              : 'bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white focus-visible:outline-slate-900'
          }`}
        >
          <SendHorizontal className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">
            {isOffline ? 'Queue' : 'Send'}
          </span>
        </button>
      </form>
    </section>
  );
};
