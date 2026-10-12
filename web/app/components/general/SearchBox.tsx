"use client";

import type { Ref } from "react";
import { SearchField } from "@heroui/react";
import { Magnifier } from "@gravity-ui/icons";

interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  /** Dims the icon while a query is settling or filtering. */
  isSearching?: boolean;
  placeholder?: string;
  label: string;
  className?: string;
  /**
   * Handle on the underlying `<input>`, so the shell can focus it when `/` is
   * pressed (PLAN WS11). React Aria owns everything else about the field.
   */
  inputRef?: Ref<HTMLInputElement>;
}

/**
 * Thin wrapper over HeroUI's SearchField: magnifier, input, and a clear
 * button. Debouncing lives in `searchStore`; filtering in `useItemSearch`.
 *
 * This is the product's **only** filter input (DIRECTION §4). The hand-rolled
 * `<input>` in `NoteList` is gone, and there is one of these, in the shell
 * header, scoped to the active route.
 *
 * React Aria's `SearchField` already clears on `Esc` and exposes the clear
 * button to assistive tech, which is most of why the HeroUI wrapper survived
 * and the raw input did not.
 */
export function SearchBox({
  value,
  onChange,
  isSearching = false,
  placeholder = "Search…",
  label,
  className,
  inputRef,
}: SearchBoxProps) {
  return (
    <SearchField
      aria-label={label}
      value={value}
      onChange={onChange}
      className={className}
    >
      {/* 44px minimum touch target (DIRECTION §6.8) — HeroUI's own group is 40. */}
      <SearchField.Group className="min-h-11">
        <SearchField.SearchIcon
          className={isSearching ? "opacity-40" : undefined}
        >
          <Magnifier />
        </SearchField.SearchIcon>
        {/* HeroUI's input slot is `text-base sm:text-sm`; the scale is locked
            at `text-base` for every input (DIRECTION §6.3) and 14px makes iOS
            zoom on focus — on an iPad that is past the `sm:` breakpoint too. */}
        <SearchField.Input
          ref={inputRef}
          placeholder={placeholder}
          className="text-base sm:text-base"
        />
        <SearchField.ClearButton />
      </SearchField.Group>
    </SearchField>
  );
}
