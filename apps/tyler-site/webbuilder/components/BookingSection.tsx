import React from 'react';

export type BookingSectionProps = {
  title: string;
  subtitle?: string;
  backgroundColor?: string;
};

export default function BookingSection({
  title,
  subtitle = 'Book your appointment online',
  backgroundColor = '#667eea',
}: BookingSectionProps) {
  return (
    <section className="py-16 px-6" style={{ backgroundColor }}>
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-4 text-white">{title}</h2>
        {subtitle && <p className="text-xl text-white mb-8">{subtitle}</p>}
        <div
          data-booking-widget="true"
          className="min-h-[400px] bg-white bg-opacity-10 rounded-lg p-8 text-white"
        >
          <p className="text-lg">The booking widget will appear here on the live site</p>
        </div>
      </div>
    </section>
  );
}
