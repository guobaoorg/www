// @msgpack/msgpack decode - 轻量浏览器端 MessagePack 解码器
// 基于 @msgpack/msgpack v3 的核心 decode 逻辑

const UINT8_MAX = 255;
const INT8_MIN = -128;
const INT8_MAX = 127;
const UINT16_MAX = 65535;
const INT16_MIN = -32768;
const INT16_MAX = 32767;
const UINT32_MAX = 4294967295;
const INT32_MIN = -2147483648;
const INT32_MAX = 2147483647;

function utf8Decoder(bytes) {
  let pos = 0;
  const len = bytes.length;
  const out = [];
  while (pos < len) {
    const c = bytes[pos];
    if (c < 0x80) { out.push(c); pos++; }
    else if (c < 0xe0) {
      out.push(((c & 0x1f) << 6) | (bytes[pos + 1] & 0x3f));
      pos += 2;
    } else if (c < 0xf0) {
      out.push(((c & 0x0f) << 12) | ((bytes[pos + 1] & 0x3f) << 6) | (bytes[pos + 2] & 0x3f));
      pos += 3;
    } else {
      out.push(((c & 0x07) << 18) | ((bytes[pos + 1] & 0x3f) << 12) | ((bytes[pos + 2] & 0x3f) << 6) | (bytes[pos + 3] & 0x3f));
      pos += 4;
    }
  }
  return String.fromCharCode(...out);
}

function readStr(bytes, pos, len) {
  return utf8Decoder(bytes.slice(pos, pos + len));
}

class Decoder {
  constructor(bytes, offset = 0) {
    this.bytes = bytes;
    this.pos = offset;
  }

  readByte() { return this.bytes[this.pos++]; }

  readStrLen() {
    const b = this.readByte();
    if ((b & 0xe0) === 0xa0) return b & 0x1f;
    if (b === 0xd9) return this.bytes[this.pos++];
    if (b === 0xda) { const v = (this.bytes[this.pos] << 8) | this.bytes[this.pos + 1]; this.pos += 2; return v; }
    if (b === 0xdb) {
      const v = (this.bytes[this.pos] << 24) | (this.bytes[this.pos + 1] << 16) | (this.bytes[this.pos + 2] << 8) | this.bytes[this.pos + 3];
      this.pos += 4; return v;
    }
    this.pos--; return -1;
  }

  readArrayLen() {
    const b = this.readByte();
    if ((b & 0xf0) === 0x90) return b & 0x0f;
    if (b === 0xdc) { const v = (this.bytes[this.pos] << 8) | this.bytes[this.pos + 1]; this.pos += 2; return v; }
    if (b === 0xdd) {
      const v = (this.bytes[this.pos] << 24) | (this.bytes[this.pos + 1] << 16) | (this.bytes[this.pos + 2] << 8) | this.bytes[this.pos + 3];
      this.pos += 4; return v;
    }
    this.pos--; return -1;
  }

  readMapLen() {
    const b = this.readByte();
    if ((b & 0xf0) === 0x80) return b & 0x0f;
    if (b === 0xde) { const v = (this.bytes[this.pos] << 8) | this.bytes[this.pos + 1]; this.pos += 2; return v; }
    if (b === 0xdf) {
      const v = (this.bytes[this.pos] << 24) | (this.bytes[this.pos + 1] << 16) | (this.bytes[this.pos + 2] << 8) | this.bytes[this.pos + 3];
      this.pos += 4; return v;
    }
    this.pos--; return -1;
  }

  decode() {
    const b = this.readByte();
    // positive fixint
    if ((b & 0x80) === 0x00) return b;
    // negative fixint
    if ((b & 0xe0) === 0xe0) return b - 256;
    // fixstr
    if ((b & 0xe0) === 0xa0) { const len = b & 0x1f; const s = readStr(this.bytes, this.pos, len); this.pos += len; return s; }
    // fixarray
    if ((b & 0xf0) === 0x90) { const len = b & 0x0f; const arr = []; for (let i = 0; i < len; i++) arr.push(this.decode()); return arr; }
    // fixmap
    if ((b & 0xf0) === 0x80) { const len = b & 0x0f; const obj = {}; for (let i = 0; i < len; i++) { const k = this.decode(); const v = this.decode(); obj[k] = v; } return obj; }

    switch (b) {
      // nil
      case 0xc0: return null;
      // false
      case 0xc2: return false;
      // true
      case 0xc3: return true;
      // float 32
      case 0xca: {
        const dv = new DataView(this.bytes.buffer, this.bytes.byteOffset + this.pos, 4);
        this.pos += 4;
        return dv.getFloat32(0, false);
      }
      // float 64
      case 0xcb: {
        const dv = new DataView(this.bytes.buffer, this.bytes.byteOffset + this.pos, 8);
        this.pos += 8;
        return dv.getFloat64(0, false);
      }
      // uint 8
      case 0xcc: return this.bytes[this.pos++];
      // uint 16
      case 0xcd: { const v = (this.bytes[this.pos] << 8) | this.bytes[this.pos + 1]; this.pos += 2; return v; }
      // uint 32
      case 0xce: {
        const v = (this.bytes[this.pos] * 16777216) + (this.bytes[this.pos + 1] << 16) + (this.bytes[this.pos + 2] << 8) + this.bytes[this.pos + 3];
        this.pos += 4; return v;
      }
      // uint 64 (as number, may lose precision)
      case 0xcf: {
        const hi = (this.bytes[this.pos] * 16777216) + (this.bytes[this.pos + 1] << 16) + (this.bytes[this.pos + 2] << 8) + this.bytes[this.pos + 3];
        const lo = (this.bytes[this.pos + 4] * 16777216) + (this.bytes[this.pos + 5] << 16) + (this.bytes[this.pos + 6] << 8) + this.bytes[this.pos + 7];
        this.pos += 8;
        return hi * 4294967296 + lo;
      }
      // int 8
      case 0xd0: return (this.bytes[this.pos++] << 24) >> 24;
      // int 16
      case 0xd1: { const v = (this.bytes[this.pos] << 8) | this.bytes[this.pos + 1]; this.pos += 2; return (v << 16) >> 16; }
      // int 32
      case 0xd2: {
        const v = (this.bytes[this.pos] * 16777216) + (this.bytes[this.pos + 1] << 16) + (this.bytes[this.pos + 2] << 8) + this.bytes[this.pos + 3];
        this.pos += 4; return v | 0;
      }
      // int 64
      case 0xd3: { this.pos += 8; return 0; }
      // str 8
      case 0xd9: { const len = this.bytes[this.pos++]; const s = readStr(this.bytes, this.pos, len); this.pos += len; return s; }
      // str 16
      case 0xda: { const len = (this.bytes[this.pos] << 8) | this.bytes[this.pos + 1]; this.pos += 2; const s = readStr(this.bytes, this.pos, len); this.pos += len; return s; }
      // str 32
      case 0xdb: {
        const len = (this.bytes[this.pos] << 24) | (this.bytes[this.pos + 1] << 16) | (this.bytes[this.pos + 2] << 8) | this.bytes[this.pos + 3];
        this.pos += 4; const s = readStr(this.bytes, this.pos, len); this.pos += len; return s;
      }
      // array 16
      case 0xdc: { const len = (this.bytes[this.pos] << 8) | this.bytes[this.pos + 1]; this.pos += 2; const arr = []; for (let i = 0; i < len; i++) arr.push(this.decode()); return arr; }
      // array 32
      case 0xdd: {
        const len = (this.bytes[this.pos] << 24) | (this.bytes[this.pos + 1] << 16) | (this.bytes[this.pos + 2] << 8) | this.bytes[this.pos + 3];
        this.pos += 4; const arr = []; for (let i = 0; i < len; i++) arr.push(this.decode()); return arr;
      }
      // map 16
      case 0xde: { const len = (this.bytes[this.pos] << 8) | this.bytes[this.pos + 1]; this.pos += 2; const obj = {}; for (let i = 0; i < len; i++) { const k = this.decode(); const v = this.decode(); obj[k] = v; } return obj; }
      // map 32
      case 0xdf: {
        const len = (this.bytes[this.pos] << 24) | (this.bytes[this.pos + 1] << 16) | (this.bytes[this.pos + 2] << 8) | this.bytes[this.pos + 3];
        this.pos += 4; const obj = {}; for (let i = 0; i < len; i++) { const k = this.decode(); const v = this.decode(); obj[k] = v; } return obj;
      }
      // bin 8
      case 0xc4: { const len = this.bytes[this.pos++]; this.pos += len; return new Uint8Array(0); }
      // bin 16
      case 0xc5: { const len = (this.bytes[this.pos] << 8) | this.bytes[this.pos + 1]; this.pos += 2 + len; return new Uint8Array(0); }
      // bin 32
      case 0xc6: { this.pos += 4; return new Uint8Array(0); }
      default: return null;
    }
  }
}

export function decode(bytes) {
  if (!(bytes instanceof Uint8Array)) {
    bytes = new Uint8Array(bytes);
  }
  return new Decoder(bytes).decode();
}