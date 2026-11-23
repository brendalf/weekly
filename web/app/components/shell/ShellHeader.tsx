"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Button } from "@heroui/react";
import { Magnifier } from "@gravity-ui/icons";
import { WorkspaceSwitcher } from "../workspaces/WorkspaceSwitcher";
import { NotificationBell } from "../workspaces/NotificationBell";
import { SearchBox } from "../general/SearchBox";
import { AccountMenu } from "./AccountMenu";
import { touchTarget } from "../ui/styles";
import { setGlobalSearchQuery } from "../../hooks/useItemSearch";
import {
  searchScopeForPath,
  searchStore,
  useSearchStore,
  type SearchScope,
} from "../../stores/search";

/**
 * The shell header — **one** of it, for every viewport and every route
 * (DIRECTION §3).
 *
 * `app/app/page.tsx` used to render the notification bell, theme toggle, and
 * logout button twice, once behind `sm:hidden` and once behind `hidden sm:flex`,
 * with the name/email block only ever visible on desktop. There is now a single
 * row: workspace context on the left, notifications and account on the right.
 * The name and email moved into the account menu, where they are readable on a
 * phone too.
 *
 * It stays thin (56px) and sticky, because the chrome above a list should cost
 * as little vertical space as possible on a phone. The page title lives in the
 * scrolling content, not here.
 *
 * On the routes that have something to filter, the product's **one** filter
 * (PLAN WS11) lives in that same row, collapsed to a magnifier button left of
 * the bell. Pressing it (or `/`) expands the field in place; a second row would
 * cost a full 56px of list on every filterable route. At 375px there is no room
 * for the field beside the workspace switcher, so on a phone the switcher steps
 * aside while the field is open.
 */
export function ShellHeader() {
  const pathname = usePathname();
  const scope = searchScopeForPath(pathname);
  const query = useSearchStore((s) => s.query);
  // Which scope the field was opened on, so leaving it (or the filterable
  // routes altogether) collapses it back to the icon.
  const [expandedScope, setExpandedScope] = useState<string | null>(null);

  // Leaving the filterable routes drops the query, so coming back to
  // `/app/notes` from `/app/settings` does not resurrect a filter whose field
  // was not on screen. (Moving *between* filterable routes is handled by the
  // `?q=` sync below, which the new route's URL answers for.)
  useEffect(() => {
    if (!scope) searchStore.clear();
  }, [scope]);

  // A query — typed, or arriving from `?q=` — always keeps the field open, so
  // an active filter is never hidden behind an icon.
  const showFilterField =
    !!scope && (expandedScope === scope.href || query !== "");
  const setFilterExpanded = useCallback(
    (expanded: boolean) => setExpandedScope(expanded && scope ? scope.href : null),
    [scope],
  );

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-2 px-4 py-2 sm:px-6">
        <div
          className={[
            "min-w-0 flex-1 items-center",
            showFilterField ? "hidden sm:flex" : "flex",
          ].join(" ")}
        >
          <WorkspaceSwitcher />
        </div>
        {scope && (
          // `useSearchParams` reads a value the prerender cannot know, so it is
          // isolated behind its own boundary: the rest of the header prerenders,
          // and only the filter waits. Next 16.0.8 happens to build without it
          // (all `/app` routes still come out static either way — checked), but
          // the boundary is what keeps that true if the shell ever renders on
          // the server for real. The fallback reserves the button's footprint
          // so the bell does not jump.
          <Suspense fallback={<div className="h-11 w-11 shrink-0" aria-hidden />}>
            <GlobalFilter
              scope={scope}
              expanded={showFilterField}
              onExpandedChange={setFilterExpanded}
            />
          </Suspense>
        )}
        <NotificationBell />
        <AccountMenu />
      </div>
    </header>
  );
}

/**
 * The global filter field, and the two-way bridge between it and `?q=`.
 *
 * `?q=` is the shareable form of the filter (DIRECTION §4): a filtered view is
 * linkable and survives reload. The store is the live form, because the field
 * is in the header and the lists are in routes.
 *
 * - **URL → store:** a `?q=` in the URL always wins — that is a link, a reload,
 *   or Back/Forward. A URL *without* it only clears the filter when the
 *   **scope** changed (Notes → Habits); moving within a scope
 *   (`/app/notes` → `/app/notes/:id` and back as a detail panel opens and
 *   closes) must not throw the filter away.
 * - **store → URL:** from the *debounced* query only, via
 *   `history.replaceState`. Next supports that explicitly and `useSearchParams`
 *   picks it up, whereas `router.replace` would issue a soft navigation — and
 *   an RSC round trip — for every word typed, and would stack history entries
 *   that make Back walk backwards through a half-typed query. It re-runs on
 *   navigation too, which is what re-stamps `?q=` onto the detail route.
 *
 * Both effects read the live store rather than their render's snapshot: in the
 * commit where a scope change clears the query, the writer would otherwise
 * stamp the value it was rendered with onto the route that just cleared it.
 *
 * Collapsed, it is a magnifier button; `ShellHeader` owns whether it is open.
 */
function GlobalFilter({
  scope,
  expanded,
  onExpandedChange,
}: {
  scope: SearchScope;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = useSearchStore((s) => s.query);
  const appliedQuery = useSearchStore((s) => s.appliedQuery);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastScopeRef = useRef(scope.href);
  // Set when the field is asked to take focus before it has mounted.
  const pendingFocusRef = useRef(false);

  const urlQuery = searchParams.get("q") ?? "";

  // URL → store.
  useEffect(() => {
    const scopeChanged = lastScopeRef.current !== scope.href;
    lastScopeRef.current = scope.href;

    if (urlQuery) {
      if (urlQuery !== searchStore.getState().appliedQuery) {
        searchStore.setQueryImmediate(urlQuery);
      }
      return;
    }
    if (scopeChanged) searchStore.clear();
  }, [urlQuery, scope.href]);

  // store → URL. Reads `window.location` rather than `searchParams` so it can
  // never write a value derived from a render that is already stale.
  useEffect(() => {
    const applied = searchStore.getState().appliedQuery;
    const params = new URLSearchParams(window.location.search);
    if ((params.get("q") ?? "") === applied) return;
    if (applied) params.set("q", applied);
    else params.delete("q");
    const qs = params.toString();
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`,
    );
  }, [appliedQuery, pathname]);

  // Focus once the field has mounted, when expansion was what was asked for.
  useEffect(() => {
    if (!expanded || !pendingFocusRef.current) return;
    pendingFocusRef.current = false;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [expanded]);

  // Register the field so anything can focus it by name. `/` is bound in
  // `components/keyboard/KeyboardShortcuts.tsx` (WS12), which calls
  // `focusGlobalSearch()` — one global key listener for the whole app, not one
  // per component that happens to want a key. `Esc` inside the field is React
  // Aria's own (it clears the value, and only propagates when already empty).
  useEffect(
    () =>
      searchStore.registerFocusHandler(() => {
        const input = inputRef.current;
        if (!input) {
          pendingFocusRef.current = true;
          onExpandedChange(true);
          return;
        }
        input.focus();
        input.select();
      }),
    [onExpandedChange],
  );

  if (!expanded) {
    return (
      <Button
        variant="ghost"
        isIconOnly
        aria-label={scope.label}
        className={[
          "relative shrink-0 rounded-full border border-border bg-surface text-muted hover:text-foreground",
          touchTarget,
        ].join(" ")}
        onPress={() => {
          pendingFocusRef.current = true;
          onExpandedChange(true);
        }}
      >
        <Magnifier width={16} height={16} aria-hidden />
      </Button>
    );
  }

  return (
    <div
      className="min-w-0 flex-1 sm:flex-none"
      // Collapse back to the icon when focus leaves an empty field. Focus
      // moving within it (the clear button) does not count.
      onBlur={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        if (!searchStore.getState().query) onExpandedChange(false);
      }}
    >
      <SearchBox
        label={scope.label}
        placeholder={scope.placeholder}
        value={query}
        onChange={setGlobalSearchQuery}
        isSearching={query !== appliedQuery}
        inputRef={inputRef}
        // Fills the row on a phone (the switcher is hidden); a fixed width on
        // a desktop, beside the switcher.
        className="w-full sm:w-72"
      />
    </div>
  );
}
