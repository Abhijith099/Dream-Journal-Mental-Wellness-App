import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { BACKEND_URL, authenticatedFetch } from '../utils/api';

export interface User {
  id: string;
  name: string;
  email: string;
  displayName?: string;
  firstName?: string;
  typingDynamicsEnabled?: boolean;
  hasCompletedOnboarding?: boolean;
  primaryIntent?: 'dreams' | 'anxiety' | 'mood' | 'wellness' | 'caregiver' | null;
  typicalWakeTime?: 'early' | 'morning' | 'late' | null;
  recentSleepQuality?: number | null;
  onboardingMoodWord?: string | null;
  currentStateTag?: 'clear' | 'foggy' | 'heavy' | string | null;
  wantsMemorySupport?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: User) => Promise<void>;
  register: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
  updateTypingDynamicsConsent: (enabled: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const getSecureItem = async (key: string) => {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  }
  return await SecureStore.getItemAsync(key);
};

const setSecureItem = async (key: string, value: string) => {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
};

const deleteSecureItem = async (key: string) => {
  if (Platform.OS === 'web') {
    localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStoredAuth() {
      try {
        const storedToken = await getSecureItem('auth_token');
        const storedUser = await getSecureItem('auth_user');
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }

        if (storedToken) {
          try {
            const res = await authenticatedFetch(`${BACKEND_URL}/auth/me`);
            if (res.ok) {
              const data = await res.json();
              if (data.user) {
                setUser(data.user);
                await setSecureItem('auth_user', JSON.stringify(data.user));
              }
            }
          } catch (fetchErr) {
            // Ignore offline errors during background sync
          }
        }
      } catch (err) {
        console.error('Error loading stored auth:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStoredAuth();
  }, []);

  const login = async (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    await setSecureItem('auth_token', newToken);
    await setSecureItem('auth_user', JSON.stringify(newUser));
  };

  const register = async (newToken: string, newUser: User) => {
    await login(newToken, newUser);
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    await deleteSecureItem('auth_token');
    await deleteSecureItem('auth_user');
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    setSecureItem('auth_user', JSON.stringify(updatedUser)).catch(console.error);
  };

  const updateTypingDynamicsConsent = async (enabled: boolean) => {
    if (user) {
      const updatedUser = { ...user, typingDynamicsEnabled: enabled };
      setUser(updatedUser);
      await setSecureItem('auth_user', JSON.stringify(updatedUser));
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateUser, updateTypingDynamicsConsent }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
