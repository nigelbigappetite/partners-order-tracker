'use client'

import { useState, useRef } from 'react'
import { Upload, FileText, CheckCircle, Loader, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatCurrency } from '@/lib/utils'

interface UberCSVUploadProps {
  brandSlug: string
  brandName?: string
  onImportComplete?: () => void
}

interface UberCSVStats {
  rowCount: number
  orderCount: number
  invoiceableRevenue: number
  totalGross: number
  earliestDate: string
  latestDate: string
  uniqueLocations: number
}

interface ImportResult {
  imported: number
  skipped: number
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  result.push(current.trim())
  return result
}

function parseDDMMYYYY(dateStr: string): string {
  const parts = dateStr.split('/')
  if (parts.length !== 3) return ''
  const [day, month, year] = parts
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

function formatDateYMD(d: string): string {
  const parts = d.split('-')
  return parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : d
}

function parseMoney(value: string | undefined): number {
  if (!value) return 0
  const trimmed = value.trim()
  if (!trimmed) return 0

  const isParenthesizedNegative = trimmed.startsWith('(') && trimmed.endsWith(')')
  const parsed = parseFloat(trimmed.replace(/[^0-9.-]/g, ''))
  if (!Number.isFinite(parsed)) return 0

  return isParenthesizedNegative ? -Math.abs(parsed) : parsed
}

interface AggRow {
  date: string
  location: string
  revenue: number
  grossSales: number
  count: number
}

function parseUberCSVStats(csvText: string): UberCSVStats | null {
  const lines = csvText.split('\n').filter((l) => l.trim())
  if (lines.length < 2) return null

  let headerLineIndex = 0
  const firstCell = parseCSVLine(lines[0])[0] || ''
  if (firstCell.startsWith('Order ID as per')) {
    headerLineIndex = 1
  }
  if (lines.length <= headerLineIndex + 1) return null

  const headers = parseCSVLine(lines[headerLineIndex]).map((h) => h.toLowerCase().trim())
  const orderIdIdx = headers.indexOf('order id')
  const shopNameIdx = headers.indexOf('shop name')
  const orderDateIdx = headers.indexOf('order date')
  const salesInclVATIdx = headers.indexOf('sales (incl. vat)')
  const offersOnItemsIdx = headers.indexOf('offers on items (incl. vat)')
  const offerRedemptionFeeIdx = headers.indexOf('offer redemption fee (incl. vat)')
  const orderStatusIdx = headers.indexOf('order status')

  if (orderIdIdx === -1 || shopNameIdx === -1 || orderDateIdx === -1 || salesInclVATIdx === -1) {
    return null
  }

  const aggregated = new Map<string, AggRow>()

  for (let i = headerLineIndex + 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    const orderId = values[orderIdIdx]?.trim() || ''
    if (!orderId) continue

    const shopName = values[shopNameIdx]?.trim() || ''
    const rawDate = values[orderDateIdx]?.trim() || ''
    const date = parseDDMMYYYY(rawDate)
    if (!date || !shopName) continue

    const salesInclVAT = parseMoney(values[salesInclVATIdx])
    const offersOnItems = offersOnItemsIdx >= 0 ? Math.abs(parseMoney(values[offersOnItemsIdx])) : 0
    const offerRedemptionFee =
      offerRedemptionFeeIdx >= 0 ? Math.abs(parseMoney(values[offerRedemptionFeeIdx])) : 0
    const orderStatus = orderStatusIdx >= 0 ? values[orderStatusIdx]?.trim() || '' : ''
    const isCompleted = orderStatus === 'Completed'
    const customerSpendAfterOffers = isCompleted
      ? Math.max(0, salesInclVAT - offersOnItems - offerRedemptionFee)
      : 0

    const key = `${date}::${shopName}`
    const existing = aggregated.get(key)
    if (!existing) {
      aggregated.set(key, {
        date,
        location: shopName,
        revenue: customerSpendAfterOffers,
        grossSales: isCompleted ? salesInclVAT : 0,
        count: isCompleted ? 1 : 0,
      })
    } else {
      if (isCompleted) {
        existing.revenue += customerSpendAfterOffers
        existing.grossSales += salesInclVAT
        existing.count += 1
      }
    }
  }

  if (aggregated.size === 0) return null

  const rows = Array.from(aggregated.values())
  const dates = rows.map((r) => r.date).sort()
  const locations = new Set(rows.map((r) => r.location))

  return {
    rowCount: rows.length,
    orderCount: rows.reduce((s, r) => s + r.count, 0),
    invoiceableRevenue: rows.reduce((s, r) => s + r.revenue, 0),
    totalGross: rows.reduce((s, r) => s + r.grossSales, 0),
    earliestDate: dates[0],
    latestDate: dates[dates.length - 1],
    uniqueLocations: locations.size,
  }
}

function parseUberCSVPreview(csvText: string): any[] {
  const lines = csvText.split('\n').filter((l) => l.trim())
  if (lines.length < 2) return []

  let headerLineIndex = 0
  const firstCell = parseCSVLine(lines[0])[0] || ''
  if (firstCell.startsWith('Order ID as per')) {
    headerLineIndex = 1
  }
  if (lines.length <= headerLineIndex + 1) return []

  const headers = parseCSVLine(lines[headerLineIndex]).map((h) => h.replace(/"/g, '').trim())
  const preview: any[] = []
  for (let i = headerLineIndex + 1; i < Math.min(headerLineIndex + 6, lines.length); i++) {
    const values = parseCSVLine(lines[i]).map((v) => v.replace(/"/g, '').trim())
    const row: any = {}
    headers.forEach((header, idx) => {
      row[header] = values[idx] || ''
    })
    preview.push(row)
  }
  return preview
}

export default function UberCSVUpload({ brandSlug, brandName, onImportComplete }: UberCSVUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [previewData, setPreviewData] = useState<any[]>([])
  const [fileName, setFileName] = useState<string>('')
  const [showModal, setShowModal] = useState(false)
  const [csvStats, setCsvStats] = useState<UberCSVStats | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast.error('Please select a CSV file')
      return
    }
    setFileName(file.name)
    const text = await file.text()
    const preview = parseUberCSVPreview(text)
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

  const handleImportClick = async () => {
    if (!fileName) return
    const fileInput = fileInputRef.current?.files?.[0]
    if (!fileInput) return

    const text = await fileInput.text()
    const stats = parseUberCSVStats(text)
    if (!stats) {
      toast.error('Could not parse Uber CSV — check column headers')
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

      const response = await fetch('/api/sales/import/uber', { method: 'POST', body: formData })
      const result = await response.json()

      if (!response.ok) throw new Error(result.error || 'Import failed')

      setImportResult({ imported: result.imported, skipped: result.skipped })
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

  const displayBrand = brandName || brandSlug

  return (
    <div className="space-y-4">
      {/* File Upload Area */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
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
          {isDragging ? 'Drop CSV file here' : 'Click or drag Uber Eats CSV to upload'}
        </p>
        <p className="mt-2 text-xs text-gray-500">
          Export from Uber Eats Manager → Reports → Order breakdown
        </p>
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
              onClick={() => {
                setPreviewData([])
                setFileName('')
                if (fileInputRef.current) fileInputRef.current.value = ''
              }}
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
                    <th key={header} className="px-2 py-1 text-left font-medium text-gray-700">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData.map((row, index) => (
                  <tr key={index} className="border-b">
                    {Object.values(row).map((value: any, colIndex) => (
                      <td key={colIndex} className="px-2 py-1 text-gray-600">
                        {String(value).substring(0, 30)}
                      </td>
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
            <span>Import Uber CSV</span>
          </button>
        </div>
      )}

      {/* Confirmation Modal */}
      {showModal && csvStats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            {importResult ? (
              <>
                <div
                  className={`px-6 py-4 ${importResult.imported > 0 ? 'bg-green-50 border-b border-green-100' : 'bg-amber-50 border-b border-amber-100'}`}
                >
                  <div className="flex items-center gap-2">
                    {importResult.imported > 0 ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                    )}
                    <h3 className="font-semibold text-gray-900">Import Complete</h3>
                  </div>
                </div>
                <div className="px-6 py-5 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Brand</span>
                    <span className="font-medium text-gray-900">{displayBrand}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Daily rows imported/updated</span>
                    <span className="font-semibold text-green-700">{importResult.imported}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Rows skipped</span>
                    <span
                      className={`font-semibold ${importResult.skipped > 0 ? 'text-amber-600' : 'text-gray-400'}`}
                    >
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
              <>
                <div className="px-6 py-4 bg-amber-50 border-b border-amber-100">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    <h3 className="font-semibold text-gray-900">Confirm Uber Import</h3>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Review before committing to the database</p>
                </div>
                <div className="px-6 py-5 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Brand</span>
                    <span className="font-semibold text-gray-900">{displayBrand}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Aggregated rows</span>
                    <span className="font-medium text-gray-900">{csvStats.rowCount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Completed orders</span>
                    <span className="font-medium text-gray-900">{csvStats.orderCount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Revenue after offers</span>
                    <span className="font-medium text-gray-900">{formatCurrency(csvStats.invoiceableRevenue)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Gross sales</span>
                    <span className="font-medium text-gray-900">{formatCurrency(csvStats.totalGross)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Date range</span>
                    <span className="font-medium text-gray-900">
                      {formatDateYMD(csvStats.earliestDate)} → {formatDateYMD(csvStats.latestDate)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Unique locations</span>
                    <span className="font-medium text-gray-900">{csvStats.uniqueLocations}</span>
                  </div>
                  <p className="text-xs text-gray-400 pt-1">
                    Existing rows with the same brand + date + location will be skipped automatically.
                  </p>
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
                    {isUploading ? (
                      <>
                        <Loader className="h-4 w-4 animate-spin" />
                        <span>Importing…</span>
                      </>
                    ) : (
                      'Confirm Import'
                    )}
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
