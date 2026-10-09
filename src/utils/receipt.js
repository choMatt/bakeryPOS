// Characters per line. If your printer shows blank lines between rows,
// try lowering these by 1.
export const PAPER_COLUMNS = { 58: 32, 80: 48 }
export const columnsFor = (paperWidth) => PAPER_COLUMNS[paperWidth] ?? 32

// Thermal printers speak plain ASCII; strip anything else.
const toAscii = (s = '') =>
  String(s)
    .replace(/[\u00A0\u2000-\u200B\u202F]/g, ' ')
    .replace(/₱/g, 'P')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '?')

const money = (centavos) =>
  (centavos / 100).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

function wrap(text, width) {
  const lines = []
  let current = ''
  for (let word of text.split(/\s+/).filter(Boolean)) {
    while (word.length > width) {
      if (current) { lines.push(current); current = '' }
      lines.push(word.slice(0, width))
      word = word.slice(width)
    }
    if (!current) current = word
    else if (current.length + 1 + word.length <= width) current += ' ' + word
    else { lines.push(current); current = word }
  }
  if (current) lines.push(current)
  return lines
}

// "Left text ........ right text" on one line
function row(left, right, width) {
  const room = width - right.length - 1
  const l = left.length > room ? left.slice(0, Math.max(room, 0)) : left
  return l.padEnd(width - right.length) + right
}

const paymentLabel = (m) => (m === 'gcash' ? 'GCash' : m === 'cash' ? 'Cash' : toAscii(m))

// Returns [{ text, align: 'left' | 'center', bold, large }]
export function buildReceipt(order, settings, width = 32) {
  const lines = []
  const add = (text = '', opts = {}) =>
    lines.push({ text, align: 'left', bold: false, large: false, ...opts })
  const center = (text, opts = {}) =>
    wrap(text, opts.large ? Math.floor(width / 2) : width).forEach((t) =>
      add(t, { ...opts, align: 'center' }),
    )
  const divider = () => add('-'.repeat(width))
  const doubleDivider = () => add('='.repeat(width))
  const formatRow = (label, value, width) => {
    const spaces = Math.max(1, width - label.length - value.length)
    return label + ' '.repeat(spaces) + value
  }


  center(toAscii(settings.businessName).toUpperCase(), { bold: true, large: true })
  String(settings.receiptHeader ?? '')
    .split('\n')
    .forEach((l) => center(toAscii(l)))
  
  doubleDivider()
  
  add(`Order #${order.id}`)
  
  add('')
  
  if (order.customer) {
    if (order.customer.name) {
      add(
        formatRow('Client: ', toAscii(order.customer.name), width)
      )
    }
  
    if (order.customer.address) {
      add(
        formatRow('Address: ', toAscii(order.customer.address), width)
      )
    }
  
    if (order.customer.contactNumber) {
      add(
        formatRow('Contact: ', toAscii(order.customer.contactNumber), width)
      )
    }
  }

  add('')
  add(
    toAscii(
      new Date(order.createdAt).toLocaleString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }),
    ),
  )
  add(`Payment: ${paymentLabel(order.paymentMethod)}`)
  if (order.status === 'voided') center('*** VOIDED ***', { bold: true })
  divider()

  order.items.forEach((i) => {
    wrap(toAscii(i.name), width).forEach((t) => add(t))
    add(row(`  ${i.qty} x ${money(i.price)}`, money(i.price * i.qty), width))
  })
  divider()


  const totalAmount = money(order.total)
  const totalRow = row('TOTAL', totalAmount, Math.floor(width / 2))
  
  add(totalRow, { bold: true, large: true })
  
  if (order.paymentMethod === 'cash') {
    add(row('Cash', money(order.amountPaid), width))
    add(row('Change', money(order.change), width))
  } else {
    add(row(paymentLabel(order.paymentMethod), money(order.amountPaid), width))
  }
  divider()

  center(toAscii(settings.receiptFooter))
  add()
  return lines 

}



// Used by the "Test print" button in Settings
export function sampleOrder() {
  const items = [
    { productId: 0, name: 'Sample Cookie', price: 4500, qty: 2 },
    { productId: 0, name: 'Sample Brownie (Box of 6)', price: 35000, qty: 1 },
  ]
  const total = items.reduce((s, i) => s + i.price * i.qty, 0)
  return {
    id: 'TEST',
    createdAt: Date.now(),
    status: 'completed',
    paymentMethod: 'cash',
    items,
    total,
    amountPaid: 50000,
    change: 50000 - total,
  }
}