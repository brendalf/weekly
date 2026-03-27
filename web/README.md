<p align="center">
  <img src="./app/icon.png" width="96" alt="Weekly logo" />
</p>

<h1 align="center">Weekly — Web App</h1>

<p align="center">A collaborative habit and task tracker built with Next.js, React, and Firebase.</p>

---

## Overview

Weekly helps individuals and teams track recurring habits and one-off tasks across three time horizons: **day**, **week**, and **month**. Each workspace is collaborative — members see each other's completions in real time via a notification feed.

Key capabilities:
- Recurring habits with customisable period, target count, active days, and time-of-day
- Habit streaks and skip functionality (skip today / this week / this month / until a date)
- Tasks scoped to a day, week, or month; incomplete past tasks stay visible until done
- Week-scoped collaborative notes shared across all workspace members
- Multiple workspaces with invite-by-email membership
- Real-time activity feed showing what team members have completed
- Dark / light theme toggle, period-tabs or overview layout preference

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI library | React 19 |
| Components | HeroUI v3 (beta) — built on React Aria |
| Icons | Gravity UI Icons |
| Styling | Tailwind CSS v4 |
| Backend | Firebase (Auth + Cloud Firestore) |
| Domain logic | `@weekly/domain` |
| Data access | `@weekly/firebase` |

## Project Structure

```
web/
├── app/
│   ├── app/
│   │   └── page.tsx          # Main authenticated view
│   ├── components/
│   │   ├── calendar/         # WeekPicker, WeekdaysCarousel
│   │   ├── general/          # SectionHeader, PeriodBadge, WorkspaceField, CircularCheckboxProgress, ...
│   │   ├── habits/           # HabitList, HabitItem, HabitAddModal, HabitDetailsModal, SkipMenu, ...
│   │   ├── notes/            # NoteList, NoteItem, NoteAddModal
│   │   ├── tasks/            # TaskList, TaskItem, TaskAddModal, TaskDetailsModal
│   │   ├── workspaces/       # WorkspaceSwitcher, CreateWorkspaceModal, WorkspaceSettingsModal,
│   │   │                     #   NotificationBell, InviteNotification
│   │   ├── HabitsTasksView.tsx
│   │   └── PeriodPanel.tsx
│   ├── contexts/
│   │   └── RepositoryContext.tsx   # Dependency injection for all repos
│   ├── hooks/
│   │   └── useWorkspaceData.ts     # Subscribes to habits/tasks, creates repos per workspace
│   ├── stores/
│   │   ├── calendar.ts             # Selected week/day state
│   │   └── workspace.ts            # Workspaces, active workspace, notifications
│   └── config/
│       └── firebase.ts             # Firebase app & Firestore initialisation
```

## Architecture

The app follows a layered architecture with dependency injection:

```
┌─────────────────────────────────────────────┐
│                    Web UI                    │
│   (components, pages, stores, hooks)         │
├─────────────────────────────────────────────┤
│              RepositoryContext               │  ← dependency injection boundary
├──────────────────┬──────────────────────────┤
│  @weekly/domain  │    @weekly/firebase       │
│  (types, ports,  │  (Firestore repos)        │
│   business logic)│                           │
└──────────────────┴──────────────────────────┘
```

Components never import Firestore directly. All data access goes through `RepositoryContext`, which provides repository instances created by `useWorkspaceData`.

## State Management

Global state is managed with lightweight stores using `useSyncExternalStore` (no external state library).

### `calendarStore`
```ts
useCalendarStore(s => s.selectedDayISO)  // ISO date of the selected day
useCalendarStore(s => s.weekStart)       // Monday of the current week
// Actions: prevWeek(), nextWeek(), goToToday(), selectDay(iso)
```

### `workspaceStore`
```ts
useWorkspaceStore(s => s.workspaces)
useWorkspaceStore(s => s.activeWorkspaceId)
useWorkspaceStore(s => s.pendingInvites)
useWorkspaceStore(s => s.activityNotifications)
```

## Key Components

### `HabitsTasksView`

Top-level layout switcher. Renders one `PeriodPanel` per period (Day / Week / Month) in either **tabs** or **overview** mode. Contains per-period progress rings in the tab bar.

### `PeriodPanel`

Renders content for a single period:
1. **Notes** (week only) — collapsible, collaborative, week-scoped
2. **Habits** — filtered to the selected day and period; collapsible
3. **Tasks** — filtered by scope and visibility; collapsible

Supports **sequential** (stacked) and **side-by-side** (2-column grid) inner layouts.

### `HabitItem`

Displays a single habit with:
- Circular progress indicator (click to increment)
- Streak badge and "open since" label
- Tap to open `HabitDetailsModal` (full edit, +/- buttons, skip menu in header)
- Icon button to open `SkipMenu` inline

### `NoteList` / `NoteItem`

Self-contained notes for the current week. `NoteList` subscribes to `activeRepos.note.subscribeNotes(weekKey)` internally using the calendar store — no prop drilling required.

`NoteItem` is a collapsible card:
- Collapsed: title, author name, relative timestamp
- Expanded: body + edit and delete icon buttons
- Edit mode: inline title input + body textarea

### `WorkspaceSwitcher`

Dropdown that lists all workspaces the user belongs to. Shows a gear icon to open `WorkspaceSettingsModal`. In multi-workspace mode the top option is "All Workspaces" which aggregates habits and tasks across all spaces.

### `NotificationBell`

Real-time activity feed. Subscribes to the last 24 hours of `activities` for all workspaces. Badges the bell icon when there are unread notifications.

## Repository Context

```tsx
const { activeRepos, getHabitRepos, getTaskRepos, getWorkspaceRepos } = useRepositoryContext();

// activeRepos provides repos for the currently active workspace
const unsub = activeRepos.habit.subscribeHabits(setHabits);
await activeRepos.task.addTask('Design review', 'week');
await activeRepos.note.addNote(weekKey, { title, body, authorId, authorDisplayName });

// Look up the workspace a specific habit/task belongs to
const repos = getHabitRepos(habitId);
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 10+
- A Firebase project with Firestore and Authentication enabled

### Environment Variables

Create `web/.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

### Install & Run

```bash
# From the monorepo root
pnpm install

# Build domain and firebase packages first
pnpm -r --filter "./packages/*" run build

# Start the web dev server
pnpm --filter web dev
```

### Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
```

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start Next.js development server |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |

## Dependencies

| Package | Purpose |
|---|---|
| `next` 16 | App framework (App Router, React Server Components) |
| `react` / `react-dom` 19 | UI rendering |
| `@heroui/react` (beta) | Component library (Modal, Button, Input, Surface, …) |
| `@gravity-ui/icons` | Icon set |
| `tailwindcss` 4 | Utility-first CSS |
| `firebase` 12 | Auth + Firestore |
| `@weekly/domain` | Domain types and business logic |
| `@weekly/firebase` | Firestore repository implementations |
| `sonner` | Toast notifications |
| `@vercel/analytics` | Web analytics |
