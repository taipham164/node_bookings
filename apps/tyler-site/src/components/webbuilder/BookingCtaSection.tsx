'use client'

import React from 'react'
import { useRouter } from 'next/navigation'

interface BookingCtaSectionProps {
  title: string
  subtitle?: string
  buttonLabel?: string
  bookingHref?: string
  scrollTargetId?: string
  useThemeColors?: boolean
  customPrimaryColor?: string
  customAccentColor?: string
}

export function BookingCtaSection({
  title,
  subtitle,
  buttonLabel = 'Book Now',
  bookingHref = '/booking',
  scrollTargetId,
  useThemeColors = true,
  customPrimaryColor,
  customAccentColor,
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

  const bgGradient =
    useThemeColors && !customPrimaryColor && !customAccentColor
      ? 'linear-gradient(135deg, var(--tp-primary), var(--tp-accent))'
      : `linear-gradient(135deg, ${customPrimaryColor || '#9333ea'}, ${customAccentColor || '#2563eb'})`

  const buttonBg =
    useThemeColors && !customAccentColor ? 'var(--tp-accent)' : customAccentColor || '#f59e0b'

  return (
    <section
      className="py-16 px-4"
      style={{ background: bgGradient }}
    >
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-4xl font-bold text-white mb-4">{title}</h2>
        {subtitle && (
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            {subtitle}
          </p>
        )}
        <button
          onClick={handleClick}
          className="
            inline-block px-8 py-4 
            bg-white
            font-semibold rounded-lg 
            hover:opacity-90
            transform hover:scale-105 
            transition-all duration-200
            shadow-lg hover:shadow-xl
          "
          style={{ color: buttonBg }}
        >
          {buttonLabel}
        </button>
      </div>
    </section>
  )
}
