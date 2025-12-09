'use client';

import { useState, useEffect } from 'react';

export interface ShopTheme {
  id: string;
  shopId: string;
  brandName: string | null;
  tagline: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  background: string | null;
  logoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

interface UseShopThemeResult {
  theme: ShopTheme | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useShopTheme(): UseShopThemeResult {
  const [theme, setTheme] = useState<ShopTheme | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
  const shopId = process.env.NEXT_PUBLIC_SHOP_ID || 'default-shop-id';

  const fetchTheme = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`${apiBaseUrl}/api/shop-theme/${shopId}`);

      if (!response.ok) {
        // Use default theme if backend unavailable
        console.warn('Theme API unavailable, using defaults');
        setTheme({
          id: 'default',
          shopId: shopId,
          brandName: 'My Shop',
          tagline: 'Quality service you can trust',
          primaryColor: '#111827',
          accentColor: '#f59e0b',
          background: 'light',
          logoUrl: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      setTheme(data);
    } catch (err) {
      // On error, use default theme instead of blocking app
      console.warn('Error fetching theme, using defaults:', err);
      setTheme({
        id: 'default',
        shopId: shopId,
        brandName: 'My Shop',
        tagline: 'Quality service you can trust',
        primaryColor: '#111827',
        accentColor: '#f59e0b',
        background: 'light',
        logoUrl: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTheme();
  }, []);

  return { theme, isLoading, error, refetch: fetchTheme };
}
