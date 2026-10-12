"use client";

import { useContext, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightFromSquare, Gear, Moon, Sun } from "@gravity-ui/icons";
import { ActionMenu } from "../ui";
import type { ActionMenuEntry } from "../ui";
import { ThemeContext } from "../../providers";
import { useAppData } from "./AppDataProvider";

/** "Breno Silva" → "BS"; "brenophp@gmail.com" → "B". */
function initialsOf(name: string | null, email: string | null): string {
  const source = name?.trim() || email?.trim() || "";
  if (!source) return "?";
  const words = source.split(/[\s@._-]+/).filter(Boolean);
  const letters = words.slice(0, 2).map((w) => w[0]);
  return letters.join("").toUpperCase() || "?";
}

/**
 * The account menu (PLAN WS3): identity, theme, settings, sign out.
 *
 * Log out used to be a red `variant="danger"` icon button sitting in the
 * header — the most alarming control in the product for an action that
 * destroys nothing (DIRECTION §6.7). It is a plain menu row here.
 */
export function AccountMenu() {
  const router = useRouter();
  const { user, userId, logout } = useAppData();
  const { theme, toggleTheme } = useContext(ThemeContext);

  const displayName = user?.displayName ?? "Signed in";
  const email = user?.email ?? "";
  const initials = initialsOf(user?.displayName ?? null, user?.email ?? null);

  const items = useMemo<ActionMenuEntry[]>(
    () => [
      {
        key: "identity",
        label: displayName,
        description: email,
        textValue: displayName,
        onAction: () => router.push("/app/settings"),
      },
      { kind: "separator", key: "after-identity" },
      {
        key: "theme",
        label: theme === "dark" ? "Switch to light theme" : "Switch to dark theme",
        icon: theme === "dark" ? <Sun width={16} height={16} /> : <Moon width={16} height={16} />,
        onAction: () => {
          if (userId) toggleTheme(userId);
        },
      },
      {
        key: "settings",
        label: "Settings",
        icon: <Gear width={16} height={16} />,
        onAction: () => router.push("/app/settings"),
      },
      { kind: "separator", key: "before-logout" },
      {
        key: "logout",
        label: "Log out",
        icon: <ArrowRightFromSquare width={16} height={16} />,
        onAction: () => {
          logout();
        },
      },
    ],
    [displayName, email, theme, userId, toggleTheme, router, logout],
  );

  return (
    <ActionMenu
      label={`Account menu for ${displayName}`}
      items={items}
      popoverClassName="min-w-56"
      trigger={
        <span
          aria-hidden
          className="flex size-8 items-center justify-center rounded-full border border-brand-border bg-brand-soft text-xs font-semibold text-brand-muted"
        >
          {initials}
        </span>
      }
    />
  );
}
