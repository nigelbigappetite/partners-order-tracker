'use client'

import { useState } from 'react'
import Navigation from '@/components/Navigation'
import toast from 'react-hot-toast'

const SHEET_NAMES = [
  'Orders_Header',
  'Order_Lines',
  'SKU_COGS',
  'Supplier_Summary',
  'Franchise_Locations',
]

export default function DebugPage() {
  const [selectedSheet, setSelectedSheet] = useState('Orders_Header')
  const [columns, setColumns] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const fetchColumns = async (sheetName: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/debug/columns?sheet=${encodeURIComponent(sheetName)}`)
      const data = await response.json()
      
      if (data.error) {
        toast.error(data.error)
        setColumns([])
      } else {
        setColumns(data.headers || [])
        toast.success(`Found ${data.headers?.length || 0} columns`)
      }
    } catch (error: any) {
      toast.error('Failed to fetch columns')
      console.error(error)
      setColumns([])
    } finally {
      setLoading(false)
    }
  }

  const handleSheetChange = (sheetName: string) => {
    setSelectedSheet(sheetName)
    fetchColumns(sheetName)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Google Sheets Column Mapper</h1>
          <p className="mt-2 text-gray-600">
            View your actual Google Sheets column headers to help map them correctly
          </p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Sheet:
          </label>
          <select
            value={selectedSheet}
            onChange={(e) => handleSheetChange(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {SHEET_NAMES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <button
            onClick={() => fetchColumns(selectedSheet)}
            disabled={loading}
            className="ml-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Loading from Hungry Tum OS' : 'Refresh'}
          </button>
        </div>

        {columns.length > 0 && (
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              Columns in {selectedSheet}
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {columns.map((col, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-gray-200 bg-gray-50 p-3"
                >
                  <div className="text-xs text-gray-500 mb-1">Column {index + 1}</div>
                  <div className="font-mono text-sm font-medium text-gray-900">{col || '(empty)'}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {columns.length === 0 && !loading && (
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <p className="text-gray-500">No columns found. Click "Refresh" to load columns.</p>
          </div>
        )}

        <div className="mt-8 rounded-lg border border-blue-200 bg-blue-50 p-6">
          <h3 className="mb-2 text-lg font-semibold text-blue-900">How to Map Columns</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
            <li>Select a sheet above to see its actual column headers</li>
            <li>Compare these headers with the mappings in <code className="bg-blue-100 px-1 rounded">lib/sheets.ts</code></li>
            <li>If a column name doesn't match, add it to the <code className="bg-blue-100 px-1 rounded">columnMapping</code> object</li>
            <li>Format: <code className="bg-blue-100 px-1 rounded">'Your Column Name': 'applicationPropertyName'</code></li>
            <li>See <code className="bg-blue-100 px-1 rounded">MAPPING_GUIDE.md</code> for detailed instructions</li>
          </ol>
        </div>
      </div>
    </div>
  )
}

