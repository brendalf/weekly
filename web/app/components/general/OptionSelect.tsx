"use client";

import { ListBox, Select } from "@heroui/react";

/**
 * A single-choice dropdown, composed once (DIRECTION §6.6).
 *
 * HeroUI's `Select` is five nested parts — trigger, value, indicator, popover,
 * list box — and spelling them out at each call site is how the task detail
 * ended up with a raw `<select>` instead. This is that composition with a
 * values-in/value-out API, plus the 44px trigger HeroUI's `min-h-9` default
 * misses (DIRECTION §6.8).
 *
 * The label is a caller concern: these live inside a `FormField`, which owns the
 * visible label, so only the accessible name is passed in.
 */
export interface OptionSelectOption {
  /** Stored value. */
  id: string;
  /** What the user reads. */
  label: string;
}

export interface OptionSelectProps {
  /** Accessible name, since the visible label belongs to the surrounding field. */
  ariaLabel: string;
  value: string;
  onChange: (id: string) => void;
  options: OptionSelectOption[];
  /** Shown when `value` matches no option. */
  placeholder?: string;
  isDisabled?: boolean;
}

export function OptionSelect({
  ariaLabel,
  value,
  onChange,
  options,
  placeholder = "Select",
  isDisabled,
}: OptionSelectProps) {
  return (
    <Select
      fullWidth
      aria-label={ariaLabel}
      placeholder={placeholder}
      variant="secondary"
      value={value}
      isDisabled={isDisabled}
      onChange={(next) => onChange(next as string)}
    >
      <Select.Trigger className="min-h-11">
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {options.map((option) => (
            <ListBox.Item
              key={option.id}
              id={option.id}
              textValue={option.label}
            >
              {option.label}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
