'use client'

import { Service, Barber, CustomerInfo } from '../../../lib/bookingApi';
import { SquareCardForm } from '../SquareCardForm';
import { PaymentMode } from '../../../hooks/useBookingFlow';

interface ReviewStepProps {
  service: Service;
  barber: Barber;
  selectedSlot: string;
  customerInfo: CustomerInfo;
  paymentMode: PaymentMode;
  loading: boolean;
  error: string | null;
  onSubmitPayment: (nonce: string) => Promise<void>;
  onBack: () => void;
}

export function ReviewStep({
  service,
  barber,
  selectedSlot,
  customerInfo,
  paymentMode,
  loading,
  error,
  onSubmitPayment,
  onBack,
}: ReviewStepProps) {
  const formatDateTime = (isoString: string) => {
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

  const { date, time } = formatDateTime(selectedSlot);

  // Calculate amount based on payment mode
  const amountCents =
    paymentMode === 'FULL' ? service.priceCents : Math.round(service.priceCents * 0.2); // 20% deposit

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Review & Pay</h2>
        <p className="text-gray-600 mt-1">Review your booking details and complete payment</p>
      </div>

      {/* Booking Summary */}
      <div className="bg-gray-50 rounded-lg p-6 space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-semibold text-gray-900">Service</h3>
            <p className="text-gray-600">{service.name}</p>
            <p className="text-sm text-gray-500">{service.durationMins} minutes</p>
          </div>
          <div className="text-right">
            <p className="font-semibold text-gray-900">
              ${(service.priceCents / 100).toFixed(2)}
            </p>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <h3 className="font-semibold text-gray-900">Barber</h3>
          <p className="text-gray-600">{barber.displayName}</p>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <h3 className="font-semibold text-gray-900">Date & Time</h3>
          <p className="text-gray-600">{date}</p>
          <p className="text-gray-600">{time}</p>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <h3 className="font-semibold text-gray-900">Contact Information</h3>
          <p className="text-gray-600">
            {customerInfo.firstName} {customerInfo.lastName}
          </p>
          <p className="text-gray-600">{customerInfo.phone}</p>
          {customerInfo.email && <p className="text-gray-600">{customerInfo.email}</p>}
        </div>

        <div className="border-t border-gray-200 pt-4">
          <h3 className="font-semibold text-gray-900">Payment</h3>
          <p className="text-gray-600">
            {paymentMode === 'FULL' ? 'Full Payment' : 'Deposit (20%)'}
          </p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="font-semibold text-red-800 mb-1">Payment Failed</h3>
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Square Card Form */}
      <div className="border-t border-gray-200 pt-6">
        <SquareCardForm
          amountCents={amountCents}
          onNonce={onSubmitPayment}
          loading={loading}
        />
      </div>

      {/* Back Button */}
      <button
        onClick={onBack}
        disabled={loading}
        className="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
      >
        Back
      </button>
    </div>
  );
}
