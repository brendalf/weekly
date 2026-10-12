"use client";

import { useEffect, useRef } from "react";

/**
 * The keyboard layer (PLAN WS12 / DIRECTION §7). Nothing existed before this.
 *
 * One `keydown` listener on `window`, fed a declarative list of bindings. The
 * list is also the source of the `?` cheatsheet, so a shortcut cannot exist
 * without being documented — they drift apart the moment they are two lists.
 *
 * Three guards, in this order, decide whether a binding may fire:
 *
 * 1. **Modifiers.** Anything with ⌘/Ctrl/Alt belongs to the browser or the OS.
 * 2. **Text entry.** A shortcut must never fire while the user is typing —
 *    `n` in a task title is an `n`, not "new task".
 * 3. **Overlays.** While a dialog, menu, or listbox has focus the app's global
 *    keys stand down so React Aria's own handling (focus trap, typeahead,
 *    `Esc`) is the only thing listening.
 *
 * Each guard has an opt-out so the few bindings that legitimately need to
 * cross it (`Esc`, `?`) can.
 */

export interface Shortcut {
  /**
   * Keys that trigger this binding, matched against `KeyboardEvent.key`.
   * Letters are matched case-insensitively; `"?"`, `"/"`, `"Escape"`,
   * `"ArrowLeft"`, `" "` are spelled as the browser reports them.
   */
  keys: string[];
  /** Cheatsheet group heading — "Navigate", "Create", "Rows", "This row". */
  group: string;
  /** What the shortcut does, in the cheatsheet. Keep it a verb phrase. */
  label: string;
  /** How the keys read in the cheatsheet. Defaults to `keys`. */
  display?: string[];
  /**
   * Fired on match, after the guards pass. Return `false` to say "I could not
   * act on this" — the key is then left to the browser, which is what `/`
   * does on a route with no filter.
   */
  run: (event: KeyboardEvent) => void | boolean;
  /** Fire even while an input, textarea, or contenteditable has focus. */
  allowInTextEntry?: boolean;
  /** Fire even while a dialog, menu, or listbox has focus. */
  allowInOverlay?: boolean;
  /** Skip this binding entirely while false. @default true */
  enabled?: boolean;
  /** Leave the browser's own handling alone instead of `preventDefault()`. */
  passive?: boolean;
}

/** `true` when the event target is somewhere the user types prose. */
export function isTextEntryTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (tag === "INPUT") {
    const type = (target as HTMLInputElement).type;
    // Checkboxes, radios and buttons are pressed, not typed into.
    return !["checkbox", "radio", "button", "submit", "reset"].includes(type);
  }
  return Boolean(target.closest('[contenteditable="true"], [role="textbox"]'));
}

/** `true` when focus sits inside a dialog, menu, or listbox. */
export function isOverlayTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest('[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]'),
  );
}

function matches(shortcut: Shortcut, event: KeyboardEvent): boolean {
  return shortcut.keys.some((key) =>
    key.length === 1 && /[a-z]/i.test(key)
      ? event.key.toLowerCase() === key.toLowerCase()
      : event.key === key,
  );
}

/**
 * Binds `shortcuts` for as long as the component is mounted.
 *
 * The list is read through a ref, so passing a freshly built array on every
 * render costs nothing and the handlers always close over current state — no
 * `useCallback` discipline required at the call site.
 */
export function useKeyboardShortcuts(
  shortcuts: Shortcut[],
  options?: { enabled?: boolean },
) {
  const enabled = options?.enabled ?? true;
  const ref = useRef(shortcuts);

  // Written in an effect, not during render: the listener below is the only
  // reader and it cannot run before React has committed and flushed effects.
  useEffect(() => {
    ref.current = shortcuts;
  });

  useEffect(() => {
    if (!enabled) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.isComposing) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const inTextEntry = isTextEntryTarget(event.target);
      const inOverlay = isOverlayTarget(event.target);

      for (const shortcut of ref.current) {
        if (shortcut.enabled === false) continue;
        if (inTextEntry && !shortcut.allowInTextEntry) continue;
        if (inOverlay && !shortcut.allowInOverlay) continue;
        if (!matches(shortcut, event)) continue;

        const handled = shortcut.run(event);
        if (!shortcut.passive && handled !== false) event.preventDefault();
        return;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}

/** The cheatsheet's shape: bindings grouped in declaration order. */
export interface ShortcutGroup {
  group: string;
  entries: { keys: string[]; label: string }[];
}

/** Groups a binding list for the `?` overlay, preserving declaration order. */
export function groupShortcuts(shortcuts: Shortcut[]): ShortcutGroup[] {
  const groups: ShortcutGroup[] = [];
  for (const shortcut of shortcuts) {
    if (shortcut.enabled === false) continue;
    let bucket = groups.find((g) => g.group === shortcut.group);
    if (!bucket) {
      bucket = { group: shortcut.group, entries: [] };
      groups.push(bucket);
    }
    bucket.entries.push({
      keys: shortcut.display ?? shortcut.keys,
      label: shortcut.label,
    });
  }
  return groups;
}
