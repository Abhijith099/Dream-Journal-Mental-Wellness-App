import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { BACKEND_URL, authenticatedFetch } from './api';

const LAST_SECTION_KEY = 'lucid_last_nav_section';
const NAV_STATE_KEY = 'lucid_nav_state_data';

export type NavSection = 'home' | 'dream_logs' | 'insights' | 'wellness' | 'sanctuary';

export interface NavigationState {
  current_section: NavSection;
  last_visited_section: string;
  section_entry_time: string;
  section_exit_time?: string | null;
  navigation_history?: Array<{
    section: string;
    entered_at: string;
    exited_at?: string;
  }>;
  badges?: {
    sanctuary: boolean;
    emergency: boolean;
  };
}

/**
 * Persistently save current navigation section to local storage
 */
export async function saveLastVisitedSection(section: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(LAST_SECTION_KEY, section);
    } else {
      await SecureStore.setItemAsync(LAST_SECTION_KEY, section);
    }
  } catch (err) {
    console.warn('Failed to save last visited section locally:', err);
  }
}

/**
 * Retrieve last visited section from local storage
 */
export async function getLastVisitedSection(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return localStorage.getItem(LAST_SECTION_KEY);
    } else {
      return await SecureStore.getItemAsync(LAST_SECTION_KEY);
    }
  } catch (err) {
    return null;
  }
}

/**
 * Track section transitions and sync with backend
 */
export async function trackNavigationTransition(
  section: string,
  action: 'enter' | 'exit' = 'enter'
): Promise<void> {
  const timestamp = new Date().toISOString();

  // 1. Save locally
  if (action === 'enter') {
    saveLastVisitedSection(section);
  }

  // 2. Track with backend (fail-safe, non-blocking)
  try {
    authenticatedFetch(`${BACKEND_URL}/user/navigation/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        section,
        action,
        timestamp,
      }),
    }).catch(() => {
      // Quiet fail-safe: offline or transient network issue
    });
  } catch (err) {
    // Non-blocking
  }
}
