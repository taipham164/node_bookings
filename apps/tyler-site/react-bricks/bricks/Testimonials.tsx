import React from 'react'
import { types, Text, Repeater } from 'react-bricks'

interface TestimonialItemProps {
  quote: string
  name: string
  role: string
}

const TestimonialItem: types.Brick<TestimonialItemProps> = () => {
  return (
    <div className="bg-gray-50 p-8 rounded-lg shadow-md">
      <Text
        propName="quote"
        placeholder="Enter testimonial quote..."
        renderBlock={({ children }) => (
          <p className="text-lg text-gray-700 mb-6 italic">
            &ldquo;{children}&rdquo;
          </p>
        )}
      />
      <div className="flex items-center gap-4">
        <div>
          <Text
            propName="name"
            placeholder="Customer name..."
            renderBlock={({ children }) => (
              <p className="font-bold text-gray-900">{children}</p>
            )}
          />
          <Text
            propName="role"
            placeholder="Role/description..."
            renderBlock={({ children }) => (
              <p className="text-sm text-gray-600">{children}</p>
            )}
          />
        </div>
      </div>
    </div>
  )
}

TestimonialItem.schema = {
  name: 'testimonial-item',
  label: 'Testimonial Item',
  category: 'testimonials',
  hideFromAddMenu: true,

  getDefaultProps: (): TestimonialItemProps => ({
    quote: 'Great service and amazing haircut!',
    name: 'John Doe',
    role: 'Regular Customer',
  }),
}

interface TestimonialsProps {
  title: string
}

const Testimonials: types.Brick<TestimonialsProps> = () => {
  return (
    <section className="py-16 px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        <Text
          propName="title"
          placeholder="Enter section title..."
          renderBlock={({ children }) => (
            <h2 className="text-4xl font-bold mb-12 text-center text-gray-900">
              {children}
            </h2>
          )}
        />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Repeater propName="items" />
        </div>
      </div>
    </section>
  )
}

Testimonials.schema = {
  name: 'testimonials',
  label: 'Testimonials',
  category: 'content sections',
  tags: ['testimonials', 'reviews', 'social proof'],

  getDefaultProps: (): TestimonialsProps => ({
    title: 'What Our Customers Say',
  }),

  repeaterItems: [
    {
      name: 'items',
      itemType: 'testimonial-item',
      itemLabel: 'Testimonial',
      min: 1,
      max: 12,
    },
  ],
}

export { Testimonials, TestimonialItem }
