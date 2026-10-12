import { redirect } from "next/navigation";

/**
 * `/app` has no content of its own: the week is the hero view (DIRECTION §1),
 * so the shell's index is the week planner.
 *
 * A server-side redirect, so there is no flash of an empty shell and no client
 * round trip. The `proxy.ts` auth gate already sends signed-in visitors from
 * `/` to `/app`.
 */
export default function AppIndexPage() {
  redirect("/app/week");
}
