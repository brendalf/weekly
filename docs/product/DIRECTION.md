# Weekly — Product & Design Direction

> **Status:** active. Written 2026-10-12 as the standing direction for all UI/UX work on `web/`.
> **Audience:** any agent or contributor touching `web/app/**`.
> **Companion doc:** [`PLAN.md`](./PLAN.md) — the phased, assignable work breakdown.

Read this before changing any component. It records *what Weekly is*, *the decisions
already made* (so they are not re-litigated), and *the patterns every new surface must
follow*. Where this doc and existing code disagree, **this doc wins** — the code is the
backlog.

---

## 1. What Weekly is

**Weekly is a shared weekly planner.** You sit down once a week, decide what matters,
and then execute day by day — with a small team or partner watching the same board.

Three object types, three different jobs:

| Object | Job | Time horizon |
|---|---|---|
| **Habit** | A commitment that recurs. Measured by consistency (streaks). | day / week / month, recurring |
| **Task** | A thing that happens once. Measured by completion. | scoped to a day, week, or month |
| **Note** | Shared context that is not work. Measured by findability. | timeless, workspace-scoped |

Everything lives in a **workspace**. A workspace is either personal (auto-created on
first login) or shared via email invite. Shared workspaces get a real-time activity feed.

### The product's center of gravity

The name is *Weekly*, and the week is the unit of commitment. **The week is the hero
view.** The day is where you execute against the week's plan; the month is a slower
container. Today's app defaults to the Day tab — that is backwards and is being fixed.

### What Weekly is not

- Not a project manager. No dependencies, no Gantt, no assignees, no estimates.
- Not a note-taking app. Notes are a thin shared scratchpad, not a wiki.
- Not a calendar. No events, no times of day beyond a coarse morning/afternoon/evening hint.
- Not an analytics product. Streaks and a week recap, not dashboards.

When a feature request arrives, test it against these four lines first.

---

## 2. Product principles

1. **The week is the unit.** Every surface should make "what did I commit to this week,
   and where am I" answerable in one glance.
2. **One obvious place for each thing.** The current app shows notes, habits, and tasks
   stacked on one screen behind two different filters and four layout preferences. That
   is the symptom of having never decided. Decide, then commit.
3. **Every row is fully operable from the row.** Opening a modal to delete a task is a
   failure. If an action applies to one item, it belongs in that item's `⋯` menu.
4. **Destructive actions are reversible or confirmed — never both silent and instant.**
   Deleting a habit today destroys its entire history with no confirm and no undo.
5. **Preferences are a last resort.** A user-facing toggle is an admission that we could
   not pick a default. Weekly currently ships 4 layout permutations; it ships 1 after this
   pass.
6. **Mobile is a first-class client, not a reflow.** Roughly half of habit check-ins
   happen on a phone, standing up, one-handed. Sheets, not centered modals. 44px targets.
7. **Collaboration is ambient, not loud.** Members should feel each other's presence
   through the feed and item-level traces, without notifications demanding attention.

---

## 3. Information architecture (DECIDED)

**Decision: a routed app shell.** `web/app/app/page.tsx` — one 311-line page that is the
entire authenticated product — is replaced by real routes under `/app`.

```
/                     landing + Google sign-in (exists)
/app                  → redirect to /app/week
/app/week             WEEK PLANNER — the hero. Habits + tasks for the selected week,
                      with a day strip for drilling into a single day.
/app/habits           All habits. Period/time-of-day grouping, archive, per-habit stats.
/app/tasks            All tasks. Backlog, overdue, completed, scope + workspace filters.
/app/notes            Workspace notes. Pinned first, full-text filter, no period coupling.
/app/review           Weekly close — read-only recap of the selected week.
/app/settings         Workspace members/invites, display preferences, account.

/app/habits/:id       Deep-linkable habit detail (renders in the detail panel)
/app/tasks/:id        Deep-linkable task detail
/app/notes/:id        Deep-linkable note detail
```

### Why routes

- **Deep links.** "Did you see this habit?" is currently unsendable. Items have ids; they
  should have URLs.
- **Back/forward works.** Today the browser back button logs you out of context entirely.
- **Per-section density.** The week planner wants a dense list; `/app/habits` wants a
  management table. One page cannot be both, which is why four layout prefs exist.
- **Code pressure relief.** `HabitsTasksView.tsx` is 616 lines because it is the whole
  app. Routes give each concern a home.

### Rules for the shell

- **Nav lives in `/app/layout.tsx`** — sidebar on `lg:`+, bottom tab bar below it. The
  workspace switcher, notification bell, and account menu live in the shell header and
  are rendered **once** (today they are duplicated for mobile/desktop with
  `sm:hidden` / `hidden sm:flex`).
- **Calendar state is global and survives navigation.** `calendarStore` already does this;
  keep it. Selecting Thursday on `/app/week` then visiting `/app/review` reviews that week.
- **Workspace selection is global and persisted.** Already true via
  `userPreferences.selectedWorkspaceIds`; keep it.
- **Detail views are routes rendered into a panel**, not modals. See §5.
- **`/app/review` is read-only this pass.** It recaps the selected week from existing
  data — habit completion rates, streaks held/broken, tasks done, tasks still open.
  Carry-over *actions* are explicitly out of scope (see §8).

### What dies

- The `layout` preference (`period-tabs` | `period-sequential`) and the `innerLayout`
  preference (`sequential` | `side-by-side`). Four permutations → one layout per route.
  Keep the fields in `UserPreferences` for one release so old clients don't break, but
  stop reading them.
- The duplicated habits/tasks section markup in `HabitsTasksView` (which `PeriodPanel`
  already implements).
- `ProgressSummary.tsx`, `ProjectField.tsx`, `HabitInput.tsx`, `InviteNotification.tsx` —
  dead code, nothing imports them.

---

## 4. Filtering & search (DECIDED)

There are two filters today with different implementations and different scopes: the
HeroUI `SearchBox` in the toolbar (habits + tasks only) and a hand-rolled `<input>` inside
`NoteList` that appears only above 5 notes. This is the single most confusing thing in the
UI.

**Decision: one global filter, in the shell header, scoped to the current route.**

- One `SearchBox` component (the HeroUI `SearchField` wrapper — keep it, delete the raw
  input in `NoteList`).
- Debounced and abortable: `useHabitTaskSearch` already does this well. Generalize it to
  `useItemSearch` covering habits, tasks, **and notes** (notes match on title + body).
- `/` focuses it from anywhere. `Esc` clears it.
- The query lives in the URL (`?q=`) so a filtered view is linkable and survives reload.
- **Never threshold-gate a filter.** It appears always, or not at all. "Appears at 6 notes"
  teaches users nothing.
- Display toggles (`showCompleted`, `showSkipped`) are **not** search. They stay as
  persisted preferences, surfaced as chips/segments on the list routes — not buried in a
  gear popover.

---

## 5. Detail views: panel, not modal (DECIDED)

Every item detail today is a HeroUI centered `Modal` at `size="sm"`. On a 1440px screen
that is a small box over a dimmed, unusable page; on a phone, the habit and task modals
have no mobile treatment at all (only the *note* modals got sheet styling — the two
most-used modals are the worst ones).

**Decision: one `DetailPanel` primitive, two presentations.**

| Viewport | Presentation | Behavior |
|---|---|---|
| `lg:` and up | Right-side panel, ~420px, page content stays interactive beside it | Push/overlay, closes on Esc or outside click |
| below `lg:` | Bottom sheet, `rounded-t-3xl`, `pb-[calc(1rem+env(safe-area-inset-bottom))]`, `max-h-[85dvh]` | Drag/swipe-to-dismiss, Esc closes |

The note modals (`NoteAddModal`, `NoteDetailsModal`) already implement the mobile half
correctly — **lift their styling into the shared primitive** rather than writing it a
third time.

Rules:
- Detail panel content is driven by the route (`/app/habits/:id`), so it is deep-linkable
  and back-button-closable.
- Add flows (`HabitAddModal`, `TaskAddModal`, `NoteAddModal`) stay dialogs — they are
  short, focused, and modal by nature — but they must use the shared sheet treatment on
  mobile and gain a **real labeled submit button** (see §6).
- **Never nest a modal in a modal.** Confirmations use an inline two-step in the footer
  (`NoteDetailsModal` already does this correctly) or an undo toast.

---

## 6. Design system contract

This section is normative. New code that violates it should fail review.

### 6.1 The font bug — fix first

`web/app/layout.tsx` loads Geist and Geist Mono into `--font-geist-sans` /
`--font-geist-mono` and applies the variable classes to `<body>`. Then
`web/app/globals.css` does:

```css
body { font-family: Arial, Helvetica, sans-serif; }
```

…which wins. **The entire production app renders in Arial.** This one line is the largest
single contributor to "the UI looks ugly." Fix it before anything else:

```css
@theme {
  --font-sans: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif;
  --font-mono: var(--font-geist-mono), ui-monospace, monospace;
}
body { font-family: var(--font-sans); }
```

### 6.2 One brand color token

Purple is currently spelled **six** different ways across the codebase:

| Spelling | Found in |
|---|---|
| `--accent: oklch(0.627 0.265 303.9)` | `globals.css` |
| `bg-purple-500` / `border-purple-500` | `WeekdaysCarousel`, `NotificationBell`, modals |
| `var(--color-purple-500)` | `CircularCheckboxProgress` |
| `rgba(168,85,247,0.55)` | `HabitsTasksView` PeriodProgress |
| `text-primary` / `bg-primary` | `WorkspaceSwitcher`, layout menu |
| inline `oklch(... / 0.4)` gradient | landing `page.tsx` |

Define the palette once in `@theme` and reference only semantic tokens
(`--color-brand`, `--color-brand-muted`, `--color-surface`, `--color-border`, …).
No raw `purple-500`, no raw `rgba()`, no inline `oklch()` in components.

### 6.3 Type scale

Arbitrary sizes in use today: `text-[8px]`, `text-[10px]`, `text-[11px]`, `text-xs`,
`text-sm`, `text-base`, `text-3xl`, `text-4xl`, `text-5xl`. Anything under 12px is
unreadable and fails accessibility.

Allowed scale — **nothing else, and no arbitrary `text-[Npx]`**:

| Token | Size | Use |
|---|---|---|
| `text-xs` | 12px | metadata, badges, timestamps — the floor |
| `text-sm` | 14px | body, list rows, labels |
| `text-base` | 16px | **all inputs** (below 16px iOS zooms on focus) |
| `text-lg` | 18px | panel/section headings |
| `text-2xl` | 24px | page title |
| `text-4xl` | 36px | landing hero only |

### 6.4 Opacity ladder

Foreground opacities currently in use: `/5 /6 /8 /10 /15 /20 /25 /30 /40 /50 /60 /80`.
Collapse to four semantic tokens:

- `text-foreground` — primary content
- `text-muted` (~65%) — secondary content, metadata
- `text-subtle` (~45%) — placeholders, disabled, de-emphasized
- `border-border` (~12%) / `border-border-strong` (~22%) — the only two border values

### 6.5 One menu primitive

Four hand-rolled dropdown implementations exist, none of which trap focus, close on
`Esc`, or reposition on scroll:

- `LayoutSettingsButton`, `UnifiedAddButton`, `WorkspaceSwitcher` — `absolute` + a
  `fixed inset-0` click-catcher div
- `HabitActionMenu` — `createPortal` + `getBoundingClientRect` measured **once** on open,
  with no scroll/resize listener (scroll the page and the menu detaches from its row)
- `NotificationBell` — inline computed `position: fixed`

HeroUI is built on React Aria and ships `Menu` / `Popover` / `Dialog` that handle focus
trapping, `Esc`, collision detection, and repositioning. **Use them.** Delete the
hand-rolled ones. One `ActionMenu` wrapper, used by every `⋯`.

### 6.6 Native controls

`TaskDetailsModal` uses a raw `<select>` and a raw `<input type="date">` while
`WorkspaceField` two inches away uses HeroUI `Select`. Same product, same modal, two
visual languages. Use HeroUI `Select` and `DatePicker` everywhere. The custom
`<span className="text-[8px]">✓</span>` checkboxes in the layout menu and workspace
switcher become HeroUI `Checkbox`.

### 6.7 Buttons must say what they do

Every modal footer today is a row of bare glyphs: `<Pencil/>`, `<TrashBin/>`, `<Check/>`,
`<Xmark/>`. A delete button that is only a trash icon, sitting beside a save button that
is only a checkmark, with no text, is a guessing game — and the destructive one looks
exactly as safe as the safe one.

- Primary and destructive actions **always** carry a text label ("Save", "Delete habit").
- Icon-only is permitted **only** for: toolbar affordances with a tooltip, row-level `⋯`,
  and the pin toggle.
- Every icon-only control needs `aria-label` (mostly present today — keep it).
- **Log out is not a destructive action.** It is currently `variant="danger"` (a red
  button) and the most alarming control in the product. Move it into an account menu as a
  normal item.

### 6.8 Hit targets & focus

- Minimum interactive size **44×44px** on touch. Current violations: `HabitItem`'s `⋯`
  (24px), `NotificationBell` (32px), the `✓` checkbox spans (12px), `WeekPicker` arrows.
- Every interactive element needs a visible `focus-visible` ring. Almost nothing has one today.
- `TaskItem` is a `<div onClick>` — it is not focusable, not Enter-activatable, and
  invisible to screen readers. Rows are `<button>`/`<a>`, or they get `role` +
  `tabIndex` + key handlers. Same for `SectionHeader` and the overview section headers.

### 6.9 Light theme must actually work

- `web/app/layout.tsx` hardcodes `<html className="dark" data-theme="dark">` in the server
  render. A user whose saved preference is light sees a **flash of dark** on every load.
- `providers.tsx` does `html.className = t`, which **wipes every other class on `<html>`** —
  a latent footgun for anything that adds a root class.
- Components hardcode `text-white` on purple fills and use `dark:` variants
  (`dark:text-green-400`) that were never checked in light mode.

Fix: write the theme from a blocking inline script before paint, use
`classList.add/remove` (never assignment), and verify **every** surface in both themes.

### 6.10 Motion

Keep it minimal and consistent: 150ms for hover/color, 250ms for layout/collapse, one
easing curve (`cubic-bezier(0.4, 0, 0.2, 1)`, already used by `.collapsible`). Honor
`prefers-reduced-motion`. No new animation without a reason.

---

## 7. Interaction affordances — the gaps to close

The audit found these specific holes. Each is a required outcome, not a suggestion.

### Row-level actions

| Object | Today | Required |
|---|---|---|
| **Habit** | `⋯` with Skip/Unskip only — and **the menu is hidden entirely when the habit is complete** (`{!complete && …}`), so a finished habit cannot be edited or deleted from the row at all | `⋯` always present: Edit, Skip/Unskip, Archive, Delete |
| **Task** | *No row menu.* Must open the detail modal to edit, reschedule, or delete | `⋯`: Edit, Change scope, Move to tomorrow / next week, Duplicate, Delete |
| **Note** | Pin only on the row; edit/delete require the modal | `⋯`: Edit, Pin/Unpin, Duplicate, Delete |

### Specific interaction bugs

- **A completed habit cannot be un-marked from the row.** `CircularCheckboxProgress`
  sets `disabled` when `complete`, so recovering from a mis-tap means opening the modal
  and clicking `−`. Allow decrement from the row.
- **An open past task has no one-click reschedule.** It shows an "open since W41" badge
  and offers nothing. "Move to this week" belongs in the `⋯` menu and ideally inline on
  the badge.
- **Deleting a habit is instant and silent**, destroying all its completion history.
  `TaskDetailsModal` deletes instantly too. Meanwhile `NoteDetailsModal` — the least
  destructive — has a two-step confirm. Invert: habits get a typed/explicit confirm,
  tasks and notes get an undo toast.
- **Collapsed state never persists.** `PeriodPanel`, `HabitsTasksView`, `NoteList`,
  `HabitList`, and `TaskList` each hold their own `useState(false)`. Collapse a section,
  switch tabs, and it is back. Persist per-section collapse in preferences or local storage.
- **The collapse chevron only renders while collapsed** (`SectionHeader`), so an expanded
  section shows no toggle affordance at all. `NoteList` gets this right with a persistent
  rotating chevron — match it.

### Keyboard

Nothing exists today. Minimum viable set:

| Key | Action |
|---|---|
| `/` | focus the global filter |
| `n` | new task (the most common action in the product) |
| `h` / `t` / `o` | new habit / task / note |
| `j` / `k` | move between rows |
| `x` / `Space` | toggle the focused row's completion |
| `Enter` | open the focused row's detail |
| `Esc` | close panel / clear filter / leave edit mode |
| `←` / `→` | previous / next week |
| `?` | shortcut cheatsheet |

### Empty & loading states

A new user sees `No habits yet.` in 12px at 60% opacity. The landing page sells four
features; the app delivers a blank grid. Every list route needs a real empty state:
an illustration or icon, one line of explanation, and a primary action. `/app/week` with
nothing in it should offer 3–5 starter habits in one click.

Loading is currently the bare string `Loading…`. Use skeleton rows matching the real
row geometry so the layout does not jump.

---

## 8. Explicitly out of scope this pass

Recorded so the next agent does not treat these as oversights. They require domain-model
and Firestore-rules changes, and were deliberately deferred.

- **Carry-over actions** on `/app/review` (bulk "move all open tasks to next week").
  The route ships read-only.
- **Task description, due date, priority, subtasks, labels.** `Task` stays
  `{ id, title, createdAt, completed, scope?, schedule? }`.
- **Habit archive as a data concept.** The `⋯` menu gets an Archive entry, but if no
  `archived` field exists yet it must be wired in a follow-up — do not invent a schema
  change inside a UI task.
- **Comments on notes.** `CommentTarget` is `'habit' | 'task'`; notes — the most
  discussion-worthy object — cannot be commented. Inconsistent, but a model change.
- **Per-member habit attribution.** In a shared workspace, habit progress is a single
  shared counter with no actor; you cannot see whether *your partner* did the habit. This
  is a genuine product question, not a bug to quietly fix.
- **Drag-to-reorder** habits and tasks. Sort order is fully computed; users cannot express
  their own priority. Needs a persisted `order` field.
- **Bulk multi-select.**
- **The Expo app** in `app/`. It is scaffolding (`expo-router` starter screens) and shares
  only `@weekly/domain`. Untouched.

---

## 9. Working agreements for agents

1. **Read this doc and `PLAN.md` before editing.** Pick up a numbered workstream; do not
   freelance across phases.
2. **Phase order is a dependency order,** not a preference. Phase 2 components should be
   built on Phase 1 tokens and primitives. Do not build an IA on top of Arial.
3. **Reuse before writing.** Four dropdowns, three collapse implementations, two filter
   inputs, and two modal styles already exist. The correct move is almost always to
   consolidate into one primitive, not to add a fifth.
4. **No new user-facing preference** without explicit sign-off (principle 5).
5. **Verify in both themes and at 375px, 768px, and 1440px** before claiming a UI task done.
6. **`pnpm --filter web lint` must pass with zero warnings** (`--max-warnings 0` is
   configured) and `pnpm --filter web build` must succeed.
7. **Keep the layered architecture.** Components never import Firestore; all data access
   goes through `RepositoryContext`. Domain logic belongs in `packages/domain`, not in a
   component.
8. **Activity-logging boilerplate** (`workspaces.find(...)` → `members.length < 2` →
   `logActivity(...).catch(() => {})`) is copy-pasted in eight places. Extract one
   `useActivityLog()` hook the first time you touch any of them.
