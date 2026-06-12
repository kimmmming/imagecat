export function detectImageMimeType(buffer: Buffer) {
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'image/png';
  }

  if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) {
    return 'image/jpeg';
  }

  if (
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }

  return null;
}

export interface ImageAsset {
  buffer: Buffer;
  mimeType: string;
}

export async function toImageAsset(generatedImage: Blob | Buffer | string): Promise<ImageAsset> {
  if (generatedImage instanceof Blob) {
    const buffer = Buffer.from(await generatedImage.arrayBuffer());
    const mimeType = detectImageMimeType(buffer);

    if (!mimeType) {
      throw new Error(`Generated blob is not a supported image: ${generatedImage.type || 'unknown content type'}`);
    }

    return { buffer, mimeType };
  }

  if (Buffer.isBuffer(generatedImage)) {
    const mimeType = detectImageMimeType(generatedImage);

    if (!mimeType) {
      throw new Error('Generated buffer is not a supported image');
    }

    return { buffer: generatedImage, mimeType };
  }

  if (generatedImage.startsWith('http')) {
    const imageResponse = await fetch(generatedImage);

    if (!imageResponse.ok) {
      throw new Error(`Generated image download failed: ${imageResponse.status}`);
    }

    const buffer = Buffer.from(await imageResponse.arrayBuffer());
    const contentType = imageResponse.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase();
    const mimeType = detectImageMimeType(buffer);

    if (!mimeType) {
      throw new Error(`Generated image URL returned non-image content: ${contentType || 'unknown content type'}`);
    }

    return { buffer, mimeType };
  }

  if (generatedImage.startsWith('data:image')) {
    const match = generatedImage.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/);

    if (!match) {
      throw new Error('Generated data URL is not a supported image');
    }

    const buffer = Buffer.from(match[2], 'base64');
    const mimeType = detectImageMimeType(buffer) || match[1];
    return { buffer, mimeType };
  }

  const buffer = Buffer.from(generatedImage, 'base64');
  const mimeType = detectImageMimeType(buffer);

  if (!mimeType) {
    throw new Error('Generated base64 payload is not a supported image');
  }

  return { buffer, mimeType };
}
