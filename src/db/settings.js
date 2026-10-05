import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'

export const DEFAULT_SETTINGS = {
  businessName: 'My Bakery',
  receiptHeader: '', // address / contact, one per line
  receiptFooter: 'Thank you! Come again.',
  paperWidth: 58, // mm: 58 or 80
}

export async function saveSettings(values) {
  await db.settings.bulkPut(
    Object.entries(values).map(([key, value]) => ({ key, value })),
  )
}

// Returns null while loading. Missing keys fall back to the defaults.
export function useSettings() {
  const rows = useLiveQuery(() => db.settings.toArray(), [])
  if (!rows) return null
  const stored = Object.fromEntries(rows.map((r) => [r.key, r.value]))
  return { ...DEFAULT_SETTINGS, ...stored }
}