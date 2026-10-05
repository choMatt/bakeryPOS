import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { addProduct, updateProduct, deleteProduct } from '../db/products'
import { isTracked } from '../db/inventory'
import ProductForm from './ProductForm'
import './ProductManager.css'


const formatPrice = (centavos) =>
  `₱${(centavos / 100).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

export default function ProductManager() {
  const categories = useLiveQuery(() => db.categories.orderBy('sortOrder').toArray(), [])
  const products = useLiveQuery(() => db.products.orderBy('name').toArray(), [])

  // null = form closed, 'new' = adding, product object = editing
  const [editing, setEditing] = useState(null)

  if (!categories || !products) return <p>Loading…</p>

  const categoryName = (id) => categories.find((c) => c.id === id)?.name ?? '—'

  const handleSave = async (data) => {
    if (editing === 'new') await addProduct(data)
    else await updateProduct(editing.id, data)
    setEditing(null)
  }

  const handleDelete = async (product) => {
    if (window.confirm(`Delete "${product.name}"? This can't be undone.`)) {
      await deleteProduct(product.id)
    }
  }

  return (
    <div className="product-manager">
      <header>
        <h1>Products</h1>
        {!editing && <button onClick={() => setEditing('new')}>+ Add product</button>}
      </header>

      {editing && (
        <ProductForm
          key={editing === 'new' ? 'new' : editing.id}
          product={editing === 'new' ? null : editing}
          categories={categories}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      )}

      {products.length === 0 ? (
        <p className="empty">No products yet. Add your first one.</p>
      ) : (
        <ul className="product-list">
          {products.map((p) => (
            <li key={p.id} className={p.isActive ? '' : 'inactive'}>
              <div className="info">
                <strong>{p.name}</strong>
                <span>
                  {categoryName(p.categoryId)} ·{' '}
                  {p.saleType === 'box' ? `Box of ${p.boxSize}` : 'Individual'}
                  {isTracked(p) && ` · ${p.stock ?? 0} in stock`}
                  {!p.isActive && ' · Unavailable'}
                </span>
              </div>
              <div className="price">{formatPrice(p.price)}</div>
              <div className="actions">
                <button className="secondary" onClick={() => setEditing(p)}>Edit</button>
                <button className="danger" onClick={() => handleDelete(p)}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}