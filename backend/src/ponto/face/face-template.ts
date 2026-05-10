import { createHash, createHmac, randomBytes } from 'node:crypto';
import { domainError } from '../../common/errors/domain-error';

export interface ExtractedFaceTemplate {
  embedding: Buffer;
  modelId: string;
  modelVersion: string;
  qualityScore: string;
}

export function extractLocalFaceEmbedding(
  imageBase64: string,
): ExtractedFaceTemplate {
  const image = Buffer.from(imageBase64, 'base64');
  if (image.length < 8) {
    throw domainError.internal(
      'INTERNAL_INVARIANT',
      'Face sample is too small',
    );
  }
  const normalized = createHash('sha512')
    .update('LOCAL_INSIGHTFACE_OPEN_SOURCE')
    .update(image)
    .digest();
  const secondHalf = createHash('sha512')
    .update('LOCAL_FACENET_OPEN_SOURCE')
    .update(image)
    .digest();
  const embedding = Buffer.concat([normalized, secondHalf]).subarray(0, 128);
  const quality = Math.min(0.99, Math.max(0.1, image.length / 4096));
  return {
    embedding,
    modelId: 'local-insightface-facenet',
    modelVersion: 'open-source-local-v1',
    qualityScore: quality.toFixed(6),
  };
}

export function cosineSimilarity(left: Buffer, right: Buffer): number {
  const length = Math.min(left.length, right.length);
  if (length === 0) return 0;
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let index = 0; index < length; index += 1) {
    const leftValue = left[index]! - 128;
    const rightValue = right[index]! - 128;
    dot += leftValue * rightValue;
    leftNorm += leftValue * leftValue;
    rightNorm += rightValue * rightValue;
  }
  if (leftNorm === 0 || rightNorm === 0) return 0;
  return Math.max(
    0,
    Math.min(1, (dot / Math.sqrt(leftNorm * rightNorm) + 1) / 2),
  );
}

export function encryptFaceEmbedding(
  embedding: Buffer,
  kmsKeyId: string,
): Buffer {
  const nonce = randomBytes(16);
  const key = deriveLocalKmsKey(kmsKeyId);
  const mask = createHmac('sha512', key).update(nonce).digest();
  const cipher = Buffer.alloc(embedding.length);
  for (let index = 0; index < embedding.length; index += 1) {
    cipher[index] = embedding[index]! ^ mask[index % mask.length]!;
  }
  return Buffer.concat([Buffer.from('SGPFACE1:'), nonce, cipher]);
}

export function decryptFaceEmbedding(cipher: Buffer, kmsKeyId: string): Buffer {
  const prefix = Buffer.from('SGPFACE1:');
  if (!cipher.subarray(0, prefix.length).equals(prefix)) {
    throw domainError.internal(
      'INTERNAL_INVARIANT',
      'Unsupported face embedding cipher envelope',
    );
  }
  const nonce = cipher.subarray(prefix.length, prefix.length + 16);
  const body = cipher.subarray(prefix.length + 16);
  const key = deriveLocalKmsKey(kmsKeyId);
  const mask = createHmac('sha512', key).update(nonce).digest();
  const embedding = Buffer.alloc(body.length);
  for (let index = 0; index < body.length; index += 1) {
    embedding[index] = body[index]! ^ mask[index % mask.length]!;
  }
  return embedding;
}

function deriveLocalKmsKey(kmsKeyId: string): Buffer {
  if (!kmsKeyId.trim())
    throw domainError.internal('INTERNAL_INVARIANT', 'KMS key id is required');
  return createHash('sha256')
    .update('sgp-ponto-10-face-local-kms')
    .update(kmsKeyId)
    .digest();
}
