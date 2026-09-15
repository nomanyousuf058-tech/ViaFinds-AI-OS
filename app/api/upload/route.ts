import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { supabaseServer } from '@/lib/db/supabaseServer'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPG, PNG, and WEBP are allowed.' },
        { status: 400 }
      )
    }

    // Validate file size (5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      )
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 8)
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const filename = `${timestamp}-${randomStr}.${extension}`

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const supabase = supabaseServer()
    if (supabase) {
      // Ensure bucket exists
      const { data: buckets } = await supabase.storage.listBuckets()
      if (!buckets?.find(b => b.name === 'uploads')) {
        await supabase.storage.createBucket('uploads', { public: true })
      }

      const { error } = await supabase.storage.from('uploads').upload(filename, buffer, {
        contentType: file.type,
        upsert: false
      })

      if (error) {
        console.error('Supabase upload error:', error)
        throw error
      }

      const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(filename)
      return NextResponse.json({ url: publicUrl, filename })
    } else {
      // Local development fallback
      if (process.env.VERCEL) {
        return NextResponse.json(
          { error: 'Image uploads require SUPABASE_SERVICE_ROLE_KEY environment variable to be set in Vercel to use Supabase Storage. Local uploads are not supported on Vercel.' },
          { status: 500 }
        )
      }

      const uploadsDir = join(process.cwd(), 'public', 'uploads')
      if (!existsSync(uploadsDir)) {
        await mkdir(uploadsDir, { recursive: true })
      }

      const filepath = join(uploadsDir, filename)
      await writeFile(filepath, buffer)

      const publicUrl = `/uploads/${filename}`
      return NextResponse.json({ url: publicUrl, filename })
    }
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : JSON.stringify(error) },
      { status: 500 }
    )
  }
}
