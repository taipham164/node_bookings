import React from 'react';

export type TextImageSectionProps = {
  title: string;
  content: string;
  imageUrl?: string;
  imagePosition?: 'left' | 'right';
  backgroundColor?: string;
};

export default function TextImageSection({
  title,
  content,
  imageUrl,
  imagePosition = 'right',
  backgroundColor = '#ffffff',
}: TextImageSectionProps) {
  const isImageLeft = imagePosition === 'left';

  return (
    <section className="py-16 px-6" style={{ backgroundColor }}>
      <div className="max-w-6xl mx-auto">
        <div className={`flex flex-col ${isImageLeft ? 'md:flex-row-reverse' : 'md:flex-row'} gap-8 items-center`}>
          <div className="flex-1">
            <h2 className="text-3xl font-bold mb-4">{title}</h2>
            <div className="text-lg whitespace-pre-line">{content}</div>
          </div>
          {imageUrl && (
            <div className="flex-1">
              <img
                src={imageUrl}
                alt={title}
                className="w-full h-auto rounded-lg shadow-lg"
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
