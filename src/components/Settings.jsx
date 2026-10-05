import { useState } from 'react'
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

function SettingsForm({ settings }) {
  const [businessName, setBusinessName] = useState(settings.businessName)
  const [receiptHeader, setReceiptHeader] = useState(settings.receiptHeader)
  const [receiptFooter, setReceiptFooter] = useState(settings.receiptFooter)
  const [paperWidth, setPaperWidth] = useState(settings.paperWidth)

  const [printerName, setPrinterName] = useState(getPrinterName())
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

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
            <label className="inline">
              <input type="radio" checked={paperWidth === 58} onChange={() => setPaperWidth(58)} />
              58 mm
            </label>
            <label className="inline">
              <input type="radio" checked={paperWidth === 80} onChange={() => setPaperWidth(80)} />
              80 mm
            </label>
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
    </div>
  )
}

export default function Settings() {
  const settings = useSettings()
  if (!settings) return <p>Loading…</p>
  return <SettingsForm settings={settings} />
}