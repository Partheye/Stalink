import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AUTO_TOGGLE_INTERVAL_SEC,
  clearSyncedQueueFlags,
  connectionStateToMode,
  countTotalQueuedMessages,
  deriveThreadStatus,
  estimatePayloadBytes,
  extractPendingQueueEntries,
  extractSyncedFromQueueEntries,
  filterThreads,
  flushMessagesForMode,
  getDeliveryStatusForNewMessage,
  getNextConnectionState,
  getSignalProfile,
  modeToConnectionState,
  rollbackSyncingMessages,
  syncQueuedMessagesOnReconnect,
  updateMessageQueueStatus,
} from './messagingEngine';
import type { ConversationThread } from '../types/messaging';

const sampleThreads: ConversationThread[] = [
  {
    id: 't1',
    name: 'Maya Lin',
    role: 'Alpine Survey Lead',
    initials: 'ML',
    accentColor: '#0D9488',
    hopCount: 1,
    relayPath: 'Direct BLE',
    encryptionFingerprint: '4A9F-82C1',
    unreadCount: 0,
    lastTimestamp: '08:14',
    messages: [
      {
        id: 'm1',
        sender: 'me',
        text: 'Reached Ridge Camp B.',
        timestamp: '08:14',
        dateGroup: 'Today',
        status: 'read',
      },
    ],
  },
  {
    id: 't2',
    name: 'Liam O’Connor',
    role: 'Relay Engineer',
    initials: 'LO',
    accentColor: '#D97706',
    hopCount: 2,
    relayPath: 'Node 04 → Base',
    encryptionFingerprint: '7C12-90EA',
    unreadCount: 1,
    lastTimestamp: '07:50',
    messages: [
      {
        id: 'm2',
        sender: 'me',
        text: 'Solar repeater battery at 64%.',
        timestamp: '07:50',
        dateGroup: 'Today',
        status: 'queued',
        wasQueued: true,
        transportHint: 'Queue',
      },
    ],
  },
  {
    id: 't3',
    name: 'Base Dispatch',
    role: 'Satellite Gateway',
    initials: 'BD',
    accentColor: '#0284C7',
    prefersSatellite: true,
    hopCount: 0,
    relayPath: 'LEO Sat Window',
    encryptionFingerprint: '19F0-44B8',
    unreadCount: 0,
    lastTimestamp: 'Yesterday',
    messages: [
      {
        id: 'm3',
        sender: 'me',
        text: 'Requesting barometric forecast burst.',
        timestamp: 'Yesterday',
        dateGroup: 'Yesterday',
        status: 'queued',
        wasQueued: true,
        transportHint: 'Queue',
      },
    ],
  },
];

test('AUTO_TOGGLE_INTERVAL_SEC is 15 seconds and state mapping flips Online/Offline cleanly', () => {
  assert.equal(AUTO_TOGGLE_INTERVAL_SEC, 15);
  assert.equal(getNextConnectionState('Online'), 'Offline');
  assert.equal(getNextConnectionState('Offline'), 'Online');
  assert.equal(modeToConnectionState('bluetooth_mesh'), 'Online');
  assert.equal(modeToConnectionState('satellite_burst'), 'Online');
  assert.equal(modeToConnectionState('offline_queue'), 'Offline');
  assert.equal(connectionStateToMode('Offline'), 'offline_queue');
  assert.equal(connectionStateToMode('Online'), 'bluetooth_mesh');
});

test('getSignalProfile returns correct bar counts and details per mode', () => {
  const mesh = getSignalProfile('bluetooth_mesh', 2);
  assert.equal(mesh.bars, 4);
  assert.equal(mesh.label, 'Local Bluetooth Mesh');

  const sat = getSignalProfile('satellite_burst', 2);
  assert.equal(sat.bars, 2);
  assert.equal(sat.label, 'Satellite Burst Mode');

  const offline = getSignalProfile('offline_queue', 3);
  assert.equal(offline.bars, 0);
  assert.equal(offline.detail, '3 packets stored locally');
});

test('deriveThreadStatus classifies Synced, Pending Relay, and Queued for Satellite accurately', () => {
  assert.equal(deriveThreadStatus(sampleThreads[0]), 'Synced');
  assert.equal(deriveThreadStatus(sampleThreads[1]), 'Pending Relay');
  assert.equal(deriveThreadStatus(sampleThreads[2]), 'Queued for Satellite');
});

test('getDeliveryStatusForNewMessage sends immediately when Online and queues locally when Offline', () => {
  assert.deepEqual(getDeliveryStatusForNewMessage('offline_queue', false), {
    status: 'queued',
    transportHint: 'Queue',
    wasQueued: true,
  });
  assert.deepEqual(getDeliveryStatusForNewMessage('bluetooth_mesh', false), {
    status: 'delivered',
    transportHint: 'Mesh',
    wasQueued: false,
  });
  assert.deepEqual(getDeliveryStatusForNewMessage('bluetooth_mesh', true), {
    status: 'delivered',
    transportHint: 'Mesh',
    wasQueued: false,
  });
  assert.deepEqual(getDeliveryStatusForNewMessage('satellite_burst', true), {
    status: 'delivered',
    transportHint: 'Satellite',
    wasQueued: false,
  });
});

test('Store-and-Forward queue engine tracks, updates, rolls back, and clears queued entries', () => {
  const initialPending = extractPendingQueueEntries(sampleThreads);
  assert.equal(initialPending.length, 2);
  assert.equal(initialPending[0].status, 'queued');
  assert.ok(estimatePayloadBytes('hello') >= 29);

  // Transition m2 -> syncing
  const syncingStep = updateMessageQueueStatus(sampleThreads, 'm2', 'syncing', 'Mesh');
  assert.equal(syncingStep.updatedItem?.message.status, 'syncing');
  assert.equal(extractPendingQueueEntries(syncingStep.threads).length, 2);

  // Rollback if disconnected mid-sync
  const rolledBack = rollbackSyncingMessages(syncingStep.threads);
  assert.equal(rolledBack[1].messages[0].status, 'queued');

  // Complete sync m2 -> delivered
  const deliveredStep = updateMessageQueueStatus(
    syncingStep.threads,
    'm2',
    'delivered',
    'Mesh',
    '08:31'
  );
  assert.equal(extractPendingQueueEntries(deliveredStep.threads).length, 1);
  const syncedHistory = extractSyncedFromQueueEntries(deliveredStep.threads);
  assert.equal(syncedHistory.length, 1);
  assert.equal(syncedHistory[0].id, 'm2');
  assert.equal(syncedHistory[0].syncedAt, '08:31');

  const cleared = clearSyncedQueueFlags(deliveredStep.threads);
  assert.equal(extractSyncedFromQueueEntries(cleared).length, 0);
});

test('syncQueuedMessagesOnReconnect transitions queued messages to relayed then delivered', () => {
  const step1 = syncQueuedMessagesOnReconnect(sampleThreads, 'relayed', 'Mesh');
  assert.equal(step1.syncedItems.length, 2);
  assert.equal(step1.threads[1].messages[0].status, 'relayed');
  assert.equal(step1.threads[2].messages[0].status, 'relayed');

  const step2 = syncQueuedMessagesOnReconnect(step1.threads, 'delivered', 'Mesh');
  assert.equal(step2.syncedItems.length, 2);
  assert.equal(step2.threads[1].messages[0].status, 'delivered');
  assert.equal(step2.threads[2].messages[0].status, 'delivered');
  assert.equal(countTotalQueuedMessages(step2.threads), 0);
  assert.equal(deriveThreadStatus(step2.threads[1]), 'Synced');
  assert.equal(deriveThreadStatus(step2.threads[2]), 'Synced');
});

test('flushMessagesForMode delivers mesh threads in bluetooth_mesh and all threads in satellite_burst', () => {
  assert.equal(countTotalQueuedMessages(sampleThreads), 2);

  const meshFlush = flushMessagesForMode(sampleThreads, 'bluetooth_mesh');
  assert.equal(meshFlush.flushedCount, 2);
  assert.equal(deriveThreadStatus(meshFlush.threads[1]), 'Synced');
  assert.equal(deriveThreadStatus(meshFlush.threads[2]), 'Queued for Satellite');

  const satFlush = flushMessagesForMode(meshFlush.threads, 'satellite_burst');
  assert.equal(satFlush.flushedCount, 1);
  assert.equal(deriveThreadStatus(satFlush.threads[2]), 'Synced');
  assert.equal(countTotalQueuedMessages(satFlush.threads), 0);
});

test('filterThreads filters by status tag and search query', () => {
  const onlySynced = filterThreads(sampleThreads, '', 'Synced');
  assert.equal(onlySynced.length, 1);
  assert.equal(onlySynced[0].id, 't1');

  const queryMatch = filterThreads(sampleThreads, 'barometric', 'All');
  assert.equal(queryMatch.length, 1);
  assert.equal(queryMatch[0].id, 't3');
});
