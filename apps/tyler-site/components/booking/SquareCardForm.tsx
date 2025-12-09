'use client'

import { useEffect, useRef, useState } from 'react';

// Extend Window interface to include Square
declare global {
  interface Window {
    Square?: any;
  }
}

export interface SquareCardFormProps {
  amountCents: number;
  onNonce: (nonce: string) => Promise<void>;
  loading?: boolean;
}

export function SquareCardForm({ amountCents, onNonce, loading = false }: SquareCardFormProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const cardRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const appId = process.env.NEXT_PUBLIC_SQUARE_APP_ID;
  const locationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID;
  const environment = process.env.NEXT_PUBLIC_SQUARE_ENVIRONMENT || 'sandbox';

  // Format amount for display
  const amountDollars = (amountCents / 100).toFixed(2);

  useEffect(() => {
    if (!appId || !locationId) {
      setError('Square configuration is missing. Please check environment variables.');
      return;
    }

    // Load Square.js script
    const scriptUrl =
      environment === 'production'
        ? 'https://web.squarecdn.com/v1/square.js'
        : 'https://sandbox.web.squarecdn.com/v1/square.js';

    const script = document.createElement('script');
    script.src = scriptUrl;
    script.async = true;

    script.onload = async () => {
      if (!window.Square) {
        setError('Square.js failed to load');
        return;
      }

      try {
        // Initialize Square Payments
        const payments = window.Square.payments(appId, locationId);

        // Initialize Card payment method
        const card = await payments.card();
        await card.attach('#card-container');

        cardRef.current = card;
        setIsLoaded(true);
      } catch (err) {
        console.error('Failed to initialize Square Payments:', err);
        setError('Failed to initialize payment form');
      }
    };

    script.onerror = () => {
      setError('Failed to load Square payment SDK');
    };

    document.body.appendChild(script);

    // Cleanup
    return () => {
      if (cardRef.current) {
        cardRef.current.destroy();
      }
      document.body.removeChild(script);
    };
  }, [appId, locationId, environment]);

  const handlePayment = async () => {
    if (!cardRef.current || isProcessing || loading) return;

    setIsProcessing(true);
    setError(null);

    try {
      // Tokenize the card
      const result = await cardRef.current.tokenize();

      if (result.status === 'OK') {
        // Call the parent's onNonce callback with the token
        await onNonce(result.token);
      } else {
        // Handle tokenization errors
        let errorMessage = 'Card verification failed';

        if (result.errors && result.errors.length > 0) {
          errorMessage = result.errors.map((e: any) => e.message).join(', ');
        }

        setError(errorMessage);
        setIsProcessing(false);
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError(err instanceof Error ? err.message : 'Payment processing failed');
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Amount Display */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <div className="flex justify-between items-center">
          <span className="text-gray-700 font-medium">Amount to charge:</span>
          <span className="text-2xl font-bold text-gray-900">${amountDollars}</span>
        </div>
      </div>

      {/* Card Form Container */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          Card Details
        </label>

        {/* Square will mount the card input here */}
        <div
          id="card-container"
          ref={containerRef}
          className="min-h-[120px] border border-gray-300 rounded-lg p-3 bg-white"
        />

        {!isLoaded && !error && (
          <div className="text-sm text-gray-500">Loading payment form...</div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Pay Button */}
      <button
        onClick={handlePayment}
        disabled={!isLoaded || isProcessing || loading}
        className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-colors ${
          !isLoaded || isProcessing || loading
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {isProcessing || loading ? 'Processing...' : `Pay $${amountDollars} & Book`}
      </button>

      {/* Security Notice */}
      <div className="text-xs text-gray-500 text-center">
        <svg
          className="inline w-4 h-4 mr-1"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
            clipRule="evenodd"
          />
        </svg>
        Secured by Square
      </div>
    </div>
  );
}
