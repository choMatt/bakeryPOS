const ESC = 0x1b
const GS = 0x1d
const LF = 0x0a

// Turns receipt lines into ESC/POS bytes.
export function encodeReceipt(lines, { feed = 4, cut = true } = {}) {
  const out = [ESC, 0x40] // initialize

  for (const line of lines) {
    out.push(ESC, 0x61, line.align === 'center' ? 1 : 0) // alignment
    out.push(ESC, 0x45, line.bold ? 1 : 0) // bold
    out.push(GS, 0x21, line.large ? 0x11 : 0x00) // double width + height
    for (const ch of line.text) {
      const code = ch.charCodeAt(0)
      out.push(code >= 0x20 && code <= 0x7e ? code : 0x3f)
    }
    out.push(LF)
  }

  out.push(ESC, 0x61, 0, ESC, 0x45, 0, GS, 0x21, 0) // reset styles
  out.push(ESC, 0x64, feed) // feed paper so the receipt clears the tear bar
  if (cut) out.push(GS, 0x56, 0x42, 0x00) // partial cut (ignored without a cutter)

  return new Uint8Array(out)
}