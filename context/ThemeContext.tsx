import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  colors: typeof LightColors;
  fonts: typeof Typography;
}

export const Typography = {
  h1: { fontSize: 32, fontWeight: '900' as const, letterSpacing: -1 },
  h2: { fontSize: 24, fontWeight: '800' as const, letterSpacing: -0.5 },
  h3: { fontSize: 18, fontWeight: '700' as const, letterSpacing: -0.5 },
  body: { fontSize: 15, fontWeight: '500' as const },
  bodyBold: { fontSize: 15, fontWeight: '700' as const },
  caption: { fontSize: 12, fontWeight: '600' as const, textTransform: 'uppercase' as const, letterSpacing: 1 },
  tiny: { fontSize: 10, fontWeight: '700' as const, textTransform: 'uppercase' as const },
};

const LightColors = {
  background: '#F8F9FB',
  card: '#FFFFFF',
  text: '#1C1C1E',
  textSecondary: '#8E8E93',
  primary: '#007AFF',
  secondary: '#5856D6',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  border: '#E5E5EA',
  surface: '#F2F2F7',
  white: '#FFFFFF',
};

const DarkColors = {
  background: '#0F1115', // Rich charcoal black
  card: '#1A1C20',       // Slightly lighter card background
  text: '#F5F5F7',       // Soft off-white for main text
  textSecondary: '#9DA3AE', // Muted gray for secondary info
  primary: '#0A84FF',
  secondary: '#5E5CE6',
  success: '#30D158',
  warning: '#FF9F0A',
  error: '#FF453A',
  border: '#2C2E33',     // Subtle border
  surface: '#24272D',    // Inset surface color
  white: '#FFFFFF',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [theme, setTheme] = useState<Theme>(systemColorScheme === 'dark' ? 'dark' : 'light');

  useEffect(() => {
    // Load saved theme
    AsyncStorage.getItem('@theme').then(savedTheme => {
      if (savedTheme) {
        setTheme(savedTheme as Theme);
      }
    });
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    AsyncStorage.setItem('@theme', newTheme);
  };

  const isDark = theme === 'dark';
  const colors = isDark ? DarkColors : LightColors;

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme, colors, fonts: Typography }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
