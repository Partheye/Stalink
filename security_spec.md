# MeshLine Firestore Security Specification

## 1. Data Invariants
1. **Default Deny**: Any path not explicitly matched is denied for both read and write.
2. **Verified Identity**: Write operations require `request.auth != null` and `request.auth.token.email_verified == true`.
3. **Strict Ownership**: Every document under `/users/{userId}` and its subcollections (`private/info`, `threads/{threadId}`, `threads/{threadId}/messages/{messageId}`) is strictly owned by `userId == request.auth.uid`.
4. **Master Gate Relational Integrity**: Writing a `SyncedMessage` requires the parent `ConversationThread` at `/users/{userId}/threads/{threadId}` to exist (via `exists()` or `existsAfter()` for atomic batch creation) and belong to `request.auth.uid`.
5. **PII Isolation**: User email is isolated in `/users/{userId}/private/info`, readable and writable only by `userId == request.auth.uid`.
6. **Immutable Ownership & Temporal Integrity**: `ownerId`/`uid` and `createdAt` cannot change after creation; `createdAt == request.time` on create and `updatedAt == request.time` on create/update.
7. **Terminal State Locking**: Once a `SyncedMessage` reaches `status == 'read'`, subsequent client updates are rejected.
8. **Strict Key & Volumetric Guards**: All IDs match `^[a-zA-Z0-9_\\-]+$` (max 128 chars), strings have bounded `.size()` checks, and `keys().hasAll` + `keys().hasOnly` forbid shadow fields.

## 2. The "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. **Shadow Field Injection on Profile**: Creating `/users/{uid}` with extra `isAdmin: true`.
2. **Identity Spoofing on Thread**: Creating `/users/{uid}/threads/t1` with `ownerId: "attacker_uid"`.
3. **Unverified Email Bypass**: Attempting any write when `request.auth.token.email_verified == false`.
4. **Cross-User PII Read**: Authenticated User B reading `/users/{userA}/private/info`.
5. **Cross-User Thread List**: Authenticated User B listing `/users/{userA}/threads`.
6. **ID Poisoning**: Creating `/users/{uid}/threads/{200-char-invalid-id}` with spaces/slashes or >128 chars.
7. **Orphaned Message Write**: Creating `/users/{uid}/threads/nonexistent/messages/m1` when parent thread does not exist.
8. **Oversized Text Payload**: Creating a message with `text` > 4000 characters.
9. **Client Timestamp Forgery**: Creating a message with `createdAt` != `request.time`.
10. **Immutable Field Mutation**: Updating a message's `createdAt` or `ownerId`.
11. **Terminal State Regression**: Updating a message whose existing `status` is `'read'` back to `'queued'`.
12. **Type Poisoning on Update**: Updating a message's `status` to a boolean `true` or invalid string `'hacked'`.
