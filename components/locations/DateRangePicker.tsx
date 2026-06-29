'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface DateRangePickerProps {
  startDate: Date
  endDate: Date
  onChange: (start: Date, end: Date) => void
  allTimeStartDate?: Date
}

const DAY_MS = 24 * 60 * 60 * 1000
const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function toDateOnly(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function isSameDay(left: Date, right: Date): boolean {
  return toDateOnly(left).getTime() === toDateOnly(right).getTime()
}

function orderRange(first: Date, second: Date): [Date, Date] {
  return first.getTime() <= second.getTime() ? [first, second] : [second, first]
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

// Returns Mon–today for weeksAgo=0, Mon–Sun for weeksAgo=1, 2, …
function getPayWeek(weeksAgo: number): { start: Date; end: Date } {
  const today = toDateOnly(new Date())
  const daysSinceMonday = (today.getDay() + 6) % 7 // 0=Mon … 6=Sun
  const currentMonday = new Date(today)
  currentMonday.setDate(today.getDate() - daysSinceMonday)

  const start = new Date(currentMonday)
  start.setDate(currentMonday.getDate() - 7 * weeksAgo)
  const end = weeksAgo === 0 ? today : new Date(start.getTime() + 6 * DAY_MS)
  return { start, end }
}

export function isAllTimeRange(startDate: Date, endDate: Date): boolean {
  if (startDate.getTime() !== new Date(0).getTime()) return false

  const now = new Date()
  const isNearNow = Math.abs(endDate.getTime() - now.getTime()) < DAY_MS
  const isFarFuture = endDate.getFullYear() >= 2099

  return isNearNow || isFarFuture
}

export default function DateRangePicker({ startDate, endDate, onChange, allTimeStartDate }: DateRangePickerProps) {
  const [showCustom, setShowCustom] = useState(false)
  const displayedStartDate =
    isAllTimeRange(startDate, endDate) && allTimeStartDate ? allTimeStartDate : startDate
  const [viewMonth, setViewMonth] = useState(
    () => new Date(displayedStartDate.getFullYear(), displayedStartDate.getMonth(), 1)
  )
  const [pendingStart, setPendingStart] = useState<Date | null>(null)
  const [hoverDate, setHoverDate] = useState<Date | null>(null)
  const [dragAnchor, setDragAnchor] = useState<Date | null>(null)
  const [dragDate, setDragDate] = useState<Date | null>(null)
  const isDraggingRef = useRef(false)
  const didDragRef = useRef(false)

  useEffect(() => {
    if (!showCustom) return
    setViewMonth(new Date(displayedStartDate.getFullYear(), displayedStartDate.getMonth(), 1))
  }, [showCustom, displayedStartDate.getFullYear(), displayedStartDate.getMonth()])

  useEffect(() => {
    const stopDragging = () => {
      isDraggingRef.current = false
      setDragAnchor(null)
      setDragDate(null)
    }

    window.addEventListener('pointerup', stopDragging)
    return () => window.removeEventListener('pointerup', stopDragging)
  }, [])

  const activePreset = useMemo(() => {
    if (isAllTimeRange(startDate, endDate)) return 'all'

    const today = toDateOnly(new Date())
    const selStart = toDateOnly(startDate)
    const selEnd = toDateOnly(endDate)

    const thisWeek = getPayWeek(0)
    if (isSameDay(selStart, thisWeek.start) && isSameDay(selEnd, thisWeek.end)) return 'this-week'

    const lastWeek = getPayWeek(1)
    if (isSameDay(selStart, lastWeek.start) && isSameDay(selEnd, lastWeek.end)) return 'last-week'

    if (!isSameDay(selEnd, today)) return 'custom'

    const daysDiff = Math.round((today.getTime() - selStart.getTime()) / DAY_MS)
    if (daysDiff === 7) return '7'
    if (daysDiff === 30) return '30'
    if (daysDiff === 90) return '90'
    return 'custom'
  }, [startDate, endDate])

  const calendarDays = useMemo(() => {
    const monthStart = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1)
    const mondayOffset = (monthStart.getDay() + 6) % 7
    const gridStart = new Date(monthStart)
    gridStart.setDate(gridStart.getDate() - mondayOffset)

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart)
      date.setDate(gridStart.getDate() + index)
      return date
    })
  }, [viewMonth])

  const previewRange = useMemo<[Date, Date]>(() => {
    if (dragAnchor && dragDate) return orderRange(dragAnchor, dragDate)
    if (pendingStart && hoverDate) return orderRange(pendingStart, hoverDate)
    if (pendingStart) return [pendingStart, pendingStart]
    return [toDateOnly(displayedStartDate), toDateOnly(endDate)]
  }, [dragAnchor, dragDate, pendingStart, hoverDate, displayedStartDate, endDate])

  const maximumDate = toDateOnly(new Date())

  const isDisabled = (date: Date) => date.getTime() > maximumDate.getTime()

  const commitRange = (first: Date, second: Date) => {
    const [rangeStart, rangeEnd] = orderRange(toDateOnly(first), toDateOnly(second))
    onChange(rangeStart, rangeEnd)
    setPendingStart(null)
    setHoverDate(null)
  }

  const handlePreset = (days: number | null) => {
    const end = new Date()
    const start = days ? new Date(end.getTime() - days * DAY_MS) : new Date(0)
    onChange(start, end)
    setShowCustom(false)
    setPendingStart(null)
  }

  const handlePayWeek = (weeksAgo: number) => {
    const { start, end } = getPayWeek(weeksAgo)
    onChange(start, end)
    setShowCustom(false)
    setPendingStart(null)
  }

  const handleDayClick = (date: Date) => {
    if (isDisabled(date) || didDragRef.current) {
      didDragRef.current = false
      return
    }

    if (!pendingStart) {
      setPendingStart(date)
      setHoverDate(date)
      return
    }

    commitRange(pendingStart, date)
  }

  const handlePointerDown = (date: Date, pointerType: string) => {
    if (isDisabled(date) || pointerType === 'touch') return
    isDraggingRef.current = true
    didDragRef.current = false
    setDragAnchor(date)
    setDragDate(date)
  }

  const handlePointerEnter = (date: Date) => {
    setHoverDate(date)
    if (!isDraggingRef.current || !dragAnchor || isDisabled(date)) return
    if (!isSameDay(date, dragAnchor)) didDragRef.current = true
    setDragDate(date)
  }

  const handlePointerUp = (date: Date) => {
    if (!isDraggingRef.current || !dragAnchor) return
    if (didDragRef.current && !isDisabled(date)) {
      commitRange(dragAnchor, date)
    }
    isDraggingRef.current = false
    setDragAnchor(null)
    setDragDate(null)
  }

  const getButtonClass = (preset: string) => {
    const isActive = preset === 'custom'
      ? showCustom || activePreset === 'custom'
      : activePreset === preset
    return `rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
      isActive
        ? 'border-orange-500 bg-orange-50 text-orange-700 hover:bg-orange-100'
        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
    }`
  }

  const rangeLabel = useMemo(() => {
    const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    const s = toDateOnly(displayedStartDate)
    const e = toDateOnly(endDate)
    return isSameDay(s, e) ? fmt(s) : `${fmt(s)} – ${fmt(e)}`
  }, [displayedStartDate, endDate])

  return (
    <div className="relative flex w-full flex-wrap items-start gap-2">
      <div className="flex flex-1 flex-wrap gap-2">
        <button onClick={() => handlePayWeek(0)} className={`${getButtonClass('this-week')} min-w-[88px] flex-1`}>
          This week
        </button>
        <button onClick={() => handlePayWeek(1)} className={`${getButtonClass('last-week')} min-w-[88px] flex-1`}>
          Last week
        </button>
        <button onClick={() => handlePreset(7)} className={`${getButtonClass('7')} min-w-[88px] flex-1`}>
          Last 7 days
        </button>
        <button onClick={() => handlePreset(30)} className={`${getButtonClass('30')} min-w-[88px] flex-1`}>
          Last 30 days
        </button>
        <button onClick={() => handlePreset(90)} className={`${getButtonClass('90')} min-w-[88px] flex-1`}>
          Last 90 days
        </button>
        <button onClick={() => handlePreset(null)} className={`${getButtonClass('all')} min-w-[88px] flex-1`}>
          All time
        </button>
      </div>

      <button
        onClick={() => setShowCustom(!showCustom)}
        className={`${getButtonClass('custom')} w-full sm:w-auto`}
      >
        Custom ▾
      </button>

      <p className="w-full text-xs text-gray-500 -mt-1">{rangeLabel}</p>

      {showCustom && (
        <div className="z-30 w-full rounded-xl border border-gray-200 bg-white p-4 shadow-xl sm:absolute sm:right-0 sm:top-10 sm:w-[340px]">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
              className="rounded-lg p-2 text-gray-500 hover:bg-orange-50 hover:text-orange-700"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="text-sm font-semibold text-gray-900">
              {viewMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
            </p>
            <button
              type="button"
              onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
              className="rounded-lg p-2 text-gray-500 hover:bg-orange-50 hover:text-orange-700"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-7 text-center">
            {WEEKDAYS.map((day, index) => (
              <span key={`${day}-${index}`} className="py-2 text-[11px] font-semibold text-gray-400">
                {day}
              </span>
            ))}
            {calendarDays.map((date) => {
              const disabled = isDisabled(date)
              const inCurrentMonth = date.getMonth() === viewMonth.getMonth()
              const isStart = isSameDay(date, previewRange[0])
              const isEnd = isSameDay(date, previewRange[1])
              const isInRange =
                date.getTime() >= previewRange[0].getTime() && date.getTime() <= previewRange[1].getTime()

              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleDayClick(date)}
                  onPointerDown={(event) => handlePointerDown(date, event.pointerType)}
                  onPointerEnter={() => handlePointerEnter(date)}
                  onPointerUp={() => handlePointerUp(date)}
                  className={`relative h-9 select-none text-xs transition-colors ${
                    disabled
                      ? 'cursor-not-allowed text-gray-300'
                      : !inCurrentMonth
                        ? 'text-gray-400 hover:bg-orange-50'
                        : 'text-gray-700 hover:bg-orange-50'
                  } ${isInRange && !disabled ? 'bg-orange-50' : ''} ${
                    (isStart || isEnd) && !disabled
                      ? 'rounded-lg bg-orange-500 font-semibold text-white hover:bg-orange-600'
                      : ''
                  }`}
                >
                  {date.getDate()}
                </button>
              )
            })}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Selected range</p>
              <p className="mt-1 text-xs font-medium text-gray-700">
                {formatShortDate(previewRange[0])} - {formatShortDate(previewRange[1])}
              </p>
            </div>
            <p className="max-w-[120px] text-right text-[11px] leading-4 text-gray-500">
              Drag across dates or select start and end.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
