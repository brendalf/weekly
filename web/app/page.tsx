"use client";

import { GoogleLoginCard } from "./components/auth/GoogleLoginCard";

const features = [
  {
    title: "Weekly view",
    desc: "Navigate weeks fast and see what matters today.",
  },
  {
    title: "Habit streaks",
    desc: "Track daily, weekly, and monthly habits with clear progress.",
  },
  {
    title: "Task clarity",
    desc: "Lightweight tasks that stay out of your way.",
  },
  {
    title: "Shared projects",
    desc: "Collaborate on habits and tasks with your team.",
  },
];

export default function Home() {
  return (
    <main className="relative min-h-screen bg-background overflow-hidden">
      <div
        className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full opacity-30 blur-3xl"
        style={{
          background:
            "radial-gradient(ellipse, oklch(0.627 0.265 303.9 / 0.4) 0%, transparent 70%)",
        }}
      />

      {/* Mobile top bar */}
      <div className="relative flex items-center justify-between px-6 pt-6 md:hidden">
        <div className="inline-flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/weekly.png"
            alt="Weekly"
            width={20}
            height={20}
            className="rounded"
          />
          <span className="text-sm font-semibold text-foreground">Weekly</span>
        </div>
        <GoogleLoginCard compact />
      </div>

      <div className="relative mx-auto grid min-h-screen max-w-6xl grid-cols-1 gap-10 px-6 py-8 md:py-12 md:grid-cols-2 md:items-center">
        <section>
          <div className="hidden md:inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/weekly.png"
              alt="Weekly"
              width={20}
              height={20}
              className="rounded"
            />
            <span className="text-sm font-semibold text-foreground">
              Weekly
            </span>
          </div>

          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
            Habits, tasks,
            <span className="block text-primary">and weekly focus.</span>
          </h1>

          <p className="mt-5 max-w-md text-base leading-relaxed text-foreground/60">
            Plan your week, build streaks, and keep tasks moving — all in one
            clean interface.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {features.map(({ title, desc }) => (
              <div
                key={title}
                className="flex items-start gap-3 rounded-xl border border-foreground/8 bg-surface p-4"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {title}
                  </p>
                  <p className="mt-0.5 text-xs text-foreground/50">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="hidden md:flex items-center justify-end">
          <GoogleLoginCard />
        </section>
      </div>
    </main>
  );
}
