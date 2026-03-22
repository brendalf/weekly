export type ThemePreference = 'dark' | 'light';

export type LayoutPreference = 'period-tabs' | 'period-sequential';

export interface UserPreferences {
  theme: ThemePreference;
  layout: LayoutPreference;
  lastNotificationReadAt: string | null;
}
