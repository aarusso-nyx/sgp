import { createHash, createHmac, randomBytes } from 'node:crypto';

export type PontoBiometricKind = 'FINGERPRINT' | 'PALM_VEIN';

export interface ExtractedPontoBiometricTemplate {
  template: Buffer;
  qualityScore: string;
}

export function extractPontoBiometricTemplate(
  kind: PontoBiometricKind,
  sampleBase64: string,
): ExtractedPontoBiometricTemplate {
  const sample = Buffer.from(sampleBase64, 'base64');
  if (sample.length < 8) {
    throw new Error('Biometric sample is too small');
  }
  const normalized = createHash('sha512').update(kind).update(sample).digest();
  const quality = Math.min(0.99, Math.max(0.1, sample.length / 2048));
  return {
    template: normalized.subarray(0, kind === 'PALM_VEIN' ? 64 : 48),
    qualityScore: quality.toFixed(6),
  };
}

export function scorePontoBiometricTemplates(
  left: Buffer,
  right: Buffer,
): number {
  const length = Math.min(left.length, right.length);
  if (length === 0) return 0;
  let matchingBits = 0;
  for (let index = 0; index < length; index += 1) {
    matchingBits += 8 - bitCount(left[index] ^ right[index]);
  }
  return matchingBits / (length * 8);
}

export function encryptPontoTemplate(
  template: Buffer,
  kmsKeyId: string,
): Buffer {
  const nonce = randomBytes(16);
  const key = deriveLocalKmsKey(kmsKeyId);
  const mask = createHmac('sha512', key).update(nonce).digest();
  const cipher = Buffer.alloc(template.length);
  for (let index = 0; index < template.length; index += 1) {
    cipher[index] = template[index] ^ mask[index % mask.length];
  }
  return Buffer.concat([Buffer.from('SGPPONTOBIO1:'), nonce, cipher]);
}

export function decryptPontoTemplate(cipher: Buffer, kmsKeyId: string): Buffer {
  const prefix = Buffer.from('SGPPONTOBIO1:');
  if (!cipher.subarray(0, prefix.length).equals(prefix)) {
    throw new Error('Unsupported ponto biometric cipher envelope');
  }
  const nonce = cipher.subarray(prefix.length, prefix.length + 16);
  const body = cipher.subarray(prefix.length + 16);
  const key = deriveLocalKmsKey(kmsKeyId);
  const mask = createHmac('sha512', key).update(nonce).digest();
  const template = Buffer.alloc(body.length);
  for (let index = 0; index < body.length; index += 1) {
    template[index] = body[index] ^ mask[index % mask.length];
  }
  return template;
}

function deriveLocalKmsKey(kmsKeyId: string): Buffer {
  if (!kmsKeyId.trim()) throw new Error('KMS key id is required');
  return createHash('sha256')
    .update('sgp-ponto-08-local-kms')
    .update(kmsKeyId)
    .digest();
}

function bitCount(value: number): number {
  let count = 0;
  let remaining = value;
  while (remaining > 0) {
    count += remaining & 1;
    remaining >>= 1;
  }
  return count;
}
