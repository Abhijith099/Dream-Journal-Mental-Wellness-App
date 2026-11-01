import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const sanitizeUrl = (url: string) => {
  return url.replace(/[\[\]]/g, '').trim().replace(/\/+$/, '');
};

const getBaseServerUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    const cleaned = sanitizeUrl(process.env.EXPO_PUBLIC_API_URL);
    const withoutApi = cleaned.replace(/\/api$/, '');
    if (/^https?:\/\/\d+\.\d+\.\d+\.\d+$/.test(withoutApi)) {
      return `${withoutApi}:5000`;
    }
    return withoutApi;
  }
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest?.debuggerHost ||
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    return `http://${ip}:5000`;
  }
  return Platform.OS === 'android' ? 'http://127.0.0.1:5000' : 'http://localhost:5000';
};

export const BASE_SERVER_URL = getBaseServerUrl();
export const BACKEND_URL = `${BASE_SERVER_URL}/api`;

const getSecureToken = async () => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('auth_token');
  }
  return await SecureStore.getItemAsync('auth_token');
};

// Cache the last verified working host so subsequent requests don't repeatedly timeout and fallback
let activeWorkingHost: string | null = null;

/**
 * Robust fetch wrapper that handles network timeouts and automatic fallback
 * across configured BASE_SERVER_URL, adb reverse loopback (127.0.0.1:5000), and emulator/LAN host.
 */
export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  const fetchWithTimeout = async (targetUrl: string, timeoutMs = 6000) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(targetUrl, {
        ...options,
        headers,
        signal: options.signal || controller.signal,
      });
      return res;
    } finally {
      clearTimeout(timer);
    }
  };

  // If we already discovered a working host, rewrite URL immediately to avoid slow timeouts
  let primaryUrl = url;
  if (activeWorkingHost && !primaryUrl.includes(activeWorkingHost)) {
    primaryUrl = primaryUrl.replace(/^https?:\/\/[^\/]+/, `http://${activeWorkingHost}`);
  }

  try {
    const initialTimeout = (Platform.OS === 'android' && primaryUrl.includes('127.0.0.1') && !activeWorkingHost) ? 2500 : 6000;
    const res = await fetchWithTimeout(primaryUrl, initialTimeout);
    // Remember working host
    const matched = primaryUrl.match(/^https?:\/\/([^\/]+)/);
    if (matched && !activeWorkingHost) {
      activeWorkingHost = matched[1];
    }
    return res;
  } catch (err: any) {
    if (Platform.OS === 'android') {
      const baseClean = BASE_SERVER_URL.replace(/^https?:\/\//, '');
      const hostUri =
        Constants.expoConfig?.hostUri ||
        (Constants as any).manifest?.debuggerHost ||
        (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;
      const hostIp = hostUri ? hostUri.split(':')[0] : null;

      const potentialHosts = Array.from(new Set([
        hostIp ? `${hostIp}:5000` : null,
        '10.211.154.6:5000',
        baseClean,
        '127.0.0.1:5000',
        '10.0.2.2:5000',
      ])).filter(Boolean) as string[];

      const candidates: string[] = [];
      for (const host of potentialHosts) {
        if (!primaryUrl.includes(host)) {
          const candidate = primaryUrl.replace(/^https?:\/\/[^\/]+/, `http://${host}`);
          if (!candidates.includes(candidate)) {
            candidates.push(candidate);
          }
        }
      }

      for (const candidate of candidates) {
        try {
          console.log(`[apiFetch] Fallback request to: ${candidate}`);
          const res = await fetchWithTimeout(candidate, 3500);
          if (res) {
            const match = candidate.match(/^https?:\/\/([^\/]+)/);
            if (match) {
              activeWorkingHost = match[1];
            }
            return res;
          }
        } catch {
          // Keep trying candidate endpoints
        }
      }
    }
    throw err;
  }
}

export async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await getSecureToken();
  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return await apiFetch(url, { ...options, headers });
}
