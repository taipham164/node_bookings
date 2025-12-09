'use client'

import { useState } from 'react';
import {
  Service,
  Barber,
  CustomerInfo,
  BookingWithPaymentResponse,
  createBookingWithPayment,
} from '../lib/bookingApi';

export type BookingStep =
  | 'SERVICE'
  | 'BARBER'
  | 'DATETIME'
  | 'DETAILS'
  | 'REVIEW'
  | 'RESULT';

export type PaymentMode = 'FULL' | 'DEPOSIT';

export interface UseBookingFlowReturn {
  // Current step
  step: BookingStep;
  setStep: (step: BookingStep) => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;

  // Selected data
  selectedService: Service | null;
  setSelectedService: (service: Service | null) => void;
  selectedBarber: Barber | null;
  setSelectedBarber: (barber: Barber | null) => void;
  selectedSlot: string | null; // ISO datetime
  setSelectedSlot: (slot: string | null) => void;
  customerInfo: CustomerInfo | null;
  setCustomerInfo: (info: CustomerInfo | null) => void;
  paymentMode: PaymentMode;
  setPaymentMode: (mode: PaymentMode) => void;

  // Booking result
  bookingResponse: BookingWithPaymentResponse | null;

  // Loading and error states
  loading: boolean;
  error: string | null;
  setError: (error: string | null) => void;

  // Actions
  submitBookingWithPayment: (paymentNonce: string) => Promise<void>;
  reset: () => void;

  // Computed
  canProceedToNextStep: () => boolean;
}

const STEP_ORDER: BookingStep[] = ['SERVICE', 'BARBER', 'DATETIME', 'DETAILS', 'REVIEW', 'RESULT'];

export function useBookingFlow(shopId: string): UseBookingFlowReturn {
  const [step, setStep] = useState<BookingStep>('SERVICE');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('FULL');
  const [bookingResponse, setBookingResponse] = useState<BookingWithPaymentResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goToNextStep = () => {
    const currentIndex = STEP_ORDER.indexOf(step);
    if (currentIndex < STEP_ORDER.length - 1) {
      setStep(STEP_ORDER[currentIndex + 1]);
    }
  };

  const goToPreviousStep = () => {
    const currentIndex = STEP_ORDER.indexOf(step);
    if (currentIndex > 0) {
      setStep(STEP_ORDER[currentIndex - 1]);
    }
  };

  const canProceedToNextStep = (): boolean => {
    switch (step) {
      case 'SERVICE':
        return selectedService !== null;
      case 'BARBER':
        return selectedBarber !== null;
      case 'DATETIME':
        return selectedSlot !== null;
      case 'DETAILS':
        return customerInfo !== null &&
               !!customerInfo.firstName &&
               !!customerInfo.lastName &&
               !!customerInfo.phone;
      case 'REVIEW':
        return false; // Review step doesn't proceed automatically
      case 'RESULT':
        return false; // Result is the final step
      default:
        return false;
    }
  };

  const submitBookingWithPayment = async (paymentNonce: string): Promise<void> => {
    if (!selectedService || !selectedSlot || !customerInfo) {
      setError('Missing required booking information');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await createBookingWithPayment({
        shopId,
        serviceId: selectedService.id,
        barberId: selectedBarber?.id,
        startAt: selectedSlot,
        customer: customerInfo,
        paymentNonce,
        paymentMode,
      });

      setBookingResponse(response);
      setStep('RESULT');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment or booking failed';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep('SERVICE');
    setSelectedService(null);
    setSelectedBarber(null);
    setSelectedSlot(null);
    setCustomerInfo(null);
    setPaymentMode('FULL');
    setBookingResponse(null);
    setLoading(false);
    setError(null);
  };

  return {
    step,
    setStep,
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
    setPaymentMode,
    bookingResponse,
    loading,
    error,
    setError,
    submitBookingWithPayment,
    reset,
    canProceedToNextStep,
  };
}
