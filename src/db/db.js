import Dexie from 'dexie'

export const db = new Dexie('bakery-pos')

// Only indexed fields are listed here. Other fields can still be stored on records.
db.version(1).stores({
  categories: '++id, name, sortOrder',
  products: '++id, name, categoryId, isActive',
  orders: '++id, createdAt, status, paymentMethod',
  settings: 'key',
})

// Runs once, when the database is first created.
db.on('populate', () => {
const defaultSettings = [
    { key: 'businessName', value: 'My Bakery' },
    { key: 'currency', value: 'PHP' },
    { key: 'currencySymbol', value: '₱' },
  ]

  db.on('ready', async () => {
if ((await db.settings.count()) === 0) {
      await db.settings.bulkAdd(defaultSettings)
    }
  })
})
