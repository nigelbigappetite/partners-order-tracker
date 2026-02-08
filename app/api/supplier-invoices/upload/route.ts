import { NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { updateSupplierInvoiceFileLink } from '@/lib/sheets'

const MAX_FILE_SIZE_BYTES = 4.5 * 1024 * 1024 // 4.5 MB (Vercel serverless limit)
const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp']

function getExtension(name: string): string {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i).toLowerCase() : ''
}

function isValidFileType(file: File): boolean {
  const ext = getExtension(file.name)
  if (!ALLOWED_EXTENSIONS.includes(ext)) return false
  if (ALLOWED_TYPES.includes(file.type)) return true
  // Fallback by extension
  if (ext === '.pdf') return true
  if (['.jpg', '.jpeg'].includes(ext)) return true
  if (ext === '.png') return true
  if (ext === '.gif') return true
  if (ext === '.webp') return true
  return false
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const supplierInvoiceId = formData.get('supplier_invoice_id') as string | null
    const supplierInvoiceNo = formData.get('supplier_invoice_no') as string | null
    const salesInvoiceNo = formData.get('sales_invoice_no') as string | null

    if (!file || typeof file === 'string') {
      return NextResponse.json(
        { error: 'A file is required' },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File size must be under ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB` },
        { status: 400 }
      )
    }

    if (!isValidFileType(file)) {
      return NextResponse.json(
        { error: 'File must be a PDF or image (JPEG, PNG, GIF, WebP)' },
        { status: 400 }
      )
    }

    const ext = getExtension(file.name) || '.pdf'
    const timestamp = Date.now()
    const pathPrefix =
      salesInvoiceNo && supplierInvoiceNo
        ? `supplier-invoices/${String(salesInvoiceNo).replace(/[^a-zA-Z0-9-_]/g, '_')}/${String(supplierInvoiceNo).replace(/[^a-zA-Z0-9-_]/g, '_')}_${timestamp}`
        : `supplier-invoices/upload/${timestamp}`
    const pathname = `${pathPrefix}${ext}`

    const blob = await put(pathname, file, {
      access: 'public',
      addRandomSuffix: true,
      contentType: file.type || undefined,
    })

    let updated = false
    const invoiceId = supplierInvoiceId?.toString().trim()
    if (invoiceId) {
      try {
        await updateSupplierInvoiceFileLink(invoiceId, blob.url)
        updated = true
      } catch (err: any) {
        console.error('[supplier-invoices/upload] Failed to update sheet:', err.message)
        return NextResponse.json(
          { error: 'File uploaded but failed to link to invoice: ' + (err.message || 'unknown') },
          { status: 500 }
        )
      }
    }

    return NextResponse.json(
      updated ? { url: blob.url, updated: true } : { url: blob.url }
    )
  } catch (error: any) {
    console.error('[supplier-invoices/upload] Error:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to upload file',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}
