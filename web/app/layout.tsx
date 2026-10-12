import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "sonner";
import "./globals.css";
import { AppProviders } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Weekly",
  description: "Habits, tasks, and weekly focus. All in one place.",
};

/**
 * Applies the stored theme before first paint so a light-preference user never
 * sees a flash of dark (DIRECTION §6.9). Runs synchronously in <head>.
 *
 * With nothing stored it leaves the server-rendered dark theme alone, which is
 * also the account default (`repositories.ts` coerces anything but "light" to
 * "dark"), so a first visit never flips. `providers.tsx` mirrors the persisted
 * preference into storage, so every later load paints it directly.
 *
 * The key is inlined rather than imported: `providers.tsx` is a `"use client"`
 * module, so on the server its exports are client references, not values. It
 * must stay in sync with `THEME_STORAGE_KEY` there.
 */
const themeScript = `(function(){try{var t=localStorage.getItem("weekly.theme");if(t!=="light"&&t!=="dark")return;var e=document.documentElement;e.classList.remove("light","dark");e.classList.add(t);e.setAttribute("data-theme",t);}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased bg-background text-foreground`}
      >
        <AppProviders>{children}</AppProviders>
        <Toaster richColors position="bottom-right" />
        <Analytics />
      </body>
    </html>
  );
}
