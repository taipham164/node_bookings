'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface Page {
  id: string;
  title: string;
  slug: string;
  isHome: boolean;
  updatedAt: string;
}

export default function AdminPagesPage() {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  );

  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
  const shopId = process.env.NEXT_PUBLIC_SHOP_ID || 'default-shop-id';

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${apiBaseUrl}/api/pages?shopId=${shopId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch pages');
      }

      const data = await response.json();
      setPages(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching pages:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSetHome = async (pageId: string) => {
    try {
      const response = await fetch(
        `${apiBaseUrl}/api/pages/${shopId}/home/${pageId}`,
        {
          method: 'POST',
        },
      );

      if (!response.ok) {
        throw new Error('Failed to set home page');
      }

      setMessage({ type: 'success', text: 'Home page updated successfully!' });
      fetchPages(); // Refresh the list
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to set home page',
      });
    }
  };

  const handleDelete = async (pageId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) {
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/api/pages/${pageId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete page');
      }

      setMessage({ type: 'success', text: 'Page deleted successfully!' });
      fetchPages(); // Refresh the list
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to delete page',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading pages...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Pages Manager
              </h1>
              <p className="text-gray-600">
                Manage your website pages and content
              </p>
            </div>
            <Link
              href="/admin/pages/new"
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Create Page
            </Link>
          </div>

          {/* Message */}
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

          {/* Error State */}
          {error && (
            <div className="text-center py-8">
              <p className="text-red-600 font-medium">Error: {error}</p>
              <button
                onClick={fetchPages}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          )}

          {/* Pages Table */}
          {!error && pages.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No pages yet</p>
              <Link
                href="/admin/pages/new"
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Create your first page
              </Link>
            </div>
          )}

          {!error && pages.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Slug
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Home Page
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Updated
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pages.map((page) => (
                    <tr key={page.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {page.title}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">
                          /{page.slug === 'home' ? '' : page.slug}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {page.isHome ? (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            Yes
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-600">
                            No
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(page.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/admin/pages/${page.id}/edit`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Edit
                          </Link>
                          <Link
                            href={`/admin/builder?pageId=${page.id}`}
                            className="text-purple-600 hover:text-purple-900"
                          >
                            Builder
                          </Link>
                          {!page.isHome && (
                            <button
                              onClick={() => handleSetHome(page.id)}
                              className="text-green-600 hover:text-green-900"
                            >
                              Set Home
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(page.id, page.title)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Navigation */}
          <div className="mt-8 pt-6 border-t">
            <Link
              href="/admin/theme"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              ← Back to Theme Settings
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
