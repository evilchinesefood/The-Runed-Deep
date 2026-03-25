// ============================================================
// Cloud save — sync game saves via short codes
// ============================================================

const API_BASE = '/rd/api/save.php';
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L

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
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, data: saveJson }),
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
    return await res.text();
  } catch (e) {
    console.warn('[CLOUD] Pull error:', e);
    return null;
  }
}
