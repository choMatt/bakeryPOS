import { db } from './db'

export const DEFAULT_LOW_STOCK = 5

export const isTracked = (p) => p.trackStock === true

// 'untracked' | 'out' | 'low' | 'ok'
export function stockStatus(p) {
  if (!isTracked(p)) return 'untracked'
  const stock = p.stock ?? 0
  if (stock <= 0) return 'out'
  if (stock <= (p.lowStockAt ?? DEFAULT_LOW_STOCK)) return 'low'
  return 'ok'
}

// Only products that are for sale count as "needs restock"
export const needsAttention = (p) =>
  p.isActive && ['low', 'out'].includes(stockStatus(p))

// Restock (positive) or remove (negative). Never goes below 0.
export const adjustStock = (id, delta) =>
  db.transaction('rw', db.products, async () => {
    const p = await db.products.get(id)
    if (!p) return
    await db.products.update(id, { stock: Math.max(0, (p.stock ?? 0) + delta) })
  })

// Stocktake: set the exact count.
export const setStock = (id, count) =>
  db.products.update(id, { stock: Math.max(0, count) })