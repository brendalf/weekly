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
