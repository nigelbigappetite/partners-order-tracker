// Type definitions for the application

export interface Order {
  orderId: string;
  invoiceNo?: string;
  brand: string;
  franchisee: string;
  orderDate: string;
  orderStage: string;
  supplierOrdered: boolean;
  supplierShipped: boolean;
  deliveredToPartner: boolean;
  partnerPaid: boolean;
  orderTotal: number;
  totalCOGS?: number;
  grossProfit?: number;
  grossMargin?: number;
  daysOpen: number;
  nextAction: string;
}

export interface OrderLine {
  orderId: string;
  invoiceNo?: string;
  brand?: string;
  sku: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  supplier: string;
  cogsPerUnit?: number;
  cogsTotal?: number;
}

export interface SKU {
  sku: string;
  productName: string;
  unitSize: string;
  costPerUnit: number;
  supplier: string;
  sellingPrice: number;
}

export interface Franchise {
  code: string;
  name: string;
  region?: string;
  brand?: string;
  ordersCount?: number;
  totalRevenue?: number;
  lastOrderDate?: string;
  [key: string]: any;
}

export interface Supplier {
  name: string;
  onTimePercentage?: number;
  averageShipTime?: number;
  totalValueOrdered?: number;
  [key: string]: any;
}

export interface Brand {
  name: string;
  ordersCount?: number;
  totalRevenue?: number;
  totalCOGS?: number;
  grossProfit?: number;
  grossMargin?: number;
  lastOrderDate?: string;
  [key: string]: any;
}

export interface KPIMetric {
  label: string;
  value: string | number;
  subtitle?: string;
  onClick?: () => void;
}

export interface LocationMetrics {
  totalRevenue: number;
  totalCOGS: number;
  grossProfit: number;
  grossMargin: number;
  totalOrders: number;
  avgOrderValue: number;
  totalItems: number;
}

export interface BrandMetrics {
  brand: string;
  revenue: number;
  cogs: number;
  grossProfit: number;
  grossMargin: number;
  orders: number;
  revenueShare: number;
}

export interface SKUMetrics {
  sku: string;
  productName: string;
  quantity: number;
  revenue: number;
  cogs: number;
  margin: number;
  marginPercent: number;
}

// Payment tracking types
export interface PaymentTrackerRow {
  sales_invoice_no: string;
  brand: string;
  franchisee_name: string;
  order_date: string;
  total_order_value: number;
  partner_paid: boolean;
  partner_paid_date?: string;
  partner_payment_method?: string;
  partner_payment_ref?: string;
  funds_cleared: boolean;
  cleared_date?: string;
  supplier_invoices_count: number;
  supplier_unpaid_count: number;
  supplier_allocated_total: number;
  supplier_side_paid: boolean;
  supplier_payment_ready: boolean;
  settlement_status: 'OPEN' | 'PAID_NOT_CLEARED' | 'WAITING_SUPPLIERS' | 'SETTLED';
  [key: string]: any;
}

export interface SupplierInvoice {
  id?: string;
  invoice_no?: string;
  sales_invoice_no?: string;
  supplier?: string;
  amount?: number;
  paid: boolean;
  paid_date?: string;
  payment_reference?: string;
  invoice_file_link?: string;
  [key: string]: any;
}

export interface OrderSupplierAllocation {
  sales_invoice_no: string;
  supplier_invoice_no: string;
  allocated_amount: number;
  [key: string]: any;
}

// Sales dashboard types
export interface KitchenSales {
  date: string; // YYYY-MM-DD format
  location: string; // Full location string from Deliverect
  revenue: number; // Net revenue
  grossSales: number; // Gross sales before deductions
  count: number; // Order count
  franchiseCode?: string; // Mapped from Kitchen_Mapping
  averageOrderValue?: number; // Calculated: revenue / count
  importDate: string; // When imported
  importSource: 'CSV' | 'WEBHOOK';
  // Optional parsed fields
  brandName?: string;
  city?: string;
  country?: string;
}

export interface DeliverectCSVRow {
  Date: string;
  Revenue: number;
  GrossSales: number;
  Count: number;
  Location: string;
}

export interface KitchenMapping {
  location: string;
  franchiseCode: string;
  franchiseName?: string;
  active: boolean;
  notes?: string;
}

