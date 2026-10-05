import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { formatPrice } from '../utils/money'
import './Orders.css'
import ReceiptDialog from './ReceiptDialog'

const todayString = () => new Date().toLocaleDateString('en-CA') // YYYY-MM-DD, local time

const formatDateTime = (ms) =>
  new Date(ms).toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

const formatTime = (ms) =>
  new Date(ms).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })

const paymentLabel = (m) => (m === 'gcash' ? 'GCash' : m === 'cash' ? 'Cash' : m)
const itemCount = (order) => order.items.reduce((sum, i) => sum + i.qty, 0)

export default function Orders() {
  const [date, setDate] = useState(todayString()) // '' means all dates
  const [selectedId, setSelectedId] = useState(null)
  const [showReceipt, setShowReceipt] = useState(false)
  

  const orders = useLiveQuery(() => {
    if (!date) return db.orders.orderBy('createdAt').reverse().toArray()
    const start = new Date(`${date}T00:00:00`).getTime()
    const end = start + 24 * 60 * 60 * 1000
    return db.orders
      .where('createdAt')
      .between(start, end, true, false)
      .reverse()
      .toArray()
  }, [date])

  if (!orders) return <p>Loading…</p>

  const selected = orders.find((o) => o.id === selectedId) ?? null

  const counted = orders.filter((o) => o.status !== 'voided')
  const totalSales = counted.reduce((sum, o) => sum + o.total, 0)

  return (
    <div className="orders">
      <section className="orders-list-panel">
        <div className="orders-toolbar">
          <label>
            Date
            <input
              type="date"
              value={date}
              max={todayString()}
              onChange={(e) => {
                setDate(e.target.value)
                setSelectedId(null)
              }}
            />
          </label>
          <button onClick={() => { setDate(todayString()); setSelectedId(null) }}>Today</button>
          <button onClick={() => { setDate(''); setSelectedId(null) }}>All dates</button>
        </div>

        <div className="orders-summary">
          <div>
            <span>Orders</span>
            <strong>{counted.length}</strong>
          </div>
          <div>
            <span>Total sales</span>
            <strong>{formatPrice(totalSales)}</strong>
          </div>
        </div>

        {orders.length === 0 ? (
          <p className="empty">No orders {date ? 'on this date' : 'yet'}.</p>
        ) : (
          <ul className="orders-list">
            {orders.map((o) => (
              <li key={o.id}>
                <button
                  className={o.id === selectedId ? 'row active' : 'row'}
                  onClick={() => setSelectedId(o.id)}
                >
                  <div className="row-main">
                    <strong>Order #{o.id}</strong>
                    <span>
                      {date ? formatTime(o.createdAt) : formatDateTime(o.createdAt)} ·{' '}
                      {itemCount(o)} item{itemCount(o) === 1 ? '' : 's'} · {paymentLabel(o.paymentMethod)}
                      {o.status === 'voided' && ' · Voided'}
                    </span>
                  </div>
                  <div className={o.status === 'voided' ? 'row-total voided' : 'row-total'}>
                    {formatPrice(o.total)}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <aside className="order-detail">
        {!selected ? (
          <p className="empty">Select an order to see its details.</p>
        ) : (
          <>
            <header>
              <h2>Order #{selected.id}</h2>
              <span className={`status ${selected.status}`}>{selected.status}</span>
            </header>
            <p className="detail-meta">
              {formatDateTime(selected.createdAt)} · {paymentLabel(selected.paymentMethod)}
              </p>
              <button className="print-btn" onClick={() => setShowReceipt(true)}>
                Print receipt
              </button>

            <ul className="detail-items">
              {selected.items.map((i, idx) => (
                <li key={`${i.productId}-${idx}`}>
                  <div>
                    <span className="item-name">{i.name}</span>
                    <span className="item-sub">
                      {formatPrice(i.price)} × {i.qty}
                    </span>
                  </div>
                  <span>{formatPrice(i.price * i.qty)}</span>
                </li>
              ))}
            </ul>

            <div className="detail-totals">
              <div>
                <span>Subtotal</span>
                <span>{formatPrice(selected.subtotal ?? selected.total)}</span>
              </div>
              <div className="grand">
                <span>Total</span>
                <span>{formatPrice(selected.total)}</span>
              </div>
              <div>
                <span>Amount paid</span>
                <span>{formatPrice(selected.amountPaid)}</span>
              </div>
              <div>
                <span>Change</span>
                <span>{formatPrice(selected.change)}</span>
              </div>
            </div>
          </>
        )}
        {showReceipt && selected && (
          <ReceiptDialog order={selected} onClose={() => setShowReceipt(false)} />
        )}
      </aside>
    </div>
  )
}