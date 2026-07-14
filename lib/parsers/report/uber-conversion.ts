import { UberConversionResult } from './types'
import { parseCSV, parseNum, findCol } from './csv-utils'

/**
 * Parses Uber Eats "user-conversion" CSV.
 * Columns: Period, Store views / Shop views, Menu views / Viewed, Added to cart, Placed order / Orders
 */
export function parseUberConversion(csvText: string): UberConversionResult {
  const { headers, rows } = parseCSV(csvText)

  const shopViewIdx = findCol(headers, 'shop views', 'store views', 'viewed shop', 'shop view')
  const menuViewIdx = findCol(headers, 'menu views', 'viewed menu', 'menu view', 'viewed')
  const cartIdx = findCol(headers, 'added to cart', 'add to cart', 'cart')
  const ordersIdx = findCol(headers, 'placed order', 'placed orders', 'orders placed', 'orders', 'order placed')

  // Typically this is a summary row (single data row) or weekly aggregate
  // Sum all rows in case there are multiple
  let shopViews = 0, menuViews = 0, addToCart = 0, ordersPlaced = 0

  for (const row of rows) {
    if (shopViewIdx >= 0) shopViews += parseNum(row[shopViewIdx])
    if (menuViewIdx >= 0) menuViews += parseNum(row[menuViewIdx])
    if (cartIdx >= 0) addToCart += parseNum(row[cartIdx])
    if (ordersIdx >= 0) ordersPlaced += parseNum(row[ordersIdx])
  }

  return {
    shopViews: Math.round(shopViews),
    menuViews: Math.round(menuViews),
    addToCart: Math.round(addToCart),
    ordersPlaced: Math.round(ordersPlaced),
  }
}
