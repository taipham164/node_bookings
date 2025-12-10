import React from 'react';
import type { Config } from '@measured/puck';
import HeroSection, { HeroSectionProps } from './components/HeroSection';
import TextImageSection, { TextImageSectionProps } from './components/TextImageSection';
import GallerySection, { GallerySectionProps } from './components/GallerySection';
import TestimonialsSection, { TestimonialsSectionProps } from './components/TestimonialsSection';
import BookingSection, { BookingSectionProps } from './components/BookingSection';

type Props = {
  HeroSection: HeroSectionProps;
  TextImageSection: TextImageSectionProps;
  GallerySection: GallerySectionProps;
  TestimonialsSection: TestimonialsSectionProps;
  BookingSection: BookingSectionProps;
};

export const config: Config<Props> = {
  components: {
    HeroSection: {
      fields: {
        title: { type: 'text', label: 'Title' },
        subtitle: { type: 'text', label: 'Subtitle' },
        backgroundImage: { type: 'text', label: 'Background Image URL (optional)' },
        backgroundColor: { type: 'text', label: 'Background Color' },
        textColor: { type: 'text', label: 'Text Color' },
      },
      defaultProps: {
        title: 'Welcome to Tyler\'s Barbershop',
        subtitle: 'Professional grooming services',
        backgroundColor: '#667eea',
        textColor: '#ffffff',
      },
      render: ({ title, subtitle, backgroundImage, backgroundColor, textColor }) => (
        <HeroSection
          title={title}
          subtitle={subtitle}
          backgroundImage={backgroundImage}
          backgroundColor={backgroundColor}
          textColor={textColor}
        />
      ),
    },
    TextImageSection: {
      fields: {
        title: { type: 'text', label: 'Title' },
        content: { type: 'textarea', label: 'Content' },
        imageUrl: { type: 'text', label: 'Image URL (optional)' },
        imagePosition: {
          type: 'radio',
          label: 'Image Position',
          options: [
            { label: 'Left', value: 'left' },
            { label: 'Right', value: 'right' },
          ],
        },
        backgroundColor: { type: 'text', label: 'Background Color' },
      },
      defaultProps: {
        title: 'About Us',
        content: 'Tell your story here...',
        imagePosition: 'right' as const,
        backgroundColor: '#ffffff',
      },
      render: ({ title, content, imageUrl, imagePosition, backgroundColor }) => (
        <TextImageSection
          title={title}
          content={content}
          imageUrl={imageUrl}
          imagePosition={imagePosition}
          backgroundColor={backgroundColor}
        />
      ),
    },
    GallerySection: {
      fields: {
        title: { type: 'text', label: 'Title' },
        images: {
          type: 'array',
          label: 'Images',
          arrayFields: {
            url: { type: 'text', label: 'Image URL' },
            alt: { type: 'text', label: 'Alt Text' },
          },
        },
        columns: {
          type: 'radio',
          label: 'Columns',
          options: [
            { label: '2', value: 2 },
            { label: '3', value: 3 },
            { label: '4', value: 4 },
          ],
        },
        backgroundColor: { type: 'text', label: 'Background Color' },
      },
      defaultProps: {
        title: 'Gallery',
        images: [
          { url: 'https://via.placeholder.com/400', alt: 'Gallery image 1' },
          { url: 'https://via.placeholder.com/400', alt: 'Gallery image 2' },
          { url: 'https://via.placeholder.com/400', alt: 'Gallery image 3' },
        ],
        columns: 3 as const,
        backgroundColor: '#f9fafb',
      },
      render: ({ title, images, columns, backgroundColor }) => (
        <GallerySection
          title={title}
          images={images}
          columns={columns}
          backgroundColor={backgroundColor}
        />
      ),
    },
    TestimonialsSection: {
      fields: {
        title: { type: 'text', label: 'Title' },
        testimonials: {
          type: 'array',
          label: 'Testimonials',
          arrayFields: {
            name: { type: 'text', label: 'Customer Name' },
            quote: { type: 'textarea', label: 'Quote' },
            rating: { type: 'number', label: 'Rating (1-5)', min: 1, max: 5 },
          },
        },
        backgroundColor: { type: 'text', label: 'Background Color' },
      },
      defaultProps: {
        title: 'What Our Customers Say',
        testimonials: [
          {
            name: 'John Doe',
            quote: 'Best haircut I\'ve ever had!',
            rating: 5,
          },
          {
            name: 'Jane Smith',
            quote: 'Professional and friendly service.',
            rating: 5,
          },
        ],
        backgroundColor: '#ffffff',
      },
      render: ({ title, testimonials, backgroundColor }) => (
        <TestimonialsSection
          title={title}
          testimonials={testimonials}
          backgroundColor={backgroundColor}
        />
      ),
    },
    BookingSection: {
      fields: {
        title: { type: 'text', label: 'Title' },
        subtitle: { type: 'text', label: 'Subtitle' },
        backgroundColor: { type: 'text', label: 'Background Color' },
      },
      defaultProps: {
        title: 'Book Your Appointment',
        subtitle: 'Book your appointment online',
        backgroundColor: '#667eea',
      },
      render: ({ title, subtitle, backgroundColor }) => (
        <BookingSection
          title={title}
          subtitle={subtitle}
          backgroundColor={backgroundColor}
        />
      ),
    },
  },
};

export default config;
