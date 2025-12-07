import { types } from 'react-bricks'
import Hero from './Hero'
import TextImage from './TextImage'
import { Testimonials, TestimonialItem } from './Testimonials'
import { Gallery, GalleryItem } from './Gallery'
import BookingSection from './BookingSection'

const bricks: types.Brick<any>[] = [
  Hero,
  TextImage,
  Testimonials,
  TestimonialItem,
  Gallery,
  GalleryItem,
  BookingSection,
]

export default bricks
