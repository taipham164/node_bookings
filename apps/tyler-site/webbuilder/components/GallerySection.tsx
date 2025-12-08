import React from 'react';

export type GallerySectionProps = {
  title: string;
  images: Array<{ url: string; alt: string }>;
  columns?: 2 | 3 | 4;
  backgroundColor?: string;
};

export default function GallerySection({
  title,
  images,
  columns = 3,
  backgroundColor = '#f9fafb',
}: GallerySectionProps) {
  const gridColsClass = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4',
  }[columns];

  return (
    <section className="py-16 px-6" style={{ backgroundColor }}>
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold mb-8 text-center">{title}</h2>
        <div className={`grid grid-cols-1 ${gridColsClass} gap-6`}>
          {images.map((image, index) => (
            <div key={index} className="aspect-square overflow-hidden rounded-lg shadow-md">
              <img
                src={image.url}
                alt={image.alt}
                className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
