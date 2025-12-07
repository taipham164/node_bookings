import React from 'react'
import Link from 'next/link'
import BookingHydrator from '@/components/booking/BookingHydrator'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'
const SHOP_ID = process.env.NEXT_PUBLIC_SHOP_ID || 'default-shop-id'

async function getHomePage() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/pages/${SHOP_ID}/home`, {
      next: { revalidate: 60 } // Revalidate every 60 seconds
    })

    if (response.ok) {
      return await response.json()
    }
    return null
  } catch (error) {
    console.error('Error fetching home page:', error)
    return null
  }
}

export default async function Home() {
  const page = await getHomePage()

  if (!page) {
    return (
      <main className="min-h-screen">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="text-center">
            <h1 className="text-5xl font-bold mb-6">Tyler&apos;s Barbershop</h1>
            <p className="text-xl text-gray-600 mb-8">
              Welcome! The site is being set up.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 max-w-2xl mx-auto">
              <h2 className="text-2xl font-semibold mb-4">Getting Started</h2>
              <ol className="text-left space-y-3">
                <li className="flex gap-3">
                  <span className="font-bold text-blue-600">1.</span>
                  <span>Configure your environment variables in the <code className="bg-gray-100 px-2 py-1 rounded">.env</code> file</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-blue-600">2.</span>
                  <span>Visit <Link href="/admin/builder" className="text-blue-600 hover:underline">/admin/builder</Link> to create your home page with GrapesJS</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-blue-600">3.</span>
                  <span>Use the &quot;Booking Widget&quot; block to add appointment booking to your pages</span>
                </li>
              </ol>
            </div>
            <div className="mt-8">
              <Link
                href="/admin/builder"
                className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Open Page Builder
              </Link>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: page.html }} />
      <BookingHydrator />
    </>
  )
}
