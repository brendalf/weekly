import type { ThemePreference, LayoutPreference } from '../models/userPreferences';
import type { Unsubscribe } from './types';

export interface UserPreferencesRepository {
  subscribeUserPreferences(
    userId: string,
    onPreferences: (prefs: { theme: ThemePreference; layout: LayoutPreference }) => void
  ): Unsubscribe;
  updateTheme(userId: string, theme: ThemePreference): Promise<void>;
  updateLayout(userId: string, layout: LayoutPreference): Promise<void>;
}
