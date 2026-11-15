"use client";

import { useAnnouncement } from "../../hooks/useAnnounce";

/**
 * The app's single polite live region (PLAN WS14). Mounted once in the `/app`
 * shell; see `hooks/useAnnounce` for why there is exactly one of it and why
 * the text carries an invisible toggle.
 *
 * Renders nothing visible. `sr-only` rather than `hidden`/`display:none` —
 * a hidden live region is not announced at all.
 */
export function LiveRegion() {
  const { id, message } = useAnnouncement();

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
      // Styles rather than a class so this cannot be laid out, even if a
      // utility reset ever changes what `sr-only` means.
      style={{ position: "absolute", width: 1, height: 1, overflow: "hidden" }}
    >
      {message ? `${message}${id % 2 === 1 ? "​" : ""}` : ""}
    </div>
  );
}
