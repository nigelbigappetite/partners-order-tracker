# Partners Ordering OS

A modern SaaS-style Supplier Ordering & Franchise Operations Dashboard built with Next.js, React, and TailwindCSS, connected to Google Sheets as the backend.

## Features

- **Dashboard**: KPI overview, active orders tracking, and action summaries
- **Pipeline**: Kanban board view of orders across stages
- **Order Management**: Detailed order views with timeline and action buttons
- **Create Orders**: Multi-step order creation flow
- **Suppliers**: Supplier performance metrics and tracking
- **Products**: Searchable SKU database
- **Locations**: Franchise location performance and order history

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **TailwindCSS** - Utility-first CSS framework
- **Google Sheets API** - Backend data storage
- **React Hot Toast** - Toast notifications
- **Lucide React** - Icon library
- **date-fns** - Date formatting

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Google Sheets API Setup

1. Create a Google Cloud Project
2. Enable the Google Sheets API
3. Create a Service Account
4. Download the service account key JSON file
5. Share your Google Sheet with the service account email

### 3. Environment Variables

Create a `.env.local` file in the root directory:

```env
GOOGLE_SHEETS_SPREADSHEET_ID=your-spreadsheet-id-here
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Or use a service account key file:

```env
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=./service-account-key.json
```

### 4. Google Sheets Structure

Your Google Sheet must have the following sheets:

1. **Orders_Header** - Order metadata
   - Order ID, Brand, Franchisee, Order Date, Order Stage, Supplier Ordered?, Supplier Shipped?, Delivered to Partner?, Partner Paid?, Order Total, Days Open, Next Action

2. **Order_Lines** - Order line items
   - Order ID, SKU, Product Name, Quantity, Unit Price (selling price), Line Total, Supplier

3. **SKU_COGS** - Product catalog
   - SKU, Product Name, Unit Size, Cost Per Unit, Supplier, Selling Price

4. **Franchise_Summary** - Franchise information
   - Franchise code, name, region, etc.

5. **Supplier_Summary** - Supplier information
   - Supplier name, SLA assumptions, etc.

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
partners-ordering-os/
├── app/
│   ├── api/              # API routes
│   ├── create-order/     # Create order page
│   ├── locations/        # Locations page
│   ├── order/[id]/       # Order detail page
│   ├── pipeline/         # Pipeline/Kanban page
│   ├── products/         # Products page
│   ├── suppliers/        # Suppliers page
│   ├── globals.css       # Global styles
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Dashboard page
├── components/           # Reusable UI components
├── lib/
│   ├── sheets.ts         # Google Sheets API client
│   └── types.ts          # TypeScript type definitions
└── package.json
```

## Components

- **KPICard** - KPI metric display
- **OrderCard** - Order summary card
- **PipelineColumn** - Kanban column
- **StatusPill** - Status badge
- **ActionButton** - Button with loading states
- **Table** - Data table component
- **Timeline** - Event timeline
- **SupplierCard** - Supplier summary card
- **Modal** - Modal dialog wrapper
- **Navigation** - Main navigation bar

## API Routes

- `GET /api/orders` - Get all orders
- `GET /api/orders/[id]` - Get order by ID
- `PATCH /api/orders/[id]` - Update order status
- `GET /api/orders/[id]/lines` - Get order lines
- `POST /api/orders/create` - Create new order
- `GET /api/skus` - Get all SKUs
- `GET /api/franchises` - Get all franchises
- `GET /api/suppliers` - Get all suppliers

## Styling

The app uses a clean, minimal design system:
- 8px spacing grid
- Neutral gray palette
- Inter font family
- Rounded corners (8px)
- Soft shadows
- Light mode only

## License

MIT

