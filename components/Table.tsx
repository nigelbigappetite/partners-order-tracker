'use client'

import { ReactNode } from 'react'
import { ArrowUp, ArrowDown } from 'lucide-react'

interface TableProps {
  headers: string[]
  children: ReactNode
  maxHeight?: string
  stickyHeader?: boolean
  sortable?: boolean
  sortColumn?: string | null
  sortDirection?: 'asc' | 'desc' | null
  onSort?: (column: string) => void
}

export default function Table({ 
  headers, 
  children, 
  maxHeight, 
  stickyHeader = true,
  sortable = false,
  sortColumn = null,
  sortDirection = null,
  onSort
}: TableProps) {
  const handleSort = (header: string) => {
    if (sortable && onSort) {
      onSort(header)
    }
  }

  const getSortIcon = (header: string) => {
    if (!sortable || !onSort) return null
    
    if (sortColumn === header) {
      return sortDirection === 'asc' ? (
        <ArrowUp className="h-3 w-3 ml-1 inline-block" />
      ) : (
        <ArrowDown className="h-3 w-3 ml-1 inline-block" />
      )
    }
    
    // Show both arrows when not sorted
    return (
      <span className="ml-1 inline-flex flex-col">
        <ArrowUp className="h-2 w-2 text-gray-300" />
        <ArrowDown className="h-2 w-2 text-gray-300 -mt-1" />
      </span>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      {/* Horizontal scrolling container */}
      <div className="overflow-x-auto scrollbar-thin -mx-1 xs:mx-0 sm:mx-0">
        {/* Vertical scrolling container with optional max height */}
        <div 
          className="overflow-y-auto scrollbar-thin"
          style={maxHeight ? { maxHeight } : undefined}
        >
          <table className="min-w-full divide-y divide-gray-200">
            <thead className={`bg-gray-50 ${stickyHeader ? 'sticky top-0 z-10' : ''}`}>
              <tr>
                {headers.map((header, index) => (
                  <th
                    key={index}
                    onClick={() => handleSort(header)}
                    className={`px-2 xs:px-3 sm:px-6 py-2 xs:py-2.5 sm:py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 whitespace-nowrap ${
                      sortable && onSort ? 'cursor-pointer hover:bg-gray-100 select-none' : ''
                    } ${sortColumn === header ? 'bg-gray-100' : ''}`}
                  >
                    <span className="flex items-center">
                      {header}
                      {getSortIcon(header)}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {children}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

