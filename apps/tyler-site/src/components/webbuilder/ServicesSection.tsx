'use client'

import React, { useEffect, useState } from 'react'

interface Service {
  id: string
  name: string
  description?: string
  priceCents: number
  durationMins: number
}

interface ServicesSectionProps {
  title: string
  subtitle?: string
  layout?: 'grid' | 'list'
  limit?: number
  showPrices?: boolean
  showDuration?: boolean
  useThemeColors?: boolean
  customAccentColor?: string
}

export function ServicesSection({
  title,
  subtitle,
  layout = 'grid',
  limit = 6,
  showPrices = true,
  showDuration = true,
  useThemeColors = true,
  customAccentColor,
}: ServicesSectionProps) {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'
  const shopId = process.env.NEXT_PUBLIC_SHOP_ID || 'default-shop-id'

  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch(`${apiBaseUrl}/api/services?shopId=${shopId}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch services')
        }

        const data = await response.json()
        setServices(data.slice(0, limit))
      } catch (err) {
        console.error('Error fetching services:', err)
        setError(err instanceof Error ? err.message : 'Failed to load services')
      } finally {
        setLoading(false)
      }
    }

    fetchServices()
  }, [apiBaseUrl, shopId, limit])

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`
  }

  const formatDuration = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
    }
    return `${minutes}m`
  }

  if (loading) {
    return (
      <section className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">{title}</h2>
          {subtitle && <p className="text-center text-gray-600 mb-8">{subtitle}</p>}
          <div className="text-center text-gray-500">Loading services...</div>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">{title}</h2>
          {subtitle && <p className="text-center text-gray-600 mb-8">{subtitle}</p>}
          <div className="text-center text-red-500">
            <p className="font-medium">Unable to load services</p>
            <p className="text-sm mt-2">{error}</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-12 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-4">{title}</h2>
        {subtitle && <p className="text-center text-gray-600 mb-8">{subtitle}</p>}

        {services.length === 0 ? (
          <div className="text-center text-gray-500">No services available</div>
        ) : (
          <div
            className={
              layout === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                : 'space-y-4'
            }
          >
            {services.map((service) => (
              <div
                key={service.id}
                className={`
                  border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow
                  ${layout === 'list' ? 'flex justify-between items-start' : ''}
                `}
              >
                <div className={layout === 'list' ? 'flex-1' : ''}>
                  <h3 className="text-xl font-semibold mb-2">{service.name}</h3>
                  {service.description && (
                    <p className="text-gray-600 mb-3 text-sm">{service.description}</p>
                  )}
                  <div className="flex flex-wrap gap-3 text-sm">
                    {showPrices && (
                      <span
                        className="font-semibold"
                        style={{
                          color:
                            useThemeColors && !customAccentColor
                              ? 'var(--tp-accent)'
                              : customAccentColor || '#16a34a',
                        }}
                      >
                        {formatPrice(service.priceCents)}
                      </span>
                    )}
                    {showDuration && (
                      <span className="text-gray-500">
                        {formatDuration(service.durationMins)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
