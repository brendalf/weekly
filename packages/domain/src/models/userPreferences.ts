export type ThemePreference = 'dark' | 'light';

export type LayoutPreference = 'period-tabs' | 'period-sequential';

export type InnerLayoutPreference = 'sequential' | 'side-by-side';

export interface UserPreferences {
  theme: ThemePreference;
  layout: LayoutPreference;
  innerLayout: InnerLayoutPreference;
  showCompletedTasks: boolean;
  showSkippedHabits: boolean;
  lastNotificationReadAt: string | null;
}
