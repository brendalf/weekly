export type ThemePreference = 'dark' | 'light';

export type LayoutPreference = 'tabs' | 'side-by-side';

export interface UserPreferences {
  theme: ThemePreference;
  layout: LayoutPreference;
}
