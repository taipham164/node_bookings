'use client'

import React, { useEffect, useRef, useState } from 'react'
import grapesjs, { Editor } from 'grapesjs'
import 'grapesjs/dist/css/grapes.min.css'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'
const SHOP_ID = process.env.NEXT_PUBLIC_SHOP_ID || 'default-shop-id'

export default function BuilderPage() {
  const editorRef = useRef<Editor | null>(null)
  const [pageId, setPageId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string>('')

  useEffect(() => {
    // Initialize GrapesJS
    const editor = grapesjs.init({
      container: '#gjs',
      height: '100vh',
      width: 'auto',
      storageManager: false,
      panels: { defaults: [] },
      deviceManager: {
        devices: [
          {
            name: 'Desktop',
            width: '',
          },
          {
            name: 'Tablet',
            width: '768px',
          },
          {
            name: 'Mobile',
            width: '320px',
          },
        ],
      },
      blockManager: {
        appendTo: '#blocks',
        blocks: [
          {
            id: 'section',
            label: 'Section',
            attributes: { class: 'gjs-block-section' },
            content: '<section style="padding: 40px 20px; min-height: 200px;"><h1>Section</h1></section>',
          },
          {
            id: 'text',
            label: 'Text',
            content: '<div style="padding: 10px;">Insert your text here</div>',
          },
          {
            id: 'image',
            label: 'Image',
            select: true,
            content: { type: 'image' },
            activate: true,
          },
          {
            id: 'booking-widget',
            label: 'Booking Widget',
            category: 'Tyler',
            content: '<div data-booking-widget="true" style="min-height: 400px; padding: 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-align: center; border-radius: 12px;"><h2 style="margin-bottom: 20px; font-size: 2em;">Book Your Appointment</h2><p style="font-size: 1.2em;">The booking widget will appear here on the live site</p></div>',
          },
        ],
      },
      layerManager: {
        appendTo: '#layers',
      },
      styleManager: {
        appendTo: '#styles',
        sectors: [
          {
            name: 'General',
            open: false,
            buildProps: ['float', 'display', 'position', 'top', 'right', 'left', 'bottom'],
          },
          {
            name: 'Dimension',
            open: false,
            buildProps: ['width', 'height', 'max-width', 'min-height', 'margin', 'padding'],
          },
          {
            name: 'Typography',
            open: false,
            buildProps: ['font-family', 'font-size', 'font-weight', 'letter-spacing', 'color', 'line-height', 'text-align'],
          },
          {
            name: 'Decorations',
            open: false,
            buildProps: ['background-color', 'border-radius', 'border', 'box-shadow', 'background'],
          },
        ],
      },
      traitManager: {
        appendTo: '#traits',
      },
      selectorManager: {
        appendTo: '#selectors',
      },
    })

    // Add custom panels
    editor.Panels.addPanel({
      id: 'panel-top',
      el: '.panel__top',
    })

    editor.Panels.addPanel({
      id: 'basic-actions',
      el: '.panel__basic-actions',
      buttons: [
        {
          id: 'visibility',
          active: true,
          className: 'btn-toggle-borders',
          label: '<svg style="width:22px; height:22px" viewBox="0 0 24 24"><path fill="currentColor" d="M15,9H9V7H15M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M15,15V17H9V15H15Z" /></svg>',
          command: 'sw-visibility',
        },
        {
          id: 'preview',
          className: 'btn-preview',
          label: '<svg style="width:22px; height:22px" viewBox="0 0 24 24"><path fill="currentColor" d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z" /></svg>',
          command: 'preview',
          context: 'preview',
        },
        {
          id: 'fullscreen',
          className: 'btn-fullscreen',
          label: '<svg style="width:22px; height:22px" viewBox="0 0 24 24"><path fill="currentColor" d="M5,5H10V7H7V10H5V5M14,5H19V10H17V7H14V5M17,14H19V19H14V17H17V14M10,17V19H5V14H7V17H10Z" /></svg>',
          command: 'fullscreen',
          context: 'fullscreen',
        },
        {
          id: 'export',
          className: 'btn-export',
          label: '<svg style="width:22px; height:22px" viewBox="0 0 24 24"><path fill="currentColor" d="M23,12L19,8V11H10V13H19V16M1,18V6C1,4.89 1.9,4 3,4H15A2,2 0 0,1 17,6V9H15V6H3V18H15V15H17V18A2,2 0 0,1 15,20H3A2,2 0 0,1 1,18Z" /></svg>',
          command: 'gjs-export-zip',
        },
        {
          id: 'undo',
          className: 'btn-undo',
          label: '<svg style="width:22px; height:22px" viewBox="0 0 24 24"><path fill="currentColor" d="M12.5,8C9.85,8 7.45,9 5.6,10.6L2,7V16H11L7.38,12.38C8.77,11.22 10.54,10.5 12.5,10.5C16.04,10.5 19.05,12.81 20.1,16L22.47,15.22C21.08,11.03 17.15,8 12.5,8Z" /></svg>',
          command: 'undo',
        },
        {
          id: 'redo',
          className: 'btn-redo',
          label: '<svg style="width:22px; height:22px" viewBox="0 0 24 24"><path fill="currentColor" d="M18.4,10.6C16.55,9 14.15,8 11.5,8C6.85,8 2.92,11.03 1.54,15.22L3.9,16C4.95,12.81 7.95,10.5 11.5,10.5C13.45,10.5 15.23,11.22 16.62,12.38L13,16H22V7L18.4,10.6Z" /></svg>',
          command: 'redo',
        },
      ],
    })

    editorRef.current = editor

    // Load existing page
    loadPage(editor)

    return () => {
      editor.destroy()
    }
  }, [])

  const loadPage = async (editor: Editor) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/pages/home?shopId=${SHOP_ID}`)
      if (response.ok) {
        const page = await response.json()
        setPageId(page.id)
        editor.setComponents(page.html || '')
        setMessage('Page loaded successfully')
      } else {
        // No home page exists, start with default template
        const defaultTemplate = `
          <section style="padding: 60px 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
            <h1 style="font-size: 3em; margin-bottom: 20px;">Welcome to Tyler's Barbershop</h1>
            <p style="font-size: 1.5em; margin-bottom: 40px;">Professional grooming services</p>
          </section>
          <section style="padding: 60px 20px; text-align: center;">
            <h2 style="font-size: 2.5em; margin-bottom: 40px;">Our Services</h2>
            <p>Add your services here...</p>
          </section>
        `
        editor.setComponents(defaultTemplate)
        setMessage('No existing page found. Starting with default template.')
      }
    } catch (error) {
      console.error('Error loading page:', error)
      setMessage('Error loading page. Starting with blank template.')
    }
  }

  const handleSave = async () => {
    if (!editorRef.current) return

    setSaving(true)
    setMessage('')

    try {
      const editor = editorRef.current
      const html = editor.getHtml()
      const css = editor.getCss()

      // Combine HTML and CSS
      const fullHtml = `<style>${css}</style>${html}`

      if (pageId) {
        // Update existing page
        const response = await fetch(`${API_BASE_URL}/api/pages/${pageId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            html: fullHtml,
            title: 'Home Page',
          }),
        })

        if (response.ok) {
          setMessage('Page saved successfully!')
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
            slug: 'home',
            title: 'Home Page',
            html: fullHtml,
            isHome: true,
          }),
        })

        if (response.ok) {
          const page = await response.json()
          setPageId(page.id)
          setMessage('Page created successfully!')
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

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Bar */}
      <div style={{
        background: '#2d2d2d',
        color: 'white',
        padding: '15px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ margin: 0, fontSize: '1.5em' }}>GrapesJS Page Builder</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {message && (
            <span style={{
              fontSize: '0.9em',
              padding: '8px 16px',
              background: message.includes('Error') ? '#e74c3c' : '#27ae60',
              borderRadius: '4px'
            }}>
              {message}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              background: '#667eea',
              color: 'white',
              border: 'none',
              padding: '10px 24px',
              borderRadius: '6px',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: '1em',
              fontWeight: 'bold',
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? 'Saving...' : 'Save Page'}
          </button>
        </div>
      </div>

      {/* Editor Container */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left Sidebar - Blocks and Layers */}
        <div style={{ width: '250px', background: '#f5f5f5', borderRight: '1px solid #ddd', overflow: 'auto' }}>
          <div style={{ padding: '15px' }}>
            <h3 style={{ marginTop: 0, fontSize: '1.1em', color: '#333' }}>Blocks</h3>
            <div id="blocks"></div>
          </div>
          <div style={{ padding: '15px', borderTop: '1px solid #ddd' }}>
            <h3 style={{ marginTop: 0, fontSize: '1.1em', color: '#333' }}>Layers</h3>
            <div id="layers"></div>
          </div>
        </div>

        {/* Main Canvas */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div className="panel__top">
            <div className="panel__basic-actions"></div>
          </div>
          <div id="gjs" style={{ flex: 1, overflow: 'hidden' }}></div>
        </div>

        {/* Right Sidebar - Styles and Traits */}
        <div style={{ width: '300px', background: '#f5f5f5', borderLeft: '1px solid #ddd', overflow: 'auto' }}>
          <div style={{ padding: '15px' }}>
            <h3 style={{ marginTop: 0, fontSize: '1.1em', color: '#333' }}>Selectors</h3>
            <div id="selectors"></div>
          </div>
          <div style={{ padding: '15px', borderTop: '1px solid #ddd' }}>
            <h3 style={{ marginTop: 0, fontSize: '1.1em', color: '#333' }}>Traits</h3>
            <div id="traits"></div>
          </div>
          <div style={{ padding: '15px', borderTop: '1px solid #ddd' }}>
            <h3 style={{ marginTop: 0, fontSize: '1.1em', color: '#333' }}>Styles</h3>
            <div id="styles"></div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
            'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
            sans-serif;
        }

        .panel__top {
          padding: 0;
          width: 100%;
          display: flex;
          position: relative;
          justify-content: center;
          border-bottom: 1px solid rgba(0,0,0,0.1);
          background: white;
        }

        .panel__basic-actions {
          position: relative;
        }

        button {
          transition: all 0.2s ease;
        }

        button:hover:not(:disabled) {
          opacity: 0.8;
          transform: translateY(-1px);
        }
      `}</style>
    </div>
  )
}
