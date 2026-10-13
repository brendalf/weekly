# Weekly — UX Improvement Plan

> Execution companion to [`DIRECTION.md`](./DIRECTION.md). Read that first.
> **Phases are a dependency order.** Do not build Phase 2 UI on Phase 1 tokens that
> don't exist yet. Within a phase, workstreams touch disjoint files and may run in parallel.

---

## Status as of 2026-10-13

**Landed:** WS1–WS12 and WS15 in part.
`main` at `459d5c3`. Lint, web build, both package builds and **155/155** domain tests pass;
all six routes serve 200.

**Not yet done — pick up here:**

| | Workstream | What is left |
|---|---|---|
| ◻ | **WS13** | Responsive pass. Known: the habit/task *modal* path (still used on `/app/week`) is `placement="center"` with no mobile sheet treatment; `HabitDetailsModal`'s 84-day calendar grid is tight on a phone; a habit row carrying all four trailing badges at 375px wants a human look. |
| ◻ | **WS14** | Accessibility pass. Includes re-pitching `--muted` / `--subtle` **together** — WS1 left `--subtle` at 3.85:1 in light because the spec'd 45% gave 2.87:1 and the 60% needed for AA was indistinguishable from `--muted`. That ladder needs deciding as a pair, not nudging one rung. |
| ◻ | **WS15** | `web/README.md` still documents the pre-routing app ("Key Components", "Project Structure", the `HabitsTasksView` / `PeriodPanel` descriptions) and is now wrong. |

Two Phase-2 items were descoped as the routes took shape, and should be judged on the
built product rather than reinstated on principle: per-row completion rate and the
period / time-of-day filter chips on `/app/habits`, and the four-way bucket grouping on
`/app/tasks` (buckets exist in domain as `taskBucket`, with tests).

**Verification debt — the important caveat.** No agent has seen this app render
with real data. `web/.env` exists so Firebase initializes, but sign-in is interactive
Google OAuth with no test account, so authenticated routes are unreachable in an agent
session. What *has* been verified: lint, builds, domain tests, HTTP 200s on every route,
compiled-CSS checks that each utility actually generates, numeric WCAG contrast, and —
for the global filter — real headless-Chromium runs against fixture data across
{light, dark} × {375, 768, 1440}. That last technique works well and found two real bugs
(a 14px input that would make iPad zoom, and a 40px target); **prefer it over reasoning
about layout.** A human still needs to open the app once against live data.

**Deferred follow-ups** (model or rules changes, out of scope per DIRECTION §8):

- `archived` field on `Habit` — the menu action ships disabled until it exists.
- Soft-delete tombstone (`deletedAt`). Undo currently restores content, not identity, so a
  restored task gets a new id and anything keyed to the old one — a task's comment thread —
  stays gone.
- Comments on notes (`CommentTarget` is `'habit' | 'task'`).
- Per-member habit attribution in shared workspaces.
- Drag-to-reorder; bulk multi-select.
- A stray `package-lock.json` sits in this pnpm workspace. Two agents have now tried to
  "helpfully" bump a dependency through it; decide whether it should exist at all.

Every workstream below is sized for one agent and states its files, its acceptance
criteria, and what it must not touch. Tick the boxes as they land.

**Definition of done for every workstream**

- `pnpm --filter web lint` passes (`--max-warnings 0` is configured)
- `pnpm --filter web build` succeeds
- Verified at 375px, 768px, and 1440px
- Verified in **both** light and dark theme
- No new user-facing preference introduced (DIRECTION §2.5)
- No Firestore import in a component; no domain logic in a component

---

## Phase 1 — Design foundation

Nothing else may start until WS1 lands. The app currently renders in Arial; building an
information architecture on top of that wastes the work.

### WS1 — Tokens, fonts, and theme correctness ⚙️ *blocks everything*

**Goal:** one source of truth for type, color, spacing, and theme — and a theme that
actually works in both directions.

**Files:** `web/app/globals.css`, `web/app/layout.tsx`, `web/app/providers.tsx`

- [ ] **Delete the Arial override.** `globals.css` has
      `body { font-family: Arial, Helvetica, sans-serif; }` which beats the Geist variables
      set on `<body>` in `layout.tsx`. The whole app renders in Arial today. Replace with
      an `@theme` `--font-sans` / `--font-mono` wired to the Geist variables.
- [ ] **Define the full token layer in `@theme`**: brand (one token, replacing the six
      current spellings of purple — see DIRECTION §6.2), surface, background, border /
      border-strong, foreground / muted / subtle, plus semantic success/warn/danger.
- [ ] **Lock the type scale** to `xs / sm / base / lg / 2xl / 4xl` (DIRECTION §6.3).
      Inputs are `text-base` — anything smaller makes iOS zoom on focus.
- [ ] **Collapse the opacity ladder** from 12 ad-hoc values to the four semantic tokens.
- [ ] **Fix the theme flash.** `layout.tsx` hardcodes `<html className="dark" data-theme="dark">`,
      so a light-preference user sees dark on every load. Emit a small blocking inline
      script that reads the stored preference before paint.
- [ ] **Stop clobbering the root class.** `providers.tsx` does `html.className = t`, wiping
      every other class on `<html>`. Use `classList.add/remove` + `setAttribute`.
- [ ] **Audit light mode.** Hardcoded `text-white` on brand fills and untested `dark:`
      variants (`dark:text-green-400`, `dark:text-amber-400`) across `PeriodBadge`,
      `HabitDetailsModal`, `TaskItem`, `NoteItem`. Every one must be legible in both themes.
- [ ] Add a motion baseline: one easing curve, `prefers-reduced-motion` honored.

**Must not:** change any component's structure or behavior. This is a pure foundation
change — visual diffs only.

---

### WS2 — Shared primitives *(depends on WS1)*

**Goal:** the four hand-rolled dropdowns, three collapse implementations, and two modal
styles become one of each.

**Files:** new components under `web/app/components/ui/`

- [ ] **`ActionMenu`** — wraps HeroUI `Menu`/`Popover` (React Aria: focus trap, `Esc`,
      collision detection, reposition on scroll). Replaces:
      `LayoutSettingsButton`, `UnifiedAddButton`, `WorkspaceSwitcher`'s dropdown
      (`absolute` + `fixed inset-0` catcher), `HabitActionMenu` (portal + a
      `getBoundingClientRect` measured once, so it detaches from its row on scroll), and
      `NotificationBell`'s inline `position: fixed`. Supports nested submenus — the skip
      flow needs one.
- [ ] **`DetailPanel`** — right-side panel ~420px at `lg:`+, bottom sheet below it
      (DIRECTION §5). **Lift the mobile sheet styling from `NoteDetailsModal`**, which
      already gets it right (`rounded-t-3xl`, `pb-[calc(1rem+env(safe-area-inset-bottom))]`,
      `max-h-[85dvh]`); do not write it a third time.
- [ ] **`Collapsible` + `SectionHeader`** — one implementation, with a **persistent**
      rotating chevron. Today `SectionHeader` renders the chevron *only when collapsed*,
      so expanded sections show no toggle affordance. Accepts a `storageKey` so collapse
      state can persist (WS12).
- [ ] **`EmptyState`** — icon, headline, one line of body, primary action slot.
- [ ] **`Skeleton`** — row/card skeletons matching real row geometry. Replaces the bare
      `Loading…` string.
- [ ] **`ConfirmButton`** — the inline two-step footer pattern `NoteDetailsModal` already
      uses, extracted. Never a modal inside a modal.
- [ ] Every primitive: 44px minimum touch target, visible `focus-visible` ring.

**Must not:** migrate callers yet — that is WS3–WS8. Ship the primitives with the old
components still in place so the phases stay reviewable.

---

## Phase 2 — Information architecture

### WS3 — Routed app shell ⚙️ *blocks WS4–WS9*

**Goal:** replace the single 311-line `/app` page with a real shell.

**Files:** `web/app/app/layout.tsx` (new), `web/app/app/page.tsx` (becomes a redirect),
new route dirs

- [ ] Routes per DIRECTION §3: `/app/week`, `/app/habits`, `/app/tasks`, `/app/notes`,
      `/app/review`, `/app/settings`. `/app` redirects to `/app/week`.
- [ ] **Nav in the layout:** sidebar at `lg:`+, bottom tab bar below. Active-route state.
- [ ] **Shell header rendered once.** Today `page.tsx` duplicates the whole
      NotificationBell + ThemeToggle + Logout cluster twice with `sm:hidden` /
      `hidden sm:flex`. One header, responsive.
- [ ] **Account menu.** Move logout out of its red `variant="danger"` button — logging out
      is not destructive and is currently the scariest-looking control in the product —
      into an avatar menu alongside the user's name/email and the theme toggle.
- [ ] **Move all the subscription wiring** (auth, workspaces, invites, activities,
      preferences) out of the page and into the layout or a provider, so every route
      inherits it. `useWorkspaceData` keeps its current contract.
- [ ] Preserve: `calendarStore` and workspace selection survive navigation; the
      personal-workspace bootstrap on first login; preference hydration-once semantics
      (the `selectionHydratedRef` guard exists for a real race — keep it).
- [ ] **Stop reading** `layout` / `innerLayout` preferences. Leave the fields in
      `UserPreferences` for one release; delete the UI.

**Must not:** redesign individual lists — that is WS4–WS8.

---

### WS4 — `/app/week` — the hero view *(depends on WS3)*

**Goal:** the week is the product's center of gravity (DIRECTION §1). Today the app
defaults to the **Day** tab, which inverts the premise.

- [ ] Week is the default and primary scope. The day strip drills into a day *within* the
      week; it does not compete with it.
- [ ] Collapse the three stacked time controls (`WeekPicker` + `WeekdaysCarousel` +
      period tabs ≈ 200px of chrome before any content) into one coherent header.
- [ ] Habits and tasks for the selected scope, with the progress rings. **One layout** —
      the 2×2 `layout` × `innerLayout` matrix is gone.
- [ ] **Notes do not appear here.** They are workspace context, not weekly work, and
      moved to `/app/notes`.
- [ ] Real empty state: a new user gets 3–5 one-click starter habits, not
      `No habits yet.` in 12px at 60% opacity.
- [ ] Rebuild on `PeriodPanel`'s section markup and **delete the duplicate copy** inside
      `HabitsTasksView` (616 lines holding the layout menu, add menu, progress math,
      search wiring, activity logging, and two copies of the same sections).

---

### WS5 — `/app/habits` *(depends on WS3)*

- [ ] All habits, independent of the selected day. Group by period, then time of day.
- [ ] Per-row: target, streak, active days, time-of-day, completion rate.
- [ ] Filter by period / time-of-day / workspace; `showSkipped` as a visible chip, not a
      gear-popover item.
- [ ] `/app/habits/:id` renders the detail in the `DetailPanel`.
- [ ] Archive section in the UI. **If no `archived` field exists on `Habit`, leave the
      action disabled with a note and file a follow-up** — do not invent a schema change
      inside a UI workstream (DIRECTION §8).

### WS6 — `/app/tasks` *(depends on WS3)*

- [ ] All tasks: overdue / this week / upcoming / completed.
- [ ] Overdue tasks lead with a one-click "move to this week". Today they show an
      "open since W41" badge and offer no way to act on it.
- [ ] Filter by scope / workspace / completion.
- [ ] `/app/tasks/:id` in the `DetailPanel`.
- [ ] Replace the raw `<select>` and raw `<input type="date">` in the task detail with
      HeroUI `Select` and `DatePicker` (DIRECTION §6.6) — they currently sit two inches
      from a HeroUI `Select` in `WorkspaceField`, in the same modal.

### WS7 — `/app/notes` *(depends on WS3)*

- [ ] Notes get their own route. Pinned first, then newest (`compareNotes` already does this).
- [ ] **Delete the local filter input.** `NoteList` hand-rolls an `<input>` that appears
      only above 5 notes, with different styling from the toolbar `SearchBox`. The global
      filter (WS11) covers notes.
- [ ] `/app/notes/:id` in the `DetailPanel`.
- [ ] Row `⋯`: Edit, Pin/Unpin, Duplicate, Delete (pin is the only row action today).
- [ ] Empty state explaining what notes are *for* — the object currently has no stated job.

### WS8 — `/app/review` (read-only) *(depends on WS3)*

**Goal:** close the weekly loop. The whole premise of weekly planning is the weekly
review, and the product has none.

- [ ] Read-only recap of the selected week from **existing data only**: habit completion
      rates, streaks held vs. broken, tasks completed, tasks still open, notes added.
- [ ] Reuse `packages/domain/src/core/activity.ts` and `habit.ts` — no new domain logic
      in the component.
- [ ] **No carry-over actions this pass** (DIRECTION §8). Read-only.

### WS9 — `/app/settings` *(depends on WS3)*

- [ ] Workspace: rename, members, pending invites, leave/delete — folding in
      `WorkspaceSettingsModal` and `CreateWorkspaceModal`.
- [ ] Display preferences: theme, `showCompleted`, `showSkipped`.
- [ ] Account: name, email, sign out.

---

## Phase 3 — Affordances

### WS10 — Row action menus *(depends on WS2)*

**Goal:** DIRECTION §7 — every row fully operable from the row.

- [ ] **Habit `⋯`:** Edit, Skip/Unskip, Archive, Delete. **Remove the `{!complete && …}`
      guard** — the menu is currently hidden entirely once a habit is complete, so a
      finished habit cannot be edited or deleted from its row at all.
- [ ] **Task `⋯` (does not exist today):** Edit, Change scope, Move to tomorrow / next
      week, Duplicate, Delete.
- [ ] **Note `⋯`:** Edit, Pin/Unpin, Duplicate, Delete.
- [ ] **Allow un-marking a completed habit from the row.** `CircularCheckboxProgress`
      sets `disabled` when `complete`; recovering from a mis-tap currently means opening
      the modal and clicking `−`.
- [ ] All three menus use the one `ActionMenu` primitive.

### WS11 — One global filter *(depends on WS2, WS3)*

- [ ] One `SearchBox` in the shell header, scoped to the active route.
- [ ] Generalize `useHabitTaskSearch` → `useItemSearch` covering habits, tasks, **and
      notes** (title + body). Keep its debounce + `AbortController` design — it is good.
- [ ] Query in the URL as `?q=` so filtered views are linkable and survive reload.
- [ ] `/` focuses, `Esc` clears. **Never threshold-gate** (today the notes filter appears
      only above 5 notes).
- [ ] `showCompleted` / `showSkipped` become visible chips on list routes — not buried in
      a gear popover. They are display state, not search.

### WS12 — Safety, persistence, keyboard *(depends on WS2)*

- [ ] **Destructive-action parity.** Deleting a habit is instant and silent and destroys
      all completion history; tasks delete instantly too; meanwhile notes — the least
      destructive — have a two-step confirm. Invert it: explicit confirm for habits, undo
      toast for tasks and notes (`sonner` is already a dependency).
- [ ] **Persist collapse state.** `PeriodPanel`, `HabitsTasksView`, `NoteList`,
      `HabitList`, and `TaskList` each hold their own `useState(false)`; collapse a
      section, switch tabs, and it is back.
- [ ] **Keyboard map** per DIRECTION §7: `/` `n` `h` `t` `o` `j` `k` `x` `Enter` `Esc`
      `←` `→` `?`, plus a `?` cheatsheet.
- [ ] **Make rows focusable.** `TaskItem` is a `<div onClick>` — not focusable, not
      Enter-activatable, invisible to screen readers. Same for `SectionHeader` and the
      overview section headers.

---

## Phase 4 — Responsive, accessibility, cleanup

### WS13 — Responsive pass

- [ ] **Weekday strip:** `min-w-[70px]` × 7 = 490px minimum with `overflow-x-auto` and no
      scroll affordance — it scrolls silently on a 375px phone.
- [ ] **Toolbar row:** tabs + progress rings + a `w-32` filter + two icon buttons is a
      single non-wrapping flex ≈ 340px, right at the edge on a 375px screen.
- [ ] **Habit and task detail views get the mobile sheet.** They are `placement="center"`
      `size="sm"` with no mobile treatment — the two most-used detail views are the worst
      ones on a phone, while the *note* modals got proper sheet styling.
- [ ] **Tablet:** the old `side-by-side` preference only split at `lg:`, so it silently
      did nothing on tablets. The new layouts must have a real `md:` story.
- [ ] **Inputs at `text-base`.** The task detail's date input and workspace select are
      `text-sm`, which makes iOS zoom on focus.
- [ ] `HabitDetailsModal`'s 84-day calendar grid needs a workable mobile presentation.

### WS14 — Accessibility pass

- [ ] Visible `focus-visible` rings on every interactive element (almost nothing has one).
- [ ] 44px minimum touch targets. Known violations: `HabitItem`'s `⋯` (24px),
      `NotificationBell` (32px), the `✓` checkbox spans (12px), `WeekPicker` arrows.
- [ ] Contrast audit in both themes — the `text-[10px]` / `/30` opacity combinations in
      the activity feed and note metadata fail at normal viewing distance.
- [ ] Replace the custom `<span className="text-[8px]">✓</span>` checkboxes in the layout
      menu and workspace switcher with HeroUI `Checkbox`.
- [ ] `aria-live` for optimistic updates and toasts; `aria-expanded` on every collapse
      (`NoteList` already does this — match it).
- [ ] Full keyboard traversal of every route with no mouse.

### WS15 — Dead code and duplication

- [ ] **Delete** `ProgressSummary.tsx`, `ProjectField.tsx`, `HabitInput.tsx`,
      `InviteNotification.tsx` — verified: nothing imports them.
- [ ] **Extract `useActivityLog()`.** The
      `workspaces.find(...)` → `members.length < 2` → `logActivity(...).catch(() => {})`
      sequence is copy-pasted in eight places: `app/page.tsx`, `HabitsTasksView` (×3),
      `HabitList`, `TaskList`, `NoteList`, `HabitItem`, `CommentSection`.
- [ ] Delete the hand-rolled dropdowns, collapse implementations, and the second copy of
      the habits/tasks sections once their callers are migrated.
- [ ] Update `web/README.md` — its "Key Components" and "Project Structure" sections
      describe the pre-routing app and will be wrong.

---

## Suggested agent waves

File-conflict-safe parallelization:

| Wave | Workstreams | Why together |
|---|---|---|
| 1 | WS1 | Blocks everything. Alone. |
| 2 | WS2 | New files only; needs WS1 tokens. |
| 3 | WS3 | Blocks all route work. Alone. |
| 4 | WS4, WS5, WS6, WS7, WS8, WS9 | Disjoint route directories. |
| 5 | WS10, WS11, WS12 | Component-level; routes exist by now. |
| 6 | WS13, WS14, WS15 | Cross-cutting polish and deletion, last. |
