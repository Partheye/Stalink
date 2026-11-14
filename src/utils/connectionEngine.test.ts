import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createLogEntry,
  evaluateNetworkConditions,
  filterLogEntries,
  formatDurationSeconds,
} from './connectionEngine';

test('interval_cycle toggles Online to Offline and back automatically', () => {
  const first = evaluateNetworkConditions({
    currentMode: 'Online',
    triggerRule: 'interval_cycle',
    tickCount: 1,
    consecutiveFailures: 0,
    faultInjected: false,
  });
  assert.equal(first.nextMode, 'Offline');
  assert.equal(first.changed, true);

  const second = evaluateNetworkConditions({
    currentMode: 'Offline',
    triggerRule: 'interval_cycle',
    tickCount: 2,
    consecutiveFailures: 1,
    faultInjected: false,
  });
  assert.equal(second.nextMode, 'Online');
  assert.equal(second.changed, true);
});

test('heartbeat_threshold requires 2 consecutive missed probes before switching Offline', () => {
  const miss1 = evaluateNetworkConditions({
    currentMode: 'Online',
    triggerRule: 'heartbeat_threshold',
    tickCount: 3,
    consecutiveFailures: 0,
    faultInjected: false,
  });
  assert.equal(miss1.nextMode, 'Online');
  assert.equal(miss1.changed, false);
  assert.equal(miss1.nextConsecutiveFailures, 1);

  const miss2 = evaluateNetworkConditions({
    currentMode: 'Online',
    triggerRule: 'heartbeat_threshold',
    tickCount: 4,
    consecutiveFailures: miss1.nextConsecutiveFailures,
    faultInjected: false,
  });
  assert.equal(miss2.nextMode, 'Offline');
  assert.equal(miss2.changed, true);

  const recover = evaluateNetworkConditions({
    currentMode: 'Offline',
    triggerRule: 'heartbeat_threshold',
    tickCount: 5,
    consecutiveFailures: miss2.nextConsecutiveFailures,
    faultInjected: false,
  });
  assert.equal(recover.nextMode, 'Online');
  assert.equal(recover.changed, true);
});

test('jitter_spike switches Offline when fault is injected and restores when clear', () => {
  const spiked = evaluateNetworkConditions({
    currentMode: 'Online',
    triggerRule: 'jitter_spike',
    tickCount: 1,
    consecutiveFailures: 0,
    faultInjected: true,
  });
  assert.equal(spiked.nextMode, 'Offline');
  assert.equal(spiked.changed, true);

  const cleared = evaluateNetworkConditions({
    currentMode: 'Offline',
    triggerRule: 'jitter_spike',
    tickCount: 1,
    consecutiveFailures: 1,
    faultInjected: false,
  });
  assert.equal(cleared.nextMode, 'Online');
  assert.equal(cleared.changed, true);
});

test('filterLogEntries filters by category and formatDurationSeconds formats cleanly', () => {
  const entries = [
    createLogEntry({
      id: '1',
      category: 'transition',
      previousState: 'Online',
      nextState: 'Offline',
      reason: 'Timeout',
      latencyMs: null,
      packetLossPct: 100,
    }),
    createLogEntry({
      id: '2',
      category: 'override',
      previousState: 'Offline',
      nextState: 'Online',
      reason: 'Manual override',
      latencyMs: 30,
      packetLossPct: 0,
    }),
  ];

  assert.equal(filterLogEntries(entries, 'all').length, 2);
  assert.equal(filterLogEntries(entries, 'override').length, 1);
  assert.equal(formatDurationSeconds(65), '01m 05s');
});
