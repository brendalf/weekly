"use client";

import { useId } from "react";
import type { ReactNode } from "react";

/**
 * One labelled fact in a `DetailPanel` body — "Repeats: 3× per week".
 *
 * A definition list, not a stack of divs: the panels are read-only facts about
 * one item, which is exactly what `<dl>` describes, and it gives screen readers
 * the label/value pairing for free.
 */
export function DetailField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-subtle">{label}</dt>
      <dd className="text-sm text-foreground">{children}</dd>
    </div>
  );
}

/** The `<dl>` wrapper `DetailField`s belong in. */
export function DetailFields({ children }: { children: ReactNode }) {
  return <dl className="flex flex-col gap-3">{children}</dl>;
}

/**
 * The editable twin of {@link DetailField} — one labelled control in an edit
 * form, with the label styled identically so switching a detail surface into
 * edit mode does not re-letter the page.
 *
 * It is a labelled **group**, not a `<label>`: most controls here are composed
 * of several elements (a number input beside a period select, seven weekday
 * toggles, a date field plus a calendar trigger), and a wrapping `<label>`
 * would silently rename the first of them. The group carries the name for
 * assistive tech; a single-control field also passes `aria-label` to the
 * control itself.
 */
export function FormField({
  label,
  hint,
  children,
}: {
  label: string;
  /** One short line under the label. For a constraint, not a restatement. */
  hint?: string;
  children: ReactNode;
}) {
  const labelId = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <span id={labelId} className="text-xs text-subtle">
        {label}
      </span>
      <div role="group" aria-labelledby={labelId}>
        {children}
      </div>
      {hint && <p className="text-xs text-subtle">{hint}</p>}
    </div>
  );
}

/** The stack `FormField`s belong in. Matches `DetailFields`' rhythm. */
export function FormFields({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-4">{children}</div>;
}
