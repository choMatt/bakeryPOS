import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { createOrder } from '../db/orders'
import { formatPrice, toCentavos } from '../utils/money'
import ReceiptDialog from './ReceiptDialog'
import './Checkout.css'
import { isTracked, stockStatus } from '../db/inventory'


function ProductCatalog({ products, cart, qtyInCart, canAddMore, addToCart }) {
  const visibleProducts = products.filter((p) => p.isActive)

  if (visibleProducts.length === 0) {
    return (
      <p className="empty">
        No products to show. Add some in the Products tab.
      </p>
    )
  }

  return (
    <div className="product-grid">
      {visibleProducts.map((product) => {
        const status = stockStatus(product)
        const quantity = qtyInCart(product.id)

        return (
          <button
            key={product.id}
            className="product-tile"
            onClick={() => addToCart(product)}
            disabled={!canAddMore(product.id)}
          >
            {quantity > 0 && (
              <span className="badge">{quantity}</span>
            )}

            <span className="name">{product.name}</span>

            <span className="meta">
              {product.saleType === 'box'
                ? `Box of ${product.boxSize}`
                : 'Individual'}
            </span>

            {status !== 'untracked' && (
              <span className={`stock ${status}`}>
                {status === 'out'
                  ? 'Sold out'
                  : `${product.stock} left`}
              </span>
            )}

            <span className="price">
              {formatPrice(product.price)}
            </span>
          </button>
        )
      })}
    </div>
  )
}


function CartPeek({ open, itemCount, total, setOpen }) {
  return (
    <button
      type="button"
      className="cart-peek"
      onClick={() => setOpen((current) => !current)}
      aria-expanded={open}
      aria-controls="cart-body"
      aria-label={open ? 'Collapse order' : 'Expand order'}
    >
      <span className="peek-arrow">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 15l6-6 6 6" />
        </svg>
      </span>

      <span className="peek-info">
        <span className="peek-count">
          {itemCount} item{itemCount === 1 ? '' : 's'}
        </span>

        <strong className="peek-total">
          {formatPrice(total)}
        </strong>
      </span>
    </button>
  )
}


function OrderView({
  cart,
  lastSale,
  total,
  changeQty,
  removeItem,
  canAddMore,
  clearCart,
  setShowReceipt,
  setView,
}) {
  return (
    <div className="cart-view order-view">
      <h2>Current order</h2>

      {lastSale && (
        <div className="sale-done">
          <strong>Sale #{lastSale.id} completed</strong>

          <span>
            Total {formatPrice(lastSale.total)}
          </span>

          {lastSale.paymentMethod === 'cash' && (
            <span>
              Change {formatPrice(lastSale.change)}
            </span>
          )}

          <button onClick={() => setShowReceipt(true)}>
            Print receipt
          </button>
        </div>
      )}

      {cart.length === 0 ? (
        <p className="empty">
          Tap a product to add it.
        </p>
      ) : (
        <ul className="cart-lines">
          {cart.map((item) => (
            <li key={item.productId}>
              <div className="line-info">
                <span className="line-name">
                  {item.name}
                </span>

                <span className="line-sub">
                  {formatPrice(item.price)} × {item.qty} ={' '}
                  {formatPrice(item.price * item.qty)}
                </span>
              </div>

              <div className="qty">
                <button
                  onClick={() => changeQty(item.productId, -1)}
                  aria-label={`Decrease ${item.name}`}
                >
                  −
                </button>

                <span>{item.qty}</span>

                <button
                  onClick={() => changeQty(item.productId, 1)}
                  disabled={!canAddMore(item.productId)}
                  aria-label={`Increase ${item.name}`}
                >
                  +
                </button>
              </div>

              <button
                className="remove"
                onClick={() => removeItem(item.productId)}
                aria-label={`Remove ${item.name}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="order-footer">
        <div className="totals">
          <div className="grand">
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>
        </div>

        <div className="cart-actions">
          <button
            className="secondary"
            onClick={clearCart}
            disabled={cart.length === 0}
          >
            Clear
          </button>

          <button
            className="primary"
            onClick={() => setView('checkout')}
            disabled={cart.length === 0}
          >
            Checkout
          </button>
        </div>
      </div>
    </div>
  )
}


function CheckoutView({
  total,
  paymentMethod,
  setPaymentMethod,
  tendered,
  setTendered,
  amountPaid,
  hasValidPayment,
  change,
  error,
  saving,
  canComplete,
  completeSale,
  setView,
}) {
  return (
    <div className="cart-view checkout-view">
      <button
        className="back-button"
        onClick={() => setView('order')}
      >
        ← Back to Order
      </button>

      <h2>Checkout</h2>

      <div className="checkout-total">
        <span>Total</span>
        <strong>{formatPrice(total)}</strong>
      </div>

      <div className="payment">
        <div className="method-toggle">
          {['cash', 'gcash'].map((method) => (
            <button
              key={method}
              className={paymentMethod === method ? 'active' : ''}
              onClick={() => setPaymentMethod(method)}
            >
              {method === 'cash' ? 'Cash' : 'GCash'}
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
                onChange={(event) => setTendered(event.target.value)}
              />
            </label>

            <div className="quick-cash">
              <button
                onClick={() => setTendered((total / 100).toFixed(2))}
                disabled={total === 0}
              >
                Exact
              </button>

              {[100, 500, 1000].map((amount) => (
                <button
                  key={amount}
                  onClick={() => setTendered(String(amount))}
                >
                  ₱{amount}
                </button>
              ))}
            </div>

            {tendered !== '' && (
              <div className={`change ${hasValidPayment ? '' : 'short'}`}>
                {hasValidPayment
                  ? `Change: ${formatPrice(change)}`
                  : `Short by ${formatPrice(
                      total - (amountPaid || 0),
                    )}`}
              </div>
            )}
          </>
        )}
      </div>

      {error && (
        <p className="error">{error}</p>
      )}

      <button
        className="primary checkout-complete"
        onClick={completeSale}
        disabled={!canComplete}
      >
        {saving
          ? 'Saving…'
          : `Complete Sale ${
              total > 0 ? formatPrice(total) : ''
            }`}
      </button>
    </div>
  )
}


export default function Checkout() {
  const products = useLiveQuery(
    () => db.products.orderBy('name').toArray(),
    [],
  )

  const [cart, setCart] = useState([])
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [tendered, setTendered] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [lastSale, setLastSale] = useState(null)
  const [showReceipt, setShowReceipt] = useState(false)
  const [open, setOpen] = useState(false)
  const [view, setView] = useState('order')

  const itemCount = cart.reduce(
    (sum, item) => sum + item.qty,
    0,
  )

  useEffect(() => {
    if (cart.length === 0) {
      setOpen(false)
      setView('order')
    }
  }, [cart.length])

  if (!products) {
    return <p>Loading…</p>
  }

  const qtyInCart = (productId) =>
    cart.find((item) => item.productId === productId)?.qty ?? 0

  const productById = (productId) =>
    products.find((product) => product.id === productId)

  const canAddMore = (productId) => {
    const product = productById(productId)

    return (
      !product ||
      !isTracked(product) ||
      qtyInCart(productId) < (product.stock ?? 0)
    )
  }

  const addToCart = (product) => {
    if (!canAddMore(product.id)) return

    setLastSale(null)

    setCart((currentCart) => {
      const existing = currentCart.find(
        (item) => item.productId === product.id,
      )

      if (existing) {
        return currentCart.map((item) =>
          item.productId === product.id
            ? { ...item, qty: item.qty + 1 }
            : item,
        )
      }

      const name =
        product.saleType === 'box'
          ? `${product.name} (Box of ${product.boxSize})`
          : product.name

      return [
        ...currentCart,
        {
          productId: product.id,
          name,
          price: product.price,
          qty: 1,
        },
      ]
    })
  }

  const changeQty = (productId, delta) => {
    if (delta > 0 && !canAddMore(productId)) return

    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item.productId === productId
            ? { ...item, qty: item.qty + delta }
            : item,
        )
        .filter((item) => item.qty > 0),
    )
  }

  const removeItem = (productId) => {
    setCart((currentCart) =>
      currentCart.filter(
        (item) => item.productId !== productId,
      ),
    )
  }

  const clearCart = () => {
    setCart([])
    setTendered('')
    setError('')
  }

  const total = cart.reduce(
    (sum, item) => sum + item.price * item.qty,
    0,
  )

  const amountPaid =
    paymentMethod === 'cash'
      ? toCentavos(tendered)
      : total

  const hasValidPayment =
    paymentMethod !== 'cash' ||
    (!Number.isNaN(amountPaid) && amountPaid >= total)

  const change = hasValidPayment
    ? amountPaid - total
    : 0

  const canComplete =
    cart.length > 0 &&
    hasValidPayment &&
    !saving

  const completeSale = async () => {
    setSaving(true)
    setError('')

    try {
      const order = await createOrder({
        items: cart,
        paymentMethod,
        amountPaid,
      })

      setLastSale(order)
      setCart([])
      setTendered('')
      setView('order')
      setShowReceipt(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={`checkout ${cart.length > 0 ? 'has-cart' : ''}`}>
      <section className="catalog">
        <ProductCatalog
          products={products}
          cart={cart}
          qtyInCart={qtyInCart}
          canAddMore={canAddMore}
          addToCart={addToCart}
        />
      </section>

      {cart.length > 0 && (
      <aside
        className={`cart ${open ? 'open' : ''}`}
      >
        <CartPeek
          open={open}
          itemCount={itemCount}
          total={total}
          setOpen={setOpen}
        />

        <div
          className="cart-body"
          id="cart-body"
          inert={!open}
        >
          <div
            className={`cart-views ${
              view === 'checkout'
                ? 'show-checkout'
                : ''
            }`}
          >
            <OrderView
              cart={cart}
              lastSale={lastSale}
              total={total}
              changeQty={changeQty}
              removeItem={removeItem}
              canAddMore={canAddMore}
              clearCart={clearCart}
              setShowReceipt={setShowReceipt}
              setView={setView}
            />

            <CheckoutView
              total={total}
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              tendered={tendered}
              setTendered={setTendered}
              amountPaid={amountPaid}
              hasValidPayment={hasValidPayment}
              change={change}
              error={error}
              saving={saving}
              canComplete={canComplete}
              completeSale={completeSale}
              setView={setView}
            />
          </div>
        </div>

      </aside>
      )}

      {showReceipt && lastSale && (
        <ReceiptDialog
          order={lastSale}
          onClose={() => setShowReceipt(false)}
        />
      )}
    </div>
  )
}