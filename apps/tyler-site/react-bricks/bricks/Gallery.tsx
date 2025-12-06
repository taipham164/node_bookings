import React from 'react'
import { types, Text, Repeater, Image } from 'react-bricks'

interface GalleryItemProps {
  image: types.IImageSource
}

const GalleryItem: types.Brick<GalleryItemProps> = () => {
  return (
    <div className="aspect-square overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300">
      <Image
        propName="image"
        alt="Gallery image"
        imageClassName="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
      />
    </div>
  )
}

GalleryItem.schema = {
  name: 'gallery-item',
  label: 'Gallery Item',
  category: 'gallery',
  hideFromAddMenu: true,

  getDefaultProps: (): GalleryItemProps => ({
    image: {
      src: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=600',
      placeholderSrc: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=50',
      srcSet: '',
      alt: 'Gallery image',
      seoName: 'gallery-image',
    },
  }),
}

interface GalleryProps {
  title: string
}

const Gallery: types.Brick<GalleryProps> = () => {
  return (
    <section className="py-16 px-6 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <Text
          propName="title"
          placeholder="Enter gallery title..."
          renderBlock={({ children }) => (
            <h2 className="text-4xl font-bold mb-12 text-center text-gray-900">
              {children}
            </h2>
          )}
        />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          <Repeater propName="images" />
        </div>
      </div>
    </section>
  )
}

Gallery.schema = {
  name: 'gallery',
  label: 'Gallery',
  category: 'content sections',
  tags: ['gallery', 'images', 'portfolio'],

  getDefaultProps: (): GalleryProps => ({
    title: 'Our Work',
  }),

  repeaterItems: [
    {
      name: 'images',
      itemType: 'gallery-item',
      itemLabel: 'Image',
      min: 1,
      max: 24,
    },
  ],
}

export { Gallery, GalleryItem }
