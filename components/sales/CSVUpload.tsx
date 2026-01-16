'use client'

import { useState, useRef } from 'react'
import { Upload, FileText, CheckCircle, XCircle, Loader } from 'lucide-react'
import toast from 'react-hot-toast'

interface CSVUploadProps {
  onImportComplete?: () => void
}

export default function CSVUpload({ onImportComplete }: CSVUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [previewData, setPreviewData] = useState<any[]>([])
  const [fileName, setFileName] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast.error('Please select a CSV file')
      return
    }

    setFileName(file.name)
    
    // Read and preview file
    const text = await file.text()
    const preview = parseCSVPreview(text)
    setPreviewData(preview)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleImport = async () => {
    if (!fileName) return

    setIsUploading(true)
    try {
      const fileInput = fileInputRef.current?.files?.[0]
      if (!fileInput) {
        toast.error('No file selected')
        return
      }

      const formData = new FormData()
      formData.append('file', fileInput)

      const response = await fetch('/api/sales/import', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Import failed')
      }

      if (result.errors && result.errors.length > 0) {
        console.warn('Import completed with errors:', result.errors)
      }

      if (result.unmappedLocations && result.unmappedLocations.length > 0) {
        toast(
          `Imported ${result.imported} rows. ${result.unmappedLocations.length} locations need mapping.`,
          { duration: 5000 }
        )
      } else {
        toast.success(`Successfully imported ${result.imported} rows`)
      }

      // Reset form
      setPreviewData([])
      setFileName('')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      // Callback
      if (onImportComplete) {
        onImportComplete()
      }
    } catch (error: any) {
      console.error('Import error:', error)
      toast.error(error.message || 'Failed to import CSV')
    } finally {
      setIsUploading(false)
    }
  }

  const parseCSVPreview = (csvText: string): any[] => {
    const lines = csvText.split('\n').filter(line => line.trim())
    if (lines.length < 2) return []

    const headers = lines[0].split(',').map(h => h.trim())
    const preview: any[] = []

    for (let i = 1; i < Math.min(6, lines.length); i++) {
      const values = lines[i].split(',').map(v => v.trim())
      const row: any = {}
      headers.forEach((header, index) => {
        row[header] = values[index] || ''
      })
      preview.push(row)
    }

    return preview
  }

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
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileInput}
          className="hidden"
        />
        <Upload className={`mx-auto h-12 w-12 ${isDragging ? 'text-brand-primary' : 'text-gray-400'}`} />
        <p className="mt-4 text-sm text-gray-600">
          {isDragging ? 'Drop CSV file here' : 'Click or drag CSV file to upload'}
        </p>
        <p className="mt-2 text-xs text-gray-500">
          Expected columns: Date, Revenue, GrossSales, Count, Location
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
                if (fileInputRef.current) {
                  fileInputRef.current.value = ''
                }
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
            onClick={handleImport}
            disabled={isUploading}
            className="mt-4 w-full bg-brand-primary text-white px-4 py-2 rounded-lg hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isUploading ? (
              <>
                <Loader className="h-4 w-4 animate-spin" />
                <span>Importing...</span>
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                <span>Import CSV</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
