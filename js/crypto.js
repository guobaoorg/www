const _K = 'dfc3627b883d2c5253b8785d8068dadc8d4ced5507ec17b490b67c81727e3f81';
const _KEY = new Uint8Array(_K.match(/.{2}/g).map(b => parseInt(b, 16)));
let _cryptoKey = null;

async function _getKey() {
  if (!_cryptoKey) _cryptoKey = await crypto.subtle.importKey('raw', _KEY, { name: 'AES-GCM' }, false, ['decrypt']);
  return _cryptoKey;
}

export async function decryptData(s) {
  const raw = Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: raw.slice(0, 12) }, await _getKey(), raw.slice(12));
  return JSON.parse(new TextDecoder().decode(pt));
}