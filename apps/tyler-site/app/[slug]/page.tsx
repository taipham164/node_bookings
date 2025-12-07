import React from 'react'

type Params = Promise<{ slug: string }>

export default async function Page({ params }: { params: Params }) {
  const { slug } = await params

  // This is a placeholder - will be replaced when React Bricks is configured
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Page: {slug}</h1>
        <p className="text-gray-600">
          Configure React Bricks to see dynamic content here
        </p>
      </div>
    </main>
  )
}
