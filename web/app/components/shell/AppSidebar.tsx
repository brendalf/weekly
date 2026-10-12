"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  NAV_GROUP_BREAK_AFTER,
  NAV_ITEMS,
  isActiveRoute,
} from "./navItems";
import { focusRing } from "../ui/styles";

/**
 * The `lg:`-and-up section nav (DIRECTION §3). Below `lg:` the same routes are
 * reachable from `AppTabBar`.
 *
 * Active state is a brand tick on the panel edge plus a filled row. The tick is
 * the shell's one "you are here" mark and `AppTabBar` repeats it on the tab's
 * top edge, so the signal reads the same on both viewports.
 */
export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-6 border-r border-border bg-surface px-3 py-5 lg:flex">
      <Link
        href="/app/week"
        className={`mx-1 flex w-fit items-center gap-2 rounded-lg ${focusRing}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/weekly.png" alt="" width={20} height={20} className="rounded" />
        <span className="text-base font-semibold tracking-tight text-foreground">
          Weekly
        </span>
      </Link>

      <nav aria-label="Sections" className="flex flex-1 flex-col gap-0.5">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = isActiveRoute(pathname, href);
          return (
            <div
              key={href}
              className={[
                // Settings sits apart at the bottom; the hairline marks the
                // break between the week surfaces and the object surfaces.
                href === "/app/settings" ? "mt-auto" : "",
                href === NAV_GROUP_BREAK_AFTER
                  ? "mb-2 border-b border-border pb-2"
                  : "",
              ].join(" ")}
            >
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={[
                  "relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
                  active
                    ? "bg-fill-strong font-medium text-foreground"
                    : "text-muted hover:bg-fill hover:text-foreground",
                  focusRing,
                ].join(" ")}
              >
                {active && (
                  <span
                    aria-hidden
                    className="absolute top-1/2 -left-3 h-6 w-0.5 -translate-y-1/2 rounded-r-full bg-brand"
                  />
                )}
                <Icon width={16} height={16} className="shrink-0" />
                {label}
              </Link>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
