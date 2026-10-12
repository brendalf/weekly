/**
 * Shared UI primitives (PLAN WS2). One menu, one detail surface, one collapse,
 * one empty state, one skeleton, one confirm.
 *
 * Built on the WS1 token layer in `globals.css` — these components introduce no
 * colors and no type sizes of their own. Import from the barrel:
 *
 * ```ts
 * import { ActionMenu, DetailPanel } from "../ui";
 * ```
 */

export { ActionMenu } from "./ActionMenu";
export type {
  ActionMenuProps,
  ActionMenuEntry,
  ActionMenuItem,
  ActionMenuSection,
  ActionMenuSeparator,
  ActionMenuPlacement,
} from "./ActionMenu";

export { ActionPopover } from "./ActionPopover";
export type { ActionPopoverProps } from "./ActionPopover";

export { Collapsible, SectionHeader } from "./Collapsible";
export type { CollapsibleProps, SectionHeaderProps } from "./Collapsible";

export { ConfirmButton } from "./ConfirmButton";
export type { ConfirmButtonProps } from "./ConfirmButton";

export { DetailPanel } from "./DetailPanel";
export type { DetailPanelProps } from "./DetailPanel";

export { EmptyState } from "./EmptyState";
export type { EmptyStateProps } from "./EmptyState";

export { Skeleton, SkeletonCard, SkeletonList, SkeletonRow } from "./Skeleton";
export type {
  SkeletonProps,
  SkeletonCardProps,
  SkeletonListProps,
  SkeletonRowProps,
} from "./Skeleton";

export { focusRing, touchRow, touchRowCoarse, touchTarget } from "./styles";
