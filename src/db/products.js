import { db } from './db'

export const addProduct = (product) =>
  db.products.add({ isActive: true, ...product })

export const updateProduct = (id, changes) =>
  db.products.update(id, changes)

export const deleteProduct = (id) => db.products.delete(id)