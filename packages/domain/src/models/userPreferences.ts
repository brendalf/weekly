export type ThemePreference = 'dark' | 'light';

export type LayoutPreference = 'tabs' | 'side-by-side' | 'sequential' | 'period-tabs' | 'period-sequential';

export interface UserPreferences {
  theme: ThemePreference;
  layout: LayoutPreference;
}
