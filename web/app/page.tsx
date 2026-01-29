import { GoogleLoginCard } from "./components/auth/GoogleLoginCard";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-white via-white to-purple-50">
      <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 gap-10 px-6 py-12 md:grid-cols-2 md:items-center">
        <section>
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-white px-3 py-1 text-xs font-medium text-purple-700">
            <span className="h-2 w-2 rounded-full bg-purple-600" />
            Weekly — build consistency
          </div>

          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-gray-900 md:text-5xl">
            Habits, tasks, and weekly focus.
            <span className="block text-purple-700">All in one place.</span>
          </h1>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-gray-600">
            Weekly helps you plan your week, track habits per day/week/month, and keep tasks
            moving — without the clutter.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-semibold text-gray-900">Weekly view</p>
              <p className="mt-1 text-sm text-gray-600">
                Navigate weeks fast and see what matters today.
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-semibold text-gray-900">Habit progress</p>
              <p className="mt-1 text-sm text-gray-600">
                Track completion per day/week/month with clear progress.
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-semibold text-gray-900">Task clarity</p>
              <p className="mt-1 text-sm text-gray-600">
                Lightweight tasks that never get in the way.
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-semibold text-gray-900">Cross-platform ready</p>
              <p className="mt-1 text-sm text-gray-600">
                Same data layer across web, mobile, and admin.
              </p>
            </div>
          </div>

          <p className="mt-8 text-xs text-gray-500">
            Tip: after logging in, you’ll land in the app at <code>/app</code>.
          </p>
        </section>

        <section className="flex items-center justify-center md:justify-end">
          <GoogleLoginCard />
        </section>
      </div>
    </main>
  );
}
