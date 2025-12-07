'use client'

import { useBookingFlow } from '../../hooks/useBookingFlow';
import { ServiceStep } from './steps/ServiceStep';
import { BarberStep } from './steps/BarberStep';
import { DateTimeStep } from './steps/DateTimeStep';
import { DetailsStep } from './steps/DetailsStep';
import { ReviewStep } from './steps/ReviewStep';
import { ResultStep } from './steps/ResultStep';

export interface BookingWidgetProps {
  shopId: string;
}

export function BookingWidget({ shopId }: BookingWidgetProps) {
  const {
    step,
    goToNextStep,
    goToPreviousStep,
    selectedService,
    setSelectedService,
    selectedBarber,
    setSelectedBarber,
    selectedSlot,
    setSelectedSlot,
    customerInfo,
    setCustomerInfo,
    paymentMode,
    bookingResponse,
    loading,
    error,
    setError,
    submitBookingWithPayment,
    reset,
  } = useBookingFlow(shopId);

  // Render the appropriate step based on current state
  const renderStep = () => {
    switch (step) {
      case 'SERVICE':
        return (
          <ServiceStep
            shopId={shopId}
            selectedService={selectedService}
            onSelectService={setSelectedService}
            onNext={goToNextStep}
          />
        );

      case 'BARBER':
        return (
          <BarberStep
            shopId={shopId}
            selectedBarber={selectedBarber}
            onSelectBarber={setSelectedBarber}
            onNext={goToNextStep}
            onBack={goToPreviousStep}
          />
        );

      case 'DATETIME':
        if (!selectedService || !selectedBarber) {
          // Safety check - shouldn't happen in normal flow
          reset();
          return null;
        }
        return (
          <DateTimeStep
            shopId={shopId}
            service={selectedService}
            barber={selectedBarber}
            selectedSlot={selectedSlot}
            onSelectSlot={setSelectedSlot}
            onNext={goToNextStep}
            onBack={goToPreviousStep}
          />
        );

      case 'DETAILS':
        return (
          <DetailsStep
            customerInfo={customerInfo}
            onSetCustomerInfo={setCustomerInfo}
            onNext={goToNextStep}
            onBack={goToPreviousStep}
          />
        );

      case 'REVIEW':
        if (!selectedService || !selectedBarber || !selectedSlot || !customerInfo) {
          // Safety check - shouldn't happen in normal flow
          reset();
          return null;
        }
        return (
          <ReviewStep
            service={selectedService}
            barber={selectedBarber}
            selectedSlot={selectedSlot}
            customerInfo={customerInfo}
            paymentMode={paymentMode}
            loading={loading}
            error={error}
            onSubmitPayment={submitBookingWithPayment}
            onBack={goToPreviousStep}
          />
        );

      case 'RESULT':
        if (!bookingResponse) {
          // Safety check - shouldn't happen in normal flow
          reset();
          return null;
        }
        return <ResultStep bookingResponse={bookingResponse} onReset={reset} />;

      default:
        return null;
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          {['Service', 'Barber', 'Date/Time', 'Details', 'Review', 'Result'].map(
            (stepName, index) => {
              const stepKeys = ['SERVICE', 'BARBER', 'DATETIME', 'DETAILS', 'REVIEW', 'RESULT'];
              const currentIndex = stepKeys.indexOf(step);
              const isActive = index === currentIndex;
              const isCompleted = index < currentIndex;

              return (
                <div key={stepName} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : isCompleted
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {isCompleted ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : (
                        index + 1
                      )}
                    </div>
                    <div
                      className={`text-xs mt-1 hidden sm:block ${
                        isActive ? 'font-semibold text-blue-600' : 'text-gray-500'
                      }`}
                    >
                      {stepName}
                    </div>
                  </div>
                  {index < 5 && (
                    <div
                      className={`h-1 flex-1 mx-2 ${
                        isCompleted ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              );
            }
          )}
        </div>
      </div>

      {/* Step Content */}
      <div>{renderStep()}</div>
    </div>
  );
}
