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
import {
  createBackup,
  validateBackup,
  restoreBackup,
  downloadSafetyBackup,
} from '../db/backup'

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

  const [backupBusy, setBackupBusy] = useState(false)
  const [backupError, setBackupError] = useState('')
  const [backupStatus, setBackupStatus] = useState('')
  const [restorePreview, setRestorePreview] = useState(null)
  const [restoreFile, setRestoreFile] = useState(null)

  

  

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

  
  const handleCreateBackup = async () => {
    setBackupBusy(true)
    setBackupError('')
    setBackupStatus('')
    setRestorePreview(null)
    setRestoreFile(null)

    try {
      const backup = await createBackup()
      downloadSafetyBackup // Keep the imported function available for restore.
      const blob = new Blob(
        [JSON.stringify(backup, null, 2)],
        { type: 'application/json' },
      )
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `ff-pos-backup-${new Date()
        .toISOString()
        .slice(0, 10)}.json`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)

      setBackupStatus('Backup downloaded. Store a copy somewhere safe.')
    } catch (e) {
      setBackupError(`Backup failed: ${e?.message || 'Unknown error'}`)
    } finally {
      setBackupBusy(false)
    }
  }

  const handleSelectBackup = async (e) => {
    const file = e.target.files?.[0]
    setRestorePreview(null)
    setRestoreFile(null)
    setBackupError('')
    setBackupStatus('')

    if (!file) return

    setBackupBusy(true)

    try {
      const text = await file.text()
      const backup = JSON.parse(text)
      const counts = validateBackup(backup)

      setRestoreFile(backup)
      setRestorePreview({
        filename: file.name,
        exportedAt: backup.exportedAt,
        ...counts,
      })
    } catch (e) {
      setBackupError(
        `Cannot use this backup: ${e?.message || 'Invalid JSON file.'}`,
      )
    } finally {
      setBackupBusy(false)
      e.target.value = ''
    }
  }

  const handleRestoreBackup = async () => {
    if (!restoreFile || !restorePreview) return

    const confirmed = window.confirm(
      'Restoring this backup will replace all current products, categories, orders, and settings. Continue?',
    )

    if (!confirmed) return

    setBackupBusy(true)
    setBackupError('')
    setBackupStatus('')

    try {
      // Download the current database first so it can be recovered if needed.
      const currentBackup = await createBackup()
      downloadSafetyBackup(currentBackup)

      await restoreBackup(restoreFile)

      setBackupStatus(
        'Restore completed. Reloading the POS to apply the restored data.',
      )
      window.setTimeout(() => window.location.reload(), 800)
    } catch (e) {
      setBackupError(
        `Restore failed: ${e?.message || 'Unknown error'}`,
      )
    } finally {
      setBackupBusy(false)
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


      <section className="backup-section">
        <h2>Backup &amp; Restore</h2>

        <p className="hint">
          Download a backup of your products, categories, orders, product
          images, and settings. Keep a copy outside this device.
        </p>

        <button
          type="button"
          className="primary"
          onClick={handleCreateBackup}
          disabled={backupBusy}
        >
          {backupBusy ? 'Please wait...' : 'Download Backup'}
        </button>

        <div className="backup-divider" />

        <h3>Restore from a backup</h3>

        <p className="hint">
          Select a previously downloaded F&amp;F POS backup file. Review its
          contents before replacing the current database.
        </p>

        <label>
          Backup file (.json)
          <input
            type="file"
            accept=".json,application/json"
            onChange={handleSelectBackup}
            disabled={backupBusy}
          />
        </label>

        {restorePreview && (
          <div className="backup-preview">
            <strong>Backup ready to restore</strong>
            <p className="hint">{restorePreview.filename}</p>
            {restorePreview.exportedAt && (
              <p className="hint">
                Created: {new Date(restorePreview.exportedAt).toLocaleString()}
              </p>
            )}
            <ul>
              <li>Products: {restorePreview.products}</li>
              <li>Categories: {restorePreview.categories}</li>
              <li>Orders: {restorePreview.orders}</li>
              <li>Settings: {restorePreview.settings}</li>
            </ul>

            <p className="error">
              Restoring replaces the current database. This cannot be undone
              from inside the POS.
            </p>

            <button
              type="button"
              className="delete-database-button"
              onClick={handleRestoreBackup}
              disabled={backupBusy}
            >
              {backupBusy ? 'Restoring...' : 'Restore This Backup'}
            </button>
          </div>
        )}

        {backupError && <p className="error">{backupError}</p>}
        {backupStatus && <p className="ok">{backupStatus}</p>}
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
