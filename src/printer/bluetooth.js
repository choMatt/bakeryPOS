// Services used by common BLE thermal printers. Chrome only lets us talk to
// services that are listed here.
const SERVICES = [
  0x18f0,
  0xff00,
  0xffe0,
  0xfff0,
  0xfee7,
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
]

// Small chunks are slow but reliable on cheap printers. Raise if yours copes.
const CHUNK_SIZE = 20
const CHUNK_DELAY_MS = 20

let device = null
let characteristic = null

export const isBluetoothSupported = () =>
  typeof navigator !== 'undefined' && 'bluetooth' in navigator

export const getPrinterName = () => device?.name ?? ''

const isConnected = () => Boolean(device?.gatt?.connected && characteristic)

async function findWritableCharacteristic(server) {
  for (const service of await server.getPrimaryServices()) {
    for (const c of await service.getCharacteristics()) {
      if (c.properties.write || c.properties.writeWithoutResponse) return c
    }
  }
  return null
}

// Must be triggered by a click the first time (browser requirement).
// After that it reconnects to the same printer without asking again.
export async function connectPrinter() {
  if (!isBluetoothSupported()) {
    throw new Error('Bluetooth printing is not supported in this browser.')
  }
  if (!device) {
    device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: SERVICES,
    })
    device.addEventListener('gattserverdisconnected', () => {
      characteristic = null
    })
  }
  if (!isConnected()) {
    const server = await device.gatt.connect()
    characteristic = await findWritableCharacteristic(server)
    if (!characteristic) {
      device = null
      throw new Error("This device doesn't look like a supported printer.")
    }
  }
  return device.name ?? 'Printer'
}

// Use this to pick a different printer.
export function forgetPrinter() {
  if (device?.gatt?.connected) device.gatt.disconnect()
  device = null
  characteristic = null
}

export async function printBytes(bytes) {
  if (!isConnected()) await connectPrinter()
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.slice(i, i + CHUNK_SIZE)
    if (characteristic.properties.writeWithoutResponse) {
      await characteristic.writeValueWithoutResponse(chunk)
    } else {
      await characteristic.writeValue(chunk)
    }
    await new Promise((r) => setTimeout(r, CHUNK_DELAY_MS))
  }
}

export function describePrinterError(e) {
  if (e?.name === 'NotFoundError') return 'No printer was selected.'
  if (e?.name === 'SecurityError') {
    return 'Bluetooth is blocked. Use HTTPS (or localhost) and allow Bluetooth access.'
  }
  return e?.message || 'Could not reach the printer.'
}