// ==================== 数据加密解密 ====================
const _K0 = 'dfc3627b883d2c52';
const _K1 = '53b8785d8068dadc';
const _K2 = '8d4ced5507ec17b4';
const _K3 = '90b67c81727e3f81';
const _KEY = new Uint8Array((_K0 + _K1 + _K2 + _K3).match(/.{2}/g).map(b => parseInt(b, 16)));
let _cryptoKey = null;

async function _getCryptoKey() {
  if (_cryptoKey) return _cryptoKey;
  _cryptoKey = await crypto.subtle.importKey('raw', _KEY, { name: 'AES-GCM' }, false, ['decrypt']);
  return _cryptoKey;
}

export async function decryptData(encryptedBase64) {
  const key = await _getCryptoKey();
  const raw = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
  const iv = raw.slice(0, 12);
  const ct = raw.slice(12);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return JSON.parse(new TextDecoder().decode(pt));
}