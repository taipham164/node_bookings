'use client'

import { useEffect, useState } from 'react';
import { Service, Barber, AvailabilitySlot, fetchAvailability } from '../../../lib/bookingApi';

interface DateTimeStepProps {
  shopId: string;
  service: Service;
  barber: Barber;
  selectedSlot: string | null;
  onSelectSlot: (slot: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function DateTimeStep({
  shopId,
  service,
  barber,
  selectedSlot,
  onSelectSlot,
  onNext,
  onBack,
}: DateTimeStepProps) {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate next 14 days for date picker
  const availableDates = Array.from({ length: 14 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  });

  useEffect(() => {
    if (!selectedDate) return;

    const loadSlots = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchAvailability({
          shopId,
          serviceId: service.id,
          barberId: barber.id,
          date: selectedDate,
        });
        setSlots(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load availability');
        setSlots([]);
      } finally {
        setLoading(false);
      }
    };

    loadSlots();
  }, [shopId, service.id, barber.id, selectedDate]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const handleNext = () => {
    if (selectedSlot) {
      onNext();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Select Date & Time</h2>
        <p className="text-gray-600 mt-1">
          Service: <span className="font-medium">{service.name}</span> with{' '}
          <span className="font-medium">{barber.displayName}</span>
        </p>
      </div>

      {/* Date Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Date</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {availableDates.map((date) => (
            <button
              key={date}
              onClick={() => setSelectedDate(date)}
              className={`p-3 rounded-lg border-2 text-sm transition-all ${
                selectedDate === date
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-blue-300'
              }`}
            >
              {formatDate(date)}
            </button>
          ))}
        </div>
      </div>

      {/* Time Slots */}
      {selectedDate && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Time</label>

          {loading && (
            <div className="text-center py-8 text-gray-600">Loading available times...</div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {!loading && !error && slots.length === 0 && (
            <div className="text-center py-8 text-gray-600">
              No availability on this date. Please select another date.
            </div>
          )}

          {!loading && slots.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {slots.map((slot, index) => (
                <button
                  key={index}
                  onClick={() => onSelectSlot(slot.startAt)}
                  className={`p-3 rounded-lg border-2 text-sm transition-all ${
                    selectedSlot === slot.startAt
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-blue-300'
                  }`}
                >
                  {formatTime(slot.startAt)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3 pt-4">
        <button
          onClick={onBack}
          className="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={handleNext}
          disabled={!selectedSlot}
          className={`flex-1 px-6 py-2 rounded-lg font-semibold text-white ${
            selectedSlot
              ? 'bg-blue-600 hover:bg-blue-700'
              : 'bg-gray-400 cursor-not-allowed'
          }`}
        >
          Next
        </button>
      </div>
    </div>
  );
}
