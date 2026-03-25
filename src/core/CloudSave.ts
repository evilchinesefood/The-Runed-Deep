// ============================================================
// Cloud save — sync game saves via short codes
// Saves are gzip-compressed before upload, decompressed on download
// ============================================================

const API_BASE = '/rd/api/save.php';
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L

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
  const blob = new Blob([bytes]);
  const stream = blob.stream().pipeThrough(new DecompressionStream('gzip'));
  return await new Response(stream).text();
}

export function generateCode(): string {
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
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

export async function pushSave(code: string, saveJson: string): Promise<boolean> {
  try {
    const compressed = await compress(saveJson);
    console.log(`[CLOUD] Compressed ${saveJson.length} -> ${compressed.length} bytes`);
    const res = await fetch(API_BASE, {
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
  try {
    const res = await fetch(`${API_BASE}?code=${encodeURIComponent(code)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Unknown error' }));
      console.warn('[CLOUD] Pull failed:', err.error);
      return null;
    }
    const raw = await res.text();
    // Try to decompress (compressed saves are base64 gzip)
    try {
      return await decompress(raw);
    } catch {
      // Fallback: might be uncompressed (old save)
      return raw;
    }
  } catch (e) {
    console.warn('[CLOUD] Pull error:', e);
    return null;
  }
}
