'use client'

import { useEffect, useState } from 'react';
import { Service, fetchServices } from '../../../lib/bookingApi';

interface ServiceStepProps {
  shopId: string;
  selectedService: Service | null;
  onSelectService: (service: Service) => void;
  onNext: () => void;
}

export function ServiceStep({ shopId, selectedService, onSelectService, onNext }: ServiceStepProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadServices = async () => {
      try {
        setLoading(true);
        const data = await fetchServices(shopId);
        setServices(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load services');
      } finally {
        setLoading(false);
      }
    };

    loadServices();
  }, [shopId]);

  const handleSelectAndNext = (service: Service) => {
    onSelectService(service);
    onNext();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-600">Loading services...</div>
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
      <h2 className="text-2xl font-bold text-gray-900">Select a Service</h2>
      <p className="text-gray-600">Choose the service you'd like to book</p>

      <div className="grid gap-4 mt-6">
        {services.map((service) => (
          <button
            key={service.id}
            onClick={() => handleSelectAndNext(service)}
            className={`text-left p-4 rounded-lg border-2 transition-all ${
              selectedService?.id === service.id
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 bg-white hover:border-blue-300'
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{service.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{service.durationMinutes} minutes</p>
              </div>
              <div className="text-right">
                <span className="text-xl font-bold text-gray-900">
                  ${(service.priceCents / 100).toFixed(2)}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
