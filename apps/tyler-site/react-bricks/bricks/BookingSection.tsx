import React from 'react'
import { types, Text } from 'react-bricks'

interface BookingSectionProps {
  heading: string
}

/**
 * BookingSection Brick
 *
 * TODO: This is a placeholder for the booking widget integration.
 *
 * Future implementation will:
 * 1. Import and render a BookingWidget component
 * 2. Connect to apps/backend endpoints:
 *    - GET /api/services - Fetch available services
 *    - GET /api/barbers - Fetch barber list
 *    - GET /api/availability - Check barber availability
 *    - POST /api/appointments/bookings - Create new booking
 * 3. Handle booking flow: service selection → barber selection → time slot → confirmation
 * 4. Integrate with Square payments for deposit/payment processing
 * 5. Implement no-show prevention system
 */
const BookingSection: types.Brick<BookingSectionProps> = () => {
  return (
    <section className="py-16 px-6 bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      <div className="max-w-4xl mx-auto text-center">
        <Text
          propName="heading"
          placeholder="Enter booking section heading..."
          renderBlock={({ children }) => (
            <h2 className="text-4xl font-bold mb-8">{children}</h2>
          )}
        />

        {/* Placeholder Box */}
        <div className="bg-gray-700/50 border-2 border-dashed border-gray-500 rounded-lg p-12 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <svg
              className="w-16 h-16 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <h3 className="text-2xl font-semibold text-gray-200">
              Booking Widget Coming Soon
            </h3>
            <p className="text-gray-300 max-w-md">
              This section will integrate with the booking system to allow customers to:
            </p>
            <ul className="text-left text-gray-300 space-y-2 mt-4">
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-1">✓</span>
                <span>Select services and barbers</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-1">✓</span>
                <span>Check real-time availability</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-1">✓</span>
                <span>Book appointments online</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-1">✓</span>
                <span>Make secure payments</span>
              </li>
            </ul>
            <p className="text-sm text-gray-400 mt-6">
              Connected to: <code className="bg-gray-800 px-2 py-1 rounded">apps/backend</code>
            </p>
          </div>
        </div>
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
