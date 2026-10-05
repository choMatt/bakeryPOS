export const formatPrice = (centavos) =>
  `₱${(centavos / 100).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

export const toCentavos = (pesos) => Math.round(parseFloat(pesos) * 100)