import { db } from './db'

export async function createOrder({ items, paymentMethod, amountPaid }) {
  if (items.length === 0) throw new Error('Cart is empty.')

  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0)
  const total = subtotal // discounts/fees can adjust this later

  if (amountPaid < total) throw new Error('Amount paid is less than the total.')

  const order = {
    createdAt: Date.now(),
    status: 'completed',
    paymentMethod,
    // name and price are copied so old receipts never change
    items: items.map(({ productId, name, price, qty }) => ({
      productId, name, price, qty,
    })),
    subtotal,
    total,
    amountPaid,
    change: amountPaid - total,
  }

  return db.transaction('rw', db.orders, db.products, async () => {
    for (const item of items) {
      const product = await db.products.get(item.productId)
      if (!product || product.trackStock !== true) continue // untracked or deleted

      const available = product.stock ?? 0
      if (item.qty > available) {
        // Throwing inside the transaction rolls everything back
        throw new Error(`Not enough stock for ${product.name}: ${available} left.`)
      }
      await db.products.update(product.id, { stock: available - item.qty })
    }

    const id = await db.orders.add(order)
    return { id, ...order }
  })
}