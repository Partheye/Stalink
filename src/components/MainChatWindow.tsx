import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  FileText,
  Image as ImageIcon,
  Info,
  MapPin,
  Mic,
  Paperclip,
  SendHorizontal,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react';
import type {
  ConnectionMode,
  ConversationThread,
  MessageAttachment,
} from '../types/messaging';
import { ATTACHMENT_PRESETS } from '../data/seedThreads';
import {
  countQueuedMessagesInThread,
  deriveThreadStatus,
} from '../utils/messagingEngine';
import { AttachmentCard } from './AttachmentCard';
import { Avatar } from './Avatar';
import { DeliveryCheckmark } from './DeliveryCheckmark';

interface MainChatWindowProps {
  thread: ConversationThread | undefined;
  connectionMode: ConnectionMode;
  onBackToList: () => void;
  onSendMessage: (text: string, attachment?: MessageAttachment) => void;
}

export const MainChatWindow: React.FC<MainChatWindowProps> = ({
  thread,
  connectionMode,
  onBackToList,
  onSendMessage,
}) => {
  const [draftText, setDraftText] = useState('');
  const [stagedAttachment, setStagedAttachment] = useState<
    MessageAttachment | undefined
  >(undefined);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [showRouteInfo, setShowRouteInfo] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [thread?.id, thread?.messages.length]);

  useEffect(() => {
    setAttachMenuOpen(false);
    setShowRouteInfo(false);
  }, [thread?.id]);

  useEffect(() => {
    if (!attachMenuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (
        attachMenuRef.current &&
        !attachMenuRef.current.contains(e.target as Node)
      ) {
        setAttachMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [attachMenuOpen]);

  if (!thread) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-8 bg-[#F8FAFC] dark:bg-[#0B141A] text-center">
        <p className="font-display text-base font-semibold text-slate-800 dark:text-slate-200">
          Select a conversation
        </p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-sm">
          Choose a contact or field channel on the left to inspect mesh relay
          history or queue offline messages.
        </p>
      </main>
    );
  }

  const threadStatus = deriveThreadStatus(thread);
  const queuedInThread = countQueuedMessagesInThread(thread);

  const handleStagePreset = (
    key: 'photo' | 'location' | 'voice' | 'document'
  ) => {
    const preset = ATTACHMENT_PRESETS[key];
    setStagedAttachment({
      ...preset,
      id: `att-${Date.now()}`,
    });
    setAttachMenuOpen(false);
  };

  const handleLocalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeLabel =
      file.size >= 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.max(1, Math.round(file.size / 1024))} KB`;

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        setStagedAttachment({
          id: `att-${Date.now()}`,
          kind: 'photo',
          title: file.name,
          subtitle: `Image · ${sizeLabel}`,
          imageUrl: typeof reader.result === 'string' ? reader.result : undefined,
          fileSize: sizeLabel,
        });
      };
      reader.readAsDataURL(file);
    } else {
      setStagedAttachment({
        id: `att-${Date.now()}`,
        kind: 'document',
        title: file.name,
        subtitle: `Attachment · ${sizeLabel}`,
        fileSize: sizeLabel,
      });
    }

    e.target.value = '';
    setAttachMenuOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = draftText.trim();
    if (!trimmed && !stagedAttachment) return;

    onSendMessage(trimmed, stagedAttachment);
    setDraftText('');
    setStagedAttachment(undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const trimmed = draftText.trim();
      if (!trimmed && !stagedAttachment) return;
      onSendMessage(trimmed, stagedAttachment);
      setDraftText('');
      setStagedAttachment(undefined);
    }
  };

  // Group messages by dateGroup while preserving order
  const groupedMessages: { dateGroup: string; items: typeof thread.messages }[] =
    [];
  for (const msg of thread.messages) {
    const lastGroup = groupedMessages[groupedMessages.length - 1];
    if (!lastGroup || lastGroup.dateGroup !== msg.dateGroup) {
      groupedMessages.push({ dateGroup: msg.dateGroup, items: [msg] });
    } else {
      lastGroup.items.push(msg);
    }
  }

  return (
    <main
      aria-label={`Chat with ${thread.name}`}
      className="flex-1 min-w-0 h-full flex flex-col bg-[#EFEAE2] dark:bg-[#0B141A]"
    >
      {/* Chat Header */}
      <div className="relative z-10 shrink-0 h-14 sm:h-16 px-3 sm:px-5 bg-white dark:bg-[#202C33] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onBackToList}
            aria-label="Back to conversations"
            className="lg:hidden min-w-[44px] min-h-[44px] -ml-1.5 rounded-lg flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <Avatar
            name={thread.name}
            initials={thread.initials}
            avatarUrl={thread.avatarUrl}
            accentColor={thread.accentColor}
            isGroup={thread.isGroup}
            size="md"
          />

          <div className="min-w-0">
            <h2 className="font-display text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
              {thread.name}
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
              {thread.role} · {threadStatus}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowRouteInfo((prev) => !prev)}
          aria-expanded={showRouteInfo}
          aria-label="Toggle route and encryption info"
          className={`min-w-[40px] min-h-[40px] px-2.5 rounded-lg flex items-center gap-1.5 text-xs font-medium transition-colors ${
            showRouteInfo
              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
          }`}
        >
          <Info className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">Route Info</span>
        </button>
      </div>

      {/* Expandable Route & Encryption Detail Bar */}
      {showRouteInfo && (
        <div className="shrink-0 px-4 py-3 bg-slate-50 dark:bg-[#182229] border-b border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <span className="text-slate-500 dark:text-slate-400 block">
              Relay Path
            </span>
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {thread.relayPath} ({thread.hopCount} hop
              {thread.hopCount === 1 ? '' : 's'})
            </span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400 block">
              End-to-End Key
            </span>
            <span className="font-mono-tabular font-medium text-slate-900 dark:text-slate-100 inline-flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              {thread.encryptionFingerprint}
            </span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400 block">
              Outbox Status
            </span>
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {queuedInThread > 0
                ? `${queuedInThread} packet(s) awaiting confirmation`
                : 'All packets acknowledged'}
            </span>
          </div>
        </div>
      )}

      {/* Scrollable Message Stream */}
      <div
        ref={scrollContainerRef}
        className="relative flex-1 overflow-y-auto overscroll-contain px-3 sm:px-6 lg:px-10 py-4 chat-wallpaper"
      >
        <div className="max-w-3xl mx-auto space-y-4">
          {groupedMessages.map((group) => (
            <div key={group.dateGroup} className="space-y-2.5">
              <div className="flex justify-center py-1">
                <span className="px-3 py-1 rounded-md bg-white/85 dark:bg-[#182229]/90 border border-slate-200/70 dark:border-slate-700/60 text-[11px] font-medium text-slate-600 dark:text-slate-300 shadow-2xs">
                  {group.dateGroup}
                </span>
              </div>

              {group.items.map((msg) => {
                const isOutgoing = msg.sender === 'me';
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      data-testid={`message-bubble-${msg.id}`}
                      className={`max-w-[85%] sm:max-w-[72%] rounded-xl px-3.5 py-2 shadow-xs border ${
                        isOutgoing
                          ? 'bg-[#D9FDD3] dark:bg-[#005C4B] border-emerald-900/10 dark:border-emerald-400/10 text-slate-900 dark:text-slate-100 rounded-tr-xs'
                          : 'bg-white dark:bg-[#202C33] border-slate-200/80 dark:border-slate-700/60 text-slate-900 dark:text-slate-100 rounded-tl-xs'
                      }`}
                    >
                      {!isOutgoing && msg.senderName && (
                        <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 mb-0.5">
                          {msg.senderName}
                        </p>
                      )}

                      {msg.attachment && (
                        <AttachmentCard
                          attachment={msg.attachment}
                          isOutgoing={isOutgoing}
                        />
                      )}

                      {msg.text && (
                        <p className="text-[14px] leading-relaxed whitespace-pre-wrap break-words">
                          {msg.text}
                        </p>
                      )}

                      <div className="mt-1 flex items-center justify-end gap-1.5 text-[11px] text-slate-500 dark:text-slate-300/80">
                        {isOutgoing && msg.status === 'queued' && (
                          <span
                            data-testid={`queued-label-${msg.id}`}
                            className="text-[10.5px] font-medium text-amber-700 dark:text-amber-300"
                          >
                            Queued / Stored Locally
                          </span>
                        )}
                        {isOutgoing && msg.status === 'syncing' && (
                          <span
                            data-testid={`syncing-label-${msg.id}`}
                            className="text-[10.5px] font-medium text-emerald-700 dark:text-emerald-300"
                          >
                            Syncing...
                          </span>
                        )}
                        {isOutgoing && msg.status === 'relayed' && (
                          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-300">
                            {msg.transportHint === 'Satellite'
                              ? 'Sat Burst'
                              : 'Relayed'}
                          </span>
                        )}
                        {isOutgoing && msg.status === 'delivered' && (
                          <span
                            data-testid={`delivered-label-${msg.id}`}
                            className="text-[10.5px] font-medium text-emerald-700 dark:text-emerald-300"
                          >
                            {msg.wasQueued ? 'Synced / Delivered' : 'Sent'}
                          </span>
                        )}
                        <span className="font-mono-tabular">{msg.timestamp}</span>
                        {isOutgoing && (
                          <DeliveryCheckmark status={msg.status} />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Composer Footer */}
      <footer className="shrink-0 px-3 sm:px-5 py-2.5 bg-[#F0F2F5] dark:bg-[#202C33] border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-3xl mx-auto">
          {/* Staged Attachment Preview */}
          {stagedAttachment && (
            <div className="mb-2 px-3 py-2 rounded-lg bg-white dark:bg-[#111B21] border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                  Attached: {stagedAttachment.title}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {stagedAttachment.subtitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStagedAttachment(undefined)}
                aria-label="Remove staged attachment"
                className="w-8 h-8 rounded-md flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            {/* Attachment Picker Trigger & Popover */}
            <div className="relative" ref={attachMenuRef}>
              <button
                type="button"
                onClick={() => setAttachMenuOpen((prev) => !prev)}
                aria-label="Attach media or packet"
                aria-expanded={attachMenuOpen}
                className={`min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${
                  attachMenuOpen
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white dark:bg-[#2A3942] text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700'
                }`}
              >
                <Paperclip className="w-5 h-5" />
              </button>

              {attachMenuOpen && (
                <div
                  role="menu"
                  aria-label="Attachment options"
                  className="absolute bottom-full left-0 mb-2 w-60 rounded-xl bg-white dark:bg-[#233138] border border-slate-200 dark:border-slate-700 shadow-xl p-1.5 z-40"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => handleStagePreset('photo')}
                    className="w-full flex items-center gap-2.5 px-3 min-h-[44px] rounded-lg text-left text-xs font-medium text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700/70 transition-colors"
                  >
                    <ImageIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Field Ridge Photo</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => handleStagePreset('location')}
                    className="w-full flex items-center gap-2.5 px-3 min-h-[44px] rounded-lg text-left text-xs font-medium text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700/70 transition-colors"
                  >
                    <MapPin className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>GPS Waypoint Pin</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => handleStagePreset('voice')}
                    className="w-full flex items-center gap-2.5 px-3 min-h-[44px] rounded-lg text-left text-xs font-medium text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700/70 transition-colors"
                  >
                    <Mic className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                    <span>Codec2 Voice Note</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => handleStagePreset('document')}
                    className="w-full flex items-center gap-2.5 px-3 min-h-[44px] rounded-lg text-left text-xs font-medium text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700/70 transition-colors"
                  >
                    <FileText className="w-4 h-4 text-slate-600 dark:text-slate-300 shrink-0" />
                    <span>GPX Route Packet</span>
                  </button>
                  <div className="my-1 border-t border-slate-200 dark:border-slate-700" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center gap-2.5 px-3 min-h-[44px] rounded-lg text-left text-xs font-medium text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700/70 transition-colors"
                  >
                    <Upload className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                    <span>Choose Local File...</span>
                  </button>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                onChange={handleLocalFileChange}
                className="hidden"
                aria-hidden="true"
              />
            </div>

            {/* Text Input */}
            <div className="flex-1 min-w-0">
              <textarea
                rows={1}
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  connectionMode === 'offline_queue'
                    ? 'Offline — message will be marked Queued / Stored Locally...'
                    : connectionMode === 'satellite_burst'
                      ? 'Type a short burst message...'
                      : 'Type a message...'
                }
                aria-label="Message input"
                className="w-full min-h-[44px] max-h-28 px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#2A3942] text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 border border-slate-200/80 dark:border-slate-700 focus:border-emerald-600 dark:focus:border-emerald-400 focus:outline-none resize-none leading-snug"
              />
            </div>

            {/* Send Button */}
            <button
              type="submit"
              disabled={!draftText.trim() && !stagedAttachment}
              aria-label="Send message"
              className="min-w-[44px] min-h-[44px] px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-500 dark:disabled:text-slate-500 text-white flex items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 shrink-0"
            >
              <SendHorizontal className="w-5 h-5" />
            </button>
          </form>
        </div>
      </footer>
    </main>
  );
};
