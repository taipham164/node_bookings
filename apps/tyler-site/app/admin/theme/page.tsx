'use client';

import React, { useState, useEffect } from 'react';
import { useShopThemeContext } from '@/components/theme/ShopThemeProvider';

export default function ThemeEditorPage() {
  const { theme, isLoading: themeLoading, refetch } = useShopThemeContext();
  const [formData, setFormData] = useState({
    brandName: '',
    tagline: '',
    primaryColor: '#111827',
    accentColor: '#f59e0b',
    background: 'light',
    logoUrl: '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  );

  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
  const shopId = process.env.NEXT_PUBLIC_SHOP_ID || 'default-shop-id';

  // Populate form when theme loads
  useEffect(() => {
    if (theme) {
      setFormData({
        brandName: theme.brandName || '',
        tagline: theme.tagline || '',
        primaryColor: theme.primaryColor || '#111827',
        accentColor: theme.accentColor || '#f59e0b',
        background: theme.background || 'light',
        logoUrl: theme.logoUrl || '',
      });
    }
  }, [theme]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`${apiBaseUrl}/api/shop-theme/${shopId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to update theme');
      }

      setMessage({ type: 'success', text: 'Theme updated successfully!' });
      
      // Refetch theme to update CSS variables
      await refetch();
    } catch (error) {
      console.error('Error updating theme:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to update theme',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  if (themeLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading theme...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Shop Theme & Branding
            </h1>
            <p className="text-gray-600">
              Customize your shop's visual identity and branding
            </p>
          </div>

          {message && (
            <div
              className={`mb-6 p-4 rounded-lg ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Brand Name */}
            <div>
              <label
                htmlFor="brandName"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Brand Name
              </label>
              <input
                type="text"
                id="brandName"
                name="brandName"
                value={formData.brandName}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="My Shop"
              />
            </div>

            {/* Tagline */}
            <div>
              <label
                htmlFor="tagline"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Tagline
              </label>
              <input
                type="text"
                id="tagline"
                name="tagline"
                value={formData.tagline}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Quality service you can trust"
              />
            </div>

            {/* Primary Color */}
            <div>
              <label
                htmlFor="primaryColor"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Primary Color
              </label>
              <div className="flex gap-3">
                <input
                  type="color"
                  id="primaryColor"
                  name="primaryColor"
                  value={formData.primaryColor}
                  onChange={handleChange}
                  className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.primaryColor}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, primaryColor: e.target.value }))
                  }
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="#111827"
                />
              </div>
            </div>

            {/* Accent Color */}
            <div>
              <label
                htmlFor="accentColor"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Accent Color
              </label>
              <div className="flex gap-3">
                <input
                  type="color"
                  id="accentColor"
                  name="accentColor"
                  value={formData.accentColor}
                  onChange={handleChange}
                  className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.accentColor}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, accentColor: e.target.value }))
                  }
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="#f59e0b"
                />
              </div>
            </div>

            {/* Background */}
            <div>
              <label
                htmlFor="background"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Background Theme
              </label>
              <select
                id="background"
                name="background"
                value={formData.background}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>

            {/* Logo URL */}
            <div>
              <label
                htmlFor="logoUrl"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Logo URL
              </label>
              <input
                type="text"
                id="logoUrl"
                name="logoUrl"
                value={formData.logoUrl}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://example.com/logo.png"
              />
            </div>

            {/* Preview */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Preview</h3>
              <div className="space-y-4">
                {/* Color Swatches */}
                <div className="flex gap-4">
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 mb-2">Primary</p>
                    <div
                      className="h-16 rounded-lg border border-gray-200"
                      style={{ backgroundColor: formData.primaryColor }}
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 mb-2">Accent</p>
                    <div
                      className="h-16 rounded-lg border border-gray-200"
                      style={{ backgroundColor: formData.accentColor }}
                    />
                  </div>
                </div>

                {/* Sample Button */}
                <div>
                  <p className="text-sm text-gray-600 mb-2">Sample Button</p>
                  <button
                    type="button"
                    className="px-6 py-3 rounded-lg font-semibold text-white transition-opacity hover:opacity-90"
                    style={{ backgroundColor: formData.accentColor }}
                  >
                    Book Now
                  </button>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="border-t pt-6">
              <button
                type="submit"
                disabled={saving}
                className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Saving...' : 'Save Theme'}
              </button>
            </div>
          </form>

          {/* Navigation */}
          <div className="mt-6 pt-6 border-t">
            <a
              href="/admin/builder"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              ← Back to Page Builder
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
