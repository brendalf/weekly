"use client";

import { WorkspaceSwitcher } from "../workspaces/WorkspaceSwitcher";
import { NotificationBell } from "../workspaces/NotificationBell";
import { AccountMenu } from "./AccountMenu";

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
 */
export function ShellHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-2 px-4 py-2 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center">
          <WorkspaceSwitcher />
        </div>
        <NotificationBell />
        <AccountMenu />
      </div>
    </header>
  );
}
