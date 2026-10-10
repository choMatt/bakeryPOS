
import { db } from './db'

export async function createOrder({
  items,
  paymentMethod,
  amountPaid,
  customer = null,
}) {
  if (items.length === 0) throw new Error('Cart is empty.')

  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0)
  const total = subtotal // discounts/fees can adjust this later

  if (amountPaid < total) {
    throw new Error('Amount paid is less than the total.')
  }

  return db.transaction('rw', db.orders, db.products, async () => {
    const createdAt = Date.now()
    const date = new Date(createdAt)

    const datePart = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('')

    const prefix = `FF-${datePart}-`
    const existingOrders = await db.orders.toArray()

    const highestSequence = existingOrders.reduce((highest, order) => {
      if (!order.orderNumber?.startsWith(prefix)) return highest

      const sequence = Number(order.orderNumber.slice(prefix.length))

      return Number.isInteger(sequence)
        ? Math.max(highest, sequence)
        : highest
    }, 0)

    const orderNumber =
      `${prefix}${String(highestSequence + 1).padStart(4, '0')}`

    const order = {
      createdAt,
      orderNumber,
      status: 'completed',
      paymentMethod,

      // Keep product names and prices unchanged on existing receipts.
      items: items.map(({ productId, name, price, qty }) => ({
        productId,
        name,
        price,
        qty,
      })),

      subtotal,
      total,
      amountPaid,
      change: amountPaid - total,

      customer: customer
        ? {
            name: customer.name.trim(),
            address: customer.address.trim(),
            contactNumber: customer.contactNumber.trim(),
          }
        : null,
    }

    for (const item of items) {
      const product = await db.products.get(item.productId)

      if (!product || product.trackStock !== true) continue

      const available = product.stock ?? 0

      if (item.qty > available) {
        throw new Error(
          `Not enough stock for ${product.name}: ${available} left.`,
        )
      }

      await db.products.update(product.id, {
        stock: available - item.qty,
      })
    }

    const id = await db.orders.add(order)

    return { id, ...order }
  })
}
