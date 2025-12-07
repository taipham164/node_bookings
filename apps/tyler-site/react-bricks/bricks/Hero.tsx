import React from 'react'
import { types, Text, RichText, Image } from 'react-bricks'

interface HeroProps {
  title: string
  subtitle: string
  backgroundImage: types.IImageSource
}

const Hero: types.Brick<HeroProps> = ({ title, subtitle, backgroundImage }) => {
  return (
    <section className="relative min-h-[600px] flex items-center justify-center bg-gray-900 text-white overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          propName="backgroundImage"
          alt="Hero background"
          imageClassName="w-full h-full object-cover opacity-50"
        />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        <Text
          propName="title"
          placeholder="Enter hero title..."
          renderBlock={({ children }) => (
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              {children}
            </h1>
          )}
        />
        <RichText
          propName="subtitle"
          placeholder="Enter subtitle..."
          renderBlock={({ children }) => (
            <p className="text-xl md:text-2xl mb-8 text-gray-200">
              {children}
            </p>
          )}
          allowedFeatures={[types.RichTextFeatures.Bold, types.RichTextFeatures.Italic]}
        />
      </div>
    </section>
  )
}

Hero.schema = {
  name: 'hero',
  label: 'Hero',
  category: 'hero sections',
  tags: ['hero', 'header', 'banner'],

  getDefaultProps: (): HeroProps => ({
    title: "Tyler's Barbershop",
    subtitle: 'Professional cuts, timeless style',
    backgroundImage: {
      src: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=1920',
      placeholderSrc: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=50',
      srcSet: '',
      alt: 'Barbershop',
      seoName: 'barbershop-hero',
    },
  }),

  sideEditProps: [],
}

export default Hero
