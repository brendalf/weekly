import type { ComponentType } from "react";
import {
  ArrowsRotateRight,
  Calendar,
  FileText,
  Gear,
  ListCheck,
  SealCheck,
} from "@gravity-ui/icons";

/** The icon shape `@gravity-ui/icons` exports. */
type NavIcon = ComponentType<{
  width?: number;
  height?: number;
  className?: string;
}>;

export interface NavItem {
  /** Route the item points at. Also its identity. */
  href: string;
  /** Nav label and the page's `<h1>`. Sentence case, one word where possible. */
  label: string;
  Icon: NavIcon;
  /** Whether the item appears in the mobile tab bar (five slots). */
  inTabBar: boolean;
}

/**
 * The product's six surfaces, in the order the sidebar shows them
 * (DIRECTION §3).
 *
 * The order encodes the product's own shape rather than alphabet or frequency:
 * the two **time** surfaces first — the week you are committing to, then the
 * week you are closing — and after them the three **object** surfaces that back
 * them (habit, task, note: DIRECTION §1). The sidebar draws one hairline
 * between those two groups and leaves them unlabeled; the split is legible from
 * the icons, and a label above five rows would be chrome.
 */
export const NAV_ITEMS: NavItem[] = [
  { href: "/app/week", label: "Week", Icon: Calendar, inTabBar: true },
  { href: "/app/review", label: "Review", Icon: SealCheck, inTabBar: true },
  {
    href: "/app/habits",
    label: "Habits",
    Icon: ArrowsRotateRight,
    inTabBar: true,
  },
  { href: "/app/tasks", label: "Tasks", Icon: ListCheck, inTabBar: true },
  { href: "/app/notes", label: "Notes", Icon: FileText, inTabBar: true },
  // Settings is reachable from the account menu on every viewport, so it does
  // not spend one of the five thumb-reachable tab slots.
  { href: "/app/settings", label: "Settings", Icon: Gear, inTabBar: false },
];

/** Where the hairline falls in the sidebar: after the time surfaces. */
export const NAV_GROUP_BREAK_AFTER = "/app/review";

/** Tab-bar order: the week first, then the three object surfaces, then review. */
export const TAB_BAR_ITEMS: NavItem[] = [
  "/app/week",
  "/app/habits",
  "/app/tasks",
  "/app/notes",
  "/app/review",
].map((href) => NAV_ITEMS.find((item) => item.href === href)!);

/**
 * True when `pathname` is inside `href` — so `/app/habits/abc123` keeps the
 * Habits item active while its detail panel is open.
 */
export function isActiveRoute(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** The nav item owning `pathname`, or `null` outside the six surfaces. */
export function activeNavItem(pathname: string): NavItem | null {
  return NAV_ITEMS.find((item) => isActiveRoute(pathname, item.href)) ?? null;
}
