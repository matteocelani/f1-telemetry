// Checks whether every key in an object is a non-negative integer string (e.g. "0", "3", "12")
function hasOnlyNumericKeys(obj: Record<string, unknown>): boolean {
  for (const key of Object.keys(obj)) {
    if (!/^\d+$/.test(key)) return false;
  }
  return true;
}

// Deep-merges F1 delta payloads into accumulated state.
// Objects are recursively merged. Arrays receive index-level patches when F1
// sends sparse updates as `{ "0": ..., "3": ... }` instead of a full array.
export function deepMerge(target: unknown, source: unknown): unknown {
  if (source === null || source === undefined || typeof source !== 'object') {
    return source;
  }

  if (Array.isArray(source)) return source;

  const sourceObj = source as Record<string, unknown>;

  // F1 sends sparse array patches as objects with numeric keys.
  // When target is an array and source is `{ "2": { "Value": "29.789" } }`,
  // patch only the referenced indices and preserve the rest.
  if (Array.isArray(target) && hasOnlyNumericKeys(sourceObj)) {
    const cloned = [...target];
    for (const key of Object.keys(sourceObj)) {
      const idx = Number(key);
      cloned[idx] = deepMerge(cloned[idx], sourceObj[key]);
    }
    return cloned;
  }

  if (
    target === null ||
    target === undefined ||
    typeof target !== 'object' ||
    Array.isArray(target)
  ) {
    return source;
  }

  const result: Record<string, unknown> = {
    ...(target as Record<string, unknown>),
  };
  for (const key of Object.keys(sourceObj)) {
    result[key] = deepMerge(result[key], sourceObj[key]);
  }
  return result;
}
