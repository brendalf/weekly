<p align="center">
  <img src="./app/icon.png" width="96" alt="Weekly logo" />
</p>

<h1 align="center">Weekly — Web App</h1>

<p align="center">A collaborative habit and task tracker built with Next.js, React, and Firebase.</p>

---

## Overview

Weekly helps individuals and teams track recurring habits and one-off tasks across three time horizons: **day**, **week**, and **month**. Each workspace is collaborative — members see each other's completions in real time via a notification feed.

The **week** is the unit of commitment and the hero view; the day is where you execute
against it. See [`../docs/product/DIRECTION.md`](../docs/product/DIRECTION.md) for what
Weekly is (and is not) before adding to it.

Key capabilities:
- Recurring habits with customisable period, target count, active days, and time-of-day
- Habit streaks and skip functionality (skip today / this week / this month / until a date)
- Tasks scoped to a day, week, or month; incomplete past tasks stay visible until done
- Collaborative notes, scoped to a workspace rather than a week
- Row-level actions on every habit, task, and note; undo on delete
- One global filter, scoped to the active route and shareable via `?q=`
- A read-only weekly review: habit completion, streaks held or broken, tasks carried
- Multiple workspaces with invite-by-email membership
- Real-time activity feed showing what team members have completed
- Keyboard shortcuts throughout (`?` for the cheatsheet)
- Dark / light theme

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
│   ├── page.tsx                    # Landing + Google sign-in
│   ├── app/                        # The authenticated shell
│   │   ├── layout.tsx              #   nav + header + every subscription, mounted once
│   │   ├── page.tsx                #   redirects to /app/week
│   │   ├── week/                   #   the hero: habits + tasks for the selected week
│   │   ├── habits/  [id]/          #   all habits, + deep-linkable detail panel
│   │   ├── tasks/   [id]/          #   all tasks, + detail panel
│   │   ├── notes/   [id]/          #   workspace notes, + detail panel
│   │   ├── review/                 #   read-only weekly close
│   │   └── settings/               #   workspace, display, account
│   ├── components/
│   │   ├── ui/                     # Shared primitives: ActionMenu, DetailPanel,
│   │   │                           #   Collapsible, EmptyState, Skeleton, ConfirmButton
│   │   ├── shell/                  # AppDataProvider, AppSidebar, AppTabBar,
│   │   │                           #   ShellHeader, AccountMenu, navItems
│   │   ├── week/                   # WeekHeader, WeekToolbar, ScopeTabs, StarterHabits
│   │   ├── keyboard/               # Global shortcuts + the `?` cheatsheet
│   │   ├── habits/ tasks/ notes/   # Rows, action menus, edit forms, detail modals
│   │   ├── general/ calendar/      # Badges, selects, date picker, WeekPicker
│   │   ├── comments/ workspaces/   # CommentSection; switcher, settings, notifications
│   │   └── PeriodPanel.tsx         # One period's habit + task sections
│   ├── contexts/RepositoryContext.tsx   # Dependency injection for all repos
│   ├── hooks/                      # useItemSearch, useActivityLog, useRowKeys,
│   │                               #   useUndoableDelete, useKeyboardShortcuts, ...
│   ├── stores/                     # calendar.ts, workspace.ts, search.ts
│   ├── globals.css                 # The design token layer — read before styling
│   └── config/firebase.ts          # Firebase app & Firestore initialisation
```

Routes are the unit of organisation: each surface owns its own layout and density, and
items are deep-linkable (`/app/habits/:id`). `app/app/layout.tsx` owns every
subscription, so routes read data through `useAppData()` and never subscribe themselves —
which is what lets navigation preserve the selected week and the workspace selection.

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
useWorkspaceStore(s => s.selectedWorkspaceIds)   // empty array = all workspaces
useWorkspaceStore(s => s.pendingInvites)
useWorkspaceStore(s => s.activityNotifications)
// Selection is persisted to user preferences and survives navigation.
```

### `searchStore`
```ts
useSearchStore(s => s.query)         // raw input, every keystroke
useSearchStore(s => s.appliedQuery)  // debounced: what lists filter on, what ?q= holds
focusGlobalSearch()                  // `/` entry point; false where no filter is mounted
```

## Key Components

### `AppDataProvider` (`components/shell/`)

Owns auth, workspaces, invites, activities, preferences, habits, tasks, and notes for the
whole of `/app`. **Routes call `useAppData()` and never subscribe themselves** — that is
what keeps the selected week and workspace selection intact across navigation.

```tsx
const { habits, tasks, notes, workspaces, pickerWorkspaces,
        showCompletedTasks, showSkippedHabits,
        toggleTaskCompleted, addNote, updateNote, deleteNote, logout } = useAppData();
```

Two guards in here exist for real races and should not be "simplified": a brand-new user
must not create a second personal workspace off the initial empty snapshot, and the
persisted workspace selection hydrates **once** so a later preference write cannot stomp
an in-session change.

### `components/ui/` — the shared primitives

`ActionMenu` (HeroUI `Dropdown`, with submenus), `DetailPanel` (side panel at `lg:`+,
bottom sheet below), `Collapsible` / `SectionHeader` (optional `storageKey` persists
collapse), `EmptyState`, `Skeleton`, `ConfirmButton`. **Reach for these before writing a
new menu, panel, or collapse** — the pre-routing app had four hand-rolled dropdowns and
three collapse implementations.

### `PeriodPanel`

One period's habit and task sections, with counts supplied by the caller from a single
`scopeProgress()` call so headers and progress rings cannot disagree.

### Rows (`HabitItem`, `TaskItem`, `NoteItem`)

A row holds a progress ring *and* an action menu, so it cannot be a `<button>`. They use
the stretched-link pattern in `hooks/useRowKeys.ts`: the title is the real focusable
element with `after:inset-0` covering the row, giving one tab stop and one hit area while
the controls above it keep their own semantics. `x` / `Space` toggle, `Enter` opens.

### `components/keyboard/`

Global shortcuts, mounted once in the shell. The binding list is also the source of the
`?` cheatsheet, so a shortcut cannot exist undocumented.

## Repository Context

Most UI should read data from `useAppData()`. Reach for `RepositoryContext` when you need
to **write**, or to subscribe to something the shell does not already hold (a single
habit's completion log, say).

```tsx
const { activeRepos, getHabitRepos, getTaskRepos, getWorkspaceRepos } = useRepositoryContext();

// activeRepos provides repos for the currently active workspace
const unsub = activeRepos.habit.subscribeHabits(setHabits);
await activeRepos.task.addTask('Design review', 'week');
// Notes are workspace-scoped, not week-scoped — no period key.
await activeRepos.note.addNote({ title, body, authorId, authorDisplayName });

// Look up the workspace a specific habit/task belongs to
const repos = getHabitRepos(habitId);

// One-shot read, for somewhere read-only like /app/review: a live row pays for
// two subscriptions per habit because it must repaint the moment a member marks
// something, and a recap of a finished week must not.
const progress = await repos.habitProgress.readHabitProgress(
  habitId, period, fromPeriodKey, toPeriodKey,   // bounds inclusive
);
```

## Design System

`app/globals.css` is the single source of truth for type, colour, spacing, and motion.
The full contract is [`DIRECTION.md` §6](../docs/product/DIRECTION.md); the short version:

- **Semantic tokens only.** No raw `purple-500`, no `rgba()`, no inline `oklch()`, no
  `foreground/NN`. Use `brand`, `surface`, `muted`, `subtle`, `border`, `border-strong`,
  `fill`, `fill-strong`, `success-muted` / `warning-muted` / `danger-muted`, `streak`,
  `highlight`, `period-day` / `-week` / `-month`.
- **The type scale is locked** to `xs sm base lg 2xl 4xl`. Every other `text-*` size is
  removed from the theme, so an out-of-scale size **fails to generate** rather than
  passing review. 12px is the floor; form inputs must be `text-base`, or iOS zooms on focus.
- **44px minimum touch targets** and a visible `focus-visible` ring on everything interactive.
- **Both themes, always.** Define colours as tokens rather than `dark:` variants, and
  check both — the light theme once shipped text at 2.7:1 contrast.
- One easing curve, and `prefers-reduced-motion` is honoured globally.

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 10+
- A Firebase project with Firestore and Authentication enabled

### Environment Variables

`web/.env` holds the dev config and `web/.env.production` the deployed one; use
`web/.env.local` for an override Git should ignore. Any of them needs:

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
| `pnpm lint` | Run ESLint (`--max-warnings 0` — warnings fail) |

Before claiming a change done, from the monorepo root:

```bash
pnpm --filter web lint && pnpm --filter web build
pnpm -r --filter "./packages/*" run build
pnpm --filter @weekly/domain test
```

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
| `sonner` | Toast notifications (and the undo affordance on delete) |
| `@internationalized/date` | Date values for HeroUI's date controls |
| `@vercel/analytics` | Web analytics |

## Contributing

Read [`../docs/product/DIRECTION.md`](../docs/product/DIRECTION.md) first — it records the
product decisions and the design-system contract, so they do not get re-litigated per
change. [`../docs/product/PLAN.md`](../docs/product/PLAN.md) tracks what is still open.

The two rules worth repeating here: components never import Firestore (data access goes
through `RepositoryContext`), and business logic belongs in `packages/domain`, which has
tests — not in a component.
