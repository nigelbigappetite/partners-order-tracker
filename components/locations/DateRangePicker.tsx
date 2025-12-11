'use client'

import { useState } from 'react'

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

  const handlePreset = (days: number | null) => {
    const end = new Date()
    const start = days ? new Date(end.getTime() - days * 24 * 60 * 60 * 1000) : new Date(0)
    onChange(start, end)
    setShowCustom(false)
  }

  const handleCustomStart = (value: string) => {
    const newStart = new Date(value)
    onChange(newStart, endDate)
  }

  const handleCustomEnd = (value: string) => {
    const newEnd = new Date(value)
    onChange(startDate, newEnd)
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-2">
        <button
          onClick={() => handlePreset(7)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Last 7 days
        </button>
        <button
          onClick={() => handlePreset(30)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Last 30 days
        </button>
        <button
          onClick={() => handlePreset(90)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Last 90 days
        </button>
        <button
          onClick={() => handlePreset(null)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          All time
        </button>
      </div>
      <button
        onClick={() => setShowCustom(!showCustom)}
        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
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

