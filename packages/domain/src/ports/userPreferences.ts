import type { ThemePreference } from '../models/userPreferences';
import type { Unsubscribe } from './types';

export interface UserPreferencesRepository {
  subscribeUserPreferences(
    userId: string,
    onPreferences: (prefs: { theme: ThemePreference }) => void
  ): Unsubscribe;
  updateTheme(userId: string, theme: ThemePreference): Promise<void>;
}
