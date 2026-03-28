import type { ThemePreference, LayoutPreference, InnerLayoutPreference } from '../models/userPreferences';
import type { Unsubscribe } from './types';

export interface UserPreferencesRepository {
  subscribeUserPreferences(
    userId: string,
    onPreferences: (prefs: {
      theme: ThemePreference;
      layout: LayoutPreference;
      innerLayout: InnerLayoutPreference;
      showCompletedTasks: boolean;
      showSkippedHabits: boolean;
      lastNotificationReadAt: string | null;
    }) => void
  ): Unsubscribe;
  updateTheme(userId: string, theme: ThemePreference): Promise<void>;
  updateLayout(userId: string, layout: LayoutPreference): Promise<void>;
  updateInnerLayout(userId: string, innerLayout: InnerLayoutPreference): Promise<void>;
  updateShowCompletedTasks(userId: string, show: boolean): Promise<void>;
  updateShowSkippedHabits(userId: string, show: boolean): Promise<void>;
  updateLastNotificationReadAt(userId: string, ts: string): Promise<void>;
}
