'use client'

import { useState, useRef } from 'react'
import { Upload, FileText, CheckCircle, XCircle, Loader, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatCurrency } from '@/lib/utils'

interface CSVUploadProps {
  brandSlug: string
  brandName?: string
  onImportComplete?: () => void
}

interface CSVStats {
  rowCount: number
  totalRevenue: number
  totalOrders: number
  earliestDate: string
  latestDate: string
  uniqueLocations: number
}

interface ImportResult {
  imported: number
  skipped: number
}

export default function CSVUpload({ brandSlug, brandName, onImportComplete }: CSVUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [previewData, setPreviewData] = useState<any[]>([])
  const [fileName, setFileName] = useState<string>('')
  const [showModal, setShowModal] = useState(false)
  const [csvStats, setCsvStats] = useState<CSVStats | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast.error('Please select a CSV file')
      return
    }
    setFileName(file.name)
    const text = await file.text()
    const preview = parseCSVPreview(text)
    setPreviewData(preview)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileSelect(file)
  }

  // Full client-side parse to compute stats before confirming
  const parseFullCSV = (csvText: string): CSVStats | null => {
    const lines = csvText.split('\n').filter((l) => l.trim())
    if (lines.length < 2) return null

    const headers = lines[0].split(',').map((h) => h.replace(/"/g, '').trim().toLowerCase())
    const dateIdx = headers.indexOf('date')
    const revenueIdx = headers.indexOf('revenue')
    const grossSalesIdx = headers.indexOf('grosssales') !== -1 ? headers.indexOf('grosssales') : headers.indexOf('gross sales')
    const countIdx = headers.indexOf('count')
    const locationIdx = headers.indexOf('location')

    if (dateIdx === -1 || revenueIdx === -1 || countIdx === -1 || locationIdx === -1) return null

    let totalRevenue = 0
    let totalOrders = 0
    const dates: string[] = []
    const locations = new Set<string>()

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.replace(/"/g, '').trim())
      const rawRevenue = values[revenueIdx] || ''
      const rawCount = values[countIdx] || ''
      if (!rawRevenue && !rawCount) continue

      const date = values[dateIdx] || ''
      const location = values[locationIdx] || ''
      const revenue = parseFloat(rawRevenue || '0') || 0
      const count = parseInt(rawCount || '0', 10) || 0

      if (date && location) {
        totalRevenue += revenue
        totalOrders += count
        dates.push(date)
        locations.add(location)
      }
    }

    if (dates.length === 0) return null

    dates.sort()
    return {
      rowCount: dates.length,
      totalRevenue,
      totalOrders,
      earliestDate: dates[0],
      latestDate: dates[dates.length - 1],
      uniqueLocations: locations.size,
    }
  }

  const handleImportClick = async () => {
    if (!fileName) return
    const fileInput = fileInputRef.current?.files?.[0]
    if (!fileInput) return

    const text = await fileInput.text()
    const stats = parseFullCSV(text)
    if (!stats) {
      toast.error('Could not parse CSV — check column headers')
      return
    }

    setCsvStats(stats)
    setImportResult(null)
    setShowModal(true)
  }

  const handleConfirmImport = async () => {
    const fileInput = fileInputRef.current?.files?.[0]
    if (!fileInput) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', fileInput)
      formData.append('brand_slug', brandSlug)

      const response = await fetch('/api/sales/import', { method: 'POST', body: formData })
      const result = await response.json()

      if (!response.ok) throw new Error(result.error || 'Import failed')

      setImportResult({ imported: result.imported, skipped: result.skipped })

      // Reset file state but keep modal open to show result
      setPreviewData([])
      setFileName('')
      if (fileInputRef.current) fileInputRef.current.value = ''

      if (onImportComplete) onImportComplete()
    } catch (error: any) {
      toast.error(error.message || 'Failed to import CSV')
      setShowModal(false)
    } finally {
      setIsUploading(false)
    }
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setCsvStats(null)
    setImportResult(null)
  }

  const formatDate = (d: string) => {
    const parts = d.split('-')
    return parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : d
  }

  const parseCSVPreview = (csvText: string): any[] => {
    const lines = csvText.split('\n').filter((l) => l.trim())
    if (lines.length < 2) return []
    const headers = lines[0].split(',').map((h) => h.trim())
    const preview: any[] = []
    for (let i = 1; i < Math.min(6, lines.length); i++) {
      const values = lines[i].split(',').map((v) => v.trim())
      const row: any = {}
      headers.forEach((header, idx) => { row[header] = values[idx] || '' })
      preview.push(row)
    }
    return preview
  }

  const displayBrand = brandName || brandSlug

  return (
    <div className="space-y-4">
      {/* File Upload Area */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-all
          ${isDragging ? 'border-brand-primary bg-brand-light' : 'border-gray-300'}
          ${isUploading ? 'opacity-50 pointer-events-none' : 'cursor-pointer hover:border-brand-primary'}
        `}
        onClick={() => fileInputRef.current?.click()}
      >
        <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileInput} className="hidden" />
        <Upload className={`mx-auto h-12 w-12 ${isDragging ? 'text-brand-primary' : 'text-gray-400'}`} />
        <p className="mt-4 text-sm text-gray-600">
          {isDragging ? 'Drop CSV file here' : 'Click or drag CSV file to upload'}
        </p>
        <p className="mt-2 text-xs text-gray-500">Expected columns: Date, Revenue, GrossSales, Count, Location</p>
      </div>

      {/* Preview */}
      {previewData.length > 0 && (
        <div className="border rounded-lg p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-gray-600" />
              <span className="font-medium text-gray-900">{fileName}</span>
              <span className="text-sm text-gray-500">({previewData.length} rows preview)</span>
            </div>
            <button
              onClick={() => { setPreviewData([]); setFileName(''); if (fileInputRef.current) fileInputRef.current.value = '' }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b">
                  {Object.keys(previewData[0] || {}).map((header) => (
                    <th key={header} className="px-2 py-1 text-left font-medium text-gray-700">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData.map((row, index) => (
                  <tr key={index} className="border-b">
                    {Object.values(row).map((value: any, colIndex) => (
                      <td key={colIndex} className="px-2 py-1 text-gray-600">{String(value).substring(0, 30)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            onClick={handleImportClick}
            disabled={isUploading}
            className="mt-4 w-full bg-brand-primary text-white px-4 py-2 rounded-lg hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            <CheckCircle className="h-4 w-4" />
            <span>Import CSV</span>
          </button>
        </div>
      )}

      {/* Confirmation Modal */}
      {showModal && csvStats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            {importResult ? (
              /* Result view */
              <>
                <div className={`px-6 py-4 ${importResult.imported > 0 ? 'bg-green-50 border-b border-green-100' : 'bg-amber-50 border-b border-amber-100'}`}>
                  <div className="flex items-center gap-2">
                    {importResult.imported > 0
                      ? <CheckCircle className="h-5 w-5 text-green-600" />
                      : <AlertTriangle className="h-5 w-5 text-amber-600" />
                    }
                    <h3 className="font-semibold text-gray-900">Import Complete</h3>
                  </div>
                </div>
                <div className="px-6 py-5 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Brand</span>
                    <span className="font-medium text-gray-900">{displayBrand}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">New rows imported</span>
                    <span className="font-semibold text-green-700">{importResult.imported}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Duplicates skipped</span>
                    <span className={`font-semibold ${importResult.skipped > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                      {importResult.skipped}
                    </span>
                  </div>
                </div>
                <div className="px-6 pb-5">
                  <button
                    onClick={handleCloseModal}
                    className="w-full bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 text-sm font-medium"
                  >
                    Done
                  </button>
                </div>
              </>
            ) : (
              /* Pre-import confirmation view */
              <>
                <div className="px-6 py-4 bg-amber-50 border-b border-amber-100">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    <h3 className="font-semibold text-gray-900">Confirm Import</h3>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Review before committing to the database</p>
                </div>
                <div className="px-6 py-5 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Brand</span>
                    <span className="font-semibold text-gray-900">{displayBrand}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Rows to import</span>
                    <span className="font-medium text-gray-900">{csvStats.rowCount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total revenue</span>
                    <span className="font-medium text-gray-900">{formatCurrency(csvStats.totalRevenue)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total orders</span>
                    <span className="font-medium text-gray-900">{csvStats.totalOrders.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Date range</span>
                    <span className="font-medium text-gray-900">{formatDate(csvStats.earliestDate)} → {formatDate(csvStats.latestDate)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Unique locations</span>
                    <span className="font-medium text-gray-900">{csvStats.uniqueLocations}</span>
                  </div>
                  <p className="text-xs text-gray-400 pt-1">Existing rows with the same brand + date + location will be skipped automatically.</p>
                </div>
                <div className="px-6 pb-5 flex gap-3">
                  <button
                    onClick={handleCloseModal}
                    className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmImport}
                    disabled={isUploading}
                    className="flex-1 bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50 text-sm font-medium flex items-center justify-center gap-2"
                  >
                    {isUploading ? <><Loader className="h-4 w-4 animate-spin" /><span>Importing…</span></> : 'Confirm Import'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
