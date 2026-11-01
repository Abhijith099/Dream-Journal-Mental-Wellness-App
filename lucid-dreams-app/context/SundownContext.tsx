import React, { createContext, useContext, useState, useEffect } from 'react';

export interface SundownTheme {
  background: string;
  cardBackground: string;
  cardBorder: string;
  glassBackground: string;
  glassBorder: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentText: string;
  buttonPrimary: string;
  buttonPrimaryText: string;
  buttonStop: string;
  buttonStopText: string;
  badgeBg: string;
  badgeText: string;
  glowColor: string;
}

export const DayTheme: SundownTheme = {
  background: '#F3EEFC',
  cardBackground: '#FFFFFF',
  cardBorder: 'rgba(139, 123, 184, 0.25)',
  glassBackground: 'rgba(255, 255, 255, 0.75)',
  glassBorder: 'rgba(255, 255, 255, 0.65)',
  textPrimary: '#2D234A',
  textSecondary: '#5A4D7E',
  textMuted: '#8B7BB8',
  accent: '#5B4B9E',
  accentText: '#FFFFFF',
  buttonPrimary: '#3A2E64',
  buttonPrimaryText: '#FFFFFF',
  buttonStop: '#8C1D18',
  buttonStopText: '#FFFFFF',
  badgeBg: 'rgba(91, 75, 158, 0.12)',
  badgeText: '#5B4B9E',
  glowColor: 'rgba(139, 123, 184, 0.18)',
};

export const SundownThemeColors: SundownTheme = {
  background: '#FBE6D1',
  cardBackground: '#FFF5EB',
  cardBorder: 'rgba(217, 119, 6, 0.3)',
  glassBackground: 'rgba(255, 246, 237, 0.82)',
  glassBorder: 'rgba(255, 255, 255, 0.75)',
  textPrimary: '#381A05',
  textSecondary: '#6B3811',
  textMuted: '#9B5B28',
  accent: '#C25E00',
  accentText: '#FFFFFF',
  buttonPrimary: '#78350F',
  buttonPrimaryText: '#FFFFFF',
  buttonStop: '#5C1D06',
  buttonStopText: '#FFFFFF',
  badgeBg: 'rgba(194, 94, 0, 0.15)',
  badgeText: '#92400E',
  glowColor: 'rgba(217, 119, 6, 0.22)',
};

interface SundownContextType {
  isSundownMode: boolean;
  setIsSundownMode: (val: boolean | ((prev: boolean) => boolean)) => void;
  isAutoSundown: boolean;
  currentHour: number;
  theme: SundownTheme;
}

const SundownContext = createContext<SundownContextType | null>(null);

export const SundownProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentHour, setCurrentHour] = useState<number>(() => new Date().getHours());
  const [manualOverride, setManualOverride] = useState<boolean | null>(null);

  useEffect(() => {
    const updateHour = () => {
      const h = new Date().getHours();
      setCurrentHour(h);
    };

    updateHour();
    const interval = setInterval(updateHour, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const isAutoSundown = currentHour >= 16;
  const isSundownMode = manualOverride !== null ? manualOverride : isAutoSundown;
  const theme = isSundownMode ? SundownThemeColors : DayTheme;

  const handleSetSundown = (val: boolean | ((prev: boolean) => boolean)) => {
    if (typeof val === 'function') {
      setManualOverride((prev) => val(prev !== null ? prev : isAutoSundown));
    } else {
      setManualOverride(val);
    }
  };

  return (
    <SundownContext.Provider
      value={{
        isSundownMode,
        setIsSundownMode: handleSetSundown,
        isAutoSundown,
        currentHour,
        theme,
      }}
    >
      {children}
    </SundownContext.Provider>
  );
};

export const useSundown = () => {
  const context = useContext(SundownContext);
  if (!context) {
    throw new Error('useSundown must be used within a SundownProvider');
  }
  return context;
};
