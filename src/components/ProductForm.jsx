
import { useState } from 'react'
import { DEFAULT_LOW_STOCK } from '../db/inventory'

const toPesos = (centavos) => (centavos / 100).toFixed(2)

const isWholeNumber = (v) =>
  v !== '' && Number.isInteger(Number(v)) && Number(v) >= 0

async function resizeProductImage(file) {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please select an image file.')
  }

  const imageUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Could not read the image.'))

    reader.readAsDataURL(file)
  })

  const image = await new Promise((resolve, reject) => {
    const img = new Image()

    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not load the image.'))

    img.src = imageUrl
  })

  const maxSize = 800
  const scale = Math.min(1, maxSize / Math.max(image.width, image.height))
  const canvas = document.createElement('canvas')

  canvas.width = Math.round(image.width * scale)
  canvas.height = Math.round(image.height * scale)

  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Could not process the image.')
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height)

  return canvas.toDataURL('image/jpeg', 0.8)
}

export default function ProductForm({ product, onSave, onCancel }) {
  const [name, setName] = useState(product?.name ?? '')
  const [price, setPrice] = useState(product ? toPesos(product.price) : '')
  const [saleType, setSaleType] = useState(product?.saleType ?? 'single')
  const [boxSize, setBoxSize] = useState(product?.boxSize ?? 6)
  const [isActive, setIsActive] = useState(product?.isActive ?? true)
  const [trackStock, setTrackStock] = useState(product?.trackStock ?? false)
  const [stock, setStock] = useState(product?.stock ?? 0)
  const [lowStockAt, setLowStockAt] = useState(
    product?.lowStockAt ?? DEFAULT_LOW_STOCK,
  )
  const [image, setImage] = useState(product?.image ?? '')
  const [error, setError] = useState('')
  const [imageLoading, setImageLoading] = useState(false)

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0]

    if (!file) return

    setError('')
    setImageLoading(true)

    try {
      const resizedImage = await resizeProductImage(file)
      setImage(resizedImage)
    } catch (err) {
      setError(err.message || 'Could not process the image.')
    } finally {
      setImageLoading(false)
      event.target.value = ''
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const trimmed = name.trim()
    const pesos = parseFloat(price)

    if (imageLoading) return setError('Please wait for the image to finish processing.')
    if (!trimmed) return setError('Name is required.')
    if (Number.isNaN(pesos) || pesos < 0) return setError('Enter a valid price.')

    if (saleType === 'box' && (!Number.isInteger(+boxSize) || +boxSize < 2)) {
      return setError('Box size must be a whole number of 2 or more.')
    }

    if (trackStock && !isWholeNumber(stock)) {
      return setError('Stock must be a whole number, 0 or more.')
    }

    if (trackStock && !isWholeNumber(lowStockAt)) {
      return setError('Low-stock alert must be a whole number, 0 or more.')
    }

    try {
      await onSave({
        name: trimmed,
        price: Math.round(pesos * 100),
        saleType,
        boxSize: saleType === 'box' ? Number(boxSize) : null,
        isActive,
        trackStock,
        image,
        ...(trackStock && {
          stock: Number(stock),
          lowStockAt: Number(lowStockAt),
        }),
      })
    } catch (err) {
      setError(err.message || 'Could not save the product.')
    }
  }

  return (
    <form className="product-form" onSubmit={handleSubmit}>
      <h2>{product ? 'Edit product' : 'Add product'}</h2>

      <div className="product-image-upload">
        <div className="product-image-preview">
          {image ? (
            <img src={image} alt="Product preview" />
          ) : (
            <span>No image</span>
          )}
        </div>

        <label className="product-image-picker">
          {image ? 'Change image' : 'Add product image'}
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
          />
        </label>

        {image && (
          <button
            type="button"
            className="secondary"
            onClick={() => setImage('')}
          >
            Remove image
          </button>
        )}

        <p className="hint">
          Choose a photo from your gallery or use your camera if your device offers that option.
        </p>
      </div>

      <label>
        Name
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoFocus
        />
      </label>

      <label>
        Price (₱)
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
        />
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
            onChange={(event) => setBoxSize(event.target.value)}
          />
        </label>
      )}

      <label className="inline">
        <input
          type="checkbox"
          checked={trackStock}
          onChange={(event) => setTrackStock(event.target.checked)}
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
              onChange={(event) => setStock(event.target.value)}
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
              onChange={(event) => setLowStockAt(event.target.value)}
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
          onChange={(event) => setIsActive(event.target.checked)}
        />
        Available for sale
      </label>

      {error && <p className="error">{error}</p>}

      <div className="actions">
        <button type="submit" disabled={imageLoading}>
          {imageLoading ? 'Processing image…' : 'Save'}
        </button>

        <button type="button" className="secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}
