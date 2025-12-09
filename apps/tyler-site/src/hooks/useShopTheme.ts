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
        throw new Error(`Failed to fetch theme: ${response.statusText}`);
      }

      const data = await response.json();
      setTheme(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching shop theme:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTheme();
  }, []);

  return { theme, isLoading, error, refetch: fetchTheme };
}
