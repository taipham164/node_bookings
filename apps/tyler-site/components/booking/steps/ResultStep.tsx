'use client'

import { BookingWithPaymentResponse } from '../../../lib/bookingApi';

interface ResultStepProps {
  bookingResponse: BookingWithPaymentResponse;
  onReset: () => void;
}

export function ResultStep({ bookingResponse, onReset }: ResultStepProps) {
  const isSuccess = bookingResponse.success;

  const formatDateTime = (isoString: string | undefined) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return {
      date: date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    };
  };

  if (isSuccess && bookingResponse.appointment) {
    const { appointment, payment } = bookingResponse;
    const { date, time } = formatDateTime(appointment.startAt);

    return (
      <div className="space-y-6">
        {/* Success Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Booking Confirmed!</h2>
          <p className="text-gray-600 mt-2">Your appointment has been successfully booked</p>
        </div>

        {/* Booking Details */}
        <div className="bg-gray-50 rounded-lg p-6 space-y-4">
          <div>
            <h3 className="font-semibold text-gray-900">Service</h3>
            <p className="text-gray-600">{appointment.service.name}</p>
            <p className="text-sm text-gray-500">{appointment.service.durationMinutes} minutes</p>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h3 className="font-semibold text-gray-900">Barber</h3>
            <p className="text-gray-600">{appointment.barber.displayName}</p>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h3 className="font-semibold text-gray-900">Date & Time</h3>
            <p className="text-gray-600">{date}</p>
            <p className="text-gray-600">{time}</p>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h3 className="font-semibold text-gray-900">Contact</h3>
            <p className="text-gray-600">
              {appointment.customer.firstName} {appointment.customer.lastName}
            </p>
            <p className="text-gray-600">{appointment.customer.phone}</p>
            {appointment.customer.email && (
              <p className="text-gray-600">{appointment.customer.email}</p>
            )}
          </div>

          {payment && (
            <div className="border-t border-gray-200 pt-4">
              <h3 className="font-semibold text-gray-900">Payment</h3>
              <p className="text-gray-600">
                ${(payment.amountCents / 100).toFixed(2)} - {payment.status}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Payment ID: {payment.squarePaymentId}
              </p>
            </div>
          )}
        </div>

        {/* Confirmation Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-800 text-sm">
            A confirmation has been sent to your phone{' '}
            {appointment.customer.email && 'and email'}. Please arrive 5 minutes before your
            scheduled time.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={onReset}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
          >
            Book Another Appointment
          </button>
        </div>
      </div>
    );
  }

  // Failure state
  return (
    <div className="space-y-6">
      {/* Error Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
          <svg
            className="w-8 h-8 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-gray-900">Booking Failed</h2>
        <p className="text-gray-600 mt-2">We couldn't complete your booking</p>
      </div>

      {/* Error Message */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">
          {bookingResponse.message || 'An error occurred while processing your booking'}
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3">
        <button
          onClick={onReset}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
