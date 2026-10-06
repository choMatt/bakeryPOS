import { useState, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db/db'
import { needsAttention } from './db/inventory'
import { useSettings } from './db/settings'
import { applyTheme } from './utils/theme'
import Checkout from './components/Checkout'
import ProductManager from './components/ProductManager'
import Orders from './components/Orders'
import Inventory from './components/Inventory'
import Settings from './components/Settings'
import './App.css'

const TABS = [
  { id: 'pos', label: 'POS' },
  { id: 'orders', label: 'Orders' },
  { id: 'products', label: 'Products' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'settings', label: 'Settings' },
]

export default function App() {
  const [tab, setTab] = useState('pos')
  const settings = useSettings()

  useEffect(() => {
    if (settings?.theme) {
      applyTheme(settings.theme)
    }
  }, [settings?.theme])

  const alertCount = useLiveQuery(
    async () => (await db.products.toArray()).filter(needsAttention).length,
    [],
    0,
  )

  return (
    <>
      <nav className="app-nav">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? 'active' : ''}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {t.id === 'inventory' && alertCount > 0 && (
              <span className="nav-badge">{alertCount}</span>
            )}
          </button>
        ))}
      </nav>
      {tab === 'pos' && <Checkout />}
      {tab === 'orders' && <Orders />}
      {tab === 'products' && <ProductManager />}
      {tab === 'inventory' && <Inventory />}
      {tab === 'settings' && <Settings />}
    </>
  )
}
