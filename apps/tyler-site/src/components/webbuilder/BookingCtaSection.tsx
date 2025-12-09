'use client'

import React from 'react'
import { useRouter } from 'next/navigation'

interface BookingCtaSectionProps {
  title: string
  subtitle?: string
  buttonLabel?: string
  bookingHref?: string
  scrollTargetId?: string
}

export function BookingCtaSection({
  title,
  subtitle,
  buttonLabel = 'Book Now',
  bookingHref = '/booking',
  scrollTargetId,
}: BookingCtaSectionProps) {
  const router = useRouter()

  const handleClick = () => {
    // If scrollTargetId is provided, try to scroll to it first
    if (scrollTargetId) {
      const element = document.getElementById(scrollTargetId)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' })
        return
      }
    }

    // Otherwise, navigate to the booking page
    router.push(bookingHref)
  }

  return (
    <section className="py-16 px-4 bg-gradient-to-br from-purple-600 to-blue-600">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-4xl font-bold text-white mb-4">{title}</h2>
        {subtitle && (
          <p className="text-xl text-purple-100 mb-8 max-w-2xl mx-auto">
            {subtitle}
          </p>
        )}
        <button
          onClick={handleClick}
          className="
            inline-block px-8 py-4 
            bg-white text-purple-600 
            font-semibold rounded-lg 
            hover:bg-purple-50 
            transform hover:scale-105 
            transition-all duration-200
            shadow-lg hover:shadow-xl
          "
        >
          {buttonLabel}
        </button>
      </div>
    </section>
  )
}
