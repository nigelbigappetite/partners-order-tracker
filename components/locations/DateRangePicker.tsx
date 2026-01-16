'use client'

import { useState, useMemo } from 'react'

interface DateRangePickerProps {
  startDate: Date
  endDate: Date
  onChange: (start: Date, end: Date) => void
}

export default function DateRangePicker({ startDate, endDate, onChange }: DateRangePickerProps) {
  const [showCustom, setShowCustom] = useState(false)

  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0]
  }

  // Determine which preset is active
  const activePreset = useMemo(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endOfToday = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1)
    
    // Check if end date is today (within 1 second tolerance)
    const isEndToday = Math.abs(endDate.getTime() - endOfToday.getTime()) < 1000
    
    if (!isEndToday) {
      // Check if it's "All time" (start is epoch, end is far future)
      const isAllTime = startDate.getTime() === new Date(0).getTime() && endDate.getFullYear() >= 2099
      return isAllTime ? 'all' : 'custom'
    }
    
    // Calculate days difference
    const daysDiff = Math.round((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000))
    
    if (daysDiff === 7) return '7'
    if (daysDiff === 30) return '30'
    if (daysDiff === 90) return '90'
    
    // Check if it's all time (start is epoch)
    if (startDate.getTime() === new Date(0).getTime()) return 'all'
    
    return 'custom'
  }, [startDate, endDate])

  const handlePreset = (days: number | null) => {
    const end = new Date()
    const start = days ? new Date(end.getTime() - days * 24 * 60 * 60 * 1000) : new Date(0)
    onChange(start, end)
    setShowCustom(false)
  }

  const handleCustomStart = (value: string) => {
    const newStart = new Date(value)
    onChange(newStart, endDate)
    setShowCustom(true)
  }

  const handleCustomEnd = (value: string) => {
    const newEnd = new Date(value)
    onChange(startDate, newEnd)
    setShowCustom(true)
  }

  const getButtonClass = (preset: string) => {
    const isActive = activePreset === preset
    return `rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
      isActive
        ? 'border-blue-500 bg-blue-50 text-blue-700 hover:bg-blue-100'
        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
    }`
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-2">
        <button
          onClick={() => handlePreset(7)}
          className={getButtonClass('7')}
        >
          Last 7 days
        </button>
        <button
          onClick={() => handlePreset(30)}
          className={getButtonClass('30')}
        >
          Last 30 days
        </button>
        <button
          onClick={() => handlePreset(90)}
          className={getButtonClass('90')}
        >
          Last 90 days
        </button>
        <button
          onClick={() => handlePreset(null)}
          className={getButtonClass('all')}
        >
          All time
        </button>
      </div>
      <button
        onClick={() => setShowCustom(!showCustom)}
        className={getButtonClass('custom')}
      >
        Custom ▾
      </button>
      {showCustom && (
        <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white p-2">
          <input
            type="date"
            value={formatDateForInput(startDate)}
            onChange={(e) => handleCustomStart(e.target.value)}
            className="rounded border border-gray-300 px-2 py-1 text-xs text-white focus:border-gray-900 focus:outline-none"
          />
          <span className="text-xs text-gray-500">to</span>
          <input
            type="date"
            value={formatDateForInput(endDate)}
            onChange={(e) => handleCustomEnd(e.target.value)}
            className="rounded border border-gray-300 px-2 py-1 text-xs text-white focus:border-gray-900 focus:outline-none"
          />
        </div>
      )}
    </div>
  )
}

