'use client'

import { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { BookingWidget } from './BookingWidget';

export interface BookingHydratorProps {
  html: string;
  shopId: string;
}

/**
 * BookingHydrator scans rendered HTML for elements with data-booking-widget="true"
 * and mounts BookingWidget components into those containers.
 *
 * This enables booking widgets to be embedded in GrapesJS-built pages or any
 * custom HTML by simply adding: <div data-booking-widget="true"></div>
 */
export function BookingHydrator({ html, shopId }: BookingHydratorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rootsRef = useRef<any[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Set the HTML content
    containerRef.current.innerHTML = html;

    // Find all elements with data-booking-widget="true"
    const bookingContainers = containerRef.current.querySelectorAll(
      '[data-booking-widget="true"]'
    );

    // Mount BookingWidget into each container
    bookingContainers.forEach((container) => {
      const root = createRoot(container);
      root.render(<BookingWidget shopId={shopId} />);
      rootsRef.current.push(root);
    });

    // Cleanup function
    return () => {
      rootsRef.current.forEach((root) => {
        try {
          root.unmount();
        } catch (error) {
          // Ignore unmount errors
        }
      });
      rootsRef.current = [];
    };
  }, [html, shopId]);

  return <div ref={containerRef} />;
}
