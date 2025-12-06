import React from 'react'
import Link from 'next/link'

export default async function Home() {
  return (
    <main className="min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-center">
          <h1 className="text-5xl font-bold mb-6">Tyler&apos;s Barbershop</h1>
          <p className="text-xl text-gray-600 mb-8">
            Welcome to our React Bricks powered site
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 max-w-2xl mx-auto">
            <h2 className="text-2xl font-semibold mb-4">Getting Started</h2>
            <ol className="text-left space-y-3">
              <li className="flex gap-3">
                <span className="font-bold text-blue-600">1.</span>
                <span>Configure your React Bricks credentials in the <code className="bg-gray-100 px-2 py-1 rounded">.env</code> file</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-blue-600">2.</span>
                <span>Visit <Link href="/admin" className="text-blue-600 hover:underline">/admin</Link> to access the React Bricks editor</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-blue-600">3.</span>
                <span>Create pages using the custom bricks: Hero, Text+Image, Testimonials, Gallery, and BookingSection</span>
              </li>
            </ol>
          </div>
          <div className="mt-8">
            <Link
              href="/admin"
              className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Open Editor
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
