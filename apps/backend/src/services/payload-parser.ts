import { inflateRawSync } from 'zlib';
import { Logger } from '@utils/logger';

// F1 compresses high-frequency channels (CarData.z, Position.z) with raw DEFLATE (no zlib wrapper)
export const decompressPayload = (base64Payload: string): unknown | null => {
  if (!base64Payload || typeof base64Payload !== 'string') return null;

  try {
    const decompressed = inflateRawSync(Buffer.from(base64Payload, 'base64'));
    return JSON.parse(decompressed.toString('utf-8'));
  } catch (err) {
    Logger.error('Failed to decompress payload', err);
    return null;
  }
};
