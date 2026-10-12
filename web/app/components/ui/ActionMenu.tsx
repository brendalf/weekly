"use client";

import type { ReactNode } from "react";
import { Dropdown, Header, Separator } from "@heroui/react";
import type { DropdownPopoverProps, Selection } from "@heroui/react";
import { Ellipsis } from "@gravity-ui/icons";
import { touchRow, touchTarget } from "./styles";

/**
 * The one menu primitive (DIRECTION §6.5).
 *
 * Wraps HeroUI's `Dropdown` (React Aria `MenuTrigger` + `Popover` + `Menu`), so
 * every menu gets a real focus trap, `Esc` to close, typeahead, collision
 * detection, and repositioning on scroll/resize for free. Replaces the five
 * hand-rolled dropdowns (`LayoutSettingsButton`, `UnifiedAddButton`,
 * `WorkspaceSwitcher`, `HabitActionMenu`, `NotificationBell`), none of which did
 * any of that.
 *
 * Menus are *lists of actions*. For a panel of arbitrary content (the
 * notification feed, with its own buttons per row) use `ActionPopover`.
 */

/** Popover placement relative to the trigger, e.g. `"bottom end"`, `"top start"`. */
export type ActionMenuPlacement = DropdownPopoverProps["placement"];

/** A single activatable row. */
export interface ActionMenuItem {
  /** Discriminator; omit (or pass `"item"`) for a normal row. */
  kind?: "item";
  /** Stable identity. Also the key reported through `onSelectionChange`. */
  key: string;
  /** Row label. Keep it a verb phrase — "Skip today", "Delete habit". */
  label: ReactNode;
  /** Leading icon, rendered at 16px in the muted color. */
  icon?: ReactNode;
  /** Second line under the label, for a hint or a date. */
  description?: ReactNode;
  /** Right-aligned trailing text — a count, a shortcut hint. */
  trailing?: ReactNode;
  /** Paints the row in the danger palette. Use for destructive actions only. */
  danger?: boolean;
  /** Greys the row out and blocks activation. */
  disabled?: boolean;
  /**
   * Nested submenu. When present the row opens the submenu on hover/`→` and
   * `onAction` is ignored — the habit skip flow uses this.
   */
  items?: ActionMenuEntry[];
  /** Fired when the row is activated by click, `Enter`, or `Space`. */
  onAction?: () => void;
  /**
   * Leave the menu open after activation. Use for toggles the user may flip
   * several times in a row (workspace multi-select).
   */
  keepOpen?: boolean;
  /** Typeahead text. Defaults to `label` when it is a plain string. */
  textValue?: string;
}

/** A labeled group of rows. */
export interface ActionMenuSection {
  kind: "section";
  /** Stable identity. */
  key: string;
  /** Group heading, rendered small and uppercase. */
  label: string;
  /** Rows in the group. */
  items: ActionMenuEntry[];
}

/** A hairline between groups of rows. */
export interface ActionMenuSeparator {
  kind: "separator";
  /** Stable identity. */
  key: string;
}

/** Anything that can appear in an `ActionMenu`. */
export type ActionMenuEntry =
  | ActionMenuItem
  | ActionMenuSection
  | ActionMenuSeparator;

export interface ActionMenuProps {
  /**
   * Accessible name for both the trigger and the menu. Required — the trigger
   * is usually an icon-only `⋯` (DIRECTION §6.7).
   */
  label: string;
  /** Rows, top to bottom. */
  items: ActionMenuEntry[];
  /** Trigger content. Defaults to the `⋯` glyph. */
  trigger?: ReactNode;
  /** Extra classes on the trigger button (sizing, color, alignment). */
  triggerClassName?: string;
  /** Extra classes on the popover — width overrides belong here. */
  popoverClassName?: string;
  /** Where the popover opens relative to the trigger. @default "bottom end" */
  placement?: ActionMenuPlacement;
  /** Controlled open state. Omit to let the menu manage itself. */
  isOpen?: boolean;
  /** Called when the menu opens or closes (trigger, `Esc`, outside click). */
  onOpenChange?: (open: boolean) => void;
  /** Disables the trigger. */
  isDisabled?: boolean;
  /**
   * Turns rows into checkable options with a real `aria-checked`. Pair with
   * `selectedKeys` + `onSelectionChange`.
   */
  selectionMode?: "single" | "multiple";
  /** Selected row keys. Only meaningful with `selectionMode`. */
  selectedKeys?: Selection;
  /** Called with the new selection. */
  onSelectionChange?: (keys: Selection) => void;
}

/** Row chrome: 44px tall so the menu is usable with a thumb (DIRECTION §6.8). */
const ITEM_CLASS = `${touchRow} text-sm text-foreground`;

function renderItem(item: ActionMenuItem, showIndicator: boolean): ReactNode {
  const content = (
    <>
      {showIndicator && <Dropdown.ItemIndicator />}
      {item.icon && (
        <span
          aria-hidden
          className="flex size-4 shrink-0 items-center justify-center text-muted"
        >
          {item.icon}
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col items-start">
        <span data-slot="label" className="max-w-full truncate">
          {item.label}
        </span>
        {item.description && (
          <span data-slot="description" className="text-xs text-subtle">
            {item.description}
          </span>
        )}
      </span>
      {item.trailing && (
        <span className="shrink-0 text-xs text-subtle">{item.trailing}</span>
      )}
      <Dropdown.SubmenuIndicator />
    </>
  );

  const shared = {
    id: item.key,
    className: ITEM_CLASS,
    isDisabled: item.disabled,
    textValue:
      item.textValue ?? (typeof item.label === "string" ? item.label : undefined),
    variant: item.danger ? ("danger" as const) : undefined,
  };

  // A submenu needs the trigger row and its popover wrapped together, which is
  // what React Aria's `SubmenuTrigger` does — it keeps the parent menu open and
  // wires `→`/`←` between levels.
  if (item.items && item.items.length > 0) {
    return (
      <Dropdown.SubmenuTrigger key={item.key}>
        <Dropdown.Item {...shared}>{content}</Dropdown.Item>
        <Dropdown.Popover>
          <Dropdown.Menu aria-label={shared.textValue ?? "Submenu"}>
            {item.items.map((entry) => renderEntry(entry, false))}
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown.SubmenuTrigger>
    );
  }

  return (
    <Dropdown.Item
      key={item.key}
      {...shared}
      shouldCloseOnSelect={item.keepOpen ? false : undefined}
      onAction={item.onAction}
    >
      {content}
    </Dropdown.Item>
  );
}

function renderEntry(entry: ActionMenuEntry, showIndicator: boolean): ReactNode {
  if (entry.kind === "separator") {
    return <Separator key={entry.key} className="my-1" />;
  }
  if (entry.kind === "section") {
    return (
      <Dropdown.Section key={entry.key}>
        <Header className="px-2.5 pt-2 pb-1 text-xs font-semibold tracking-wide text-subtle uppercase">
          {entry.label}
        </Header>
        {entry.items.map((child) => renderEntry(child, showIndicator))}
      </Dropdown.Section>
    );
  }
  return renderItem(entry, showIndicator);
}

export function ActionMenu({
  label,
  items,
  trigger,
  triggerClassName,
  popoverClassName,
  placement = "bottom end",
  isOpen,
  onOpenChange,
  isDisabled,
  selectionMode,
  selectedKeys,
  onSelectionChange,
}: ActionMenuProps) {
  const showIndicator = selectionMode !== undefined;

  return (
    <Dropdown.Root isOpen={isOpen} onOpenChange={onOpenChange}>
      <Dropdown.Trigger
        aria-label={label}
        isDisabled={isDisabled}
        // `.dropdown__trigger` already carries HeroUI's brand-colored
        // focus-visible ring; only the 44px target is missing.
        className={[
          "inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg text-subtle transition-colors hover:text-foreground",
          touchTarget,
          triggerClassName ?? "",
        ].join(" ")}
      >
        {trigger ?? <Ellipsis width={16} height={16} />}
      </Dropdown.Trigger>

      <Dropdown.Popover placement={placement} className={popoverClassName}>
        <Dropdown.Menu
          aria-label={label}
          selectionMode={selectionMode}
          selectedKeys={selectedKeys}
          onSelectionChange={onSelectionChange}
        >
          {items.map((entry) => renderEntry(entry, showIndicator))}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown.Root>
  );
}
