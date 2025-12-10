/**
 * Booking API client for tyler-site
 * Communicates with apps/backend endpoints
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

export interface Service {
  id: string;
  name: string;
  durationMins: number;
  priceCents: number;
  squareCatalogObjectId: string;
  shopId: string;
}

export interface Barber {
  id: string;
  displayName: string;
  squareTeamMemberId: string;
  active: boolean;
  shopId: string;
}

export interface AvailabilitySlot {
  startAt: string; // ISO datetime
  durationMins: number;
}

export interface CustomerInfo {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
}

export interface BookingWithPaymentPayload {
  shopId: string;
  serviceId: string;
  barberId?: string;
  startAt: string; // ISO datetime
  customer: CustomerInfo;
  paymentNonce: string;
  paymentMode: 'FULL' | 'DEPOSIT';
}

export interface BookingWithPaymentResponse {
  success: boolean;
  appointment?: {
    id: string;
    shopId: string;
    serviceId: string;
    barberId: string;
    customerId: string;
    startAt: string;
    endAt: string;
    squareBookingId: string;
    status: string;
    service: {
      id: string;
      name: string;
      durationMins: number;
      priceCents: number;
    };
    barber: {
      id: string;
      displayName: string;
    };
    customer: {
      id: string;
      firstName: string;
      lastName: string;
      phone: string;
      email?: string;
    };
  };
  payment?: {
    id: string;
    squarePaymentId: string;
    amountCents: number;
    currency: string;
    status: string;
  };
  squareBookingId?: string;
  message?: string;
}

/**
 * Fetch all services for a shop
 */
export async function fetchServices(shopId: string): Promise<Service[]> {
  const response = await fetch(`${API_BASE_URL}/api/services?shopId=${shopId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch services: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Fetch all barbers for a shop
 */
export async function fetchBarbers(shopId: string): Promise<Barber[]> {
  const response = await fetch(`${API_BASE_URL}/api/barbers?shopId=${shopId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch barbers: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Fetch available time slots for a service and barber on a specific date
 */
export async function fetchAvailability(params: {
  shopId: string;
  serviceId: string;
  barberId?: string;
  date: string; // YYYY-MM-DD
}): Promise<AvailabilitySlot[]> {
  const queryParams = new URLSearchParams({
    shopId: params.shopId,
    serviceId: params.serviceId,
    date: params.date,
  });

  if (params.barberId) {
    queryParams.append('barberId', params.barberId);
  }

  const response = await fetch(`${API_BASE_URL}/api/availability?${queryParams.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch availability: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Create a booking with payment
 * This is the main endpoint for the booking flow with Square payment integration
 */
export async function createBookingWithPayment(
  payload: BookingWithPaymentPayload
): Promise<BookingWithPaymentResponse> {
  const response = await fetch(`${API_BASE_URL}/api/appointments/bookings-with-payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    // Parse error message from backend if available
    const errorMessage = data.message || data.error || 'Booking or payment failed';
    throw new Error(errorMessage);
  }

  return data;
}
