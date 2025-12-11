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

