<p align="center">
  <img src="../../web/app/icon.png" width="96" alt="Weekly logo" />
</p>

<h1 align="center">@weekly/firebase</h1>

<p align="center">Firestore implementations of the <code>@weekly/domain</code> repository interfaces.</p>

---

This package provides concrete Firestore implementations for every repository interface defined in `@weekly/domain`. All data is stored in Cloud Firestore with real-time subscriptions via `onSnapshot`. The web app consumes this package through dependency injection (`RepositoryContext`) so the UI never imports Firestore directly.

## Firestore Data Model

```
preferences/{userId}
invitesByEmail/{email}/invites/{inviteId}

workspaces/{workspaceId}
  ├── tasks/{taskId}
  ├── habits/{habitId}
  │     └── completions/{logId}
  ├── habitProgress/{habitId}_{periodKey}
  ├── weekNotes/{weekKey}/items/{noteId}
  └── activities/{actId}
```

## Exported Factories

All factories accept a Firestore `db` instance (and optionally a `workspaceId`) and return the corresponding repository interface from `@weekly/domain`.

### `createTaskRepository(db, workspaceId)`

Stores tasks at `workspaces/{workspaceId}/tasks/{taskId}`, ordered by `createdAt` descending.

```ts
import { createTaskRepository } from '@weekly/firebase';

const taskRepo = createTaskRepository(db, workspaceId);
const unsub = taskRepo.subscribeTasks((tasks) => console.log(tasks));
await taskRepo.addTask('Buy groceries', 'week');
await taskRepo.toggleTask(taskId, true);
```

### `createHabitRepository(db, workspaceId)`

Stores habits at `workspaces/{workspaceId}/habits/{habitId}`. Completion events are stored as a subcollection at `habits/{habitId}/completions/{logId}`. On habit creation, an initial `habitProgress` document is also written.

```ts
const habitRepo = createHabitRepository(db, workspaceId);
await habitRepo.addHabit('Read', 1, 'day', new Date(), [1,2,3,4,5]);
await habitRepo.skipHabit(habitId, ['2025-W13']);
await habitRepo.unskipHabit(habitId, '2025-W13');
```

### `createHabitProgressRepository(db, workspaceId)`

Tracks per-period progress at `workspaces/{workspaceId}/habitProgress/{habitId}_{periodKey}`.

Each document stores:
- `count` — total completions in the period
- `succeeded` — whether the target was met
- `dayCounts` — map of `dayKey → count` (for day-level breakdown within week/month periods)

The `incrementHabit` method uses a Firestore transaction to atomically read and update both the progress document and the completion log.

```ts
const progressRepo = createHabitProgressRepository(db, workspaceId);
await progressRepo.incrementHabit(habitId, 'day', 2, new Date());

const unsub = progressRepo.subscribeHabitStreak(
  habitId, 'day', createdAt, skippedPeriods,
  ({ currentStrikeLength, openSincePeriodKey }) => { ... }
);
```

### `createNoteRepository(db, workspaceId)`

Stores week-scoped notes at `workspaces/{workspaceId}/weekNotes/{weekKey}/items/{noteId}`, ordered by `createdAt` ascending.

```ts
const noteRepo = createNoteRepository(db, workspaceId);
const unsub = noteRepo.subscribeNotes('2025-W13', setNotes);
await noteRepo.addNote('2025-W13', {
  title: 'Sprint goals',
  body: '...',
  authorId: uid,
  authorDisplayName: 'Alice',
});
await noteRepo.updateNote('2025-W13', noteId, 'New title', 'New body');
await noteRepo.deleteNote('2025-W13', noteId);
```

### `createWorkspaceRepository(db)`

Manages workspace documents and all collaboration features. Invite documents are stored under `invitesByEmail/{email}/invites/{inviteId}` so each user can query their own invites by email.

Activities are stored under `workspaces/{workspaceId}/activities/{actId}` and are queried with a 24-hour window, limited to 50 entries.

```ts
const workspaceRepo = createWorkspaceRepository(db);
const personalId = await workspaceRepo.createPersonalWorkspace(uid, 'Alice');
const unsub = workspaceRepo.subscribeUserWorkspaces(uid, setWorkspaces);
await workspaceRepo.inviteMember(workspaceId, 'bob@example.com', 'Alice', 'My Workspace');
await workspaceRepo.respondToInvite(inviteId, email, uid, true /* accept */);
```

> **Backward compatibility**: Invite documents written before the `projects → workspaces` rename may contain `projectId`/`projectName` fields. `createWorkspaceRepository` transparently reads both the old and new field names.

### `createUserPreferencesRepository(db)`

Stores per-user settings at `preferences/{userId}`.

```ts
const prefsRepo = createUserPreferencesRepository(db);
const unsub = prefsRepo.subscribeUserPreferences(uid, setPrefs);
await prefsRepo.updateTheme(uid, 'dark');
await prefsRepo.updateLayout(uid, 'period-tabs');
```

## Firestore Security Rules

The rules enforce workspace-based access control. The `isMember()` helper validates that the authenticated user's UID appears in the workspace's `members` array.

| Path | Rule |
|---|---|
| `preferences/{userId}` | Read/write only if `auth.uid == userId` |
| `invitesByEmail/{email}/invites/*` | Read/write only if `auth.token.email == email`; create allowed for any authed user |
| `workspaces/{workspaceId}` | Read/write if member; create if `auth.uid == ownerId`; delete if owner |
| `workspaces/{id}/tasks/*` | Members only |
| `workspaces/{id}/habits/*` | Members only |
| `workspaces/{id}/habits/*/completions/*` | Members only |
| `workspaces/{id}/habitProgress/*` | Members only |
| `workspaces/{id}/weekNotes/*/*` | Members only |
| `workspaces/{id}/activities/*` | Members only |

Deploy rules with:
```bash
firebase deploy --only firestore:rules
```

## Build

```bash
pnpm build   # tsc → dist/
```

## Dependencies

| | Package |
|---|---|
| Runtime | `firebase` ^12.6.0 |
| Peer | `@weekly/domain` (workspace) |
| Dev | `typescript`, `@types/node` |
