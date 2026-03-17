export type ThemePreference = 'dark' | 'light';

export type LayoutPreference = 'tabs' | 'side-by-side' | 'sequential';

export interface UserPreferences {
  theme: ThemePreference;
  layout: LayoutPreference;
}
