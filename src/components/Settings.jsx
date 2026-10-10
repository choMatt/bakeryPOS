import { useState } from 'react'
import { db } from '../db/db'
import { useSettings, saveSettings } from '../db/settings'
import { buildReceipt, sampleOrder, columnsFor } from '../utils/receipt'
import { encodeReceipt } from '../printer/escpos'
import {
  connectPrinter,
  forgetPrinter,
  getPrinterName,
  isBluetoothSupported,
  printBytes,
  describePrinterError,
} from '../printer/bluetooth'
import './Settings.css'

function SettingsForm({ settings, onLogout }) {
  const [businessName, setBusinessName] = useState(settings.businessName)
  const [receiptHeader, setReceiptHeader] = useState(settings.receiptHeader)
  const [receiptFooter, setReceiptFooter] = useState(settings.receiptFooter)
  const [paperWidth, setPaperWidth] = useState(settings.paperWidth)

  const [printerName, setPrinterName] = useState(getPrinterName())
  const [busy, setBusy] = useState(false)

  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  const [deletePassword, setDeletePassword] = useState('')
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const DELETE_DATABASE_PASSWORD = '#330221'

  

  const handleSave = async (e) => {
    e.preventDefault()
    setError('')
    await saveSettings({
      businessName: businessName.trim() || 'My Bakery',
      receiptHeader,
      receiptFooter,
      paperWidth,
    })
    setStatus('Settings saved.')
  }

  const runPrinter = async (action, okText) => {
    setBusy(true)
    setError('')
    setStatus('')
    try {
      await action()
      setPrinterName(getPrinterName())
      setStatus(okText)
    } catch (e) {
      setError(describePrinterError(e))
    } finally {
      setBusy(false)
    }
  }

  const handleConnect = () => runPrinter(connectPrinter, 'Printer connected.')

  const handleTestPrint = () =>
    runPrinter(async () => {
      const lines = buildReceipt(
        sampleOrder(),
        { businessName, receiptHeader, receiptFooter },
        columnsFor(paperWidth),
      )
      await printBytes(encodeReceipt(lines))
    }, 'Test receipt sent.')

  const handleForget = () => {
    forgetPrinter()
    setPrinterName('')
    setStatus('')
  }

  const handleRequestDelete = (e) => {
    e.preventDefault()
    setError('')
    setStatus('')
  
    if (deletePassword !== DELETE_DATABASE_PASSWORD) {
      setError('Incorrect password.')
      return
    }
  
    setShowDeleteConfirmation(true)
  }
  
  const handleDeleteDatabase = async () => {
    setDeleting(true)
    setError('')
    setStatus('')
  
    try {
      db.close()
      await db.delete()
      window.location.reload()
    } catch (e) {
      console.error('Database deletion failed:', e)
  
      setError(
        `Failed to delete database: ${e?.message || 'Unknown error'}`,
      )
  
      // Reopen the database so the POS can continue working.
      try {
        await db.open()
      } catch (openError) {
        console.error('Database reopen failed:', openError)
      }
  
      setDeleting(false)
      setShowDeleteConfirmation(false)
    }
  }

  return (
    <div className="settings">
      <form onSubmit={handleSave}>
        <section>
          <h2>Receipt</h2>

          <label>
            Business name
            <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
          </label>

          <label>
            Address / contact (one line each)
            <textarea
              rows="3"
              value={receiptHeader}
              onChange={(e) => setReceiptHeader(e.target.value)}
            />
          </label>

          <label>
            Footer message
            <input value={receiptFooter} onChange={(e) => setReceiptFooter(e.target.value)} />
          </label>

          <fieldset>
            <legend>Paper width</legend>
            <div className="row">
              <label className="inline">
                <input type="radio" checked={paperWidth === 58} onChange={() => setPaperWidth(58)} />
                58 mm
              </label>
              <label className="inline">
                <input type="radio" checked={paperWidth === 80} onChange={() => setPaperWidth(80)} />
                80 mm
              </label>
            </div>
          </fieldset>

          <button type="submit" className="primary">Save</button>
        </section>
      </form>

      <section>
        <h2>Thermal printer</h2>
        {isBluetoothSupported() ? (
          <>
            <p className="hint">
              {printerName ? `Printer: ${printerName}` : 'No printer connected yet.'}
            </p>
            <div className="row">
              <button onClick={handleConnect} disabled={busy}>
                {printerName ? 'Reconnect' : 'Connect printer'}
              </button>
              <button onClick={handleTestPrint} disabled={busy}>Test print</button>
              {printerName && <button onClick={handleForget} disabled={busy}>Change printer</button>}
            </div>
            <p className="hint">
              Turn the printer on and keep it close. Test print uses the paper width and
              text above, even before you save.
            </p>
          </>
        ) : (
          <p className="hint">
            This browser can't print over Bluetooth. Use Chrome or Edge on Android or desktop,
            or the Print (browser) button on receipts.
          </p>
        )}
      </section>

      {error && <p className="error">{error}</p>}
      {status && <p className="ok">{status}</p>}

      <section className="delete-database-section">
        <h2>Danger Zone</h2>
      
        <p className="hint">
          Permanently delete all locally stored products, categories,
          orders, and settings from this device.
        </p>
      
        {!showDeleteConfirmation ? (
          <form onSubmit={handleRequestDelete}>
            <label>
              Enter deletion password
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </label>
      
            <button
              type="submit"
              className="delete-database-button"
              disabled={deleting}
            >
              Delete Database
            </button>
          </form>
        ) : (
          <>
            <p className="error">
              Are you sure? This action cannot be undone.
            </p>
      
            <div className="row">
              <button
                type="button"
                className="delete-database-button"
                onClick={handleDeleteDatabase}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Yes, Delete Everything'}
              </button>
      
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirmation(false)
                  setDeletePassword('')
                }}
                disabled={deleting}
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </section>

      <section className="logout-section">
        <h2>Account</h2>
        <p className="hint">
          Log out of the POS on this device.
          Your products, orders, and settings will not be deleted.
        </p>
        <button
          type="button"
          className="logout-button"
          onClick={onLogout}
        >
          Log Out
        </button>
      </section>
    </div>
  )
}

export default function Settings({ onLogout }) {
  const settings = useSettings()

  if (!settings) return <p>Loading…</p>

  return <SettingsForm settings={settings} onLogout={onLogout} />
}
