'use client';

import React, { useEffect, useState } from 'react';
import { Puck } from '@measured/puck';
import type { Data } from '@measured/puck';
import '@measured/puck/puck.css';
import config from '@/webbuilder/puckConfig';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
const SHOP_ID = process.env.NEXT_PUBLIC_SHOP_ID || 'default-shop-id';

type Params = {
  id: string;
};

export default function BuilderPage({ params }: { params: Params }) {
  const [initialData, setInitialData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    fetchBuilderData();
  }, [params.id]);

  const fetchBuilderData = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE_URL}/api/pages/${params.id}/builder-data?shopId=${SHOP_ID}`
      );

      if (response.ok) {
        const result = await response.json();
        setInitialData(result.data || getDefaultData());
      } else {
        // Page exists but no Puck data yet
        setInitialData(getDefaultData());
      }
      setError(null);
    } catch (err) {
      console.error('Error fetching builder data:', err);
      setError('Failed to load page data');
      setInitialData(getDefaultData());
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (data: Data) => {
    try {
      setSaveStatus('saving');
      const response = await fetch(
        `${API_BASE_URL}/api/pages/${params.id}/builder-data?shopId=${SHOP_ID}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ data }),
        }
      );

      if (response.ok) {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        throw new Error('Failed to save');
      }
    } catch (err) {
      console.error('Error saving builder data:', err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const getDefaultData = (): Data => ({
    content: [
      {
        type: 'HeroSection',
        props: {
          id: 'hero-1',
          title: 'Welcome to Tyler\'s Barbershop',
          subtitle: 'Professional grooming services',
          backgroundColor: '#667eea',
          textColor: '#ffffff',
        },
      },
    ],
    root: { props: {} },
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading builder...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl text-red-600">{error}</div>
      </div>
    );
  }

  if (!initialData) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">Page Builder</h1>
          <span className="text-sm text-gray-400">Page ID: {params.id}</span>
        </div>
        <div className="flex items-center gap-4">
          {saveStatus === 'saving' && (
            <span className="text-sm text-yellow-400">Saving...</span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-sm text-green-400">✓ Saved</span>
          )}
          {saveStatus === 'error' && (
            <span className="text-sm text-red-400">Error saving</span>
          )}
        </div>
      </div>

      {/* Puck Editor */}
      <div className="flex-1 overflow-hidden">
        <Puck
          config={config}
          data={initialData}
          onPublish={handlePublish}
        />
      </div>
    </div>
  );
}
