'use client';

import React, { createContext, useContext, useEffect } from 'react';
import { useShopTheme, ShopTheme } from '@/hooks/useShopTheme';

interface ShopThemeContextValue {
  theme: ShopTheme | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const ShopThemeContext = createContext<ShopThemeContextValue | undefined>(
  undefined,
);

export function useShopThemeContext() {
  const context = useContext(ShopThemeContext);
  if (!context) {
    throw new Error(
      'useShopThemeContext must be used within ShopThemeProvider',
    );
  }
  return context;
}

interface ShopThemeProviderProps {
  children: React.ReactNode;
}

export function ShopThemeProvider({ children }: ShopThemeProviderProps) {
  const { theme, isLoading, error, refetch } = useShopTheme();

  // Apply CSS variables when theme loads
  useEffect(() => {
    if (theme) {
      const root = document.documentElement;

      // Set CSS variables
      root.style.setProperty(
        '--tp-primary',
        theme.primaryColor || '#111827',
      );
      root.style.setProperty(
        '--tp-accent',
        theme.accentColor || '#f59e0b',
      );
      root.style.setProperty(
        '--tp-bg',
        theme.background === 'dark' ? '#020617' : '#ffffff',
      );
      root.style.setProperty(
        '--tp-text',
        theme.background === 'dark' ? '#f8fafc' : '#0f172a',
      );
    }
  }, [theme]);

  return (
    <ShopThemeContext.Provider value={{ theme, isLoading, error, refetch }}>
      {children}
    </ShopThemeContext.Provider>
  );
}
