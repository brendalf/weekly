"use client";

import { parseDate, type CalendarDate } from "@internationalized/date";
import { Calendar, DateField, DatePicker } from "@heroui/react";

/**
 * The app's one date control (DIRECTION §6.6).
 *
 * The task detail used a raw `<input type="date">` sitting two inches from a
 * HeroUI `Select` — same modal, two visual languages, and a native picker whose
 * appearance is whatever the OS feels like. This is HeroUI's `DatePicker`
 * composed once, so every caller gets the same typeable segments plus a
 * calendar popover.
 *
 * HeroUI ships `DatePicker` as unstyled parts (`Root` / `Trigger` /
 * `TriggerIndicator` / `Popover`) and leaves the input group and the calendar to
 * the caller, so "use HeroUI's DatePicker" means assembling five components.
 * Doing that in one place is the whole point of this file.
 *
 * Two of its defaults are overridden because they violate the design contract:
 * the input group is `h-9`/`text-sm`, which is both under the 44px touch
 * minimum and small enough to make iOS zoom on focus (§6.3, §6.8); and the
 * popover is capped at `max-w-(--trigger-width)`, which squashes a seven-column
 * calendar inside a narrow field.
 *
 * The value is a plain `YYYY-MM-DD` string rather than a `CalendarDate`:
 * that is what the callers persist, and it keeps `@internationalized/date` out
 * of their imports.
 */
export interface DatePickerFieldProps {
  /**
   * Accessible name for the field. The *visible* label is the caller's
   * `FormField`, so this is not rendered — it names the group for a screen
   * reader.
   */
  label: string;
  /** Selected date as `YYYY-MM-DD`, or `null` for none. */
  value: string | null;
  /** Called with `YYYY-MM-DD`, or `null` when the field is cleared. */
  onChange: (value: string | null) => void;
  /** Blocks typing and the calendar. */
  isDisabled?: boolean;
}

/** `parseDate` throws on anything that is not `YYYY-MM-DD`; a bad value reads as empty. */
function toCalendarDate(value: string | null): CalendarDate | null {
  if (!value) return null;
  try {
    return parseDate(value);
  } catch {
    return null;
  }
}

export function DatePickerField({
  label,
  value,
  onChange,
  isDisabled,
}: DatePickerFieldProps) {
  return (
    <DatePicker
      aria-label={label}
      className="w-full"
      isDisabled={isDisabled}
      value={toCalendarDate(value)}
      onChange={(next) => onChange(next ? next.toString() : null)}
    >
      {/* `DateField.Group` and friends are HeroUI's `DateInputGroup` parts,
          which the package only re-exports through `DateField`. */}
      <DateField.Group fullWidth className="h-11 text-base">
        <DateField.InputContainer>
          <DateField.Input>
            {(segment) => <DateField.Segment segment={segment} />}
          </DateField.Input>
        </DateField.InputContainer>
        <DateField.Suffix>
          <DatePicker.Trigger
            aria-label={`${label}: open calendar`}
            className="size-11 justify-center"
          >
            <DatePicker.TriggerIndicator />
          </DatePicker.Trigger>
        </DateField.Suffix>
      </DateField.Group>

      <DatePicker.Popover className="max-w-none">
        <Calendar>
          <Calendar.Header>
            <Calendar.NavButton slot="previous" />
            <Calendar.Heading />
            <Calendar.NavButton slot="next" />
          </Calendar.Header>
          <Calendar.Grid>
            <Calendar.GridHeader>
              {(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
            </Calendar.GridHeader>
            <Calendar.GridBody>
              {(date) => <Calendar.Cell date={date} />}
            </Calendar.GridBody>
          </Calendar.Grid>
        </Calendar>
      </DatePicker.Popover>
    </DatePicker>
  );
}
