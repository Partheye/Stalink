import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
const blueprintPath = path.resolve(process.cwd(), 'firebase-blueprint.json');
const rulesSource = fs.readFileSync(rulesPath, 'utf8');
const blueprint = JSON.parse(fs.readFileSync(blueprintPath, 'utf8'));

test('firestore.rules starts with rules_version 2 and default deny safety net', () => {
  assert.match(rulesSource, /^rules_version = '2';/m);
  assert.match(
    rulesSource,
    /match \/\{document=\*\*\} \{\s*allow read, write: if false;\s*\}/
  );
});

test('firestore.rules covers every collection declared in firebase-blueprint.json', () => {
  const paths = Object.keys(blueprint.firestore);
  assert.ok(paths.includes('/users/{userId}'));
  assert.ok(paths.includes('/users/{userId}/private/info'));
  assert.ok(paths.includes('/users/{userId}/threads/{threadId}'));
  assert.ok(paths.includes('/users/{userId}/threads/{threadId}/messages/{messageId}'));

  assert.match(rulesSource, /match \/users\/\{userId\}/);
  assert.match(rulesSource, /match \/private\/info/);
  assert.match(rulesSource, /match \/threads\/\{threadId\}/);
  assert.match(rulesSource, /match \/messages\/\{messageId\}/);
});

test('Dirty Dozen security invariants are explicitly enforced in rules', () => {
  // 1 & 2: Shadow fields & Identity spoofing
  assert.match(rulesSource, /isValidUserProfile/);
  assert.match(rulesSource, /isValidConversationThread/);
  assert.match(rulesSource, /isValidSyncedMessage/);
  assert.match(rulesSource, /data\.keys\(\)\.hasOnly/);

  // 3: Email verified gate
  assert.match(rulesSource, /request\.auth\.token\.email_verified == true/);

  // 4 & 5: PII isolation and query trust
  assert.doesNotMatch(rulesSource, /allow read:\s*if\s*isSignedIn\(\)/);
  assert.match(rulesSource, /existing\(\)\.ownerId == request\.auth\.uid/);

  // 6 & 8: ID poisoning and bounded strings
  assert.match(rulesSource, /isValidId/);
  assert.match(rulesSource, /data\.text\.size\(\) <= 4000/);

  // 7: Master Gate / atomicity on messages
  assert.match(rulesSource, /existsAfter\(/);
  assert.match(rulesSource, /getAfter\(/);

  // 9 & 10 & 11: Temporal integrity, immutability, terminal state locking
  assert.match(rulesSource, /incoming\(\)\.createdAt == request\.time/);
  assert.match(rulesSource, /incoming\(\)\.updatedAt == request\.time/);
  assert.match(rulesSource, /existing\(\)\.status != 'read'/);
});
