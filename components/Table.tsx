'use client'

import { ReactNode } from 'react'

interface TableProps {
  headers: string[]
  children: ReactNode
  maxHeight?: string
  stickyHeader?: boolean
}

export default function Table({ headers, children, maxHeight, stickyHeader = true }: TableProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      {/* Horizontal scrolling container */}
      <div className="overflow-x-auto scrollbar-thin">
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
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 whitespace-nowrap"
                  >
                    {header}
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

