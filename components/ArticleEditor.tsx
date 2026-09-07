'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'

type BlockType = 'paragraph' | 'heading' | 'bullet-list' | 'numbered-list' | 'image' | 'cta'

interface BaseBlock {
  id: string
  type: BlockType
}

interface ParagraphBlock extends BaseBlock {
  type: 'paragraph'
  content: string
  links?: LinkMark[]
}

interface HeadingBlock extends BaseBlock {
  type: 'heading'
  level: 2 | 3 | 4
  content: string
}

interface ListItem {
  id: string
  content: string
  links?: LinkMark[]
}

interface BulletListBlock extends BaseBlock {
  type: 'bullet-list'
  items: ListItem[]
}

interface NumberedListBlock extends BaseBlock {
  type: 'numbered-list'
  items: ListItem[]
}

interface ImageBlock extends BaseBlock {
  type: 'image'
  url: string
  alt: string
  caption?: string
}

interface CTAButtonBlock extends BaseBlock {
  type: 'cta'
  label: string
  url: string
  partnerLabel?: string
  price?: string
}

interface LinkMark {
  start: number
  end: number
  url: string
  isAffiliate: boolean
}

type Block = ParagraphBlock | HeadingBlock | BulletListBlock | NumberedListBlock | ImageBlock | CTAButtonBlock

interface ArticleEditorProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

const generateId = () => Math.random().toString(36).substring(2, 11)

const createEmptyBlock = (type: BlockType): Block => {
  const id = generateId()
  switch (type) {
    case 'paragraph':
      return { id, type: 'paragraph', content: '', links: [] }
    case 'heading':
      return { id, type: 'heading', level: 2, content: '' }
    case 'bullet-list':
      return { id, type: 'bullet-list', items: [{ id: generateId(), content: '', links: [] }] }
    case 'numbered-list':
      return { id, type: 'numbered-list', items: [{ id: generateId(), content: '', links: [] }] }
    case 'image':
      return { id, type: 'image', url: '', alt: '', caption: '' }
    case 'cta':
      return { id, type: 'cta', label: 'Check Official Website', url: '', partnerLabel: '', price: '' }
  }
}

const parseValue = (value: string): Block[] => {
  if (!value) return [createEmptyBlock('paragraph')]
  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed) && parsed.length > 0) return parsed
    return [createEmptyBlock('paragraph')]
  } catch {
    return [createEmptyBlock('paragraph')]
  }
}

interface LinkModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (url: string) => void
  isAffiliate: boolean
  selectedText: string
}

function LinkModal({ isOpen, onClose, onConfirm, isAffiliate, selectedText }: LinkModalProps) {
  const [url, setUrl] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setUrl('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (url.trim()) {
      onConfirm(url.trim())
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-surface-container-high border border-slate-border rounded-lg p-6 w-full max-w-md mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-headline-lg-mobile text-lg text-on-background mb-2">
          {isAffiliate ? 'Add Affiliate Link' : 'Add Link'}
        </h3>
        {selectedText && (
          <p className="font-mono-data text-xs text-on-surface-variant mb-4 truncate">
            Selected: &quot;{selectedText}&quot;
          </p>
        )}
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            className="w-full bg-surface-container-low border border-slate-border rounded px-4 py-3 text-on-background font-ui-body text-sm placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary-container mb-4"
          />
          {isAffiliate && (
            <p className="font-mono-data text-xs text-tertiary mb-4">
              This link will be marked as an affiliate link.
            </p>
          )}
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded border border-slate-border text-on-surface-variant font-label-caps text-xs hover:bg-surface-container-high transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded bg-primary text-deep-navy font-label-caps text-xs font-bold hover:bg-primary-fixed-dim transition-colors"
            >
              Add Link
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface CTAModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (label: string, url: string, partnerLabel: string, price: string) => void
  initialLabel?: string
  initialUrl?: string
  initialPartnerLabel?: string
  initialPrice?: string
}

function CTAModal({ isOpen, onClose, onConfirm, initialLabel, initialUrl, initialPartnerLabel, initialPrice }: CTAModalProps) {
  const [label, setLabel] = useState(initialLabel || 'Check Official Website')
  const [url, setUrl] = useState(initialUrl || '')
  const [partnerLabel, setPartnerLabel] = useState(initialPartnerLabel || '')
  const [price, setPrice] = useState(initialPrice || '')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setLabel(initialLabel || 'Check Official Website')
      setUrl(initialUrl || '')
      setPartnerLabel(initialPartnerLabel || '')
      setPrice(initialPrice || '')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen, initialLabel, initialUrl, initialPartnerLabel, initialPrice])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (url.trim()) {
      onConfirm(label.trim(), url.trim(), partnerLabel.trim(), price.trim())
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-surface-container-high border border-slate-border rounded-lg p-6 w-full max-w-md mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-headline-lg-mobile text-lg text-on-background mb-4">
          Configure CTA Button
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-mono-data text-xs text-on-surface-variant mb-1">Button Label</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Check Official Website"
              className="w-full bg-surface-container-low border border-slate-border rounded px-4 py-2 text-on-background font-ui-body text-sm placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary-container"
            />
          </div>
          <div>
            <label className="block font-mono-data text-xs text-on-surface-variant mb-1">URL</label>
            <input
              ref={inputRef}
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-surface-container-low border border-slate-border rounded px-4 py-2 text-on-background font-ui-body text-sm placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary-container"
            />
          </div>
          <div>
            <label className="block font-mono-data text-xs text-on-surface-variant mb-1">Partner Label (optional)</label>
            <input
              type="text"
              value={partnerLabel}
              onChange={(e) => setPartnerLabel(e.target.value)}
              placeholder="Amazon"
              className="w-full bg-surface-container-low border border-slate-border rounded px-4 py-2 text-on-background font-ui-body text-sm placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary-container"
            />
          </div>
          <div>
            <label className="block font-mono-data text-xs text-on-surface-variant mb-1">Price (optional)</label>
            <input
              type="text"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="$99.99"
              className="w-full bg-surface-container-low border border-slate-border rounded px-4 py-2 text-on-background font-ui-body text-sm placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary-container"
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded border border-slate-border text-on-surface-variant font-label-caps text-xs hover:bg-surface-container-high transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded bg-primary text-deep-navy font-label-caps text-xs font-bold hover:bg-primary-fixed-dim transition-colors"
            >
              Save CTA
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface TextBlockProps {
  block: ParagraphBlock
  onUpdate: (block: ParagraphBlock) => void
  onAddLink: (blockId: string, isAffiliate: boolean) => void
}

function ParagraphEditor({ block, onUpdate, onAddLink }: TextBlockProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdate({ ...block, content: e.target.value })
  }

  return (
    <div className="group relative">
      <textarea
        ref={textareaRef}
        value={block.content}
        onChange={handleChange}
        placeholder="Start writing..."
        rows={Math.max(2, block.content.split('\n').length)}
        className="w-full bg-transparent border-none outline-none resize-none text-on-background font-editorial-body placeholder:text-on-surface-variant/40 focus:ring-0"
      />
      {block.content && (
        <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          <button
            onClick={() => onAddLink(block.id, false)}
            className="p-1.5 rounded bg-surface-container-high border border-slate-border text-on-surface-variant hover:text-primary hover:border-primary-container transition-colors"
            title="Add link to selected text"
          >
            <span className="material-symbols-outlined text-sm">link</span>
          </button>
          <button
            onClick={() => onAddLink(block.id, true)}
            className="p-1.5 rounded bg-surface-container-high border border-slate-border text-on-surface-variant hover:text-tertiary hover:border-tertiary transition-colors"
            title="Add affiliate link to selected text"
          >
            <span className="material-symbols-outlined text-sm">currency_exchange</span>
          </button>
        </div>
      )}
    </div>
  )
}

interface HeadingBlockProps {
  block: HeadingBlock
  onUpdate: (block: HeadingBlock) => void
}

function HeadingEditor({ block, onUpdate }: HeadingBlockProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdate({ ...block, content: e.target.value })
  }

  const headingClasses: Record<number, string> = {
    2: 'font-headline-lg text-2xl text-on-background',
    3: 'font-headline-lg-mobile text-xl text-on-background',
    4: 'font-headline-lg-mobile text-lg text-on-background',
  }

  return (
    <div className="group relative flex items-start gap-3">
      <div className="flex gap-1 pt-1">
        {([2, 3, 4] as const).map((level) => (
          <button
            key={level}
            onClick={() => onUpdate({ ...block, level })}
            className={`px-2 py-0.5 rounded text-xs font-mono-data transition-colors ${
              block.level === level
                ? 'bg-primary-container text-on-primary-container'
                : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
            }`}
          >
            H{level}
          </button>
        ))}
      </div>
      <textarea
        ref={textareaRef}
        value={block.content}
        onChange={handleChange}
        placeholder={`Heading ${block.level}...`}
        rows={1}
        className={`w-full bg-transparent border-none outline-none resize-none ${headingClasses[block.level]} placeholder:text-on-surface-variant/40 focus:ring-0`}
      />
    </div>
  )
}

interface ListBlockProps {
  block: BulletListBlock | NumberedListBlock
  onUpdate: (block: BulletListBlock | NumberedListBlock) => void
  onAddLink: (blockId: string, itemId: string, isAffiliate: boolean) => void
}

function ListEditor({ block, onUpdate, onAddLink }: ListBlockProps) {
  const handleItemChange = (itemId: string, content: string) => {
    const items = block.items.map((item) =>
      item.id === itemId ? { ...item, content } : item
    )
    onUpdate({ ...block, items })
  }

  const handleAddItem = () => {
    onUpdate({
      ...block,
      items: [...block.items, { id: generateId(), content: '', links: [] }],
    })
  }

  const handleRemoveItem = (itemId: string) => {
    if (block.items.length <= 1) return
    onUpdate({
      ...block,
      items: block.items.filter((item) => item.id !== itemId),
    })
  }

  return (
    <div className="space-y-2">
      {block.items.map((item, index) => (
        <div key={item.id} className="group relative flex items-start gap-2">
          <span className="flex-shrink-0 w-6 text-center font-mono-data text-xs text-on-surface-variant pt-2">
            {block.type === 'bullet-list' ? '•' : `${index + 1}.`}
          </span>
          <input
            type="text"
            value={item.content}
            onChange={(e) => handleItemChange(item.id, e.target.value)}
            placeholder="List item..."
            className="flex-1 bg-transparent border-none outline-none text-on-background font-ui-body placeholder:text-on-surface-variant/40 focus:ring-0 py-1.5"
          />
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
            <button
              onClick={() => onAddLink(block.id, item.id, false)}
              className="p-1 rounded bg-surface-container-high border border-slate-border text-on-surface-variant hover:text-primary hover:border-primary-container transition-colors"
              title="Add link"
            >
              <span className="material-symbols-outlined text-xs">link</span>
            </button>
            <button
              onClick={() => onAddLink(block.id, item.id, true)}
              className="p-1 rounded bg-surface-container-high border border-slate-border text-on-surface-variant hover:text-tertiary hover:border-tertiary transition-colors"
              title="Add affiliate link"
            >
              <span className="material-symbols-outlined text-xs">currency_exchange</span>
            </button>
            <button
              onClick={() => handleRemoveItem(item.id)}
              className="p-1 rounded bg-surface-container-high border border-slate-border text-on-surface-variant hover:text-error hover:border-error transition-colors"
              title="Remove item"
            >
              <span className="material-symbols-outlined text-xs">close</span>
            </button>
          </div>
        </div>
      ))}
      <button
        onClick={handleAddItem}
        className="flex items-center gap-2 pl-8 text-on-surface-variant hover:text-primary font-mono-data text-xs transition-colors"
      >
        <span className="material-symbols-outlined text-sm">add</span>
        Add item
      </button>
    </div>
  )
}

interface ImageBlockProps {
  block: ImageBlock
  onUpdate: (block: ImageBlock) => void
  onUpload: (blockId: string, file: File) => void
}

function ImageEditor({ block, onUpdate, onUpload }: ImageBlockProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onUpload(block.id, file)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) {
      onUpload(block.id, file)
    }
  }

  return (
    <div className="space-y-3">
      {block.url ? (
        <div className="relative group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={block.url}
            alt={block.alt || 'Article image'}
            className="w-full h-auto rounded border border-slate-border"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded bg-surface-container-high border border-slate-border text-on-background font-label-caps text-xs hover:bg-surface-container-highest transition-colors"
            >
              Replace
            </button>
            <button
              onClick={() => onUpdate({ ...block, url: '', alt: '', caption: '' })}
              className="px-3 py-1.5 rounded bg-error-container border border-error text-on-error-container font-label-caps text-xs hover:bg-error hover:text-on-error transition-colors"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragging
              ? 'border-primary-container bg-primary-container/10'
              : 'border-slate-border hover:border-outline-variant'
          }`}
        >
          <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-2">cloud_upload</span>
          <p className="font-ui-body text-sm text-on-surface-variant">
            Drop an image here or click to upload
          </p>
          <p className="font-mono-data text-xs text-on-surface-variant/60 mt-1">
            PNG, JPG, WEBP up to 10MB
          </p>
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      {block.url && (
        <>
          <input
            type="text"
            value={block.alt}
            onChange={(e) => onUpdate({ ...block, alt: e.target.value })}
            placeholder="Alt text..."
            className="w-full bg-surface-container-low border border-slate-border rounded px-3 py-2 text-on-background font-ui-body text-sm placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary-container"
          />
          <input
            type="text"
            value={block.caption || ''}
            onChange={(e) => onUpdate({ ...block, caption: e.target.value })}
            placeholder="Caption (optional)..."
            className="w-full bg-surface-container-low border border-slate-border rounded px-3 py-2 text-on-background font-ui-body text-sm placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary-container"
          />
        </>
      )}
    </div>
  )
}

interface CTAEditorProps {
  block: CTAButtonBlock
  onUpdate: (block: CTAButtonBlock) => void
  onConfigure: (blockId: string) => void
}

function CTAEditor({ block, onConfigure }: Omit<CTAEditorProps, 'onUpdate'>) {
  return (
    <div className="flex items-center gap-3 p-4 bg-surface-container-low border border-slate-border rounded-lg">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="material-symbols-outlined text-tertiary">smart_button</span>
          <span className="font-mono-data text-xs text-on-surface-variant">CTA Button</span>
        </div>
        <p className="font-ui-body text-sm text-on-background">{block.label || 'Configure your CTA'}</p>
        {block.url && (
          <p className="font-mono-data text-xs text-on-surface-variant truncate mt-1">{block.url}</p>
        )}
      </div>
      <button
        onClick={() => onConfigure(block.id)}
        className="px-3 py-1.5 rounded bg-primary text-deep-navy font-label-caps text-xs font-bold hover:bg-primary-fixed-dim transition-colors"
      >
        Configure
      </button>
    </div>
  )
}

export default function ArticleEditor({ value, onChange, className = '' }: ArticleEditorProps) {
  const [blocks, setBlocks] = useState<Block[]>(() => parseValue(value))
  const [linkModal, setLinkModal] = useState<{
    isOpen: boolean
    blockId: string
    itemId?: string
    isAffiliate: boolean
    selectedText: string
  }>({ isOpen: false, blockId: '', isAffiliate: false, selectedText: '' })
  const [ctaModal, setCtaModal] = useState<{
    isOpen: boolean
    blockId: string
    block?: CTAButtonBlock
  }>({ isOpen: false, blockId: '' })
  const [uploadingBlocks, setUploadingBlocks] = useState<Set<string>>(new Set())

  useEffect(() => {
    onChange(JSON.stringify(blocks))
  }, [blocks, onChange])

  const updateBlock = useCallback((updatedBlock: Block) => {
    setBlocks((prev) => prev.map((b) => (b.id === updatedBlock.id ? updatedBlock : b)))
  }, [])

  const addBlock = useCallback((type: BlockType, afterId?: string) => {
    const newBlock = createEmptyBlock(type)
    setBlocks((prev) => {
      if (afterId) {
        const index = prev.findIndex((b) => b.id === afterId)
        const newBlocks = [...prev]
        newBlocks.splice(index + 1, 0, newBlock)
        return newBlocks
      }
      return [...prev, newBlock]
    })
  }, [])

  const removeBlock = useCallback((blockId: string) => {
    setBlocks((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((b) => b.id !== blockId)
    })
  }, [])

  const moveBlock = useCallback((blockId: string, direction: 'up' | 'down') => {
    setBlocks((prev) => {
      const index = prev.findIndex((b) => b.id === blockId)
      if (index === -1) return prev
      if (direction === 'up' && index === 0) return prev
      if (direction === 'down' && index === prev.length - 1) return prev
      const newBlocks = [...prev]
      const swapIndex = direction === 'up' ? index - 1 : index + 1
      ;[newBlocks[index], newBlocks[swapIndex]] = [newBlocks[swapIndex], newBlocks[index]]
      return newBlocks
    })
  }, [])

  const handleAddLink = useCallback((blockId: string, itemIdOrIsAffiliate: string | boolean, isAffiliate?: boolean) => {
    const selection = window.getSelection()
    const selectedText = selection?.toString().trim() || ''
    if (!selectedText) return

    if (typeof itemIdOrIsAffiliate === 'string' && isAffiliate !== undefined) {
      setLinkModal({
        isOpen: true,
        blockId,
        itemId: itemIdOrIsAffiliate,
        isAffiliate,
        selectedText,
      })
    } else {
      setLinkModal({
        isOpen: true,
        blockId,
        isAffiliate: itemIdOrIsAffiliate as boolean,
        selectedText,
      })
    }
  }, [])

  const handleConfirmLink = useCallback((url: string) => {
    const { blockId, itemId, isAffiliate, selectedText } = linkModal
    setBlocks((prev) =>
      prev.map((block) => {
        if (block.id !== blockId) return block

        if (itemId && (block.type === 'bullet-list' || block.type === 'numbered-list')) {
          return {
            ...block,
            items: block.items.map((item) => {
              if (item.id !== itemId) return item
              const start = item.content.indexOf(selectedText)
              if (start === -1) return item
              const link: LinkMark = { start, end: start + selectedText.length, url, isAffiliate }
              return { ...item, links: [...(item.links || []), link] }
            }),
          }
        }

        if (block.type === 'paragraph') {
          const start = block.content.indexOf(selectedText)
          if (start === -1) return block
          const link: LinkMark = { start, end: start + selectedText.length, url, isAffiliate }
          return { ...block, links: [...(block.links || []), link] }
        }

        return block
      })
    )
    setLinkModal({ isOpen: false, blockId: '', isAffiliate: false, selectedText: '' })
  }, [linkModal])

  const handleConfigureCTA = useCallback((blockId: string) => {
    const block = blocks.find((b) => b.id === blockId) as CTAButtonBlock | undefined
    setCtaModal({ isOpen: true, blockId, block })
  }, [blocks])

  const handleConfirmCTA = useCallback((label: string, url: string, partnerLabel: string, price: string) => {
    setBlocks((prev) =>
      prev.map((block) => {
        if (block.id !== ctaModal.blockId || block.type !== 'cta') return block
        return { ...block, label, url, partnerLabel, price }
      })
    )
    setCtaModal({ isOpen: false, blockId: '' })
  }, [ctaModal.blockId])

  const handleImageUpload = useCallback(async (blockId: string, file: File) => {
    setUploadingBlocks((prev) => new Set(prev).add(blockId))
    try {
      const formData = new FormData()
      formData.append('file', file)
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      if (!response.ok) throw new Error('Upload failed')
      const data = await response.json()
      setBlocks((prev) =>
        prev.map((block) => {
          if (block.id !== blockId || block.type !== 'image') return block
          return { ...block, url: data.url || data.path, alt: file.name.replace(/\.[^/.]+$/, '') }
        })
      )
    } catch (error) {
      console.error('Image upload failed:', error)
    } finally {
      setUploadingBlocks((prev) => {
        const next = new Set(prev)
        next.delete(blockId)
        return next
      })
    }
  }, [])

  const renderBlock = (block: Block) => {
    switch (block.type) {
      case 'paragraph':
        return (
          <ParagraphEditor
            key={block.id}
            block={block}
            onUpdate={updateBlock}
            onAddLink={(id, isAffiliate) => handleAddLink(id, isAffiliate)}
          />
        )
      case 'heading':
        return <HeadingEditor key={block.id} block={block} onUpdate={updateBlock} />
      case 'bullet-list':
      case 'numbered-list':
        return (
          <ListEditor
            key={block.id}
            block={block}
            onUpdate={updateBlock}
            onAddLink={(blockId, itemId, isAffiliate) => handleAddLink(blockId, itemId, isAffiliate)}
          />
        )
      case 'image':
        return (
          <ImageEditor
            key={block.id}
            block={block}
            onUpdate={updateBlock}
            onUpload={handleImageUpload}
          />
        )
      case 'cta':
        return (
          <CTAEditor
            key={block.id}
            block={block}
            onConfigure={handleConfigureCTA}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Toolbar */}
      <div className="sticky top-0 z-40 bg-surface-container-low/95 backdrop-blur border border-slate-border rounded-lg p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono-data text-xs text-on-surface-variant mr-2">Add block:</span>
          <button
            onClick={() => addBlock('paragraph')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-surface-container-high border border-slate-border text-on-surface-variant font-mono-data text-xs hover:bg-surface-container-highest hover:text-on-background transition-colors"
          >
            <span className="material-symbols-outlined text-sm">notes</span>
            Paragraph
          </button>
          <button
            onClick={() => addBlock('heading')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-surface-container-high border border-slate-border text-on-surface-variant font-mono-data text-xs hover:bg-surface-container-highest hover:text-on-background transition-colors"
          >
            <span className="material-symbols-outlined text-sm">title</span>
            Heading
          </button>
          <button
            onClick={() => addBlock('bullet-list')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-surface-container-high border border-slate-border text-on-surface-variant font-mono-data text-xs hover:bg-surface-container-highest hover:text-on-background transition-colors"
          >
            <span className="material-symbols-outlined text-sm">format_list_bulleted</span>
            Bullets
          </button>
          <button
            onClick={() => addBlock('numbered-list')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-surface-container-high border border-slate-border text-on-surface-variant font-mono-data text-xs hover:bg-surface-container-highest hover:text-on-background transition-colors"
          >
            <span className="material-symbols-outlined text-sm">format_list_numbered</span>
            Numbers
          </button>
          <button
            onClick={() => addBlock('image')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-surface-container-high border border-slate-border text-on-surface-variant font-mono-data text-xs hover:bg-surface-container-highest hover:text-on-background transition-colors"
          >
            <span className="material-symbols-outlined text-sm">image</span>
            Image
          </button>
          <button
            onClick={() => addBlock('cta')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-surface-container-high border border-slate-border text-on-surface-variant font-mono-data text-xs hover:bg-surface-container-highest hover:text-tertiary transition-colors"
          >
            <span className="material-symbols-outlined text-sm">smart_button</span>
            CTA
          </button>
        </div>
      </div>

      {/* Blocks */}
      <div className="space-y-3">
        {blocks.map((block, index) => (
          <div
            key={block.id}
            className="group relative bg-surface-container-low border border-slate-border rounded-lg p-4 hover:border-outline-variant transition-colors"
          >
            {/* Block controls */}
            <div className="absolute -top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => moveBlock(block.id, 'up')}
                disabled={index === 0}
                className="p-1 rounded bg-surface-container-high border border-slate-border text-on-surface-variant hover:text-on-background hover:bg-surface-container-highest transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Move up"
              >
                <span className="material-symbols-outlined text-sm">keyboard_arrow_up</span>
              </button>
              <button
                onClick={() => moveBlock(block.id, 'down')}
                disabled={index === blocks.length - 1}
                className="p-1 rounded bg-surface-container-high border border-slate-border text-on-surface-variant hover:text-on-background hover:bg-surface-container-highest transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Move down"
              >
                <span className="material-symbols-outlined text-sm">keyboard_arrow_down</span>
              </button>
              <button
                onClick={() => removeBlock(block.id)}
                disabled={blocks.length <= 1}
                className="p-1 rounded bg-surface-container-high border border-slate-border text-on-surface-variant hover:text-error hover:border-error transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Remove block"
              >
                <span className="material-symbols-outlined text-sm">delete</span>
              </button>
            </div>

            {/* Block type indicator */}
            <div className="absolute -top-3 left-3">
              <span className="px-2 py-0.5 rounded bg-surface-container-high border border-slate-border font-mono-data text-[10px] text-on-surface-variant uppercase">
                {block.type === 'bullet-list' ? 'BULLET LIST' : block.type === 'numbered-list' ? 'NUMBERED LIST' : block.type}
              </span>
            </div>

            {/* Upload indicator */}
            {uploadingBlocks.has(block.id) && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-lg flex items-center justify-center z-10">
                <div className="flex items-center gap-2 text-primary">
                  <span className="material-symbols-outlined animate-spin">progress_activity</span>
                  <span className="font-mono-data text-xs">Uploading...</span>
                </div>
              </div>
            )}

            {renderBlock(block)}
          </div>
        ))}
      </div>

      {/* Add block at end */}
      <div className="flex justify-center pt-2">
        <button
          onClick={() => addBlock('paragraph')}
          className="flex items-center gap-2 px-4 py-2 rounded border border-dashed border-slate-border text-on-surface-variant font-mono-data text-xs hover:border-primary-container hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          Add paragraph
        </button>
      </div>

      {/* Modals */}
      <LinkModal
        isOpen={linkModal.isOpen}
        onClose={() => setLinkModal({ isOpen: false, blockId: '', isAffiliate: false, selectedText: '' })}
        onConfirm={handleConfirmLink}
        isAffiliate={linkModal.isAffiliate}
        selectedText={linkModal.selectedText}
      />
      <CTAModal
        isOpen={ctaModal.isOpen}
        onClose={() => setCtaModal({ isOpen: false, blockId: '' })}
        onConfirm={handleConfirmCTA}
        initialLabel={ctaModal.block?.label}
        initialUrl={ctaModal.block?.url}
        initialPartnerLabel={ctaModal.block?.partnerLabel}
        initialPrice={ctaModal.block?.price}
      />
    </div>
  )
}
