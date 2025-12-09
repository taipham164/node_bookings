import React from 'react'
import { types, Text } from 'react-bricks'
import { BookingWidget } from '../../components/booking/BookingWidget'

interface BookingSectionProps {
  heading: string
}

/**
 * BookingSection Brick
 *
 * Renders the booking widget with full Square payment integration:
 * - Service selection
 * - Barber selection
 * - Date/time selection with real-time availability
 * - Customer details collection
 * - Square Web Payments SDK for card tokenization
 * - Full booking + payment orchestration via backend
 */
const BookingSection: types.Brick<BookingSectionProps> = () => {
  const shopId = process.env.NEXT_PUBLIC_SHOP_ID || ''

  if (!shopId) {
    return (
      <section className="py-16 px-6 bg-gradient-to-br from-gray-900 to-gray-800 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-red-700/50 border-2 border-red-500 rounded-lg p-12">
            <p className="text-xl font-semibold text-white">
              Booking widget configuration error: NEXT_PUBLIC_SHOP_ID is not set.
            </p>
            <p className="text-gray-200 mt-2">
              Please configure your environment variables.
            </p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-16 px-6 bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8 text-white">
          <Text
            propName="heading"
            placeholder="Enter booking section heading..."
            renderBlock={({ children }) => (
              <h2 className="text-4xl font-bold mb-2">{children}</h2>
            )}
          />
        </div>

        {/* BookingWidget Integration */}
        <BookingWidget shopId={shopId} />
      </div>
    </section>
  )
}

BookingSection.schema = {
  name: 'bookingsection',
  label: 'Booking Section',
  category: 'booking',
  tags: ['booking', 'appointment', 'calendar'],

  getDefaultProps: (): BookingSectionProps => ({
    heading: 'Book Your Appointment',
  }),

  sideEditProps: [],
}

export default BookingSection
