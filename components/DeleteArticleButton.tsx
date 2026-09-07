'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'

interface DeleteArticleButtonProps {
  id: string
  title: string
}

export default function DeleteArticleButton({ id, title }: DeleteArticleButtonProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return

    setIsDeleting(true)
    try {
      const res = await fetch(`/api/articles/${id}`, {
        method: 'DELETE'
      })
      
      if (!res.ok) {
        throw new Error('Failed to delete article')
      }
      
      router.refresh()
    } catch (err) {
      console.error(err)
      alert('Failed to delete the article.')
      setIsDeleting(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className={`p-2 hover:text-error transition-colors flex items-center justify-center rounded-full hover:bg-error/10 ${
        isDeleting ? 'text-on-surface-variant/50 cursor-not-allowed' : 'text-on-surface-variant'
      }`}
      title="Delete"
    >
      <span className="material-symbols-outlined text-[20px] leading-none">
        {isDeleting ? 'hourglass_empty' : 'delete'}
      </span>
    </button>
  )
}
