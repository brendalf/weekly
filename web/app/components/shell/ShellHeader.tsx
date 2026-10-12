"use client";

import { Suspense, useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { WorkspaceSwitcher } from "../workspaces/WorkspaceSwitcher";
import { NotificationBell } from "../workspaces/NotificationBell";
import { SearchBox } from "../general/SearchBox";
import { AccountMenu } from "./AccountMenu";
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
 * Below that row, on the routes that have something to filter, sits the
 * product's **one** filter (PLAN WS11). A second row rather than a slot in the
 * first: at 375px the first row is already workspace switcher + bell + account,
 * and squeezing a 16px input between them would leave all four unusable.
 */
export function ShellHeader() {
  const pathname = usePathname();
  const scope = searchScopeForPath(pathname);

  // Leaving the filterable routes drops the query, so coming back to
  // `/app/notes` from `/app/settings` does not resurrect a filter whose field
  // was not on screen. (Moving *between* filterable routes is handled by the
  // `?q=` sync below, which the new route's URL answers for.)
  useEffect(() => {
    if (!scope) searchStore.clear();
  }, [scope]);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-2 px-4 py-2 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center">
          <WorkspaceSwitcher />
        </div>
        <NotificationBell />
        <AccountMenu />
      </div>

      {scope && (
        // `useSearchParams` reads a value the prerender cannot know, so it is
        // isolated behind its own boundary: the rest of the header prerenders,
        // and only this row waits. Next 16.0.8 happens to build without it
        // (all `/app` routes still come out static either way — checked), but
        // the boundary is what keeps that true if the shell ever renders on
        // the server for real. The fallback reserves the row's height so the
        // header does not jump.
        <Suspense fallback={<div className="h-14" aria-hidden />}>
          <GlobalFilter scope={scope} />
        </Suspense>
      )}
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
 */
function GlobalFilter({ scope }: { scope: SearchScope }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = useSearchStore((s) => s.query);
  const appliedQuery = useSearchStore((s) => s.appliedQuery);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastScopeRef = useRef(scope.href);

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

  // Register the field so anything can focus it by name. `/` is bound in
  // `components/keyboard/KeyboardShortcuts.tsx` (WS12), which calls
  // `focusGlobalSearch()` — one global key listener for the whole app, not one
  // per component that happens to want a key. `Esc` inside the field is React
  // Aria's own (it clears the value, and only propagates when already empty).
  useEffect(
    () =>
      searchStore.registerFocusHandler(() => {
        const input = inputRef.current;
        if (!input) return;
        input.focus();
        input.select();
      }),
    [],
  );

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-2 sm:px-6">
      <SearchBox
        label={scope.label}
        placeholder={scope.placeholder}
        value={query}
        onChange={setGlobalSearchQuery}
        isSearching={query !== appliedQuery}
        inputRef={inputRef}
        // Full width where width is scarce; capped on a desktop, where a
        // 900px-wide filter would read as a command bar rather than as the
        // control for the list beneath it.
        className="w-full sm:max-w-md"
      />
    </div>
  );
}
