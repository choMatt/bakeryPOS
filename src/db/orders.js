
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

export async function voidOrder(orderId, reason) {
  const trimmedReason = reason.trim()

  if (!trimmedReason) {
    throw new Error('A reason is required to void an order.')
  }

  return db.transaction('rw', db.orders, db.products, async () => {
    const order = await db.orders.get(orderId)

    if (!order) {
      throw new Error('Order not found.')
    }

    if (order.status !== 'completed') {
      throw new Error('Only completed orders can be voided.')
    }

    // Combine quantities in case an order contains repeated product IDs.
    const quantities = new Map()

    for (const item of order.items) {
      if (item.productId == null) continue

      quantities.set(
        item.productId,
        (quantities.get(item.productId) ?? 0) + item.qty,
      )
    }

    // Restore tracked inventory inside the same transaction.
    for (const [productId, quantity] of quantities) {
      const product = await db.products.get(productId)

      if (!product || product.trackStock !== true) continue

      await db.products.update(productId, {
        stock: (product.stock ?? 0) + quantity,
      })
    }

    await db.orders.update(orderId, {
      status: 'voided',
      voidedAt: Date.now(),
      voidReason: trimmedReason,
      stockRestored: true,
    })

    return true
  })
}