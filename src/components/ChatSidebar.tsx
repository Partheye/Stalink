import React from 'react';
import {
  CheckCheck,
  Clock,
  Radio,
  RefreshCw,
  Satellite,
  Search,
  X,
} from 'lucide-react';
import type {
  ConnectionMode,
  ConversationThread,
  ThreadStatus,
  ThreadStatusFilter,
} from '../types/messaging';
import { deriveThreadStatus } from '../utils/messagingEngine';
import { Avatar } from './Avatar';
import { DeliveryCheckmark } from './DeliveryCheckmark';

interface ChatSidebarProps {
  threads: ConversationThread[];
  activeThreadId: string;
  searchQuery: string;
  statusFilter: ThreadStatusFilter;
  connectionMode: ConnectionMode;
  totalQueuedCount: number;
  onSelectThread: (threadId: string) => void;
  onSearchChange: (query: string) => void;
  onStatusFilterChange: (filter: ThreadStatusFilter) => void;
  onSyncQueue: () => void;
}

const FILTER_OPTIONS: readonly ThreadStatusFilter[] = [
  'All',
  'Synced',
  'Pending Relay',
  'Queued for Satellite',
];

function renderThreadStatusMeta(status: ThreadStatus) {
  if (status === 'Synced') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 whitespace-nowrap shrink-0">
        <CheckCheck className="w-3 h-3 shrink-0" strokeWidth={2.2} />
        <span>Synced</span>
      </span>
    );
  }
  if (status === 'Pending Relay') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-400 whitespace-nowrap shrink-0">
        <Radio className="w-3 h-3 shrink-0" strokeWidth={2.2} />
        <span>Pending Relay</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-700 dark:text-sky-400 whitespace-nowrap shrink-0">
      <Satellite className="w-3 h-3 shrink-0" strokeWidth={2.2} />
      <span>Queued for Satellite</span>
    </span>
  );
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  threads,
  activeThreadId,
  searchQuery,
  statusFilter,
  connectionMode,
  totalQueuedCount,
  onSelectThread,
  onSearchChange,
  onStatusFilterChange,
  onSyncQueue,
}) => {
  return (
    <aside
      aria-label="Conversation threads"
      className="w-full lg:w-[310px] xl:w-[350px] shrink-0 h-full flex flex-col bg-white dark:bg-[#111B21] border-r border-slate-200 dark:border-slate-800"
    >
      {/* Search + Status Filter Controls */}
      <div className="relative z-10 shrink-0 px-3.5 pt-3 pb-2.5 bg-white dark:bg-[#111B21] border-b border-slate-200/80 dark:border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <h1 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            Chats
          </h1>
          <span className="text-xs font-mono-tabular text-slate-500 dark:text-slate-400">
            {threads.length} {threads.length === 1 ? 'thread' : 'threads'}
          </span>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search
            className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search contacts or messages..."
            aria-label="Search contacts or messages"
            className="w-full h-10 pl-9 pr-8 rounded-lg bg-slate-100 dark:bg-[#202C33] text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 border border-transparent focus:border-emerald-600/50 dark:focus:border-emerald-400/50 focus:bg-white dark:focus:bg-[#111B21] focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-md flex items-center justify-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Interactive Status Filter Buttons */}
        <div
          className="flex flex-wrap items-center gap-1"
          role="tablist"
          aria-label="Filter threads by sync status"
        >
          {FILTER_OPTIONS.map((option) => {
            const isActive = statusFilter === option;
            return (
              <button
                key={option}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onStatusFilterChange(option)}
                className={`px-2 py-1 min-h-[32px] rounded-md text-[11px] font-medium whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-emerald-600 ${
                  isActive
                    ? 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-slate-950'
                    : 'bg-slate-100 dark:bg-[#202C33] text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700/70'
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>

        {/* Mobile Sync Queue Action Banner when queued items exist and link is active */}
        {connectionMode !== 'offline_queue' && totalQueuedCount > 0 && (
          <button
            type="button"
            onClick={onSyncQueue}
            className="sm:hidden w-full flex items-center justify-between px-3 min-h-[40px] rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs font-medium text-emerald-800 dark:text-emerald-300"
          >
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>{totalQueuedCount} queued packet(s) ready</span>
            </span>
            <span className="inline-flex items-center gap-1 font-semibold">
              <RefreshCw className="w-3 h-3" />
              Sync now
            </span>
          </button>
        )}
      </div>

      {/* Thread List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
        {threads.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
              No matching conversations
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Try clearing your search query or switching status filters.
            </p>
            <button
              type="button"
              onClick={() => {
                onSearchChange('');
                onStatusFilterChange('All');
              }}
              className="mt-4 px-3.5 py-2 min-h-[40px] rounded-lg bg-slate-100 dark:bg-[#202C33] hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-medium text-slate-800 dark:text-slate-100 transition-colors"
            >
              Reset filters
            </button>
          </div>
        ) : (
          threads.map((thread) => {
            const isSelected = thread.id === activeThreadId;
            const threadStatus = deriveThreadStatus(thread);
            const lastMessage = thread.messages[thread.messages.length - 1];
            const previewText = lastMessage
              ? lastMessage.attachment && !lastMessage.text
                ? `[${lastMessage.attachment.title}]`
                : lastMessage.text
              : 'No messages yet';

            return (
              <button
                key={thread.id}
                type="button"
                onClick={() => onSelectThread(thread.id)}
                aria-current={isSelected ? 'true' : undefined}
                data-testid={`thread-item-${thread.id}`}
                className={`w-full text-left px-3.5 py-3 min-h-[76px] flex items-start gap-3 transition-colors focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-emerald-600 ${
                  isSelected
                    ? 'bg-emerald-50/75 dark:bg-[#202C33]'
                    : 'hover:bg-slate-50 dark:hover:bg-[#19242B]'
                }`}
              >
                <div className="pt-0.5">
                  <Avatar
                    name={thread.name}
                    initials={thread.initials}
                    avatarUrl={thread.avatarUrl}
                    accentColor={thread.accentColor}
                    isGroup={thread.isGroup}
                    size="lg"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {thread.name}
                    </span>
                    <span className="text-[11px] font-mono-tabular text-slate-500 dark:text-slate-400 shrink-0">
                      {lastMessage?.timestamp ?? thread.lastTimestamp}
                    </span>
                  </div>

                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 min-w-0 flex-1">
                      {lastMessage?.sender === 'me' && (
                        <DeliveryCheckmark
                          status={lastMessage.status}
                          className="shrink-0"
                        />
                      )}
                      <p className="text-xs text-slate-600 dark:text-slate-300 truncate">
                        {previewText}
                      </p>
                    </div>
                    {thread.unreadCount > 0 && (
                      <span
                        aria-label={`${thread.unreadCount} unread messages`}
                        className="min-w-[20px] h-5 px-1.5 rounded-full bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 text-[11px] font-mono-tabular font-semibold inline-flex items-center justify-center shrink-0"
                      >
                        {thread.unreadCount}
                      </span>
                    )}
                  </div>

                  <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                    {renderThreadStatusMeta(threadStatus)}
                    <span aria-hidden="true">·</span>
                    <span className="truncate">{thread.relayPath}</span>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
};
