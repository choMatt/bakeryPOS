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
db.on('populate', (tx) => {
  const defaultCategories = [
    { name: 'Cookies', sortOrder: 1 },
    { name: 'Crinkles', sortOrder: 2 },
    { name: 'Brownies', sortOrder: 3 },
    { name: 'Boxed Assortments', sortOrder: 4 },
  ]
  
  const defaultSettings = [
    { key: 'businessName', value: 'My Bakery' },
    { key: 'currency', value: 'PHP' },
    { key: 'currencySymbol', value: '₱' },
  ]
  
  db.on('ready', async () => {
    if ((await db.categories.count()) === 0) {
      await db.categories.bulkAdd(defaultCategories)
    }
    if ((await db.settings.count()) === 0) {
      await db.settings.bulkAdd(defaultSettings)
    }
  })
})