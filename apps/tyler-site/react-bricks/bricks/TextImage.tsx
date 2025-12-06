import React from 'react'
import { types, Text, RichText, Image } from 'react-bricks'

interface TextImageProps {
  title: string
  body: string
  imagePosition: 'left' | 'right'
  imageUrl: types.IImageSource
}

const TextImage: types.Brick<TextImageProps> = ({ imagePosition }) => {
  return (
    <section className="py-16 px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        <div
          className={`grid md:grid-cols-2 gap-12 items-center ${
            imagePosition === 'right' ? '' : 'md:grid-flow-dense'
          }`}
        >
          {/* Text Content */}
          <div className={imagePosition === 'right' ? 'md:col-start-1' : 'md:col-start-2'}>
            <Text
              propName="title"
              placeholder="Enter section title..."
              renderBlock={({ children }) => (
                <h2 className="text-4xl font-bold mb-6 text-gray-900">
                  {children}
                </h2>
              )}
            />
            <RichText
              propName="body"
              placeholder="Enter content..."
              renderBlock={({ children }) => (
                <div className="text-lg text-gray-700 leading-relaxed space-y-4">
                  {children}
                </div>
              )}
              allowedFeatures={[
                types.RichTextFeatures.Bold,
                types.RichTextFeatures.Italic,
                types.RichTextFeatures.Highlight,
                types.RichTextFeatures.Link,
              ]}
            />
          </div>

          {/* Image */}
          <div className={imagePosition === 'right' ? 'md:col-start-2' : 'md:col-start-1'}>
            <Image
              propName="imageUrl"
              alt="Section image"
              imageClassName="w-full h-96 object-cover rounded-lg shadow-lg"
            />
          </div>
        </div>
      </div>
    </section>
  )
}

TextImage.schema = {
  name: 'textimage',
  label: 'Text + Image',
  category: 'content sections',
  tags: ['text', 'image', 'content'],

  getDefaultProps: (): TextImageProps => ({
    title: 'About Our Barbershop',
    body: 'We provide premium barbershop services with experienced barbers who are passionate about their craft. From classic cuts to modern styles, we have you covered.',
    imagePosition: 'right',
    imageUrl: {
      src: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800',
      placeholderSrc: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=50',
      srcSet: '',
      alt: 'Barbershop interior',
      seoName: 'barbershop-about',
    },
  }),

  sideEditProps: [
    {
      name: 'imagePosition',
      label: 'Image Position',
      type: types.SideEditPropType.Select,
      selectOptions: {
        display: types.OptionsDisplay.Radio,
        options: [
          { value: 'left', label: 'Left' },
          { value: 'right', label: 'Right' },
        ],
      },
    },
  ],
}

export default TextImage
