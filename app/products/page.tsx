'use client'

import { useEffect, useState } from 'react'
import Navigation from '@/components/Navigation'
import Table from '@/components/Table'
import { SKU } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'
import { Search } from 'lucide-react'

export default function ProductsPage() {
  const [skus, setSkus] = useState<SKU[]>([])
  const [filteredSkus, setFilteredSkus] = useState<SKU[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSKUs()
  }, [])

  useEffect(() => {
    if (searchTerm) {
      const filtered = skus.filter(
        (sku) =>
          sku.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
          sku.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          sku.supplier.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredSkus(filtered)
    } else {
      setFilteredSkus(skus)
    }
  }, [searchTerm, skus])

  const fetchSKUs = async () => {
    try {
      const response = await fetch('/api/skus')
      const data = await response.json()
      setSkus(data)
      setFilteredSkus(data)
    } catch (error) {
      toast.error('Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Products</h1>
          <p className="mt-2 text-gray-600">Searchable SKU database</p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by SKU, product name, or supplier..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-white placeholder:text-white/70 focus:border-gray-900 focus:outline-none"
            />
          </div>
        </div>

        {/* Products Table */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">SKU Database</h2>
            <p className="text-sm text-gray-500">{filteredSkus.length} products</p>
          </div>
          <Table 
            headers={['SKU', 'Product Name', 'Unit Size', 'Selling Price', 'Supplier', 'Cost Per Unit']}
            maxHeight="calc(100vh - 300px)"
            stickyHeader={true}
          >
            {filteredSkus.map((sku, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                  {sku.sku}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                  {sku.productName}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  {sku.unitSize}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                  {formatCurrency(sku.sellingPrice)}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  {sku.supplier}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  {formatCurrency(sku.costPerUnit)}
                </td>
              </tr>
            ))}
          </Table>
        </div>
      </div>
    </div>
  )
}

