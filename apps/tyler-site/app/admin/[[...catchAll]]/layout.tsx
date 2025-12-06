'use client'

import React from 'react'
import { ReactBricks } from 'react-bricks'
import config from '@/react-bricks/config'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ReactBricks {...config}>{children}</ReactBricks>
}
