'use client'

import React, { useState, useEffect } from 'react'

interface BookingWidgetProps {
  shopId: string
}

interface Service {
  id: string
  name: string
  durationMinutes: number
  priceCents: number
}

interface Barber {
  id: string
  displayName: string
}

export default function BookingWidget({ shopId }: BookingWidgetProps) {
  const [services, setServices] = useState<Service[]>([])
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [selectedService, setSelectedService] = useState<string>('')
  const [selectedBarber, setSelectedBarber] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'

  useEffect(() => {
    loadData()
  }, [shopId])

  const loadData = async () => {
    try {
      setLoading(true)

      // Fetch services
      const servicesRes = await fetch(`${API_BASE_URL}/api/services?shopId=${shopId}`)
      if (servicesRes.ok) {
        const servicesData = await servicesRes.json()
        setServices(servicesData)
      }

      // Fetch barbers
      const barbersRes = await fetch(`${API_BASE_URL}/api/barbers?shopId=${shopId}`)
      if (barbersRes.ok) {
        const barbersData = await barbersRes.json()
        setBarbers(barbersData.filter((b: Barber & { active: boolean }) => b.active))
      }

      setLoading(false)
    } catch (err) {
      setError('Failed to load booking data')
      setLoading(false)
    }
  }

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`
  }

  if (loading) {
    return (
      <div style={{
        padding: '60px 20px',
        textAlign: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        borderRadius: '12px',
        minHeight: '400px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div>
          <div style={{
            width: '50px',
            height: '50px',
            border: '5px solid rgba(255,255,255,0.3)',
            borderTop: '5px solid white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }}></div>
          <p style={{ marginTop: '20px', fontSize: '1.2em' }}>Loading booking options...</p>
        </div>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        padding: '60px 20px',
        textAlign: 'center',
        background: '#e74c3c',
        color: 'white',
        borderRadius: '12px',
        minHeight: '400px'
      }}>
        <h3 style={{ fontSize: '1.8em', marginBottom: '20px' }}>⚠️ Error</h3>
        <p style={{ fontSize: '1.2em' }}>{error}</p>
      </div>
    )
  }

  return (
    <div style={{
      padding: '60px 20px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      borderRadius: '12px',
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      <h2 style={{
        fontSize: '2.5em',
        marginBottom: '40px',
        textAlign: 'center',
        fontWeight: 'bold'
      }}>
        Book Your Appointment
      </h2>

      <div style={{
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        borderRadius: '12px',
        padding: '40px',
        border: '1px solid rgba(255, 255, 255, 0.2)'
      }}>
        {/* Service Selection */}
        <div style={{ marginBottom: '30px' }}>
          <label style={{
            display: 'block',
            fontSize: '1.2em',
            marginBottom: '10px',
            fontWeight: '500'
          }}>
            Select Service
          </label>
          <select
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            style={{
              width: '100%',
              padding: '15px',
              fontSize: '1.1em',
              borderRadius: '8px',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              background: 'rgba(255, 255, 255, 0.9)',
              color: '#333',
              cursor: 'pointer'
            }}
          >
            <option value="">Choose a service...</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name} - {formatPrice(service.priceCents)} ({service.durationMinutes} min)
              </option>
            ))}
          </select>
        </div>

        {/* Barber Selection */}
        <div style={{ marginBottom: '30px' }}>
          <label style={{
            display: 'block',
            fontSize: '1.2em',
            marginBottom: '10px',
            fontWeight: '500'
          }}>
            Select Barber
          </label>
          <select
            value={selectedBarber}
            onChange={(e) => setSelectedBarber(e.target.value)}
            style={{
              width: '100%',
              padding: '15px',
              fontSize: '1.1em',
              borderRadius: '8px',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              background: 'rgba(255, 255, 255, 0.9)',
              color: '#333',
              cursor: 'pointer'
            }}
          >
            <option value="">Choose a barber...</option>
            {barbers.map((barber) => (
              <option key={barber.id} value={barber.id}>
                {barber.displayName}
              </option>
            ))}
          </select>
        </div>

        {/* Continue Button */}
        <button
          disabled={!selectedService || !selectedBarber}
          onClick={() => {
            // TODO: Navigate to availability/booking flow
            alert('Full booking flow will be implemented next! Service: ' + selectedService + ', Barber: ' + selectedBarber)
          }}
          style={{
            width: '100%',
            padding: '18px',
            fontSize: '1.3em',
            fontWeight: 'bold',
            borderRadius: '8px',
            border: 'none',
            background: (!selectedService || !selectedBarber) ? 'rgba(255, 255, 255, 0.3)' : 'white',
            color: (!selectedService || !selectedBarber) ? 'rgba(255, 255, 255, 0.6)' : '#667eea',
            cursor: (!selectedService || !selectedBarber) ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}
        >
          Continue to Booking
        </button>

        {services.length === 0 && barbers.length === 0 && (
          <div style={{
            marginTop: '30px',
            padding: '20px',
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <p style={{ fontSize: '1.1em' }}>
              No services or barbers available yet. Please contact the shop.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
