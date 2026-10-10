
import { db } from './db'

const BACKUP_FORMAT = 'ff-pos-backup'
const BACKUP_VERSION = 1

const REQUIRED_TABLES = [
  'categories',
  'products',
  'orders',
  'settings',
]

function makeBackupFilename(prefix = 'ff-pos-backup') {
  const date = new Date().toISOString().slice(0, 10)
  return `${prefix}-${date}.json`
}

function downloadJson(data, filename) {
  const blob = new Blob(
    [JSON.stringify(data, null, 2)],
    { type: 'application/json' },
  )

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()

  // Give the browser time to begin the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function createBackup() {
  const tables = {}

  await db.transaction('r', db.tables, async () => {
    for (const tableName of REQUIRED_TABLES) {
      tables[tableName] = await db.table(tableName).toArray()
    }
  })

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    app: 'F&F POS',
    exportedAt: new Date().toISOString(),
    tables,
  }
}

export async function downloadBackup(prefix = 'ff-pos-backup') {
  const backup = await createBackup()

  downloadJson(backup, makeBackupFilename(prefix))

  return backup
}

export function validateBackup(backup) {
  if (!backup || typeof backup !== 'object' || Array.isArray(backup)) {
    throw new Error('The selected file is not a valid backup.')
  }

  if (backup.format !== BACKUP_FORMAT) {
    throw new Error('This file is not an F&F POS backup.')
  }

  if (backup.version !== BACKUP_VERSION) {
    throw new Error(
      `Unsupported backup version: ${backup.version ?? 'unknown'}.`,
    )
  }

  if (!backup.tables || typeof backup.tables !== 'object') {
    throw new Error('The backup is missing its table data.')
  }

  for (const tableName of REQUIRED_TABLES) {
    if (!Array.isArray(backup.tables[tableName])) {
      throw new Error(`The backup is missing the ${tableName} table.`)
    }
  }

  for (const row of backup.tables.categories) {
    if (!row || typeof row !== 'object' || !Number.isInteger(row.id)) {
      throw new Error('The backup contains an invalid category record.')
    }
  }

  for (const row of backup.tables.products) {
    if (!row || typeof row !== 'object' || !Number.isInteger(row.id)) {
      throw new Error('The backup contains an invalid product record.')
    }
  }

  for (const row of backup.tables.orders) {
    if (!row || typeof row !== 'object' || !Number.isInteger(row.id)) {
      throw new Error('The backup contains an invalid order record.')
    }
  }

  for (const row of backup.tables.settings) {
    if (
      !row ||
      typeof row !== 'object' ||
      typeof row.key !== 'string'
    ) {
      throw new Error('The backup contains an invalid setting record.')
    }
  }

  return {
    categories: backup.tables.categories.length,
    products: backup.tables.products.length,
    orders: backup.tables.orders.length,
    settings: backup.tables.settings.length,
  }
}

export async function restoreBackup(backup) {
  validateBackup(backup)

  // Keep every table replacement in one transaction. If a write fails,
  // Dexie rolls back the transaction instead of leaving partial data.
  await db.transaction('rw', db.tables, async () => {
    for (const tableName of REQUIRED_TABLES) {
      await db.table(tableName).clear()
      await db.table(tableName).bulkPut(backup.tables[tableName])
    }
  })
}

export function downloadSafetyBackup(backup) {
  downloadJson(backup, makeBackupFilename('ff-pos-before-restore'))
}
