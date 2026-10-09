import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db/db'
import { needsAttention } from './db/inventory'
import Checkout from './components/Checkout'
import Login from './components/Login'
import ProductManager from './components/ProductManager'
import Orders from './components/Orders'
import Inventory from './components/Inventory'
import Settings from './components/Settings'
import posIcon from './assets/icons/nav/pos.svg?no-inline'
import ordersIcon from './assets/icons/nav/orders.svg?no-inline'
import productsIcon from './assets/icons/nav/products.svg?no-inline'
import inventoryIcon from './assets/icons/nav/inventory.svg?no-inline'
import settingsIcon from './assets/icons/nav/settings.svg?no-inline'
import './App.css'

const TABS = [
  { id: 'pos', label: 'POS', icon: posIcon },
  { id: 'orders', label: 'Orders', icon: ordersIcon },
  { id: 'products', label: 'Products', icon: productsIcon },
  { id: 'inventory', label: 'Inventory', icon: inventoryIcon },
  { id: 'settings', label: 'Settings', icon: settingsIcon }
]
const TITLES = Object.fromEntries(TABS.map((t) => [t.id, t.label]))

export default function App() {
  const [tab, setTab] = useState('pos')
  const [authenticated, setAuthenticated] = useState(
    () => sessionStorage.getItem('ff_authenticated') === 'true'
  )  
  const handleLogin = (username, password) => {
    // Replace these placeholders with your own credentials.
    const validUsername = 'kristina'
    const validPassword = 'freebrownies'
  
    if (
      username === validUsername &&
      password === validPassword
    ) {
      setAuthenticated(true)
      sessionStorage.setItem('ff_authenticated', 'true')
      setAuthenticated(true)
      return true
    }
  
    return false
  }

  const alertCount = useLiveQuery(
    async () => (await db.products.toArray()).filter(needsAttention).length,
    [],
    0,
  )

  return (
    <>
      {!authenticated ? (
        <Login onLogin={handleLogin} />
      ) : (
          <>
            
          <main className="app-main">
            {tab === 'pos' && <Checkout />}
            {tab === 'orders' && <Orders />}
            {tab === 'products' && <ProductManager />}
            {tab === 'inventory' && <Inventory />}
            {tab === 'settings' && (
              <Settings
                onLogout={() => {
                  sessionStorage.removeItem('ff_authenticated')
                  setAuthenticated(false)
                  setTab('pos')
                }}
              />
            )}
            </main>

            
            <nav className="bottom-nav" aria-label="Main">
              {TABS.map((t) => {
                const active = tab === t.id
                return (
                  <button
                    key={t.id}
                    className={active ? 'bn-item active' : 'bn-item'}
                    onClick={() => setTab(t.id)}
                    aria-label={t.label}
                    aria-current={active ? 'page' : undefined}
                  >
                    <span className="bn-circle">
                      <span className="bn-icon" style={{ '--icon': `url("${t.icon}")` }} />
                      {t.id === 'inventory' && alertCount > 0 && (
                        <span className="nav-badge">{alertCount}</span>
                      )}
                    </span>
                    {active && <span className="bn-label">{t.label}</span>}
                  </button>
                )
              })}
            </nav>
        </>
      )}
    </>
  )
}