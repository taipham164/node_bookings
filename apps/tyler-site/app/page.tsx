'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { PuckPageRenderer } from '@/src/components/PuckPageRenderer';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
const SHOP_ID = process.env.NEXT_PUBLIC_SHOP_ID || 'default-shop-id';

export default function Home() {
  const [page, setPage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHomePage();
  }, []);

  const fetchHomePage = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/pages/home/${SHOP_ID}`);
      
      if (!response.ok) {
        throw new Error('No home page found');
      }

      const data = await response.json();
      setPage(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load page');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  // No home page set - show default welcome
  if (error || !page) {
    return (
      <main className="min-h-screen">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="text-center">
            <h1 className="text-5xl font-bold mb-6">Tyler&apos;s Barbershop</h1>
            <p className="text-xl text-gray-600 mb-8">
              Welcome! No home page has been set yet.
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 max-w-2xl mx-auto mb-8">
              <h2 className="text-2xl font-semibold mb-4">Get Started</h2>
              <p className="text-left mb-4">
                Create your first page or set an existing page as your home page.
              </p>
            </div>
            <div className="mt-8">
              <Link
                href="/admin/pages"
                className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors mr-4"
              >
                Manage Pages
              </Link>
              <Link
                href="/admin/builder"
                className="inline-block bg-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
              >
                Page Builder
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Render the home page using Puck
  let puckData = null;
  
  try {
    // Try to parse puckJson first
    if (page.puckJson) {
      puckData = page.puckJson;
    }
    // Fallback to html field
    else if (page.html) {
      puckData = JSON.parse(page.html);
    }
  } catch (err) {
    console.error('Error parsing page data:', err);
  }

  if (puckData) {
    return (
      <main className="min-h-screen">
        <PuckPageRenderer data={puckData} />
      </main>
    );
  }

  // Fallback if no valid data
  return (
    <main className="min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold mb-4">{page.title}</h1>
        <p className="text-gray-600">This page has no content yet.</p>
        <Link
          href={`/admin/builder?pageId=${page.id}`}
          className="inline-block mt-6 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700"
        >
          Edit in Builder
        </Link>
      </div>
    </main>
  );
}
