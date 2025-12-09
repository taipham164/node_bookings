'use client'

import React, { useEffect, useState } from 'react'
import { Puck } from '@measured/puck'
import '@measured/puck/puck.css'
import { ServicesSection } from '@/components/webbuilder/ServicesSection'
import { BookingCtaSection } from '@/components/webbuilder/BookingCtaSection'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'
const SHOP_ID = process.env.NEXT_PUBLIC_SHOP_ID || 'default-shop-id'

// Define Puck components config
const config = {
  components: {
    HeadingBlock: {
      fields: {
        title: { type: 'text' },
        level: { type: 'select', options: [
          { label: 'H1', value: 'h1' },
          { label: 'H2', value: 'h2' },
          { label: 'H3', value: 'h3' },
        ]},
      },
      defaultProps: { title: 'Heading', level: 'h1' },
      render: ({ title, level }: any) => {
        const Tag = level
        return <Tag style={{ margin: '20px 0' }}>{title}</Tag>
      },
    },
    TextBlock: {
      fields: {
        content: { type: 'textarea' },
      },
      defaultProps: { content: 'Enter text here' },
      render: ({ content }: any) => <p style={{ margin: '15px 0', lineHeight: '1.6' }}>{content}</p>,
    },
    ImageBlock: {
      fields: {
        src: { type: 'text' },
        alt: { type: 'text' },
      },
      defaultProps: { src: '', alt: 'Image' },
      render: ({ src, alt }: any) => <img src={src} alt={alt} style={{ maxWidth: '100%', height: 'auto' }} />,
    },
    BookingWidget: {
      fields: {
        title: { type: 'text' },
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
        title: { type: 'text' },
        subtitle: { type: 'textarea' },
        layout: {
          type: 'radio',
          options: [
            { label: 'Grid', value: 'grid' },
            { label: 'List', value: 'list' },
          ],
        },
        limit: { type: 'number' },
        showPrices: { type: 'radio', options: [
          { label: 'Yes', value: true },
          { label: 'No', value: false },
        ]},
        showDuration: { type: 'radio', options: [
          { label: 'Yes', value: true },
          { label: 'No', value: false },
        ]},
        useThemeColors: { type: 'radio', options: [
          { label: 'Yes', value: true },
          { label: 'No', value: false },
        ]},
        customAccentColor: { type: 'text' },
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
        title: { type: 'text' },
        subtitle: { type: 'textarea' },
        buttonLabel: { type: 'text' },
        bookingHref: { type: 'text' },
        scrollTargetId: { type: 'text' },
        useThemeColors: { type: 'radio', options: [
          { label: 'Yes', value: true },
          { label: 'No', value: false },
        ]},
        customPrimaryColor: { type: 'text' },
        customAccentColor: { type: 'text' },
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
}

export default function BuilderPage() {
  const [pageData, setPageData] = useState<any>(null)
  const [pageId, setPageId] = useState<string | null>(null)
  const [slug, setSlug] = useState<string>('home')
  const [pageTitle, setPageTitle] = useState<string>('Home Page')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string>('')

  useEffect(() => {
    loadPage()
  }, [])

  const loadPage = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/pages/home?shopId=${SHOP_ID}`)
      if (response.ok) {
        const page = await response.json()
        setPageId(page.id)
        setSlug(page.slug || 'home')
        setPageTitle(page.title || 'Home Page')
        try {
          const data = JSON.parse(page.html || '{}')
          setPageData(data)
        } catch {
          setPageData({ root: { type: 'div', children: [] } })
        }
        setMessage('Page loaded successfully')
      } else {
        // No existing page, create default template
        const defaultData = {
          root: {
            type: 'div',
            children: [
              {
                type: 'HeadingBlock',
                props: { title: "Welcome to Tyler's Barbershop", level: 'h1' },
              },
              {
                type: 'TextBlock',
                props: { content: 'Professional grooming services' },
              },
            ],
          },
        }
        setPageData(defaultData)
        setMessage('No existing page found. Starting with default template.')
      }
    } catch (error) {
      console.error('Error loading page:', error)
      setPageData({ root: { type: 'div', children: [] } })
      setMessage('Starting with blank template.')
    }
  }

  const handleSave = async (data: any, isDraft: boolean = false) => {
    setSaving(true)
    setMessage('')

    try {
      const htmlString = JSON.stringify(data)

      if (pageId) {
        // Update existing page
        const response = await fetch(`${API_BASE_URL}/api/pages/${pageId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            html: htmlString,
            title: pageTitle,
            slug: slug,
          }),
        })

        if (response.ok) {
          setMessage(isDraft ? 'Draft saved!' : 'Page published successfully!')
        } else {
          const error = await response.text()
          setMessage(`Error saving page: ${error}`)
        }
      } else {
        // Create new page
        const response = await fetch(`${API_BASE_URL}/api/pages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shopId: SHOP_ID,
            slug: slug,
            title: pageTitle,
            html: htmlString,
            isHome: slug === 'home',
          }),
        })

        if (response.ok) {
          const page = await response.json()
          setPageId(page.id)
          setMessage(isDraft ? 'Draft created!' : 'Page published successfully!')
        } else {
          const error = await response.text()
          setMessage(`Error creating page: ${error}`)
        }
      }
    } catch (error) {
      console.error('Error saving page:', error)
      setMessage('Error saving page. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handlePreview = () => {
    const previewUrl = slug === 'home' ? '/' : `/${slug}`
    window.open(previewUrl, '_blank')
  }

  if (!pageData) {
    return <div style={{ padding: '20px' }}>Loading...</div>
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Page Settings Bar */}
      <div style={{
        background: '#1a1a1a',
        color: 'white',
        padding: '12px 20px',
        display: 'flex',
        gap: '20px',
        alignItems: 'center',
        borderBottom: '1px solid #333',
      }}>
        <div style={{ display: 'flex', gap: '10px', flex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.75em', opacity: 0.8 }}>Page Title</label>
            <input
              type="text"
              value={pageTitle}
              onChange={(e) => setPageTitle(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: '4px',
                border: '1px solid #444',
                background: '#2d2d2d',
                color: 'white',
                fontSize: '0.9em',
                minWidth: '200px',
              }}
              placeholder="Page Title"
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.75em', opacity: 0.8 }}>Slug</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
              style={{
                padding: '6px 10px',
                borderRadius: '4px',
                border: '1px solid #444',
                background: '#2d2d2d',
                color: 'white',
                fontSize: '0.9em',
                minWidth: '150px',
              }}
              placeholder="page-slug"
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', fontSize: '0.85em', opacity: 0.7 }}>
            URL: /{slug === 'home' ? '' : slug}
          </div>
        </div>
        {message && (
          <span style={{
            fontSize: '0.85em',
            padding: '6px 12px',
            background: message.includes('Error') ? '#e74c3c' : '#27ae60',
            borderRadius: '4px',
          }}>
            {message}
          </span>
        )}
      </div>

      <Puck
        config={config}
        data={pageData}
        onPublish={(data) => {
          setPageData(data)
          handleSave(data, false)
        }}
        renderHeader={({ children }) => (
          <div style={{
            background: '#2d2d2d',
            color: 'white',
            padding: '15px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
              <h1 style={{ margin: 0, fontSize: '1.5em' }}>Puck Page Builder</h1>
              <a
                href="/admin/theme"
                style={{
                  padding: '6px 12px',
                  background: '#7c3aed',
                  color: 'white',
                  borderRadius: '4px',
                  textDecoration: 'none',
                  fontSize: '0.85em',
                  display: 'inline-block'
                }}
              >
                Theme Settings
              </a>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                onClick={() => handleSave(pageData, true)}
                disabled={saving}
                style={{
                  padding: '8px 16px',
                  background: '#555',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontSize: '0.9em',
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? 'Saving...' : 'Save Draft'}
              </button>
              <button
                onClick={handlePreview}
                style={{
                  padding: '8px 16px',
                  background: '#3498db',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.9em',
                }}
              >
                Preview
              </button>
              {children}
            </div>
          </div>
        )}
      />
    </div>
  )
}

