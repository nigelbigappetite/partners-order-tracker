'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Navigation from '@/components/Navigation'
import ActionButton from '@/components/ActionButton'
import Table from '@/components/Table'
import { SKU, Franchise, OrderLine } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'
import { Plus, X, ChevronDown } from 'lucide-react'

interface OrderLineInput extends Omit<OrderLine, 'orderId' | 'lineTotal'> {
  lineTotal: number
}

export default function CreateOrderPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [skus, setSkus] = useState<SKU[]>([])
  const [franchises, setFranchises] = useState<Franchise[]>([])
  const [selectedFranchise, setSelectedFranchise] = useState<Franchise | null>(null)
  const [selectedBrand, setSelectedBrand] = useState<string>('')
  const [orderLines, setOrderLines] = useState<OrderLineInput[]>([])
  const [selectedSku, setSelectedSku] = useState<SKU | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [orderNumber, setOrderNumber] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [productDropdownOpen, setProductDropdownOpen] = useState(false)
  const [productSearchTerm, setProductSearchTerm] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    console.log('[CreateOrder] Component mounted, fetching data...')
    fetchSKUs()
    fetchFranchises()
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProductDropdownOpen(false)
      }
    }

    if (productDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [productDropdownOpen])

  const fetchSKUs = async () => {
    try {
      const response = await fetch('/api/skus')
      const data = await response.json()
      setSkus(data)
    } catch (error) {
      toast.error('Failed to load products')
    }
  }

  // Filter SKUs based on search term
  const filteredSkus = useMemo(() => {
    if (!productSearchTerm.trim()) return skus
    const searchLower = productSearchTerm.toLowerCase()
    return skus.filter((sku) => 
      sku.productName?.toLowerCase().includes(searchLower) ||
      sku.sku?.toLowerCase().includes(searchLower)
    )
  }, [skus, productSearchTerm])

  const fetchFranchises = async () => {
    try {
      console.log('[CreateOrder] Starting to fetch franchises...')
      // Add cache-busting timestamp to ensure fresh data
      const url = `/api/franchises?t=${Date.now()}`
      console.log('[CreateOrder] Fetching from:', url)
      
      const response = await fetch(url)
      console.log('[CreateOrder] Response status:', response.status, response.ok)
      
      const data = await response.json()
      console.log('[CreateOrder] Raw response data:', data)
      console.log('[CreateOrder] Fetched franchises:', Array.isArray(data) ? data.length : 'Not an array')
      
      if (Array.isArray(data) && data.length > 0) {
        console.log('[CreateOrder] Sample franchises:', data.slice(0, 5).map((f: Franchise) => ({
          code: f.code,
          name: f.name,
          brand: f.brand
        })))
        
        // Check for Wanstead specifically
        const wanstead = data.find((f: Franchise) => 
          f.name?.toLowerCase().includes('wanstead') || 
          f.code?.toLowerCase().includes('wanstead')
        )
        console.log('[CreateOrder] Wanstead location found:', wanstead)
      }
      
      // Store all franchises (including duplicates by brand) for brand selection
      const filtered = Array.isArray(data) ? data.filter((f: Franchise) => f.code) : []
      console.log('[CreateOrder] Filtered franchises (with code):', filtered.length)
      console.log('[CreateOrder] All franchise codes:', filtered.map((f: Franchise) => f.code))
      setFranchises(filtered)
    } catch (error) {
      console.error('[CreateOrder] Error fetching franchises:', error)
      toast.error('Failed to load franchises')
    }
  }

  // Get unique franchises by code for Step 1 selection
  const uniqueFranchises = useMemo(() => {
    return Array.from(
      new Map(franchises.map((f) => [f.code, f])).values()
    )
  }, [franchises])

  // Get available brands for selected franchise
  const availableBrands = useMemo(() => {
    if (!selectedFranchise) return []
    
    // Get all brand strings for the selected franchise
    const brandStrings = franchises
      .filter((f) => f.code === selectedFranchise.code)
      .map((f) => f.brand)
      .filter((brand): brand is string => Boolean(brand))
    
    // Split comma-separated brands, trim whitespace, and flatten
    const allBrands = brandStrings
      .flatMap((brandStr) => 
        brandStr
          .split(',')
          .map((brand) => brand.trim())
          .filter((brand) => brand.length > 0)
      )
    
    // Remove duplicates and sort
    return Array.from(new Set(allBrands)).sort()
  }, [selectedFranchise, franchises])

  const addOrderLine = () => {
    if (!selectedSku || quantity <= 0) {
      toast.error('Please select a product and enter a valid quantity')
      return
    }

    const lineTotal = selectedSku.sellingPrice * quantity
    const newLine: OrderLineInput = {
      sku: selectedSku.sku,
      productName: selectedSku.productName,
      quantity,
      unitPrice: selectedSku.sellingPrice,
      lineTotal,
      supplier: selectedSku.supplier,
    }

    setOrderLines([...orderLines, newLine])
    setSelectedSku(null)
    setQuantity(1)
    setProductDropdownOpen(false)
    setProductSearchTerm('') // Clear search when product is added
    toast.success('Product added to order')
  }

  const removeOrderLine = (index: number) => {
    setOrderLines(orderLines.filter((_, i) => i !== index))
  }

  const total = orderLines.reduce((sum, line) => sum + line.lineTotal, 0)

  // Helper function to extract city from franchisee name
  function getFranchiseLocation(franchisee: string): string {
    if (!franchisee) return ''
    const parts = franchisee.split(/[-–—]/).map(part => part.trim())
    return parts.length > 1 ? parts[parts.length - 1] : franchisee.trim()
  }

  const handleSubmit = async () => {
    if (!selectedFranchise) {
      toast.error('Please select a franchise')
      return
    }

    if (!selectedBrand) {
      toast.error('Please select a brand')
      return
    }

    if (!orderNumber.trim()) {
      toast.error('Please enter an order number')
      return
    }

    if (!invoiceNumber.trim()) {
      toast.error('Please enter an invoice number')
      return
    }

    if (orderLines.length === 0) {
      toast.error('Please add at least one product to the order')
      return
    }

    setSubmitting(true)
    try {
      const franchiseeName = selectedFranchise.name || selectedFranchise.code
      const city = getFranchiseLocation(franchiseeName)
      
      const orderData = {
        orderId: orderNumber.trim(),
        invoiceNo: invoiceNumber.trim(),
        brand: selectedBrand,
        franchisee: franchiseeName,
        franchiseeCode: selectedFranchise.code || '',
        city: city,
        orderDate: orderDate,
        orderStage: 'New',
        orderTotal: total,
        orderLines: orderLines.map((line) => ({
          sku: line.sku,
          productName: line.productName,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          lineTotal: line.lineTotal,
          supplier: line.supplier,
        })),
      }

      const response = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      })

      if (response.ok) {
        toast.success('Order created successfully')
        router.push('/brands/admin/dashboard')
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create order')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create order')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create Order</h1>
          <p className="mt-2 text-gray-600">Multi-step order creation</p>
        </div>

        {/* Step Indicator */}
        <div className="mb-8 flex items-center space-x-2">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full ${
              step >= 1 ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-600'
            }`}
          >
            1
          </div>
          <div className={`h-1 flex-1 ${step >= 2 ? 'bg-gray-900' : 'bg-gray-200'}`} />
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full ${
              step >= 2 ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-600'
            }`}
          >
            2
          </div>
          <div className={`h-1 flex-1 ${step >= 3 ? 'bg-gray-900' : 'bg-gray-200'}`} />
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full ${
              step >= 3 ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-600'
            }`}
          >
            3
          </div>
          <div className={`h-1 flex-1 ${step >= 4 ? 'bg-gray-900' : 'bg-gray-200'}`} />
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full ${
              step >= 4 ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-600'
            }`}
          >
            4
          </div>
          <div className={`h-1 flex-1 ${step >= 5 ? 'bg-gray-900' : 'bg-gray-200'}`} />
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full ${
              step >= 5 ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-600'
            }`}
          >
            5
          </div>
        </div>

        {/* Step 1: Select Franchise */}
        {step === 1 && (
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)]">
            <h2 className="mb-4 text-xl font-semibold text-brand-text">Select Franchise Location</h2>
            <div className="space-y-3">
              {uniqueFranchises.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500">No locations available</p>
              ) : (
                uniqueFranchises.map((franchise) => (
                  <button
                    key={franchise.code}
                    onClick={() => {
                      setSelectedFranchise(franchise)
                      setSelectedBrand('') // Reset brand selection
                      setStep(2)
                    }}
                    className="w-full rounded-xl border border-gray-200 bg-white p-4 text-left transition-all hover:border-brand-primary hover:shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-brand-text">{franchise.name}</p>
                        <p className="text-sm text-brand-muted">
                          {franchise.code}
                          {franchise.region && ` • ${franchise.region}`}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Step 2: Select Brand */}
        {step === 2 && (
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)]">
            <h2 className="mb-4 text-xl font-semibold text-brand-text">Select Brand</h2>
            <p className="mb-4 text-sm text-gray-600">
              Franchise: <span className="font-medium">{selectedFranchise?.name} ({selectedFranchise?.code})</span>
            </p>
            <div className="space-y-3">
              {availableBrands.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500">No brands available for this franchise</p>
              ) : (
                availableBrands.map((brand) => (
                  <button
                    key={brand}
                    onClick={() => {
                      setSelectedBrand(brand || '')
                      setStep(3)
                    }}
                    className={`w-full rounded-xl border p-4 text-left transition-all ${
                      selectedBrand === brand
                        ? 'border-brand-primary bg-brand-primary/5'
                        : 'border-gray-200 bg-white hover:border-brand-primary hover:shadow-md'
                    }`}
                  >
                    <p className="font-semibold text-brand-text">{brand}</p>
                  </button>
                ))
              )}
            </div>
            <div className="mt-6">
              <ActionButton onClick={() => setStep(1)} variant="secondary">
                Back
              </ActionButton>
            </div>
          </div>
        )}

        {/* Step 3: Add Products */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-xl font-semibold text-gray-900">Add Products</h2>
              <p className="mb-4 text-sm text-gray-600">
                Brand: <span className="font-medium">{selectedBrand}</span>
              </p>
              
              {/* Product Dropdown */}
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-gray-700">Select Product</label>
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setProductDropdownOpen(!productDropdownOpen)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-left text-white focus:border-gray-900 focus:outline-none"
                  >
                    <div className="flex items-center justify-between">
                      <span className={selectedSku ? 'text-white' : 'text-white/70'}>
                        {selectedSku ? `${selectedSku.productName} (${selectedSku.sku})` : 'Choose a product...'}
                      </span>
                      <ChevronDown className={`h-5 w-5 text-white transition-transform ${productDropdownOpen ? 'rotate-180' : ''}`} />
                    </div>
                  </button>
                  
                  {productDropdownOpen && (
                    <div className="absolute z-[9999] mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
                      {/* Search Input */}
                      <div className="border-b border-gray-200 p-2">
                        <input
                          type="text"
                          placeholder="Search by product name or SKU..."
                          value={productSearchTerm}
                          onChange={(e) => setProductSearchTerm(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                          autoFocus
                        />
                      </div>
                      
                      {/* Product List */}
                      <div className="max-h-64 overflow-y-auto">
                        {skus.length === 0 ? (
                          <div className="p-4 text-center text-sm text-gray-500">No products available</div>
                        ) : filteredSkus.length === 0 ? (
                          <div className="p-4 text-center text-sm text-gray-500">
                            No products found matching "{productSearchTerm}"
                          </div>
                        ) : (
                          filteredSkus.map((sku) => (
                            <button
                              key={sku.sku}
                              type="button"
                              onClick={() => {
                                setSelectedSku(sku)
                                setProductDropdownOpen(false)
                                setProductSearchTerm('') // Clear search when product is selected
                              }}
                              className={`w-full border-b border-gray-100 p-3 text-left transition-colors hover:bg-gray-50 ${
                                selectedSku?.sku === sku.sku ? 'bg-blue-50' : ''
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-gray-900">{sku.productName}</p>
                                  <p className="text-sm text-gray-500">SKU: {sku.sku} • {formatCurrency(sku.sellingPrice)}</p>
                                </div>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Add Product Form */}
              {selectedSku && (
                <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{selectedSku.productName}</p>
                      <p className="text-sm text-gray-500">{formatCurrency(selectedSku.sellingPrice)} per unit</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                        className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-center text-gray-900"
                      />
                      <ActionButton onClick={addOrderLine} variant="primary">
                        <Plus className="mr-2 h-4 w-4" />
                        Add
                      </ActionButton>
                    </div>
                  </div>
                </div>
              )}

              {/* Order Lines */}
              {orderLines.length > 0 && (
                <div className="mt-6">
                  <h3 className="mb-3 text-lg font-semibold text-gray-900">Order Lines</h3>
                  <Table 
                    headers={['Product', 'SKU', 'Qty', 'Unit Price', 'Total', '']}
                    maxHeight="400px"
                    stickyHeader={true}
                  >
                    {orderLines.map((line, index) => (
                      <tr key={index}>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                          {line.productName}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                          {line.sku}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                          {line.quantity}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                          {formatCurrency(line.unitPrice)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                          {formatCurrency(line.lineTotal)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                          <button
                            onClick={() => removeOrderLine(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </Table>
                  <div className="mt-4 flex justify-end">
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Total</p>
                      <p className="text-2xl font-bold text-gray-900">{formatCurrency(total)}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 flex justify-between">
                <ActionButton onClick={() => setStep(2)} variant="secondary">
                  Back
                </ActionButton>
                <ActionButton
                  onClick={() => setStep(4)}
                  variant="primary"
                  disabled={orderLines.length === 0}
                >
                  Review Order
                </ActionButton>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Review Order */}
        {step === 4 && (
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">Review Order</h2>
            
            <div className="mb-6 space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Franchise</span>
                <span className="font-medium text-gray-900">
                  {selectedFranchise?.name} ({selectedFranchise?.code})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Brand</span>
                <span className="font-medium text-gray-900">{selectedBrand}</span>
              </div>
              
              {/* Order Number Input */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Order Number *</label>
                <input
                  type="text"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="Enter order number"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder:text-gray-500 focus:border-gray-900 focus:outline-none"
                  required
                />
              </div>
              
              {/* Invoice Number Input */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Invoice Number *</label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="Enter invoice number"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder:text-gray-500 focus:border-gray-900 focus:outline-none"
                  required
                />
              </div>

              {/* Date created – defaults to today, change for backdating */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Date created</label>
                <input
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-gray-900 focus:outline-none"
                />
                <p className="mt-1 text-xs text-gray-500">Defaults to today. Change for backdating orders.</p>
              </div>
            </div>

            <Table 
              headers={['Product', 'SKU', 'Qty', 'Unit Price', 'Total']}
              maxHeight="400px"
              stickyHeader={true}
            >
              {orderLines.map((line, index) => (
                <tr key={index}>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    {line.productName}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {line.sku}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    {line.quantity}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    {formatCurrency(line.unitPrice)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                    {formatCurrency(line.lineTotal)}
                  </td>
                </tr>
              ))}
            </Table>

            <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-6">
              <div>
                <p className="text-sm text-gray-600">Order Total</p>
                <p className="text-3xl font-bold text-gray-900">{formatCurrency(total)}</p>
              </div>
            </div>

            <div className="mt-6 flex justify-between">
              <ActionButton onClick={() => setStep(3)} variant="secondary">
                Back
              </ActionButton>
              <ActionButton
                onClick={() => setStep(5)}
                variant="primary"
                disabled={!orderNumber.trim() || !invoiceNumber.trim()}
              >
                Continue to Submit
              </ActionButton>
            </div>
          </div>
        )}

        {/* Step 5: Submit Order */}
        {step === 5 && (
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">Submit Order</h2>
            
            <div className="mb-6 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Franchise</span>
                <span className="font-medium text-gray-900">
                  {selectedFranchise?.name} ({selectedFranchise?.code})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Brand</span>
                <span className="font-medium text-gray-900">{selectedBrand}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Order Number</span>
                <span className="font-medium text-gray-900">{orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Invoice Number</span>
                <span className="font-medium text-gray-900">{invoiceNumber}</span>
              </div>
            </div>

            <Table 
              headers={['Product', 'SKU', 'Qty', 'Unit Price', 'Total']}
              maxHeight="400px"
              stickyHeader={true}
            >
              {orderLines.map((line, index) => (
                <tr key={index}>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    {line.productName}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {line.sku}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    {line.quantity}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    {formatCurrency(line.unitPrice)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                    {formatCurrency(line.lineTotal)}
                  </td>
                </tr>
              ))}
            </Table>

            <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-6">
              <div>
                <p className="text-sm text-gray-600">Order Total</p>
                <p className="text-3xl font-bold text-gray-900">{formatCurrency(total)}</p>
              </div>
            </div>

            <div className="mt-6 flex justify-between">
              <ActionButton onClick={() => setStep(4)} variant="secondary">
                Back
              </ActionButton>
              <ActionButton
                onClick={handleSubmit}
                variant="primary"
                loading={submitting}
              >
                Submit Order
              </ActionButton>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

