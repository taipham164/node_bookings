'use client'

import { useEffect, useState } from 'react';
import { Barber, fetchBarbers } from '../../../lib/bookingApi';

interface BarberStepProps {
  shopId: string;
  selectedBarber: Barber | null;
  onSelectBarber: (barber: Barber) => void;
  onNext: () => void;
  onBack: () => void;
}

export function BarberStep({ shopId, selectedBarber, onSelectBarber, onNext, onBack }: BarberStepProps) {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadBarbers = async () => {
      try {
        setLoading(true);
        const data = await fetchBarbers(shopId);
        setBarbers(data.filter(b => b.active));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load barbers');
      } finally {
        setLoading(false);
      }
    };

    loadBarbers();
  }, [shopId]);

  const handleSelectAndNext = (barber: Barber) => {
    onSelectBarber(barber);
    onNext();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-600">Loading barbers...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Select a Barber</h2>
      <p className="text-gray-600">Choose your preferred barber</p>

      <div className="grid gap-4 mt-6">
        {barbers.map((barber) => (
          <button
            key={barber.id}
            onClick={() => handleSelectAndNext(barber)}
            className={`text-left p-4 rounded-lg border-2 transition-all ${
              selectedBarber?.id === barber.id
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 bg-white hover:border-blue-300'
            }`}
          >
            <h3 className="text-lg font-semibold text-gray-900">{barber.displayName}</h3>
          </button>
        ))}
      </div>

      <button
        onClick={onBack}
        className="mt-6 px-6 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
      >
        Back
      </button>
    </div>
  );
}
