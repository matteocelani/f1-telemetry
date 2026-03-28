// Deep-merges F1 delta payloads into accumulated state. Arrays are replaced, objects are recursively merged.
export function deepMerge(target: unknown, source: unknown): unknown {
  if (
    source === null ||
    source === undefined ||
    typeof source !== 'object' ||
    Array.isArray(source)
  ) {
    return source;
  }

  if (
    target === null ||
    target === undefined ||
    typeof target !== 'object' ||
    Array.isArray(target)
  ) {
    return source;
  }

  const result: Record<string, unknown> = { ...(target as Record<string, unknown>) };
  for (const key of Object.keys(source as Record<string, unknown>)) {
    result[key] = deepMerge(
      result[key],
      (source as Record<string, unknown>)[key]
    );
  }
  return result;
}
