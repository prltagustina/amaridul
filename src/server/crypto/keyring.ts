export type Keyring = {
  active: string;
  keys: ReadonlyMap<string, Buffer>;
};

/** Parses "v1:<base64>,v2:<base64>" into versioned 32-byte keys. */
export function parseKeyring(spec: string, active: string): Keyring {
  const keys = new Map<string, Buffer>();
  for (const entry of spec.split(",")) {
    const sep = entry.indexOf(":");
    const version = entry.slice(0, sep);
    const key = Buffer.from(entry.slice(sep + 1), "base64");
    if (!/^v\d+$/.test(version)) throw new Error(`Versión de clave inválida: ${version}`);
    if (key.length !== 32) throw new Error(`La clave ${version} debe tener 32 bytes`);
    if (keys.has(version)) throw new Error(`Versión de clave duplicada: ${version}`);
    keys.set(version, key);
  }
  if (!keys.has(active)) throw new Error(`La clave activa ${active} no está en el juego de claves`);
  return { active, keys };
}

export function keyFor(ring: Keyring, version: string): Buffer {
  const key = ring.keys.get(version);
  if (!key) throw new Error(`Clave desconocida: ${version}`);
  return key;
}
