import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { createOrder } from '../db/orders'
import { formatPrice, toCentavos } from '../utils/money'
import ReceiptDialog from './ReceiptDialog'
import './Checkout.css'
import { isTracked, stockStatus } from '../db/inventory'

export default function Checkout() {
  const categories = useLiveQuery(() => db.categories.orderBy('sortOrder').toArray(), [])
  const products = useLiveQuery(() => db.products.orderBy('name').toArray(), [])

  const [categoryFilter, setCategoryFilter] = useState('all')
  const [cart, setCart] = useState([]) // [{ productId, name, price, qty }]
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [tendered, setTendered] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [lastSale, setLastSale] = useState(null)
  const [showReceipt, setShowReceipt] = useState(false)
  
  if (!categories || !products) return <p>Loading…</p>

  const visibleProducts = products.filter(
    (p) =>
      p.isActive &&
      (categoryFilter === 'all' || p.categoryId === categoryFilter),
  )

  const qtyInCart = (id) => cart.find((i) => i.productId === id)?.qty ?? 0

  const productById = (id) => products.find((p) => p.id === id)
  
  // Untracked products are unlimited; tracked ones stop at the stock count
  const canAddMore = (id) => {
    const p = productById(id)
    return !p || !isTracked(p) || qtyInCart(id) < (p.stock ?? 0)
  }
  
  const addToCart = (product) => {
    if (!canAddMore(product.id)) return
    setLastSale(null)
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id)
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id ? { ...i, qty: i.qty + 1 } : i,
        )
      }
      const label =
        product.saleType === 'box' ? `${product.name} (Box of ${product.boxSize})` : product.name
      return [...prev, { productId: product.id, name: label, price: product.price, qty: 1 }]
    })
  }

  // delta of -1 on qty 1 removes the line
  const changeQty = (productId, delta) => {
    if (delta > 0 && !canAddMore(productId)) return
    setCart((prev) =>
      prev
        .map((i) => (i.productId === productId ? { ...i, qty: i.qty + delta } : i))
        .filter((i) => i.qty > 0),
    )
  }
  
  const removeItem = (productId) =>
    setCart((prev) => prev.filter((i) => i.productId !== productId))

  const clearCart = () => {
    setCart([])
    setTendered('')
    setError('')
  }

  const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0)
  const total = subtotal

  const amountPaid = paymentMethod === 'cash' ? toCentavos(tendered) : total
  const hasValidPayment = paymentMethod !== 'cash' || (!Number.isNaN(amountPaid) && amountPaid >= total)
  const change = hasValidPayment ? amountPaid - total : 0
  const canComplete = cart.length > 0 && hasValidPayment && !saving

  const completeSale = async () => {
    setSaving(true)
    setError('')
    try {
      const order = await createOrder({ items: cart, paymentMethod, amountPaid })
      setLastSale(order)
      setCart([])
      setTendered('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="checkout">
      <section className="catalog">
        <div className="category-tabs">
          <button
            className={categoryFilter === 'all' ? 'active' : ''}
            onClick={() => setCategoryFilter('all')}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              className={categoryFilter === c.id ? 'active' : ''}
              onClick={() => setCategoryFilter(c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>

        {visibleProducts.length === 0 ? (
          <p className="empty">No products to show. Add some in the Products tab.</p>
        ) : (
          <div className="product-grid">
            {visibleProducts.map((p) => {
              const status = stockStatus(p)
              return (
                <button
                  key={p.id}
                  className="product-tile"
                  onClick={() => addToCart(p)}
                  disabled={!canAddMore(p.id)}
                >
                  {qtyInCart(p.id) > 0 && <span className="badge">{qtyInCart(p.id)}</span>}
                  <span className="name">{p.name}</span>
                  <span className="meta">
                    {p.saleType === 'box' ? `Box of ${p.boxSize}` : 'Individual'}
                  </span>
                  {status !== 'untracked' && (
                    <span className={`stock ${status}`}>
                      {status === 'out' ? 'Sold out' : `${p.stock} left`}
                    </span>
                  )}
                  <span className="price">{formatPrice(p.price)}</span>
                </button>
              )
            })}
            </div>
        )}

      </section>

      <aside className="cart">
        <h2>Current order</h2>

        {lastSale && (
          <div className="sale-done">
            <strong>Sale #{lastSale.id} completed</strong>
            <span>Total {formatPrice(lastSale.total)}</span>
            {lastSale.paymentMethod === 'cash' && (
              <span>Change {formatPrice(lastSale.change)}</span>
            )}
            <button onClick={() => setShowReceipt(true)}>Print receipt</button>
          </div>
        )}
        
        {cart.length === 0 ? (
          <p className="empty">Tap a product to add it.</p>
        ) : (
          <ul className="cart-lines">
            {cart.map((i) => (
              <li key={i.productId}>
                <div className="line-info">
                  <span className="line-name">{i.name}</span>
                  <span className="line-sub">
                    {formatPrice(i.price)} × {i.qty} = {formatPrice(i.price * i.qty)}
                  </span>
                </div>
                <div className="qty">
                  <button onClick={() => changeQty(i.productId, -1)} aria-label="Decrease">−</button>
                  <span>{i.qty}</span>
                  <button
                    onClick={() => changeQty(i.productId, 1)}
                    disabled={!canAddMore(i.productId)}
                    aria-label="Increase"
                  >+</button>
                </div>
                <button className="remove" onClick={() => removeItem(i.productId)} aria-label="Remove">
                  ✕
                </button>
                
              </li>
            ))}
          </ul>
        )}

        <div className="totals">
          <div><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
          <div className="grand"><span>Total</span><span>{formatPrice(total)}</span></div>
        </div>

        <div className="payment">
          <div className="method-toggle">
            {['cash', 'gcash'].map((m) => (
              <button
                key={m}
                className={paymentMethod === m ? 'active' : ''}
                onClick={() => setPaymentMethod(m)}
              >
                {m === 'cash' ? 'Cash' : 'GCash'}
              </button>
            ))}
          </div>

          {paymentMethod === 'cash' && (
            <>
              <label>
                Amount received (₱)
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={tendered}
                  onChange={(e) => setTendered(e.target.value)}
                />
              </label>
              <div className="quick-cash">
                <button onClick={() => setTendered((total / 100).toFixed(2))} disabled={total === 0}>
                  Exact
                </button>
                {[100, 500, 1000].map((amt) => (
                  <button key={amt} onClick={() => setTendered(String(amt))}>₱{amt}</button>
                ))}
              </div>
              {tendered !== '' && (
                <div className={`change ${hasValidPayment ? '' : 'short'}`}>
                  {hasValidPayment
                    ? `Change: ${formatPrice(change)}`
                    : `Short by ${formatPrice(total - (amountPaid || 0))}`}
                </div>
              )}
            </>
          )}
        </div>

        {error && <p className="error">{error}</p>}

        <div className="cart-actions">
          <button className="secondary" onClick={clearCart} disabled={cart.length === 0}>
            Clear
          </button>
          <button className="primary" onClick={completeSale} disabled={!canComplete}>
            {saving ? 'Saving…' : `Complete sale ${total > 0 ? formatPrice(total) : ''}`}
          </button>
        </div>
        {showReceipt && lastSale && (
          <ReceiptDialog order={lastSale} onClose={() => setShowReceipt(false)} />
        )}
      </aside>
    </div>
  )
}