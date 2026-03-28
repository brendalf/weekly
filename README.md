<p align="center">
  <img src="./app/icon.png" width="96" alt="Weekly logo" />
</p>

<h1 align="center">Weekly — Web App</h1>

<p align="center">A collaborative habit and task tracker built with Next.js, React, and Firebase.</p>

---

## Overview

<a href="https://weekly-web-psi.vercel.app">Weekly</a> helps individuals and teams track recurring habits and one-off tasks across three time horizons: **day**, **week**, and **month**. Each workspace is collaborative — members see each other's completions in real time via a notification feed.

Key capabilities:

- Recurring habits with customisable period, target count, active days, and time-of-day
- Habit streaks and skip functionality (skip today / this week / this month / until a date)
- Tasks scoped to a day, week, or month; incomplete past tasks stay visible until done
- Week-scoped collaborative notes shared across all workspace members
- Multiple workspaces with invite-by-email membership
- Real-time activity feed showing what team members have completed
- Dark / light theme toggle, period-tabs or overview layout preference

## Tech Stack

| Layer        | Technology                             |
| ------------ | -------------------------------------- |
| Framework    | Next.js 16 (App Router)                |
| UI library   | React 19                               |
| Components   | HeroUI v3 (beta) — built on React Aria |
| Icons        | Gravity UI Icons                       |
| Styling      | Tailwind CSS v4                        |
| Backend      | Firebase (Auth + Cloud Firestore)      |
| Domain logic | `@weekly/domain`                       |
| Data access  | `@weekly/firebase`                     |
