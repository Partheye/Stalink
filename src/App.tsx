import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChatSidebar } from './components/ChatSidebar';
import { ConnectionBanner } from './components/ConnectionBanner';
import { HeaderStatusBar } from './components/HeaderStatusBar';
import { MainChatWindow } from './components/MainChatWindow';
import { PendingQueuePanel } from './components/PendingQueuePanel';
import {
  FirebaseAuthProvider,
  useFirebaseAuth,
} from './contexts/FirebaseAuthContext';
import { INITIAL_THREADS } from './data/seedThreads';
import {
  loadPersistedThreads,
  syncMessagesToCloud,
} from './services/syncService';
import type {
  ChatMessage,
  ConnectionMode,
  ConnectionState,
  ConversationThread,
  MessageAttachment,
  ThreadStatusFilter,
} from './types/messaging';
import {
  AUTO_TOGGLE_INTERVAL_SEC,
  clearSyncedQueueFlags,
  connectionStateToMode,
  countTotalQueuedMessages,
  extractPendingQueueEntries,
  extractSyncedFromQueueEntries,
  filterThreads,
  formatCurrentClockTime,
  getDeliveryStatusForNewMessage,
  getNextConnectionState,
  getSignalProfile,
  modeToConnectionState,
  rollbackSyncingMessages,
  updateMessageQueueStatus,
} from './utils/messagingEngine';

const LOCAL_STORAGE_KEY = 'meshline_threads_v1';

function getConfiguredIntervalSec(): number {
  if (typeof window === 'undefined') return AUTO_TOGGLE_INTERVAL_SEC;
  const param = new URLSearchParams(window.location.search).get('sim_interval');
  const parsed = param ? Number(param) : NaN;
  if (Number.isFinite(parsed) && parsed >= 2 && parsed <= 120) {
    return Math.round(parsed);
  }
  return AUTO_TOGGLE_INTERVAL_SEC;
}

function loadInitialThreads(): ConversationThread[] {
  if (typeof window === 'undefined') return INITIAL_THREADS;
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return INITIAL_THREADS;
    const parsed = JSON.parse(raw) as ConversationThread[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch {
    // Fall back to deterministic seed threads
  }
  return INITIAL_THREADS;
}

function MeshLineMessenger() {
  const { user, isSigningIn, signInWithGoogle, signOutUser } =
    useFirebaseAuth();

  const intervalSec = useMemo(() => getConfiguredIntervalSec(), []);

  const [threads, setThreads] =
    useState<ConversationThread[]>(loadInitialThreads);
  const [activeThreadId, setActiveThreadId] = useState<string>(
    () => INITIAL_THREADS[0].id
  );
  const [mobileView, setMobileView] = useState<'list' | 'chat' | 'queue'>(
    'list'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ThreadStatusFilter>('All');

  const [connectionMode, setConnectionMode] =
    useState<ConnectionMode>('bluetooth_mesh');
  const [preferredOnlineMode, setPreferredOnlineMode] = useState<
    Exclude<ConnectionMode, 'offline_queue'>
  >('bluetooth_mesh');
  const [autoToggleEnabled, setAutoToggleEnabled] = useState(true);
  const [secondsUntilToggle, setSecondsUntilToggle] = useState(intervalSec);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [lastSyncSummary, setLastSyncSummary] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(false);

  const threadsRef = useRef(threads);
  threadsRef.current = threads;

  const modeRef = useRef(connectionMode);
  modeRef.current = connectionMode;

  const preferredOnlineModeRef = useRef(preferredOnlineMode);
  preferredOnlineModeRef.current = preferredOnlineMode;

  const autoRef = useRef(autoToggleEnabled);
  autoRef.current = autoToggleEnabled;

  const userRef = useRef(user);
  userRef.current = user;

  const syncRunIdRef = useRef(0);
  const isSyncingRef = useRef(false);

  const connectionState: ConnectionState =
    modeToConnectionState(connectionMode);

  // Persist threads and queued Store-and-Forward items in localStorage
  useEffect(() => {
    try {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(threads));
    } catch {
      // Ignore quota errors in restricted environments
    }
  }, [threads]);

  // Apply Tailwind dark class cleanly on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDark]);

  // Invalidate any in-flight queue processor on unmount
  useEffect(() => {
    return () => {
      syncRunIdRef.current += 1;
    };
  }, []);

  // Hydrate previously persisted cloud messages when signed in
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void loadPersistedThreads(user).then((cloudThreads) => {
      if (cancelled || cloudThreads.length === 0) return;
      setThreads((prev) =>
        prev.map((thread) => {
          const match = cloudThreads.find(
            (c) => c.threadExternalId === thread.id
          );
          if (!match || match.messages.length === 0) return thread;
          const existingIds = new Set(thread.messages.map((m) => m.id));
          const merged = [...thread.messages];
          for (const cm of match.messages) {
            if (!existingIds.has(cm.id)) {
              merged.push(cm);
            }
          }
          return merged.length !== thread.messages.length
            ? {
                ...thread,
                messages: merged,
                lastTimestamp:
                  merged[merged.length - 1]?.timestamp ?? thread.lastTimestamp,
              }
            : thread;
        })
      );
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const processQueueSequentially = useCallback(
    async (
      targetOnlineMode: Exclude<ConnectionMode, 'offline_queue'>
    ): Promise<void> => {
      if (isSyncingRef.current) return;
      const pending = extractPendingQueueEntries(threadsRef.current);
      if (pending.length === 0) return;

      const runId = ++syncRunIdRef.current;
      isSyncingRef.current = true;
      setIsSyncing(true);
      setSyncProgress({ current: 0, total: pending.length });

      const transport: 'Mesh' | 'Satellite' =
        targetOnlineMode === 'satellite_burst' ? 'Satellite' : 'Mesh';

      const stepDelayMs =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
          ? 240
          : 550;

      const syncedForCloud: Array<{
        thread: ConversationThread;
        message: ChatMessage;
      }> = [];

      try {
        for (let i = 0; i < pending.length; i++) {
          if (
            syncRunIdRef.current !== runId ||
            modeToConnectionState(modeRef.current) !== 'Online'
          ) {
            threadsRef.current = rollbackSyncingMessages(threadsRef.current);
            setThreads((prev) => rollbackSyncingMessages(prev));
            return;
          }

          const entry = pending[i];
          setSyncProgress({ current: i + 1, total: pending.length });

          threadsRef.current = updateMessageQueueStatus(
            threadsRef.current,
            entry.id,
            'syncing',
            transport
          ).threads;
          setThreads((prev) =>
            updateMessageQueueStatus(prev, entry.id, 'syncing', transport)
              .threads
          );

          await new Promise((resolve) => window.setTimeout(resolve, stepDelayMs));

          if (
            syncRunIdRef.current !== runId ||
            modeToConnectionState(modeRef.current) !== 'Online'
          ) {
            threadsRef.current = rollbackSyncingMessages(threadsRef.current);
            setThreads((prev) => rollbackSyncingMessages(prev));
            return;
          }

          const syncedTime = formatCurrentClockTime();
          const deliveredRes = updateMessageQueueStatus(
            threadsRef.current,
            entry.id,
            'delivered',
            transport,
            syncedTime
          );
          if (deliveredRes.updatedItem) {
            syncedForCloud.push(deliveredRes.updatedItem);
          }
          threadsRef.current = deliveredRes.threads;
          setThreads((prev) =>
            updateMessageQueueStatus(
              prev,
              entry.id,
              'delivered',
              transport,
              syncedTime
            ).threads
          );
        }

        if (
          syncRunIdRef.current === runId &&
          syncedForCloud.length > 0 &&
          modeToConnectionState(modeRef.current) === 'Online'
        ) {
          setLastSyncSummary(
            `Synced ${syncedForCloud.length} queued message${
              syncedForCloud.length === 1 ? '' : 's'
            }`
          );
          if (userRef.current) {
            void syncMessagesToCloud(userRef.current, syncedForCloud).catch(
              (err) => {
                console.error('Cloud sync failed:', err);
              }
            );
          }
        }
      } finally {
        if (syncRunIdRef.current === runId) {
          isSyncingRef.current = false;
          setIsSyncing(false);
          setSyncProgress(null);
        }
      }
    },
    []
  );

  const applyConnectionMode = useCallback(
    (nextMode: ConnectionMode) => {
      const prevState = modeToConnectionState(modeRef.current);
      const nextState = modeToConnectionState(nextMode);

      if (nextMode !== 'offline_queue') {
        setPreferredOnlineMode(nextMode);
        preferredOnlineModeRef.current = nextMode;
      }

      modeRef.current = nextMode;
      setConnectionMode(nextMode);

      if (nextState === 'Offline') {
        syncRunIdRef.current += 1;
        isSyncingRef.current = false;
        setIsSyncing(false);
        setSyncProgress(null);
        setLastSyncSummary(null);
        threadsRef.current = rollbackSyncingMessages(threadsRef.current);
        setThreads((prev) => rollbackSyncingMessages(prev));
      } else if (
        prevState === 'Offline' ||
        countTotalQueuedMessages(threadsRef.current) > 0
      ) {
        void processQueueSequentially(
          nextMode === 'offline_queue'
            ? preferredOnlineModeRef.current
            : nextMode
        );
      }
    },
    [processQueueSequentially]
  );

  // Background 15-second automatic Online/Offline simulation loop
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!autoRef.current) return;

      setSecondsUntilToggle((prev) => {
        if (prev <= 1) {
          const currentState = modeToConnectionState(modeRef.current);
          const nextState = getNextConnectionState(currentState);
          const nextMode = connectionStateToMode(
            nextState,
            preferredOnlineModeRef.current
          );
          applyConnectionMode(nextMode);
          return intervalSec;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [applyConnectionMode, intervalSec]);

  const handleManualToggle = useCallback(() => {
    const currentState = modeToConnectionState(modeRef.current);
    const nextState = getNextConnectionState(currentState);
    const nextMode = connectionStateToMode(
      nextState,
      preferredOnlineModeRef.current
    );
    applyConnectionMode(nextMode);
    setSecondsUntilToggle(intervalSec);
  }, [applyConnectionMode, intervalSec]);

  const handleSelectMode = useCallback(
    (nextMode: ConnectionMode) => {
      applyConnectionMode(nextMode);
      setSecondsUntilToggle(intervalSec);
    },
    [applyConnectionMode, intervalSec]
  );

  const handleSyncQueue = useCallback(() => {
    if (modeRef.current === 'offline_queue') return;
    void processQueueSequentially(
      modeRef.current === 'satellite_burst'
        ? 'satellite_burst'
        : 'bluetooth_mesh'
    );
  }, [processQueueSequentially]);

  const handleSelectThread = useCallback((threadId: string) => {
    setActiveThreadId(threadId);
    setMobileView('chat');
    setThreads((prev) =>
      prev.map((t) => (t.id === threadId ? { ...t, unreadCount: 0 } : t))
    );
  }, []);

  const handleSendMessage = useCallback(
    (text: string, attachment?: MessageAttachment) => {
      const targetThread = threadsRef.current.find(
        (t) => t.id === activeThreadId
      );
      if (!targetThread) return;

      const timestamp = formatCurrentClockTime();
      const { status, transportHint, wasQueued } =
        getDeliveryStatusForNewMessage(
          modeRef.current,
          targetThread.prefersSatellite
        );

      const newMessage: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sender: 'me',
        text,
        timestamp,
        dateGroup: 'Today',
        status,
        wasQueued,
        transportHint,
        attachment,
      };

      const appendMessage = (list: ConversationThread[]) =>
        list.map((t) =>
          t.id === activeThreadId
            ? {
                ...t,
                lastTimestamp: timestamp,
                messages: [...t.messages, newMessage],
              }
            : t
        );

      threadsRef.current = appendMessage(threadsRef.current);
      setThreads((prev) => appendMessage(prev));

      if (status !== 'queued' && userRef.current) {
        void syncMessagesToCloud(userRef.current, [
          { thread: targetThread, message: newMessage },
        ]).catch((err) => {
          console.error('Failed to persist sent message:', err);
        });
      }
    },
    [activeThreadId]
  );

  const pendingEntries = useMemo(
    () => extractPendingQueueEntries(threads),
    [threads]
  );

  const syncedEntries = useMemo(
    () => extractSyncedFromQueueEntries(threads),
    [threads]
  );

  const totalQueuedCount = pendingEntries.length;

  const signalProfile = useMemo(
    () => getSignalProfile(connectionMode, totalQueuedCount),
    [connectionMode, totalQueuedCount]
  );

  const filteredThreads = useMemo(
    () => filterThreads(threads, searchQuery, statusFilter),
    [threads, searchQuery, statusFilter]
  );

  const activeThread = useMemo(
    () => threads.find((t) => t.id === activeThreadId) ?? threads[0],
    [threads, activeThreadId]
  );

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-slate-100 dark:bg-[#0B141A] text-slate-900 dark:text-slate-100">
      <HeaderStatusBar
        mode={connectionMode}
        signalProfile={signalProfile}
        queuedCount={totalQueuedCount}
        isDark={isDark}
        userEmail={user?.email}
        userDisplayName={user?.displayName}
        isSigningIn={isSigningIn}
        onSelectMode={handleSelectMode}
        onSyncQueue={handleSyncQueue}
        onToggleTheme={() => setIsDark((prev) => !prev)}
        onSignIn={() => void signInWithGoogle()}
        onSignOut={() => void signOutUser()}
      />

      <ConnectionBanner
        connectionState={connectionState}
        connectionMode={connectionMode}
        autoToggleEnabled={autoToggleEnabled}
        secondsUntilToggle={secondsUntilToggle}
        queuedCount={totalQueuedCount}
        isSyncing={isSyncing}
        lastSyncSummary={lastSyncSummary}
        mobileQueueOpen={mobileView === 'queue'}
        onToggleAuto={() => setAutoToggleEnabled((prev) => !prev)}
        onManualToggle={handleManualToggle}
        onToggleMobileQueue={() =>
          setMobileView((prev) => (prev === 'queue' ? 'chat' : 'queue'))
        }
      />

      <div className="flex-1 min-h-0 flex overflow-hidden">
        <div
          className={`${
            mobileView === 'list' ? 'flex' : 'hidden'
          } lg:flex w-full lg:w-auto h-full min-h-0`}
        >
          <ChatSidebar
            threads={filteredThreads}
            activeThreadId={activeThread?.id ?? ''}
            searchQuery={searchQuery}
            statusFilter={statusFilter}
            connectionMode={connectionMode}
            totalQueuedCount={totalQueuedCount}
            onSelectThread={handleSelectThread}
            onSearchChange={setSearchQuery}
            onStatusFilterChange={setStatusFilter}
            onSyncQueue={handleSyncQueue}
          />
        </div>

        <div
          className={`${
            mobileView === 'chat' ? 'flex' : 'hidden'
          } lg:flex flex-1 min-w-0 h-full min-h-0`}
        >
          <MainChatWindow
            thread={activeThread}
            connectionMode={connectionMode}
            onBackToList={() => setMobileView('list')}
            onSendMessage={handleSendMessage}
          />
        </div>

        <div
          className={`${
            mobileView === 'queue' ? 'flex' : 'hidden'
          } lg:flex w-full lg:w-auto h-full min-h-0`}
        >
          <PendingQueuePanel
            pendingEntries={pendingEntries}
            syncedEntries={syncedEntries}
            connectionState={connectionState}
            isSyncing={isSyncing}
            syncProgress={syncProgress}
            onSelectThread={handleSelectThread}
            onSyncNow={handleSyncQueue}
            onClearSyncedHistory={() => {
              threadsRef.current = clearSyncedQueueFlags(threadsRef.current);
              setThreads((prev) => clearSyncedQueueFlags(prev));
            }}
            onCloseMobileQueue={() => setMobileView('chat')}
          />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <FirebaseAuthProvider>
      <MeshLineMessenger />
    </FirebaseAuthProvider>
  );
}
