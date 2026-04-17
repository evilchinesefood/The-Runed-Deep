// ============================================================
// Cloud save — sync game saves via short codes
// Saves are gzip-compressed before upload, decompressed on download
// ============================================================

const API_BASE = location.hostname.includes('jdayers.com')
  ? '/rd/api/save.php'
  : null;
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L
const FETCH_TIMEOUT_MS = 10_000;
const MAX_INFLATE_BYTES = 10 * 1024 * 1024; // 10 MB — saves stay far below this in practice

async function compress(str: string): Promise<string> {
  const blob = new Blob([str]);
  const stream = blob.stream().pipeThrough(new CompressionStream('gzip'));
  const buf = await new Response(stream).arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function decompress(b64: string): Promise<string> {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  // Try native DecompressionStream first, fall back to manual inflate
  if (typeof DecompressionStream !== 'undefined') {
    try {
      const blob = new Blob([bytes]);
      const stream = blob.stream().pipeThrough(new DecompressionStream('gzip'));
      return await new Response(stream).text();
    } catch { /* fall through to manual */ }
  }
  // Manual gzip decompression fallback (for iOS Safari)
  return inflateGzip(bytes);
}

/** Minimal gzip inflate — strips gzip header/footer and inflates raw deflate. */
function inflateGzip(data: Uint8Array): string {
  // Gzip header: 1f 8b, method 08, then flags byte at offset 3
  if (data[0] !== 0x1f || data[1] !== 0x8b || data[2] !== 0x08) throw new Error('Not gzip');
  const flags = data[3];
  let pos = 10;
  if (flags & 0x04) { const len = data[pos] | (data[pos + 1] << 8); pos += 2 + len; } // FEXTRA
  if (flags & 0x08) { while (data[pos++] !== 0); } // FNAME
  if (flags & 0x10) { while (data[pos++] !== 0); } // FCOMMENT
  if (flags & 0x02) pos += 2; // FHCRC
  // Remaining is raw deflate + 8 byte trailer (CRC32 + ISIZE)
  const deflated = data.subarray(pos, data.length - 8);
  const inflated = rawInflate(deflated);
  return new TextDecoder().decode(inflated);
}

/** Raw DEFLATE inflate — supports stored, fixed Huffman, and dynamic Huffman blocks. */
function rawInflate(src: Uint8Array): Uint8Array {
  const out: number[] = [];
  let bitBuf = 0, bitCnt = 0, pos = 0;
  const guard = () => {
    if (out.length > MAX_INFLATE_BYTES) throw new Error('Decompressed size exceeds limit');
  };

  function bits(n: number): number {
    while (bitCnt < n) { bitBuf |= src[pos++] << bitCnt; bitCnt += 8; }
    const v = bitBuf & ((1 << n) - 1);
    bitBuf >>>= n; bitCnt -= n;
    return v;
  }

  function huffDecode(lengths: Uint8Array, n: number): (bits: () => number) => number {
    const count = new Uint16Array(16);
    for (let i = 0; i < n; i++) if (lengths[i]) count[lengths[i]]++;
    const offs = new Uint16Array(16);
    for (let i = 1; i < 16; i++) offs[i] = offs[i - 1] + count[i - 1];
    const syms = new Uint16Array(n);
    for (let i = 0; i < n; i++) if (lengths[i]) syms[offs[lengths[i]]++] = i;

    return () => {
      let code = 0, first = 0, idx = 0;
      for (let len = 1; len <= 15; len++) {
        code |= bits(1);
        const c = count[len];
        if (code < first + c) return syms[idx + (code - first)];
        idx += c; first = (first + c) << 1; code <<= 1;
      }
      throw new Error('Invalid Huffman');
    };
  }

  // Fixed Huffman tables
  const fixedLitLen = new Uint8Array(288);
  for (let i = 0; i <= 143; i++) fixedLitLen[i] = 8;
  for (let i = 144; i <= 255; i++) fixedLitLen[i] = 9;
  for (let i = 256; i <= 279; i++) fixedLitLen[i] = 7;
  for (let i = 280; i <= 287; i++) fixedLitLen[i] = 8;
  const fixedDist = new Uint8Array(32); fixedDist.fill(5);

  const lenBase = [3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258];
  const lenExtra = [0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0];
  const distBase = [1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577];
  const distExtra = [0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13];
  const clOrder = [16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];

  let bfinal = 0;
  while (!bfinal) {
    bfinal = bits(1);
    const btype = bits(2);

    if (btype === 0) {
      // Stored
      bitBuf = 0; bitCnt = 0;
      const len = src[pos] | (src[pos + 1] << 8); pos += 4;
      for (let i = 0; i < len; i++) out.push(src[pos++]);
      guard();
    } else {
      let decodeLit: (bits: () => number) => number;
      let decodeDist: (bits: () => number) => number;

      if (btype === 1) {
        decodeLit = huffDecode(fixedLitLen, 288);
        decodeDist = huffDecode(fixedDist, 32);
      } else {
        const hlit = bits(5) + 257;
        const hdist = bits(5) + 1;
        const hclen = bits(4) + 4;
        const clLens = new Uint8Array(19);
        for (let i = 0; i < hclen; i++) clLens[clOrder[i]] = bits(3);
        const decodeCL = huffDecode(clLens, 19);
        const all = new Uint8Array(hlit + hdist);
        let ai = 0;
        while (ai < hlit + hdist) {
          const sym = decodeCL(() => bits(1));
          if (sym < 16) { all[ai++] = sym; }
          else if (sym === 16) { const r = 3 + bits(2); const v = all[ai - 1]; for (let j = 0; j < r; j++) all[ai++] = v; }
          else if (sym === 17) { const r = 3 + bits(3); for (let j = 0; j < r; j++) all[ai++] = 0; }
          else { const r = 11 + bits(7); for (let j = 0; j < r; j++) all[ai++] = 0; }
        }
        decodeLit = huffDecode(all.subarray(0, hlit), hlit);
        decodeDist = huffDecode(all.subarray(hlit), hdist);
      }

      const getBit = () => bits(1);
      for (;;) {
        const sym = decodeLit(getBit);
        if (sym === 256) break;
        if (sym < 256) { out.push(sym); guard(); continue; }
        const li = sym - 257;
        const length = lenBase[li] + bits(lenExtra[li]);
        const di = decodeDist(getBit);
        const distance = distBase[di] + bits(distExtra[di]);
        const start = out.length - distance;
        for (let i = 0; i < length; i++) out.push(out[start + i]);
        guard();
      }
    }
  }
  return new Uint8Array(out);
}

export function generateCode(): string {
  let code = '';
  const src =
    typeof crypto !== 'undefined' && crypto.getRandomValues
      ? crypto.getRandomValues(new Uint32Array(5))
      : null;
  for (let i = 0; i < 5; i++) {
    const r = src ? src[i] : Math.floor(Math.random() * 0xffffffff);
    code += CODE_CHARS[r % CODE_CHARS.length];
  }
  return code;
}

export function getCloudCode(slot: number): string | null {
  return localStorage.getItem(`rd-cloud-${slot}`);
}

export function setCloudCode(slot: number, code: string): void {
  localStorage.setItem(`rd-cloud-${slot}`, code);
}

export function clearCloudCode(slot: number): void {
  localStorage.removeItem(`rd-cloud-${slot}`);
}

function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), FETCH_TIMEOUT_MS);
  return fetch(url, { ...init, signal: ctl.signal }).finally(() => clearTimeout(timer));
}

export async function pushSave(code: string, saveJson: string): Promise<boolean> {
  if (!API_BASE) return false;
  try {
    const compressed = await compress(saveJson);
    const res = await fetchWithTimeout(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, data: compressed, compressed: true }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Unknown error' }));
      console.warn('[CLOUD] Push failed:', err.error);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('[CLOUD] Push error:', e);
    return false;
  }
}

export async function pullSave(code: string): Promise<string | null> {
  if (!API_BASE) return null;
  try {
    const res = await fetchWithTimeout(`${API_BASE}?code=${encodeURIComponent(code)}`);
    if (!res.ok) return null;
    const raw = await res.text();
    try {
      return await decompress(raw);
    } catch {
      // Fallback: might be uncompressed (old save)
      return raw;
    }
  } catch {
    return null;
  }
}
