'use client'

import React, { useState, useMemo } from 'react'
import Image from 'next/image'
import type { Tool } from '@/lib/types'
import { PortableText } from '@portabletext/react'

interface ToolkitClientProps {
  initialTools: Tool[]
}

export default function ToolkitClient({ initialTools }: ToolkitClientProps) {
  const [activeToolId, setActiveToolId] = useState<string>(initialTools[0]?._id || '')

  // Find active tool details
  const activeTool = useMemo(() => {
    return initialTools.find(t => t._id === activeToolId) || initialTools[0]
  }, [initialTools, activeToolId])

  return (
    <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-20 w-full animate-fade-up">
      {/* Page Header */}
      <div className="mb-16 border-b border-surface-container pb-8 text-center max-w-2xl mx-auto">
        <span className="text-gold-accent text-[10px] font-bold tracking-[0.4em] uppercase mb-4 block">
          ViaFinds Utility Hub
        </span>
        <h1 className="font-display text-4xl md:text-5xl text-primary font-bold mb-4">
          The ViaFinds Toolkit
        </h1>
        <p className="font-body text-xs text-secondary leading-relaxed">
          Interactive shopping and niche utilities designed to bring mathematical clarity to your buying and collection decisions.
        </p>
      </div>

      {/* Grid Layout: Sidebar Navigation + Main Active Tool Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Sidebar */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <span className="font-body text-[10px] font-bold text-secondary uppercase tracking-[0.25em] mb-2 block">
            Available Utilities
          </span>

          <div className="flex flex-col gap-3.5 max-h-[70vh] overflow-y-auto pr-2">
            {initialTools.map((tool) => {
              const isActive = tool._id === activeToolId
              return (
                <button
                  key={tool._id}
                  onClick={() => setActiveToolId(tool._id)}
                  className={`w-full text-left p-5 border transition-all flex items-center gap-4 hover-luxury-shadow ${
                    isActive
                      ? 'border-primary bg-primary text-on-primary'
                      : 'border-outline-variant/30 hover:border-primary text-primary bg-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-2xl">
                    {tool.icon || 'build'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display font-bold text-sm truncate">{tool.title}</h3>
                    <p className={`font-body text-[9px] mt-1 truncate ${isActive ? 'text-white/60' : 'text-secondary/60'}`}>
                      {tool.shortDescription || 'Interactive calculator tool.'}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Active Tool Panel */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          <div className="bg-white border border-outline-variant/20 p-8 md:p-12 luxury-shadow">
            {activeTool ? (
              <div className="flex flex-col">
                <div className="flex items-center gap-3.5 mb-6 pb-4 border-b border-surface-container">
                  <span className="material-symbols-outlined text-3xl text-gold-accent">
                    {activeTool.icon || 'build'}
                  </span>
                  <div>
                    <h2 className="font-display text-2xl font-bold text-primary">
                      {activeTool.title}
                    </h2>
                    <p className="font-body text-[10px] text-secondary/50 uppercase tracking-widest font-semibold mt-1">
                      Mode: {activeTool.toolType || 'custom'}
                    </p>
                  </div>
                </div>

                {/* Description */}
                {activeTool.description && (
                  <div className="font-body text-xs text-secondary/80 leading-relaxed mb-8 space-y-3">
                    <PortableText value={activeTool.description} />
                  </div>
                )}

                {/* Calculator Area */}
                <div className="w-full">
                  <CalculatorEngine type={activeTool.toolType} />
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-secondary/60 font-body text-xs">
                Select a tool from the sidebar to launch.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Calculator Engine: Renders the active calculator component based on toolType
// ─────────────────────────────────────────────────────────────────────────────
function CalculatorEngine({ type }: { type?: string }) {
  switch (type) {
    case 'discount':
      return <DiscountCalculator />
    case 'scale':
      return <ScaleConverter />
    case 'reading-time':
      return <ReadingTimeEstimator />
    case 'currency':
      return <CurrencyConverter />
    case 'percentage':
      return <PercentageCalculator />
    case 'bmi':
      return <BMICalculator />
    case 'age':
      return <AgeCalculator />
    case 'qr':
      return <QRCodeGenerator />
    case 'password':
      return <PasswordGenerator />
    case 'unit':
      return <UnitConverter />
    case 'color':
      return <ColorConverter />
    case 'tax':
      return <TaxCalculator />
    case 'tip':
      return <TipCalculator />
    case 'storage':
      return <StorageConverter />
    case 'speed':
      return <SpeedConverter />
    default:
      return (
        <div className="p-6 bg-surface-container-low text-center font-body text-xs text-secondary/60">
          This calculator runs in real-time. Make selections to compute value.
        </div>
      )
  }
}

// ── 1. Discount Calculator ──
function DiscountCalculator() {
  const [price, setPrice] = useState(100)
  const [discount, setDiscount] = useState(20)
  const [tax, setTax] = useState(8.25)

  const saved = (price * discount) / 100
  const afterDiscount = price - saved
  const taxAmount = (afterDiscount * tax) / 100
  const total = afterDiscount + taxAmount

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="font-body text-[10px] font-bold text-secondary uppercase">Original Price ($)</label>
          <input type="number" value={price} onChange={e => setPrice(Math.max(0, parseFloat(e.target.value) || 0))} className="border border-outline-variant/30 p-3 text-xs outline-none" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="font-body text-[10px] font-bold text-secondary uppercase">Discount Percentage (%)</label>
          <input type="number" value={discount} onChange={e => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))} className="border border-outline-variant/30 p-3 text-xs outline-none" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="font-body text-[10px] font-bold text-secondary uppercase">Sales Tax Rate (%)</label>
          <input type="number" value={tax} onChange={e => setTax(Math.max(0, parseFloat(e.target.value) || 0))} className="border border-outline-variant/30 p-3 text-xs outline-none" />
        </div>
      </div>
      <div className="bg-surface-container-low p-6 flex flex-col justify-center border">
        <span className="font-body text-[9px] font-bold text-secondary uppercase mb-4 block">Total Estimate</span>
        <div className="flex flex-col gap-2 text-xs">
          <div className="flex justify-between pb-1.5 border-b border-surface-container">
            <span>Discount Saved:</span>
            <span className="font-bold text-emerald-600">-${saved.toFixed(2)}</span>
          </div>
          <div className="flex justify-between pb-1.5 border-b border-surface-container">
            <span>Tax Amount:</span>
            <span className="font-bold text-primary">+${taxAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-end pt-3 text-primary">
            <span className="font-bold uppercase tracking-wider text-[10px]">Final Price:</span>
            <span className="font-display text-2xl font-bold text-gold-accent">${total.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── 2. Scale Converter ──
function ScaleConverter() {
  const [realSize, setRealSize] = useState(72)
  const [scale, setScale] = useState(18)

  const scaledCm = (realSize / scale) * 2.54
  const scaledIn = realSize / scale

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="font-body text-[10px] font-bold text-secondary uppercase">Real Size (Inches)</label>
          <input type="number" value={realSize} onChange={e => setRealSize(Math.max(0, parseFloat(e.target.value) || 0))} className="border border-outline-variant/30 p-3 text-xs outline-none" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="font-body text-[10px] font-bold text-secondary uppercase">Scale Ratio (1 : X)</label>
          <select value={scale} onChange={e => setScale(parseInt(e.target.value))} className="border border-outline-variant/30 p-3 text-xs bg-white outline-none">
            <option value="12">1:12 Scale</option>
            <option value="18">1:18 Scale</option>
            <option value="24">1:24 Scale</option>
            <option value="43">1:43 Scale</option>
            <option value="64">1:64 Scale</option>
          </select>
        </div>
      </div>
      <div className="bg-surface-container-low p-6 flex flex-col justify-center border">
        <span className="font-body text-[9px] font-bold text-secondary uppercase mb-4 block">Scaled Model Size</span>
        <div className="flex flex-col gap-2 text-xs">
          <div className="flex justify-between pb-1.5 border-b border-surface-container">
            <span>Metric:</span>
            <span className="font-bold text-primary">{scaledCm.toFixed(2)} cm</span>
          </div>
          <div className="flex justify-between pb-1.5 border-b border-surface-container">
            <span>Imperial:</span>
            <span className="font-bold text-primary">{scaledIn.toFixed(2)} inches</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── 3. Reading Time Estimator ──
function ReadingTimeEstimator() {
  const [pages, setPages] = useState(300)
  const [wpm, setWpm] = useState(250)

  const minutes = (pages * 250) / wpm
  const hours = (minutes / 60).toFixed(1)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="font-body text-[10px] font-bold text-secondary uppercase">Page Count</label>
          <input type="number" value={pages} onChange={e => setPages(Math.max(1, parseInt(e.target.value) || 1))} className="border border-outline-variant/30 p-3 text-xs outline-none" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="font-body text-[10px] font-bold text-secondary uppercase">Speed (Words/Minute)</label>
          <input type="number" value={wpm} onChange={e => setWpm(Math.max(1, parseInt(e.target.value) || 1))} className="border border-outline-variant/30 p-3 text-xs outline-none" />
        </div>
      </div>
      <div className="bg-surface-container-low p-6 flex flex-col justify-center border">
        <span className="font-body text-[9px] font-bold text-secondary uppercase mb-4 block">Estimated Time</span>
        <div className="flex flex-col gap-2 text-xs">
          <div className="flex justify-between pb-1.5 border-b border-surface-container">
            <span>Total Minutes:</span>
            <span className="font-bold text-primary">{Math.round(minutes)} mins</span>
          </div>
          <div className="flex justify-between items-end pt-3">
            <span className="font-bold uppercase tracking-wider text-[10px]">Total Hours:</span>
            <span className="font-display text-2xl font-bold text-gold-accent">{hours} hours</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── 4. Currency Converter ──
function CurrencyConverter() {
  const [usd, setUsd] = useState(100)
  const rates: Record<string, number> = { EUR: 0.92, GBP: 0.78, CAD: 1.36, JPY: 155.5 }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="flex flex-col gap-1.5">
        <label className="font-body text-[10px] font-bold text-secondary uppercase">Amount in USD ($)</label>
        <input type="number" value={usd} onChange={e => setUsd(Math.max(0, parseFloat(e.target.value) || 0))} className="border border-outline-variant/30 p-3 text-xs outline-none" />
      </div>
      <div className="bg-surface-container-low p-6 border flex flex-col gap-2.5 text-xs">
        <span className="font-body text-[9px] font-bold text-secondary uppercase mb-2 block">Live Conversion Estimates</span>
        {Object.entries(rates).map(([cur, rate]) => (
          <div key={cur} className="flex justify-between pb-1 border-b border-surface-container last:border-0 last:pb-0">
            <span className="font-semibold text-secondary">{cur}</span>
            <span className="font-bold text-primary">{(usd * rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── 5. Percentage Calculator ──
function PercentageCalculator() {
  const [part, setPart] = useState(25)
  const [whole, setWhole] = useState(200)

  const percent = part > 0 && whole > 0 ? (part / whole) * 100 : 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="font-body text-[10px] font-bold text-secondary uppercase">Part (Value)</label>
          <input type="number" value={part} onChange={e => setPart(Math.max(0, parseFloat(e.target.value) || 0))} className="border border-outline-variant/30 p-3 text-xs outline-none" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="font-body text-[10px] font-bold text-secondary uppercase">Whole (Total)</label>
          <input type="number" value={whole} onChange={e => setWhole(Math.max(1, parseFloat(e.target.value) || 1))} className="border border-outline-variant/30 p-3 text-xs outline-none" />
        </div>
      </div>
      <div className="bg-surface-container-low p-6 flex flex-col justify-center border text-center">
        <span className="font-body text-[9px] font-bold text-secondary uppercase mb-2 block">Percentage Result</span>
        <span className="font-display text-4xl font-extrabold text-gold-accent">{percent.toFixed(1)}%</span>
      </div>
    </div>
  )
}

// ── 6. BMI Calculator ──
function BMICalculator() {
  const [weight, setWeight] = useState(70) // kg
  const [height, setHeight] = useState(175) // cm

  const bmi = weight > 0 && height > 0 ? weight / Math.pow(height / 100, 2) : 0
  const status = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal Weight' : bmi < 30 ? 'Overweight' : 'Obese'

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="font-body text-[10px] font-bold text-secondary uppercase">Weight (kg)</label>
          <input type="number" value={weight} onChange={e => setWeight(Math.max(1, parseFloat(e.target.value) || 1))} className="border border-outline-variant/30 p-3 text-xs outline-none" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="font-body text-[10px] font-bold text-secondary uppercase">Height (cm)</label>
          <input type="number" value={height} onChange={e => setHeight(Math.max(1, parseFloat(e.target.value) || 1))} className="border border-outline-variant/30 p-3 text-xs outline-none" />
        </div>
      </div>
      <div className="bg-surface-container-low p-6 border flex flex-col justify-center text-center gap-1">
        <span className="font-body text-[9px] font-bold text-secondary uppercase mb-1 block">Your BMI Score</span>
        <span className="font-display text-4xl font-extrabold text-primary">{bmi.toFixed(1)}</span>
        <span className="font-body text-[10px] font-bold uppercase tracking-wider text-gold-accent mt-2">{status}</span>
      </div>
    </div>
  )
}

// ── 7. Age Calculator ──
function AgeCalculator() {
  const [birthdate, setBirthdate] = useState('1995-01-01')

  const age = useMemo(() => {
    if (!birthdate) return 0
    const birth = new Date(birthdate)
    const diff = Date.now() - birth.getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
  }, [birthdate])

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="flex flex-col gap-1.5">
        <label className="font-body text-[10px] font-bold text-secondary uppercase">Select Date of Birth</label>
        <input type="date" value={birthdate} onChange={e => setBirthdate(e.target.value)} className="border border-outline-variant/30 p-3 text-xs outline-none" />
      </div>
      <div className="bg-surface-container-low p-6 border flex flex-col justify-center text-center">
        <span className="font-body text-[9px] font-bold text-secondary uppercase mb-1 block">Current Age</span>
        <span className="font-display text-4xl font-extrabold text-gold-accent">{age >= 0 ? `${age} Years` : 'Invalid Date'}</span>
      </div>
    </div>
  )
}

// ── 8. QR Code Generator ──
function QRCodeGenerator() {
  const [text, setText] = useState('https://viafinds.com')

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="flex flex-col gap-1.5">
        <label className="font-body text-[10px] font-bold text-secondary uppercase">Text or URL to Encode</label>
        <textarea value={text} onChange={e => setText(e.target.value)} className="border border-outline-variant/30 p-3 text-xs outline-none h-28 resize-none" />
      </div>
      <div className="bg-surface-container-low p-6 border flex flex-col items-center justify-center text-center">
        <span className="font-body text-[9px] font-bold text-secondary uppercase mb-4 block">Generated Code Preview</span>
        {/* Simple mock QR preview using reliable external image API */}
        <div className="relative h-28 w-28 border bg-white p-1">
          <Image
            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(text)}`}
            alt="QR Code Preview"
            width={112}
            height={112}
            className="h-full w-full"
            unoptimized
          />
        </div>
      </div>
    </div>
  )
}

// ── 9. Password Generator ──
function PasswordGenerator() {
  const [length, setLength] = useState(16)
  const [pwd, setPwd] = useState('')

  const generate = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?'
    let res = ''
    for (let i = 0; i < length; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setPwd(res)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="font-body text-[10px] font-bold text-secondary uppercase">Password Length ({length})</label>
          <input type="range" min="8" max="32" value={length} onChange={e => setLength(parseInt(e.target.value))} className="w-full accent-primary" />
        </div>
        <button onClick={generate} className="bg-primary text-white font-body text-[10px] font-bold uppercase tracking-widest py-3 text-center hover:opacity-90">
          Generate Password
        </button>
      </div>
      <div className="bg-surface-container-low p-6 border flex flex-col justify-center text-center">
        <span className="font-body text-[9px] font-bold text-secondary uppercase mb-2 block">Generated Password</span>
        <span className="font-mono text-sm font-semibold select-all bg-white p-3 border truncate border-outline-variant/30 text-primary">
          {pwd || 'Click Generate...'}
        </span>
      </div>
    </div>
  )
}

// ── 10. Unit Converter ──
function UnitConverter() {
  const [inches, setInches] = useState(10)
  const cm = inches * 2.54

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="flex flex-col gap-1.5">
        <label className="font-body text-[10px] font-bold text-secondary uppercase">Length in Inches (in)</label>
        <input type="number" value={inches} onChange={e => setInches(parseFloat(e.target.value) || 0)} className="border border-outline-variant/30 p-3 text-xs outline-none" />
      </div>
      <div className="bg-surface-container-low p-6 border flex flex-col justify-center text-center">
        <span className="font-body text-[9px] font-bold text-secondary uppercase mb-1 block">Equivalent Metric Size</span>
        <span className="font-display text-4xl font-extrabold text-primary">{cm.toFixed(2)} cm</span>
      </div>
    </div>
  )
}

// ── 11. Color Converter ──
function ColorConverter() {
  const [hex, setHex] = useState('#D4AF37')

  // Simple Hex to RGB conversion
  const rgb = useMemo(() => {
    const cleanHex = hex.replace('#', '')
    if (cleanHex.length !== 6) return 'Invalid Hex'
    const r = parseInt(cleanHex.substring(0, 2), 16)
    const g = parseInt(cleanHex.substring(2, 4), 16)
    const b = parseInt(cleanHex.substring(4, 6), 16)
    return `rgb(${r}, ${g}, ${b})`
  }, [hex])

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="font-body text-[10px] font-bold text-secondary uppercase">HEX Color Value</label>
          <input type="text" value={hex} onChange={e => setHex(e.target.value)} className="border border-outline-variant/30 p-3 text-xs outline-none font-mono" />
        </div>
        <div className="h-10 w-full border" style={{ backgroundColor: hex }} />
      </div>
      <div className="bg-surface-container-low p-6 border flex flex-col justify-center text-center">
        <span className="font-body text-[9px] font-bold text-secondary uppercase mb-1 block">RGB Value</span>
        <span className="font-mono text-base font-bold text-primary">{rgb}</span>
      </div>
    </div>
  )
}

// ── 12. Tax Calculator ──
function TaxCalculator() {
  const [amount, setAmount] = useState(250)
  const [rate, setRate] = useState(8.25)

  const tax = (amount * rate) / 100
  const total = amount + tax

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="font-body text-[10px] font-bold text-secondary uppercase">Subtotal Amount ($)</label>
          <input type="number" value={amount} onChange={e => setAmount(Math.max(0, parseFloat(e.target.value) || 0))} className="border border-outline-variant/30 p-3 text-xs outline-none" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="font-body text-[10px] font-bold text-secondary uppercase">Tax Rate (%)</label>
          <input type="number" value={rate} onChange={e => setRate(Math.max(0, parseFloat(e.target.value) || 0))} className="border border-outline-variant/30 p-3 text-xs outline-none" />
        </div>
      </div>
      <div className="bg-surface-container-low p-6 border flex flex-col justify-center text-xs gap-2">
        <div className="flex justify-between border-b pb-1">
          <span>Subtotal:</span>
          <span className="font-bold">${amount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between border-b pb-1">
          <span>Tax Amount:</span>
          <span className="font-bold">${tax.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-baseline pt-2">
          <span className="font-bold text-[9px]">TOTAL:</span>
          <span className="font-display text-2xl font-bold text-gold-accent">${total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  )
}

// ── 13. Tip Calculator ──
function TipCalculator() {
  const [bill, setBill] = useState(80)
  const [tipPercent, setTipPercent] = useState(18)
  const [people, setPeople] = useState(2)

  const tipAmount = (bill * tipPercent) / 100
  const total = bill + tipAmount
  const split = people > 0 ? total / people : total

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="font-body text-[10px] font-bold text-secondary uppercase">Total Bill ($)</label>
          <input type="number" value={bill} onChange={e => setBill(Math.max(0, parseFloat(e.target.value) || 0))} className="border border-outline-variant/30 p-3 text-xs outline-none" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="font-body text-[10px] font-bold text-secondary uppercase">Tip Percentage (%)</label>
          <input type="number" value={tipPercent} onChange={e => setTipPercent(Math.max(0, parseFloat(e.target.value) || 0))} className="border border-outline-variant/30 p-3 text-xs outline-none" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="font-body text-[10px] font-bold text-secondary uppercase">Number of People</label>
          <input type="number" value={people} onChange={e => setPeople(Math.max(1, parseInt(e.target.value) || 1))} className="border border-outline-variant/30 p-3 text-xs outline-none" />
        </div>
      </div>
      <div className="bg-surface-container-low p-6 border flex flex-col justify-center text-xs gap-2">
        <div className="flex justify-between border-b pb-1">
          <span>Tip Amount:</span>
          <span className="font-bold">${tipAmount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between border-b pb-1">
          <span>Total Bill:</span>
          <span className="font-bold">${total.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-baseline pt-2">
          <span className="font-bold text-[9px] uppercase">Per Person:</span>
          <span className="font-display text-2xl font-bold text-gold-accent">${split.toFixed(2)}</span>
        </div>
      </div>
    </div>
  )
}

// ── 14. Storage Converter ──
function StorageConverter() {
  const [gb, setGb] = useState(512)
  const mb = gb * 1024
  const tb = gb / 1024

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="flex flex-col gap-1.5">
        <label className="font-body text-[10px] font-bold text-secondary uppercase">Capacity in Gigabytes (GB)</label>
        <input type="number" value={gb} onChange={e => setGb(parseFloat(e.target.value) || 0)} className="border border-outline-variant/30 p-3 text-xs outline-none" />
      </div>
      <div className="bg-surface-container-low p-6 border flex flex-col justify-center text-xs gap-2 text-primary font-bold">
        <div className="flex justify-between border-b pb-1">
          <span>Megabytes (MB):</span>
          <span>{mb.toLocaleString()} MB</span>
        </div>
        <div className="flex justify-between">
          <span>Terabytes (TB):</span>
          <span>{tb.toFixed(4)} TB</span>
        </div>
      </div>
    </div>
  )
}

// ── 15. Speed Converter ──
function SpeedConverter() {
  const [mph, setMph] = useState(60)
  const kph = mph * 1.60934

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="flex flex-col gap-1.5">
        <label className="font-body text-[10px] font-bold text-secondary uppercase">Speed in MPH</label>
        <input type="number" value={mph} onChange={e => setMph(parseFloat(e.target.value) || 0)} className="border border-outline-variant/30 p-3 text-xs outline-none" />
      </div>
      <div className="bg-surface-container-low p-6 border flex flex-col justify-center text-center">
        <span className="font-body text-[9px] font-bold text-secondary uppercase mb-1 block">Equivalent Speed</span>
        <span className="font-display text-4xl font-extrabold text-primary">{kph.toFixed(1)} km/h</span>
      </div>
    </div>
  )
}
