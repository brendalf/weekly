"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TAB_BAR_ITEMS, isActiveRoute } from "./navItems";
import { focusRing } from "../ui/styles";

/**
 * The below-`lg:` section nav (DIRECTION §3) — five thumb-reachable tabs.
 *
 * Mobile is a first-class client (DIRECTION §2.6): each tab is a full-height
 * 56px column, the bar clears the iOS home indicator with
 * `env(safe-area-inset-bottom)`, and `<main>` carries matching bottom padding
 * so the bar never covers the last row of a list.
 *
 * Settings is not a tab; it lives in the account menu, which is in the header
 * on every viewport.
 */
export function AppTabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Sections"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <ul className="flex">
        {TAB_BAR_ITEMS.map(({ href, label, Icon }) => {
          const active = isActiveRoute(pathname, href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={[
                  "relative flex min-h-14 flex-col items-center justify-center gap-1 transition-colors",
                  active
                    ? "text-brand-muted"
                    : "text-subtle hover:text-foreground",
                  focusRing,
                ].join(" ")}
              >
                {active && (
                  <span
                    aria-hidden
                    className="absolute top-0 h-0.5 w-8 rounded-b-full bg-brand"
                  />
                )}
                <Icon width={20} height={20} />
                <span className="text-xs">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
