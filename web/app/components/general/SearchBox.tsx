"use client";

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
}

/**
 * Thin wrapper over HeroUI's SearchField: magnifier, input, and a clear
 * button. Debouncing lives in the consuming hook.
 */
export function SearchBox({
  value,
  onChange,
  isSearching = false,
  placeholder = "Search…",
  label,
  className,
}: SearchBoxProps) {
  return (
    <SearchField
      aria-label={label}
      value={value}
      onChange={onChange}
      className={className}
    >
      <SearchField.Group>
        <SearchField.SearchIcon
          className={isSearching ? "opacity-40" : undefined}
        >
          <Magnifier />
        </SearchField.SearchIcon>
        <SearchField.Input placeholder={placeholder} />
        <SearchField.ClearButton />
      </SearchField.Group>
    </SearchField>
  );
}
