<p align="center">
  <img src="../../web/app/icon.png" width="96" alt="Weekly logo" />
</p>

<h1 align="center">@weekly/domain</h1>

<p align="center">Shared domain logic, types, and repository interfaces for the Weekly app.</p>

---

Framework-agnostic TypeScript package that defines every core model, business rule, and data-access interface in one place. Both the Firebase implementation package and the Next.js web app depend on this package — nothing depends on it.

## Structure

```
src/
├── models/        # Data shapes (TypeScript interfaces)
├── ports/         # Repository interfaces (data-access contracts)
└── core/          # Pure business logic and utility functions
```

## Models

| Model | Description |
|---|---|
| `Habit` | Recurring habit with name, target count, period, active days, time-of-day, and skipped periods |
| `HabitCompletionLog` | A single completion event for a habit |
| `Task` | One-off to-do with optional period scope (day / week / month) |
| `Workspace` | Multi-user space with owner, member list, and pending invites |
| `WorkspaceInvite` | Invitation record with status (`pending` \| `accepted` \| `declined`) |
| `ActivityNotification` | Activity log entry produced when a member completes a habit or task |
| `Note` | Week-scoped rich note with title, body, author info, and timestamps |
| `UserPreferences` | Per-user settings: theme, layout preference, last notification read time |

### Enums / Union Types

| Type | Values |
|---|---|
| `Period` | `"day"` \| `"week"` \| `"month"` |
| `HabitTimeOfDay` | `"morning"` \| `"afternoon"` \| `"evening"` |
| `ThemePreference` | `"dark"` \| `"light"` |
| `LayoutPreference` | `"period-tabs"` \| `"period-sequential"` |

## Repository Interfaces (Ports)

All data access is described as interfaces so the UI layer never depends on a specific backend.

### `HabitRepository`
```ts
subscribeHabits(onHabits: (habits: Habit[]) => void): Unsubscribe
addHabit(name, times, period, createdAt, activeDays?, timeOfDay?): Promise<string>
subscribeHabitCompletions(habitId, onLogs): Unsubscribe
updateHabit(habitId, name, times, period, activeDays?, timeOfDay?): Promise<void>
deleteHabit(habitId): Promise<void>
deleteHabitLog(habitId, log, times): Promise<void>
skipHabit(habitId, periodKeys): Promise<void>
unskipHabit(habitId, periodKey): Promise<void>
```

### `HabitProgressRepository`
```ts
subscribeHabitProgress(habitId, periodKey, onProgress): Unsubscribe
subscribeHabitStreak(habitId, period, createdAt, skippedPeriods?, onStreak): Unsubscribe
incrementHabit(habitId, period, times, referenceDate): Promise<void>
```

### `TaskRepository`
```ts
subscribeTasks(onTasks: (tasks: Task[]) => void): Unsubscribe
addTask(title, scope?, createdAt?): Promise<string>
toggleTask(taskId, completed): Promise<void>
updateTask(taskId, updates): Promise<void>
updateTaskTitle(taskId, title): Promise<void>
deleteTask(taskId): Promise<void>
```

### `WorkspaceRepository`
```ts
createPersonalWorkspace(userId, displayName): Promise<string>
subscribeUserWorkspaces(userId, onWorkspaces): Unsubscribe
createWorkspace(name, userId): Promise<string>
renameWorkspace(workspaceId, name): Promise<void>
deleteWorkspace(workspaceId): Promise<void>
inviteMember(workspaceId, email, inviterName, workspaceName): Promise<void>
removeMember(workspaceId, userId): Promise<void>
respondToInvite(inviteId, email, userId, accept): Promise<void>
subscribeInvites(email, onInvites): Unsubscribe
subscribeWorkspaceActivities(workspaceId, since, onActivities): Unsubscribe
logActivity(workspaceId, notification): Promise<void>
```

### `NoteRepository`
```ts
subscribeNotes(weekKey: string, onNotes: (notes: Note[]) => void): Unsubscribe
addNote(weekKey, note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>
updateNote(weekKey, noteId, title, body): Promise<void>
deleteNote(weekKey, noteId): Promise<void>
```

### `UserPreferencesRepository`
```ts
subscribeUserPreferences(userId, onPrefs): Unsubscribe
updateTheme(userId, theme): Promise<void>
updateLayout(userId, layout): Promise<void>
updateLastNotificationReadAt(userId, iso): Promise<void>
```

## Core Utilities

### `period.ts` — Period key generation

```ts
dayKeyOf(date)     // → "2025-03-27"
weekKeyOf(date)    // → "2025-W13"
monthKeyOf(date)   // → "2025-03"
periodKeyOf(date, period)   // routes to the right key function
getISOWeek(date)   // → { year, week }
```

### `habit.ts` — Habit business logic

```ts
filterHabitsByDay(habits, day)
// Returns habits that are active on the given day (respects createdAt and activeDays).

isHabitSkipped(habit, day)
// Returns true if the habit has been skipped for the day's period.

computeStreak(summaryMap, referenceDate, createdAt, period, skippedPeriods?)
// Returns { currentStrikeLength, openSincePeriodKey }.

getSkipPeriodKeys(date, period, skipType, untilDate?)
// Returns the list of period keys to mark as skipped
// skipType: 'today' | 'week' | 'month' | 'until'

prevPeriodDate(date, period)
// Returns the Date one period before the given date.
```

### `task.ts` — Task business logic

```ts
getTaskVisibility(task, selectedDay)
// Returns 'current' | 'past_open' | 'hidden'
// A task is visible if it falls within the selected period or is incomplete from a past period.

taskPeriodKey(task, date)
// Returns the period key for the task's scope relative to the given date.
```

### `display.ts` — Formatting helpers

```ts
formatPeriodKey(key, period)       // → "Mon 24" / "Week 13" / "Mar"
formatPeriodKeyFull(key, period)   // → "Monday, 24 of March" / "Week 13, 2025" / "March 2025"
formatDayLabel(date)               // → "Monday, 15 of March"
habitProgress(value, times)        // → { progress: 0–1, complete: boolean }

// Constants
PERIOD_TABS   // [{ period: 'day', label: 'Day' }, ...]
WEEKDAY_LABELS
TIME_OF_DAY_OPTIONS
```

### `date.ts` — Date utilities

```ts
getStartOfWeek(date)   // Returns the Monday of the given date's ISO week
addDays(date, n)
getWeekDays(weekStart) // Returns array of 7 Date objects starting from Monday
```

## Build

```bash
pnpm build   # tsc → dist/
pnpm test    # Node test runner via tsx
```

## Dependencies

| | |
|---|---|
| Runtime | none |
| Dev | `typescript`, `tsx`, `@types/node` |
