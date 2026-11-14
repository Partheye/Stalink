import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildApiHistory,
  createToggleEvent,
  createUserMessage,
  getNextConnectionStatus,
  getQueuedMessages,
  markMessageSyncState,
} from './chatSyncEngine';

test('getNextConnectionStatus alternates Online and Offline', () => {
  assert.equal(getNextConnectionStatus('Online'), 'Offline');
  assert.equal(getNextConnectionStatus('Offline'), 'Online');
});

test('createUserMessage sets sending when Online and queued when Offline', () => {
  const onlineMsg = createUserMessage({
    id: 'm1',
    text: 'Hello AI',
    connectionStatus: 'Online',
  });
  assert.equal(onlineMsg.syncState, 'sending');

  const offlineMsg = createUserMessage({
    id: 'm2',
    text: 'Queued prompt',
    connectionStatus: 'Offline',
  });
  assert.equal(offlineMsg.syncState, 'queued');
});

test('getQueuedMessages and markMessageSyncState track queued flush transitions', () => {
  const msgs = [
    createUserMessage({
      id: 'm1',
      text: 'First',
      connectionStatus: 'Offline',
    }),
    createUserMessage({
      id: 'm2',
      text: 'Second',
      connectionStatus: 'Offline',
    }),
  ];

  assert.equal(getQueuedMessages(msgs).length, 2);

  const updated = markMessageSyncState(msgs, 'm1', 'sent');
  assert.equal(getQueuedMessages(updated).length, 1);
  assert.equal(buildApiHistory(updated).length, 1);
});

test('createToggleEvent describes auto-sync note when reconnecting with queued messages', () => {
  const evt = createToggleEvent({
    id: 'e1',
    previousStatus: 'Offline',
    nextStatus: 'Online',
    trigger: 'auto',
    queuedCount: 2,
  });
  assert.equal(evt.nextStatus, 'Online');
  assert.match(evt.note, /syncing 2 queued messages/);
});
