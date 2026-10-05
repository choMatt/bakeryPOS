import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useSettings } from '../db/settings'
import { buildReceipt, columnsFor } from '../utils/receipt'
import { encodeReceipt } from '../printer/escpos'
import { printBytes, isBluetoothSupported, describePrinterError } from '../printer/bluetooth'
import './Receipt.css'

export default function ReceiptDialog({ order, onClose }) {
  const settings = useSettings()
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  if (!settings) return null

  const cols = columnsFor(settings.paperWidth)
  const lines = buildReceipt(order, settings, cols)

  const printThermal = async () => {
    setBusy(true)
    setError('')
    setStatus('')
    try {
      await printBytes(encodeReceipt(lines))
      setStatus('Sent to printer.')
    } catch (e) {
      setError(describePrinterError(e))
    } finally {
      setBusy(false)
    }
  }

  // Rendered into <body> so the print CSS can hide the rest of the app.
  return createPortal(
    <div className="receipt-overlay">
      <style>{`@page { size: ${settings.paperWidth}mm auto; margin: 0; }`}</style>
      <div className="receipt-modal">
        <div className="receipt-scroll">
          <div className="receipt-sheet" style={{ '--cols': cols }}>
            {lines.map((l, i) => (
              <div
                key={i}
                className={[
                  'line',
                  l.align === 'center' && 'center',
                  l.bold && 'bold',
                  l.large && 'large',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {l.text || '\u00A0'}
              </div>
            ))}
          </div>
        </div>

        {error && <p className="receipt-feedback error">{error}</p>}
        {status && <p className="receipt-feedback ok">{status}</p>}
        {!isBluetoothSupported() && (
          <p className="receipt-feedback hint">
            Bluetooth printing isn't available in this browser. Use Print (browser).
          </p>
        )}

        <div className="receipt-actions">
          {isBluetoothSupported() && (
            <button className="primary" onClick={printThermal} disabled={busy}>
              {busy ? 'Printing…' : 'Print (Bluetooth)'}
            </button>
          )}
          <button onClick={() => window.print()}>Print (browser)</button>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}