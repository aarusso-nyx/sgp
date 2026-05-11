import { createHash } from 'node:crypto';

import { UnprocessableEntityException } from '@nestjs/common';

export function competenceDate(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

export function dateText(value: Date | string): string {
  return value instanceof Date
    ? value.toISOString().slice(0, 10)
    : String(value).slice(0, 10);
}

export function moneyText(value: unknown): string {
  const normalized = scalarText(value, '0').replace(',', '.');
  const number = Number(normalized);
  if (!Number.isFinite(number) || number < 0) {
    throw new UnprocessableEntityException(
      'DCTFWeb monetary values must be non-negative',
    );
  }
  return number.toFixed(2);
}

export function uuidText(value: unknown, fallbackSeed: string): string {
  const text = scalarText(value, '');
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    text,
  )
    ? text
    : hashToUuid(fallbackSeed);
}

export function scalarText(value: unknown, fallback: string): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return fallback;
}

export function hashToUuid(seed: string): string {
  const hex = createHash('sha256').update(seed).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

export function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function xmlUnescape(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
}

export function childText(node: string, name: string): string | null {
  const value = node
    .match(new RegExp(`<(?:[A-Za-z0-9_]+:)?${name}\\b[^>]*>([^<]+)<`, 'i'))?.[1]
    ?.trim();
  return value || null;
}
