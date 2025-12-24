"use client";

import { useSyncExternalStore } from "react";
import { addDays, getStartOfWeek, getWeekDays } from "@weekly/domain";

export interface CalendarState {
  weekStart: Date;
  selectedDayISO: string | null;
}

type Listener = () => void;

let state: CalendarState = (() => {
  const weekStart = getStartOfWeek(new Date());
  return {
    weekStart,
    selectedDayISO: null,
  };
})();

const listeners = new Set<Listener>();

function emitChange() {
  for (const l of listeners) l();
}

function setState(partial: Partial<CalendarState>) {
  state = { ...state, ...partial };
  emitChange();
}

export const calendarStore = {
  getState() {
    return state;
  },
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  setWeekStart(nextWeekStart: Date) {
    const normalized = getStartOfWeek(nextWeekStart);
    setState({ weekStart: normalized, selectedDayISO: null });
  },
  prevWeek() {
    calendarStore.setWeekStart(addDays(state.weekStart, -7));
  },
  nextWeek() {
    calendarStore.setWeekStart(addDays(state.weekStart, 7));
  },
  selectDay(date: Date) {
    setState({ selectedDayISO: date.toISOString() });
  },
  clearSelectedDay() {
    setState({ selectedDayISO: null });
  },
  getWeekDays() {
    return getWeekDays(state.weekStart);
  },
};

export function useCalendarStore<T>(selector: (s: CalendarState) => T): T {
  return useSyncExternalStore(calendarStore.subscribe, () => selector(state), () => selector(state));
}
