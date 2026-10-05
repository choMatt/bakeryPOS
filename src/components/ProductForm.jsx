import { useState } from 'react'
import { DEFAULT_LOW_STOCK } from '../db/inventory'
const toPesos = (centavos) => (centavos / 100).toFixed(2)
const isWholeNumber = (v) => v !== '' && Number.isInteger(Number(v)) && Number(v) >= 0

export default function ProductForm({ product, categories, onSave, onCancel }) {
  const [name, setName] = useState(product?.name ?? '')
  const [price, setPrice] = useState(product ? toPesos(product.price) : '')
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? '')
  const [saleType, setSaleType] = useState(product?.saleType ?? 'single')
  const [boxSize, setBoxSize] = useState(product?.boxSize ?? 6)
  const [isActive, setIsActive] = useState(product?.isActive ?? true)
  const [trackStock, setTrackStock] = useState(product?.trackStock ?? false)
  const [stock, setStock] = useState(product?.stock ?? 0)
  const [lowStockAt, setLowStockAt] = useState(product?.lowStockAt ?? DEFAULT_LOW_STOCK)
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()

    const trimmed = name.trim()
    const pesos = parseFloat(price)

    if (!trimmed) return setError('Name is required.')
    if (Number.isNaN(pesos) || pesos < 0) return setError('Enter a valid price.')
    if (!categoryId) return setError('Choose a category.')
    if (saleType === 'box' && (!Number.isInteger(+boxSize) || +boxSize < 2)) {
      return setError('Box size must be a whole number of 2 or more.')
    }
    if (trackStock && !isWholeNumber(stock)) {
      return setError('Stock must be a whole number, 0 or more.')
    }
    if (trackStock && !isWholeNumber(lowStockAt)) {
      return setError('Low-stock alert must be a whole number, 0 or more.')
    }

    onSave({
      name: trimmed,
      price: Math.round(pesos * 100), // store as centavos
      categoryId: Number(categoryId),
      saleType,
      boxSize: saleType === 'box' ? Number(boxSize) : null,
      isActive,
      trackStock,
      // Only written when tracking, so turning tracking off keeps the old count
      ...(trackStock && { stock: Number(stock), lowStockAt: Number(lowStockAt) }),
    })
  }

  return (
    <form className="product-form" onSubmit={handleSubmit}>
      <h2>{product ? 'Edit product' : 'Add product'}</h2>

      <label>
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </label>

      <label>
        Price (₱)
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
      </label>

      <label>
        Category
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">Select…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </label>

      <fieldset>
        <legend>Sold as</legend>
        <label className="inline">
          <input
            type="radio"
            checked={saleType === 'single'}
            onChange={() => setSaleType('single')}
          />
          Individually
        </label>
        <label className="inline">
          <input
            type="radio"
            checked={saleType === 'box'}
            onChange={() => setSaleType('box')}
          />
          Box
        </label>
      </fieldset>

      {saleType === 'box' && (
        <label>
          Pieces per box
          <input
            type="number"
            min="2"
            step="1"
            value={boxSize}
            onChange={(e) => setBoxSize(e.target.value)}
          />
        </label>
      )}

      <label className="inline">
        <input
          type="checkbox"
          checked={trackStock}
          onChange={(e) => setTrackStock(e.target.checked)}
        />
        Track stock
      </label>

      {trackStock && (
        <>
          <label>
            Stock on hand {saleType === 'box' ? '(boxes)' : '(pieces)'}
            <input
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
            />
          </label>
          <label>
            Low-stock alert at
            <input
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              value={lowStockAt}
              onChange={(e) => setLowStockAt(e.target.value)}
            />
          </label>
          <p className="hint">
            Shows as low when stock is at or below this number. Each product keeps
            its own count, so a single cookie and a box of cookies are tracked separately.
          </p>
        </>
      )}

      <label className="inline">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
        />
        Available for sale
      </label>

      {error && <p className="error">{error}</p>}

      <div className="actions">
        <button type="submit">Save</button>
        <button type="button" className="secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}