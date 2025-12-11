# Deployment Guide

This guide will help you deploy the Partners Ordering OS to production.

## Prerequisites

- Google Sheets API credentials (Service Account)
- Google Sheets Spreadsheet ID
- Node.js 18+ installed locally (for building/testing)

## Environment Variables

You'll need to set these environment variables in your deployment platform:

```
GOOGLE_SHEETS_SPREADSHEET_ID=your-spreadsheet-id
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**Important:** The `GOOGLE_PRIVATE_KEY` must include the `\n` characters (newlines) as shown above.

## Deployment Options

### Option 1: Vercel (Recommended for Next.js)

Vercel is the easiest and most optimized platform for Next.js applications.

#### Steps:

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   vercel
   ```
   
   Follow the prompts:
   - Link to existing project or create new
   - Confirm project settings
   - Add environment variables when prompted

4. **Set Environment Variables**:
   - Go to your project dashboard on Vercel
   - Navigate to Settings → Environment Variables
   - Add all three environment variables:
     - `GOOGLE_SHEETS_SPREADSHEET_ID`
     - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
     - `GOOGLE_PRIVATE_KEY` (make sure to include the `\n` characters)

5. **Redeploy** after adding environment variables:
   ```bash
   vercel --prod
   ```

#### Alternative: Deploy via GitHub

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Import your GitHub repository
5. Add environment variables in the project settings
6. Deploy!

### Option 2: Netlify

1. **Install Netlify CLI**:
   ```bash
   npm i -g netlify-cli
   ```

2. **Build the project**:
   ```bash
   npm run build
   ```

3. **Deploy**:
   ```bash
   netlify deploy --prod
   ```

4. **Set Environment Variables**:
   - Go to Netlify dashboard → Site settings → Environment variables
   - Add all three Google Sheets environment variables

### Option 3: Other Platforms

For other platforms (Railway, Render, AWS, etc.):

1. Build the project: `npm run build`
2. Start the production server: `npm start`
3. Set environment variables in your platform's settings
4. Deploy

## Post-Deployment Checklist

- [ ] Environment variables are set correctly
- [ ] Google Service Account has access to the spreadsheet
- [ ] Test brand selection page loads
- [ ] Test brand authentication works
- [ ] Test data loads from Google Sheets
- [ ] Test creating an order
- [ ] Verify all brand logos display correctly
- [ ] Test admin access (if applicable)

## Troubleshooting

### Build Errors

If you encounter build errors:
1. Run `npm run build` locally to identify issues
2. Check that all TypeScript errors are resolved
3. Ensure all dependencies are in `package.json`

### Environment Variable Issues

- Make sure `GOOGLE_PRIVATE_KEY` includes `\n` characters
- Verify the service account email is correct
- Ensure the spreadsheet ID is correct
- Check that the service account has access to the spreadsheet

### Runtime Errors

- Check deployment logs for specific error messages
- Verify Google Sheets API is enabled for your project
- Ensure the spreadsheet has the required sheets:
  - `Orders_Header`
  - `Order_Lines`
  - `SKU_COGS`
  - `Brand_Summary`
  - `Supplier_Summary`
  - `Franchise_Locations`
  - `Brand_Auth`

## Custom Domain (Optional)

After deployment, you can add a custom domain:
- **Vercel**: Project Settings → Domains
- **Netlify**: Site Settings → Domain Management

## Continuous Deployment

Both Vercel and Netlify support automatic deployments:
- Connect your GitHub repository
- Every push to main/master will automatically deploy
- Environment variables persist across deployments

