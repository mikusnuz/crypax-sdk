/**
 * Build EIP-681 payment URI
 */
export function buildEip681Uri(address: string, amountWei: string, chainId: number): string {
  return `ethereum:${address}?value=${amountWei}&chainId=${chainId}`
}

/**
 * Convert decimal amount to wei string
 */
export function toWeiString(amount: string, decimals = 18): string {
  const parts = amount.split('.')
  const whole = parts[0] || '0'
  const frac = (parts[1] || '').padEnd(decimals, '0').slice(0, decimals)
  return (BigInt(whole) * 10n ** BigInt(decimals) + BigInt(frac)).toString()
}

/**
 * Generate QR code as inline SVG string.
 * Minimal implementation - byte mode, EC level L, versions 1-10.
 */
export function generateQrSvg(data: string, size = 200): string {
  try {
    const modules = qrEncode(data)
    return renderSvg(modules, size)
  } catch {
    return fallbackSvg(size)
  }
}

function fallbackSvg(size: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="100%" height="100%" fill="#f3f4f6" rx="12"/><text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" font-family="monospace" font-size="12" fill="#6b7280">QR</text></svg>`
}

function renderSvg(mod: boolean[][], size: number): string {
  const n = mod.length, margin = 4, total = n + margin * 2, c = size / total
  let d = ''
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++)
      if (mod[y][x]) d += `M${((x + margin) * c).toFixed(1)},${((y + margin) * c).toFixed(1)}h${c.toFixed(1)}v${c.toFixed(1)}h-${c.toFixed(1)}z`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><rect width="100%" height="100%" fill="#fff" rx="8"/><path d="${d}" fill="#000"/></svg>`
}

// ── GF(256) arithmetic ──
const GF_EXP = new Uint8Array(256)
const GF_LOG = new Uint8Array(256)
{
  let v = 1
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = v
    GF_LOG[v] = i
    v = v & 128 ? (v << 1) ^ 0x11d : v << 1
    v &= 0xff
  }
  GF_EXP[255] = GF_EXP[0]
}

const gfMul = (a: number, b: number) => a && b ? GF_EXP[(GF_LOG[a] + GF_LOG[b]) % 255] : 0

function rsEncode(data: Uint8Array, n: number): Uint8Array {
  const g = new Uint8Array(n + 1)
  g[0] = 1
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j >= 1; j--)
      g[j] ^= gfMul(g[j - 1], GF_EXP[i])
  const r = new Uint8Array(n)
  for (const d of data) {
    const f = d ^ r[0]
    r.copyWithin(0, 1)
    r[n - 1] = 0
    for (let j = 0; j < n; j++) r[j] ^= gfMul(g[j + 1], f)
  }
  return r
}

// [dataCW, ecCW, blocks] EC level L, versions 1-10
const V: [number, number, number][] = [
  [19, 7, 1], [34, 10, 1], [55, 15, 1], [80, 20, 1], [108, 26, 1],
  [136, 18, 2], [156, 20, 2], [194, 24, 2], [232, 30, 2], [274, 18, 4],
]

function pickVer(len: number): number {
  for (let i = 0; i < V.length; i++)
    if (len <= V[i][0] - (i < 9 ? 2 : 3)) return i + 1
  throw new Error('QR data too long')
}

function toBits(str: string, ver: number): Uint8Array {
  const raw = new TextEncoder().encode(str)
  const [dCW] = V[ver - 1]
  const cb = ver <= 9 ? 8 : 16
  const b: number[] = []
  const p = (v: number, n: number) => { for (let i = n - 1; i >= 0; i--) b.push((v >> i) & 1) }
  p(4, 4)
  p(raw.length, cb)
  for (const x of raw) p(x, 8)
  p(0, Math.min(4, dCW * 8 - b.length))
  while (b.length & 7) b.push(0)
  for (let i = 0; b.length < dCW * 8; i++) p([0xec, 0x11][i & 1], 8)
  const o = new Uint8Array(dCW)
  for (let i = 0; i < dCW; i++) {
    let v = 0
    for (let j = 0; j < 8; j++) v = (v << 1) | (b[i * 8 + j] || 0)
    o[i] = v
  }
  return o
}

function interleave(data: Uint8Array, ver: number): Uint8Array {
  const [dCW, eCW, bl] = V[ver - 1]
  const base = Math.floor(dCW / bl)
  const extra = dCW % bl
  const db: Uint8Array[] = []
  const eb: Uint8Array[] = []
  let o = 0
  for (let i = 0; i < bl; i++) {
    const l = base + (i >= bl - extra ? 1 : 0)
    db.push(data.slice(o, o + l))
    o += l
  }
  for (const d of db) eb.push(rsEncode(d, eCW))
  const out = new Uint8Array(dCW + eCW * bl)
  let idx = 0
  const maxD = base + (extra ? 1 : 0)
  for (let i = 0; i < maxD; i++)
    for (let bk = 0; bk < bl; bk++)
      if (i < db[bk].length) out[idx++] = db[bk][i]
  for (let i = 0; i < eCW; i++)
    for (let bk = 0; bk < bl; bk++) out[idx++] = eb[bk][i]
  return out
}

const AP: number[][] = [
  [], [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34],
  [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 52],
]

function qrEncode(str: string): boolean[][] {
  const raw = new TextEncoder().encode(str)
  const ver = pickVer(raw.length)
  const cw = interleave(toBits(str, ver), ver)
  const sz = ver * 4 + 17

  type Cell = boolean | null
  const m: Cell[][] = Array.from({ length: sz }, () => Array<Cell>(sz).fill(null))
  const rv: boolean[][] = Array.from({ length: sz }, () => Array(sz).fill(false))

  const s = (row: number, col: number, val: boolean) => {
    if (row >= 0 && row < sz && col >= 0 && col < sz) {
      m[row][col] = val
      rv[row][col] = true
    }
  }

  // Finder patterns + separators
  for (const [or, oc] of [[0, 0], [0, sz - 7], [sz - 7, 0]] as [number, number][]) {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const sep = dr === -1 || dr === 7 || dc === -1 || dc === 7
        const outer = dr === 0 || dr === 6 || dc === 0 || dc === 6
        const inner = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4
        s(or + dr, oc + dc, !sep && (outer || inner))
      }
    }
  }

  // Timing
  for (let i = 8; i < sz - 8; i++) {
    s(6, i, !(i & 1))
    s(i, 6, !(i & 1))
  }

  // Alignment patterns
  if (ver >= 2) {
    const pos = AP[ver]
    for (const ar of pos) {
      for (const ac of pos) {
        if (rv[ar]?.[ac]) continue
        for (let dr = -2; dr <= 2; dr++)
          for (let dc = -2; dc <= 2; dc++)
            s(ar + dr, ac + dc, Math.abs(dr) === 2 || Math.abs(dc) === 2 || (!dr && !dc))
      }
    }
  }

  // Dark module
  s(sz - 8, 8, true)

  // Reserve format info areas
  for (let i = 0; i < 9; i++) { rv[8][i] = true; rv[i][8] = true }
  for (let i = 0; i < 8; i++) { rv[8][sz - 1 - i] = true; rv[sz - 1 - i][8] = true }

  // Place data
  const bits: number[] = []
  for (const b of cw) for (let i = 7; i >= 0; i--) bits.push((b >> i) & 1)

  let bi = 0, up = true, col = sz - 1
  while (col >= 0) {
    if (col === 6) { col--; continue }
    for (let i = 0; i < sz; i++) {
      const row = up ? sz - 1 - i : i
      for (const dc of [0, -1]) {
        const c = col + dc
        if (c < 0 || rv[row][c]) continue
        m[row][c] = bi < bits.length ? bits[bi++] === 1 : false
      }
    }
    col -= 2
    up = !up
  }

  // Mask 0: (row+col)%2===0
  for (let y = 0; y < sz; y++)
    for (let x = 0; x < sz; x++)
      if (!rv[y][x]) m[y][x] = (m[y][x] as boolean) !== ((y + x) % 2 === 0)

  // Format info: EC level L + mask 0 = 0b111011111000100
  const fmt = 0b111011111000100
  const fb = (i: number) => ((fmt >> (14 - i)) & 1) === 1

  // Horizontal: row 8
  for (let i = 0; i <= 5; i++) m[8][i] = fb(i)
  m[8][7] = fb(6)
  m[8][8] = fb(7)
  for (let i = 8; i < 15; i++) m[8][sz - 15 + i] = fb(i)

  // Vertical: col 8
  for (let i = 0; i <= 5; i++) m[sz - 1 - i][8] = fb(i)
  m[sz - 7][8] = fb(6)
  m[sz - 8][8] = fb(7)
  for (let i = 8; i < 15; i++) m[14 - i][8] = fb(i)

  return m.map(row => row.map(c => c === true))
}
