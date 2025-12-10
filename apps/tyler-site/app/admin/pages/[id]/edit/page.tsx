'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function EditPagePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [pageId, setPageId] = useState<string | null>(null);
  
  useEffect(() => {
    const initializeParams = async () => {
      const resolvedParams = await params;
      setPageId(resolvedParams.id);
    };
    initializeParams();
  }, [params]);

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    isHome: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

  useEffect(() => {
    if (pageId) {
      fetchPage();
    }
  }, [pageId]);

  const fetchPage = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${apiBaseUrl}/api/pages/${pageId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch page');
      }

      const page = await response.json();
      setFormData({
        title: page.title,
        slug: page.slug,
        isHome: page.isHome,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load page');
      console.error('Error fetching page:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    // Validate
    if (!formData.title.trim() || !formData.slug.trim()) {
      setError('Title and slug are required');
      setSaving(false);
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/api/pages/${pageId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || 'Failed to update page');
      }

      setMessage('Page updated successfully!');
    } catch (err) {
      console.error('Error updating page:', err);
      setError(err instanceof Error ? err.message : 'Failed to update page');
    } finally {
      setSaving(false);
    }
  };

  const handleSlugChange = (value: string) => {
    const formattedSlug = value
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    setFormData((prev) => ({ ...prev, slug: formattedSlug }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading page...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Edit Page
            </h1>
            <p className="text-gray-600">
              Update page metadata and settings
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-50 text-red-800 border border-red-200">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-6 p-4 rounded-lg bg-green-50 text-green-800 border border-green-200">
              {message}
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
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
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

            {/* Actions */}
            <div className="border-t pt-6">
              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <Link
                  href={`/admin/builder?pageId=${pageId}`}
                  className="px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors text-center"
                >
                  Open Builder
                </Link>
              </div>
            </div>
          </form>

          {/* Navigation */}
          <div className="mt-6 pt-6 border-t">
            <Link
              href="/admin/pages"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              ← Back to Pages List
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
