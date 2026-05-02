const SECRET_KEY_PATTERN =
  /(authorization|cookie|password|passwd|pwd|token|secret|credential|app_password|app_login)/i;
const MAX_STRING_LENGTH = 500;
const MAX_ARRAY_LENGTH = 25;
const MAX_DEPTH = 6;

export function redactAuditMetadata(value: unknown): unknown {
  return redact(value, 0);
}

function redact(value: unknown, depth: number): unknown {
  if (depth > MAX_DEPTH) return '[MaxDepth]';
  if (value === null || value === undefined) return value;

  if (typeof value === 'string') {
    return value.length > MAX_STRING_LENGTH
      ? `${value.slice(0, MAX_STRING_LENGTH)}...`
      : value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (value instanceof Date) return value.toISOString();

  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_ARRAY_LENGTH)
      .map((item) => redact(item, depth + 1));
  }

  if (typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(
      value as Record<string, unknown>,
    )) {
      output[key] = SECRET_KEY_PATTERN.test(key)
        ? '[REDACTED]'
        : redact(nested, depth + 1);
    }
    return output;
  }

  return '[Unsupported]';
}
