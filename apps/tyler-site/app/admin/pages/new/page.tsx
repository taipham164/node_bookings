'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewPagePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    isHome: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
  const shopId = process.env.NEXT_PUBLIC_SHOP_ID || 'default-shop-id';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    // Validate
    if (!formData.title.trim() || !formData.slug.trim()) {
      setError('Title and slug are required');
      setSaving(false);
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/api/pages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shopId,
          title: formData.title,
          slug: formData.slug,
          isHome: formData.isHome,
          html: JSON.stringify({ root: { props: {} } }), // Default empty Puck data
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || 'Failed to create page');
      }

      const page = await response.json();
      
      // Redirect to builder for the new page
      router.push(`/admin/builder?pageId=${page.id}`);
    } catch (err) {
      console.error('Error creating page:', err);
      setError(err instanceof Error ? err.message : 'Failed to create page');
      setSaving(false);
    }
  };

  const handleSlugChange = (value: string) => {
    // Auto-format slug: lowercase, replace spaces with hyphens, remove special chars
    const formattedSlug = value
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    setFormData((prev) => ({ ...prev, slug: formattedSlug }));
  };

  const handleTitleChange = (value: string) => {
    setFormData((prev) => ({ ...prev, title: value }));
    
    // Auto-generate slug from title if slug is empty
    if (!formData.slug) {
      handleSlugChange(value);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Create New Page
            </h1>
            <p className="text-gray-600">
              Enter the page details to get started
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-50 text-red-800 border border-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Page Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                value={formData.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., About Us"
                required
              />
            </div>

            {/* Slug */}
            <div>
              <label
                htmlFor="slug"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                URL Slug <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">/</span>
                <input
                  type="text"
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="about-us"
                  required
                />
              </div>
              <p className="mt-1 text-sm text-gray-500">
                This will be the URL: {window.location.origin}/{formData.slug || 'your-slug'}
              </p>
            </div>

            {/* Is Home */}
            <div className="flex items-start">
              <input
                type="checkbox"
                id="isHome"
                checked={formData.isHome}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, isHome: e.target.checked }))
                }
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isHome" className="ml-3">
                <span className="block text-sm font-medium text-gray-700">
                  Set as home page
                </span>
                <span className="block text-sm text-gray-500">
                  This page will be displayed at the root URL (/)
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <div className="border-t pt-6">
              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? 'Creating...' : 'Create & Open Builder'}
                </button>
                <Link
                  href="/admin/pages"
                  className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </Link>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
