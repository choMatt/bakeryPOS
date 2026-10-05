import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import {
  isTracked,
  stockStatus,
  needsAttention,
  adjustStock,
  setStock,
} from '../db/inventory'
import './Inventory.css'

const SEVERITY = { out: 0, low: 1, ok: 2 }
const STATUS_LABEL = { out: 'Out of stock', low: 'Low stock', ok: 'In stock' }

function StockRow({ product, categoryName }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const status = stockStatus(product)

  const parse = () => {
    const n = Number(value)
    if (value === '' || !Number.isInteger(n) || n < 0) {
      setError('Enter a whole number.')
      return null
    }
    setError('')
    return n
  }

  const handleAdd = async () => {
    const n = parse()
    if (n === null) return
    await adjustStock(product.id, n)
    setValue('')
  }

  const handleSet = async () => {
    const n = parse()
    if (n === null) return
    await setStock(product.id, n)
    setValue('')
  }

  return (
    <li className={`stock-row ${product.isActive ? '' : 'inactive'}`}>
      <div className="info">
        <strong>{product.name}</strong>
        <span>
          {categoryName} · {product.saleType === 'box' ? `Box of ${product.boxSize}` : 'Individual'}
          {!product.isActive && ' · Unavailable'}
        </span>
      </div>

      <div className={`level ${status}`}>
        <strong>{product.stock ?? 0}</strong>
        <span>{STATUS_LABEL[status]}</span>
      </div>

      <div className="adjust">
        <input
          type="number"
          inputMode="numeric"
          min="0"
          step="1"
          placeholder="Qty"
          aria-label={`Quantity for ${product.name}`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <button onClick={handleAdd}>Add</button>
        <button className="secondary" onClick={handleSet}>Set</button>
      </div>

      {error && <p className="error">{error}</p>}
    </li>
  )
}

export default function Inventory() {
  const [filter, setFilter] = useState('all') // 'all' | 'low'
  const categories = useLiveQuery(() => db.categories.toArray(), [])
  const products = useLiveQuery(() => db.products.toArray(), [])

  if (!categories || !products) return <p>Loading…</p>

  const categoryName = (id) => categories.find((c) => c.id === id)?.name ?? '—'

  const tracked = products.filter(isTracked)
  const attention = tracked.filter(needsAttention)
  const outCount = attention.filter((p) => stockStatus(p) === 'out').length
  const lowCount = attention.length - outCount
  const untrackedCount = products.length - tracked.length

  // Out of stock first, then low, then the rest
  const shown = (filter === 'low' ? attention : tracked)
    .slice()
    .sort(
      (a, b) =>
        SEVERITY[stockStatus(a)] - SEVERITY[stockStatus(b)] ||
        a.name.localeCompare(b.name),
    )

  return (
    <div className="inventory">
      <header>
        <h1>Inventory</h1>
      </header>

      <div className="inventory-summary">
        <div className={outCount > 0 ? 'out' : ''}>
          <span>Out of stock</span>
          <strong>{outCount}</strong>
        </div>
        <div className={lowCount > 0 ? 'low' : ''}>
          <span>Low stock</span>
          <strong>{lowCount}</strong>
        </div>
        <div>
          <span>Tracked items</span>
          <strong>{tracked.length}</strong>
        </div>
      </div>

      <div className="inventory-filters">
        <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>
          All tracked ({tracked.length})
        </button>
        <button className={filter === 'low' ? 'active' : ''} onClick={() => setFilter('low')}>
          Needs restock ({attention.length})
        </button>
      </div>

      {tracked.length === 0 ? (
        <p className="empty">
          No products are tracked yet. In the Products tab, edit a product and turn on
          “Track stock”.
        </p>
      ) : shown.length === 0 ? (
        <p className="empty">Nothing is low on stock.</p>
      ) : (
        <ul className="stock-list">
          {shown.map((p) => (
            <StockRow key={p.id} product={p} categoryName={categoryName(p.categoryId)} />
          ))}
        </ul>
      )}

      {untrackedCount > 0 && (
        <p className="footnote">
          {untrackedCount} product{untrackedCount === 1 ? ' isn’t' : 's aren’t'} tracked, so
          selling {untrackedCount === 1 ? 'it doesn’t' : 'them doesn’t'} change any stock.
        </p>
      )}
    </div>
  )
}