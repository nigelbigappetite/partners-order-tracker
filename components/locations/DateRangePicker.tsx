'use client'

import { useState, useMemo } from 'react'

interface DateRangePickerProps {
  startDate: Date
  endDate: Date
  onChange: (start: Date, end: Date) => void
}

export function isAllTimeRange(startDate: Date, endDate: Date): boolean {
  if (startDate.getTime() !== new Date(0).getTime()) return false

  const now = new Date()
  const isNearNow = Math.abs(endDate.getTime() - now.getTime()) < 24 * 60 * 60 * 1000
  const isFarFuture = endDate.getFullYear() >= 2099

  return isNearNow || isFarFuture
}

export default function DateRangePicker({ startDate, endDate, onChange }: DateRangePickerProps) {
  const [showCustom, setShowCustom] = useState(false)

  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0]
  }

  const toDateOnlyValue = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  }

  // Determine which preset is active
  const activePreset = useMemo(() => {
    if (isAllTimeRange(startDate, endDate)) return 'all'

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const selectedEnd = toDateOnlyValue(endDate)
    const todayValue = toDateOnlyValue(today)

    if (selectedEnd !== todayValue) return 'custom'

    const msPerDay = 24 * 60 * 60 * 1000
    const selectedStart = toDateOnlyValue(startDate)
    const daysDiff = Math.round((todayValue - selectedStart) / msPerDay)

    if (daysDiff === 7) return '7'
    if (daysDiff === 30) return '30'
    if (daysDiff === 90) return '90'
    
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
    const isActive = preset === 'custom'
      ? showCustom || activePreset === 'custom'
      : activePreset === preset
    return `rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
      isActive
        ? 'border-blue-500 bg-blue-50 text-blue-700 hover:bg-blue-100'
        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
    }`
  }

  return (
    <div className="flex w-full flex-wrap items-start gap-2">
      <div className="flex flex-1 flex-wrap gap-2">
        <button
          onClick={() => handlePreset(7)}
          className={`${getButtonClass('7')} flex-1 min-w-[88px]`}
        >
          Last 7 days
        </button>
        <button
          onClick={() => handlePreset(30)}
          className={`${getButtonClass('30')} flex-1 min-w-[88px]`}
        >
          Last 30 days
        </button>
        <button
          onClick={() => handlePreset(90)}
          className={`${getButtonClass('90')} flex-1 min-w-[88px]`}
        >
          Last 90 days
        </button>
        <button
          onClick={() => handlePreset(null)}
          className={`${getButtonClass('all')} flex-1 min-w-[88px]`}
        >
          All time
        </button>
      </div>
      <button
        onClick={() => setShowCustom(!showCustom)}
        className={`${getButtonClass('custom')} w-full sm:w-auto`}
      >
        Custom ▾
      </button>
      {showCustom && (
        <div className="flex w-full flex-col gap-2 rounded-lg border border-gray-300 bg-white p-2 sm:w-auto sm:flex-row sm:items-center">
          <input
            type="date"
            value={formatDateForInput(startDate)}
            onChange={(e) => handleCustomStart(e.target.value)}
            className="w-full rounded border border-gray-300 px-2 py-1 text-xs text-gray-900 focus:border-gray-900 focus:outline-none"
          />
          <span className="hidden text-xs text-gray-500 sm:block">to</span>
          <input
            type="date"
            value={formatDateForInput(endDate)}
            onChange={(e) => handleCustomEnd(e.target.value)}
            className="w-full rounded border border-gray-300 px-2 py-1 text-xs text-gray-900 focus:border-gray-900 focus:outline-none"
          />
        </div>
      )}
    </div>
  )
}
