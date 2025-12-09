import React from 'react';

export type HeroSectionProps = {
  title: string;
  subtitle: string;
  backgroundImage?: string;
  backgroundColor?: string;
  textColor?: string;
};

export default function HeroSection({
  title,
  subtitle,
  backgroundImage,
  backgroundColor = '#667eea',
  textColor = '#ffffff',
}: HeroSectionProps) {
  return (
    <section
      className="relative py-20 px-6 text-center"
      style={{
        backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
        backgroundColor: !backgroundImage ? backgroundColor : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        color: textColor,
      }}
    >
      <div className="max-w-4xl mx-auto relative z-10">
        <h1 className="text-5xl font-bold mb-4">{title}</h1>
        <p className="text-xl">{subtitle}</p>
      </div>
      {backgroundImage && (
        <div className="absolute inset-0 bg-black opacity-40 z-0"></div>
      )}
    </section>
  );
}
