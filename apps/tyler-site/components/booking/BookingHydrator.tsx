'use client'

import { useEffect } from 'react'
import BookingWidget from './BookingWidget'
import { createRoot } from 'react-dom/client'

export default function BookingHydrator() {
  useEffect(() => {
    const shopId = process.env.NEXT_PUBLIC_SHOP_ID || 'default-shop-id'

    // Find all booking widget placeholders
    const nodes = document.querySelectorAll('[data-booking-widget="true"]')

    nodes.forEach(node => {
      // Clear any existing content
      node.innerHTML = ''

      // Create a React root and render the BookingWidget
      const root = createRoot(node as HTMLElement)
      root.render(<BookingWidget shopId={shopId} />)
    })
  }, [])

  return null
}
