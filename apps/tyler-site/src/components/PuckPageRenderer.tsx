'use client';

import React from 'react';
import { Render } from '@measured/puck';
import { ServicesSection } from '@/src/components/webbuilder/ServicesSection';
import { BookingCtaSection } from '@/src/components/webbuilder/BookingCtaSection';

// Puck config for rendering (read-only)
const config = {
  components: {
    HeadingBlock: {
      fields: {
        title: { type: 'text' as const },
        level: { type: 'select' as const, options: [
          { label: 'H1', value: 'h1' },
          { label: 'H2', value: 'h2' },
          { label: 'H3', value: 'h3' },
        ]},
      },
      defaultProps: { title: 'Heading', level: 'h1' },
      render: ({ title, level }: any) => {
        const Tag = level;
        return <Tag style={{ margin: '20px 0' }}>{title}</Tag>;
      },
    },
    TextBlock: {
      fields: {
        content: { type: 'textarea' as const },
      },
      defaultProps: { content: 'Enter text here' },
      render: ({ content }: any) => <p style={{ margin: '15px 0', lineHeight: '1.6' }}>{content}</p>,
    },
    ImageBlock: {
      fields: {
        src: { type: 'text' as const },
        alt: { type: 'text' as const },
      },
      defaultProps: { src: '', alt: 'Image' },
      render: ({ src, alt }: any) => <img src={src} alt={alt} style={{ maxWidth: '100%', height: 'auto' }} />,
    },
    BookingWidget: {
      fields: {
        title: { type: 'text' as const },
      },
      defaultProps: { title: 'Book Your Appointment' },
      render: ({ title }: any) => (
        <div style={{
          minHeight: '400px',
          padding: '40px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          textAlign: 'center',
          borderRadius: '12px',
        }}>
          <h2 style={{ marginBottom: '20px', fontSize: '2em' }}>{title}</h2>
          <p style={{ fontSize: '1.2em' }}>Booking widget will appear here on live site</p>
        </div>
      ),
    },
    ServicesSection: {
      fields: {
        title: { type: 'text' as const },
        subtitle: { type: 'textarea' as const },
        layout: { type: 'radio' as const, options: [
          { label: 'Grid', value: 'grid' },
          { label: 'List', value: 'list' },
        ]},
        limit: { type: 'number' as const },
        showPrices: { type: 'radio' as const, options: [
          { label: 'Yes', value: true },
          { label: 'No', value: false },
        ]},
        showDuration: { type: 'radio' as const, options: [
          { label: 'Yes', value: true },
          { label: 'No', value: false },
        ]},
        useThemeColors: { type: 'radio' as const, options: [
          { label: 'Yes', value: true },
          { label: 'No', value: false },
        ]},
        customAccentColor: { type: 'text' as const },
      },
      defaultProps: {
        title: 'Our Services',
        subtitle: '',
        layout: 'grid',
        limit: 6,
        showPrices: true,
        showDuration: true,
        useThemeColors: true,
        customAccentColor: '',
      },
      render: (props: any) => <ServicesSection {...props} />,
    },
    BookingCtaSection: {
      fields: {
        title: { type: 'text' as const },
        subtitle: { type: 'textarea' as const },
        buttonLabel: { type: 'text' as const },
        bookingHref: { type: 'text' as const },
        scrollTargetId: { type: 'text' as const },
        useThemeColors: { type: 'radio' as const, options: [
          { label: 'Yes', value: true },
          { label: 'No', value: false },
        ]},
        customPrimaryColor: { type: 'text' as const },
        customAccentColor: { type: 'text' as const },
      },
      defaultProps: {
        title: 'Ready for a fresh cut?',
        subtitle: 'Book your next appointment in a few clicks.',
        buttonLabel: 'Book Now',
        bookingHref: '/booking',
        scrollTargetId: '',
        useThemeColors: true,
        customPrimaryColor: '',
        customAccentColor: '',
      },
      render: (props: any) => <BookingCtaSection {...props} />,
    },
  },
};

interface PuckPageRendererProps {
  data: any;
}

export function PuckPageRenderer({ data }: PuckPageRendererProps) {
  if (!data) {
    return <div>No content</div>;
  }

  return <Render config={config} data={data} />;
}
