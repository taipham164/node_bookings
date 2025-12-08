import React from 'react'
import { notFound } from 'next/navigation'
import BookingHydrator from '@/components/booking/BookingHydrator'
import PuckRenderer from '@/webbuilder/PuckRenderer'

type Params = Promise<{ slug: string }>

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'
const SHOP_ID = process.env.NEXT_PUBLIC_SHOP_ID || 'default-shop-id'

async function getPage(slug: string) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/pages/${slug}?shopId=${SHOP_ID}`,
      {
        next: { revalidate: 60 } // Revalidate every 60 seconds
      }
    )

    if (response.ok) {
      return await response.json()
    }
    return null
  } catch (error) {
    console.error('Error fetching page:', error)
    return null
  }
}

export default async function Page({ params }: { params: Params }) {
  const { slug } = await params
  const page = await getPage(slug)

  if (!page) {
    notFound()
  }

  // If the page has Puck JSON data, render using PuckRenderer
  if (page.puckJson) {
    return (
      <>
        <PuckRenderer data={page.puckJson} />
        <BookingHydrator />
      </>
    )
  }

  // Fallback to HTML rendering for pages created with old builder
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: page.html }} />
      <BookingHydrator />
    </>
  )
}
