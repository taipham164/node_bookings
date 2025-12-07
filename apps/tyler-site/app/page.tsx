import React from 'react'
import Link from 'next/link'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'

export default function Home() {
  return (
    <main className="min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-center">
          <h1 className="text-5xl font-bold mb-6">Tyler&apos;s Barbershop</h1>
          <p className="text-xl text-gray-600 mb-8">
            Welcome to Tyler&apos;s Barbershop! Your booking system is ready.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 max-w-2xl mx-auto">
            <h2 className="text-2xl font-semibold mb-4">Backend Services</h2>
            <p className="text-left mb-4">
              Your NestJS backend is running on <code className="bg-gray-100 px-2 py-1 rounded">http://localhost:3001</code>
            </p>
            <ul className="text-left space-y-2">
              <li>• Appointment booking system</li>
              <li>• Customer management</li>
              <li>• Payment processing with Square</li>
              <li>• No-show policy management</li>
            </ul>
          </div>
          <div className="mt-8">
            <Link
              href="/admin/builder"
              className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors mr-4"
            >
              Page Builder
            </Link>
            <a
              href={`${API_BASE_URL}/api/health`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
            >
              Check API Health
            </a>
          </div>
        </div>
      </div>
    </main>
  )
}
