'use client'

import React from 'react'
import { Admin, Editor } from 'react-bricks'

const AdminEditor: React.FC = () => {
  return (
    <Admin isLogin={false}>
      <Editor />
    </Admin>
  )
}

export default AdminEditor
