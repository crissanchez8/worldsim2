// UTF-8 propio: el motor no depende de TextEncoder/TextDecoder (no están en la lib ES pura y
// así core corre igual en Worker, Node y navegador sin tipos de plataforma).

/** Codifica un string a UTF-8. Los surrogates sueltos se codifican como U+FFFD. */
export function utf8(text: string): Uint8Array {
  const out: number[] = [];
  for (let i = 0; i < text.length; i++) {
    let cp = text.charCodeAt(i);
    if (cp >= 0xd800 && cp <= 0xdbff) {
      const next = i + 1 < text.length ? text.charCodeAt(i + 1) : 0;
      if (next >= 0xdc00 && next <= 0xdfff) {
        cp = 0x10000 + ((cp - 0xd800) << 10) + (next - 0xdc00);
        i++;
      } else {
        cp = 0xfffd;
      }
    } else if (cp >= 0xdc00 && cp <= 0xdfff) {
      cp = 0xfffd;
    }
    if (cp < 0x80) {
      out.push(cp);
    } else if (cp < 0x800) {
      out.push(0xc0 | (cp >> 6), 0x80 | (cp & 0x3f));
    } else if (cp < 0x10000) {
      out.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
    } else {
      out.push(
        0xf0 | (cp >> 18),
        0x80 | ((cp >> 12) & 0x3f),
        0x80 | ((cp >> 6) & 0x3f),
        0x80 | (cp & 0x3f),
      );
    }
  }
  return Uint8Array.from(out);
}

/** Decodifica UTF-8 válido (el que produce `utf8`). Secuencias inválidas → error. */
export function utf8Decode(bytes: Uint8Array): string {
  let text = '';
  let i = 0;
  const byte = (j: number): number => {
    const b = bytes[j];
    if (b === undefined || (b & 0xc0) !== 0x80) throw new Error('utf8Decode: secuencia inválida');
    return b & 0x3f;
  };
  while (i < bytes.length) {
    const b0 = bytes[i] ?? 0;
    let cp: number;
    if (b0 < 0x80) {
      cp = b0;
      i += 1;
    } else if (b0 >= 0xc2 && b0 < 0xe0) {
      cp = ((b0 & 0x1f) << 6) | byte(i + 1);
      i += 2;
    } else if (b0 >= 0xe0 && b0 < 0xf0) {
      cp = ((b0 & 0x0f) << 12) | (byte(i + 1) << 6) | byte(i + 2);
      i += 3;
    } else if (b0 >= 0xf0 && b0 < 0xf5) {
      cp = ((b0 & 0x07) << 18) | (byte(i + 1) << 12) | (byte(i + 2) << 6) | byte(i + 3);
      i += 4;
    } else {
      throw new Error('utf8Decode: byte inicial inválido');
    }
    text += String.fromCodePoint(cp);
  }
  return text;
}
