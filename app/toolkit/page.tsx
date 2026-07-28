import React from 'react'
import type { Metadata } from 'next'
import { client } from '@/lib/sanity.client'
import { TOOLS_QUERY } from '@/lib/sanity.queries'
import ToolkitClient from './ToolkitClient'
import type { Tool } from '@/lib/types'

export const metadata: Metadata = {
  title: 'Interactive Toolkit',
  description: 'Interactive shopping and niche utilities designed to bring mathematical clarity to your buying and collection decisions.',
}

export default async function ToolkitPage() {
  let tools: Tool[] = []

  try {
    tools = await client.fetch<Tool[]>(TOOLS_QUERY)
  } catch (err) {
    console.error('Failed to load toolkit database from Sanity:', err)
  }

  return <ToolkitClient initialTools={tools} />
}

export const revalidate = 3600 // ISR: Revalidate tools lists hourly
