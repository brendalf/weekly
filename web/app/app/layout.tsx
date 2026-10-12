"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { SkeletonList } from "../components/ui";
import {
  AppDataProvider,
  useAppData,
} from "../components/shell/AppDataProvider";
import { AppSidebar } from "../components/shell/AppSidebar";
import { AppTabBar } from "../components/shell/AppTabBar";
import { ShellHeader } from "../components/shell/ShellHeader";
import { activeNavItem } from "../components/shell/navItems";

/**
 * The authenticated app shell (PLAN WS3) — nav, header, and every
 * subscription, mounted once for all of `/app`.
 *
 * Three things live here on purpose:
 *
 * 1. **`AppDataProvider`** owns auth, workspaces, invites, activities,
 *    preferences, habits, tasks, and notes. Routes read them with
 *    `useAppData()` and never subscribe themselves, so navigation keeps the
 *    data (and `calendarStore`'s selected week, and the workspace selection)
 *    exactly as it was.
 * 2. **The nav** — `AppSidebar` at `lg:`+, `AppTabBar` below it.
 * 3. **The page title.** The shell renders the `<h1>` from the active nav item,
 *    so every section is titled the same way and the title always matches the
 *    nav. *Route pages must not render a second `<h1>`.*
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AppDataProvider>
      <AppShell>{children}</AppShell>
    </AppDataProvider>
  );
}

function AppShell({ children }: { children: ReactNode }) {
  const { authReady, userId, workspacesLoaded } = useAppData();
  const pathname = usePathname();
  const section = activeNavItem(pathname);

  // Auth has not answered yet. Skeleton rows, not the bare `Loading…` string
  // the page used to show (DIRECTION §7).
  if (!authReady) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background px-6">
        <SkeletonList
          count={3}
          label="Opening Weekly"
          className="w-full max-w-md"
        />
      </main>
    );
  }

  // Signed out: `AppDataProvider` is already navigating to the landing page.
  if (!userId) return null;

  return (
    <div className="flex min-h-dvh bg-background">
      <AppSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <ShellHeader />

        {/* `pb-28` clears the fixed tab bar below `lg:`. */}
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-5 pb-28 sm:px-6 lg:pb-12">
          {section && (
            <h1 className="mb-4 text-2xl font-semibold tracking-tight text-foreground">
              {section.label}
            </h1>
          )}

          {workspacesLoaded ? (
            children
          ) : (
            <SkeletonList count={5} label="Loading your workspaces" />
          )}
        </main>
      </div>

      <AppTabBar />
    </div>
  );
}
