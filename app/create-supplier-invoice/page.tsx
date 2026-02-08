'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CreateSupplierInvoicePage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/supplier-invoices')
  }, [router])
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-600">Redirecting to Supplier invoices...</p>
    </div>
  )
}
