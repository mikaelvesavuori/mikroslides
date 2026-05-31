export function createId(prefix = "id") {
  const random = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
  return `${prefix}_${random.replace(/-/g, "").slice(0, 16)}`;
}
