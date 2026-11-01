import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export async function getSecureItem(key: string): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      const direct = localStorage.getItem(key);
      if (direct) return direct;
      if (key === 'authToken') return localStorage.getItem('auth_token');
      if (key === 'auth_token') return localStorage.getItem('authToken');
      return null;
    }
    const val = await SecureStore.getItemAsync(key);
    if (val) return val;
    if (key === 'authToken') return await SecureStore.getItemAsync('auth_token');
    if (key === 'auth_token') return await SecureStore.getItemAsync('authToken');
    return null;
  } catch {
    return null;
  }
}

export async function setSecureItem(key: string, value: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  } catch (err) {
    console.error(`Failed to set secure item ${key}:`, err);
  }
}

export async function deleteSecureItem(key: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  } catch (err) {
    console.error(`Failed to delete secure item ${key}:`, err);
  }
}
