import React from 'react';

export type TestimonialsSectionProps = {
  title: string;
  testimonials: Array<{
    name: string;
    quote: string;
    rating?: number;
  }>;
  backgroundColor?: string;
};

export default function TestimonialsSection({
  title,
  testimonials,
  backgroundColor = '#ffffff',
}: TestimonialsSectionProps) {
  return (
    <section className="py-16 px-6" style={{ backgroundColor }}>
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold mb-12 text-center">{title}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-white p-6 rounded-lg shadow-md border border-gray-100"
            >
              <div className="mb-4">
                {testimonial.rating && (
                  <div className="flex gap-1 mb-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span
                        key={i}
                        className={i < testimonial.rating! ? 'text-yellow-400' : 'text-gray-300'}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-gray-700 italic">"{testimonial.quote}"</p>
              </div>
              <p className="font-semibold text-gray-900">- {testimonial.name}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
