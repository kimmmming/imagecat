import { mkdir, readFile, writeFile } from 'fs/promises';
import { join, resolve, sep } from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { generateCartoonAvatarWithAPIMart } from '@/lib/ai/apimart';
import { generateWithFallback } from '@/lib/ai/alternative';
import { generateCartoonAvatar as generateHuggingFaceAvatar } from '@/lib/ai/huggingface';
import { generateMockCartoonAvatar } from '@/lib/ai/mock-generator';
import { generateCartoonAvatar as generateSiliconCloudAvatar } from '@/lib/ai/siliconcloud';
import { db, isDatabaseConnected } from '@/lib/db';
import { generations } from '@/lib/db/schema';

export const maxDuration = 60;

const GENERATION_TIMEOUT_MS = Number(process.env.GENERATION_TIMEOUT_MS || 52000);

class GenerationTimeoutError extends Error {
  constructor() {
    super('Image generation timed out. Please try again later.');
    this.name = 'GenerationTimeoutError';
  }
}

function withGenerationTimeout<T>(promise: Promise<T>) {
  return new Promise<T>((resolvePromise, reject) => {
    const timer = setTimeout(() => reject(new GenerationTimeoutError()), GENERATION_TIMEOUT_MS);

    promise
      .then(resolvePromise)
      .catch(reject)
      .finally(() => clearTimeout(timer));
  });
}

function resolveInputImagePath(imageUrl: string) {
  if (imageUrl.startsWith('/tmp')) {
    const resolved = resolve(imageUrl);
    const tempRoot = resolve('/tmp');

    if (resolved !== tempRoot && resolved.startsWith(`${tempRoot}${sep}`)) {
      return resolved;
    }
  }

  if (imageUrl.startsWith('/uploads/')) {
    return join(process.cwd(), 'public', imageUrl);
  }

  throw new Error('Unsupported image path');
}

function loadDataImage(imageUrl: string) {
  const match = imageUrl.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/);

  if (!match) {
    throw new Error('Unsupported image data URL');
  }

  const mimeType = match[1];
  const extension = mimeType === 'image/jpeg' ? 'jpg' : mimeType.replace('image/', '');

  return {
    buffer: Buffer.from(match[2], 'base64'),
    imagePath: `upload.${extension}`,
  };
}

async function loadInputImage(imageUrl: string) {
  if (imageUrl.startsWith('data:image')) {
    return loadDataImage(imageUrl);
  }

  const imagePath = resolveInputImagePath(imageUrl);

  return {
    buffer: await readFile(imagePath),
    imagePath,
  };
}

async function updateGenerationStatus(
  id: string,
  values: Partial<typeof generations.$inferInsert>,
) {
  if (!isDatabaseConnected()) return;

  try {
    await db!.update(generations)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(generations.id, id));
  } catch (dbError) {
    console.warn('Database update failed, continuing:', dbError);
  }
}

function detectImageMimeType(buffer: Buffer) {
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

async function toImageAsset(generatedImage: Blob | Buffer | string) {
  if (generatedImage instanceof Blob) {
    const buffer = Buffer.from(await generatedImage.arrayBuffer());
    const mimeType = generatedImage.type.startsWith('image/') ? generatedImage.type : detectImageMimeType(buffer);

    if (!mimeType) {
      throw new Error('Generated blob is not a supported image');
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
    const mimeType = contentType?.startsWith('image/') ? contentType : detectImageMimeType(buffer);

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

async function generateAvatar(imageBuffer: Buffer, imagePath: string, style: string) {
  try {
    console.log('Trying APIMart API...');
    const generatedImage = await generateCartoonAvatarWithAPIMart(imageBuffer, imagePath, style);
    const imageAsset = await toImageAsset(generatedImage);
    console.log('APIMart API succeeded');
    return imageAsset;
  } catch (apimartError) {
    console.log('APIMart API failed, trying SiliconCloud:', apimartError);
  }

  try {
    const generatedImage = await generateSiliconCloudAvatar(imageBuffer, style);
    const imageAsset = await toImageAsset(generatedImage);
    console.log('SiliconCloud API succeeded');
    return imageAsset;
  } catch (siliconCloudError) {
    console.log('SiliconCloud API failed, trying Hugging Face:', siliconCloudError);
  }

  try {
    const generatedImage = await generateHuggingFaceAvatar(imageBuffer, style);
    const imageAsset = await toImageAsset(generatedImage);
    console.log('Hugging Face API succeeded');
    return imageAsset;
  } catch (huggingFaceError) {
    console.log('Hugging Face API failed, using local fallback:', huggingFaceError);
  }

  try {
    return await toImageAsset(await generateWithFallback(imageBuffer, style));
  } catch (fallbackError) {
    console.log('Local fallback failed, using final placeholder:', fallbackError);
    return toImageAsset(await generateMockCartoonAvatar(imageBuffer, style));
  }
}

export async function POST(request: NextRequest) {
  const generationId = uuidv4();

  try {
    const { imageUrl, style = 'cartoon' } = await request.json();

    if (!imageUrl || typeof imageUrl !== 'string') {
      return NextResponse.json({ error: 'Missing image URL' }, { status: 400 });
    }

    if (isDatabaseConnected()) {
      try {
        await db!.insert(generations).values({
          id: generationId,
          originalImageUrl: imageUrl,
          style,
          status: 'processing',
        });
      } catch (dbError) {
        console.warn('Database insert failed, continuing:', dbError);
      }
    }

    const { buffer: imageBuffer, imagePath } = await loadInputImage(imageUrl);
    const { buffer: finalImageBuffer, mimeType } = await withGenerationTimeout(generateAvatar(imageBuffer, imagePath, style));
    const isVercel = process.env.VERCEL === '1';
    const extension = mimeType === 'image/jpeg' ? 'jpg' : mimeType.replace('image/', '');
    const generatedFilename = `generated_${generationId}.${extension}`;
    let generatedUrl: string;

    if (isVercel) {
      generatedUrl = `data:${mimeType};base64,${finalImageBuffer.toString('base64')}`;
    } else {
      const generatedDir = join(process.cwd(), 'public', 'generated');
      const generatedPath = join(generatedDir, generatedFilename);
      await mkdir(generatedDir, { recursive: true });
      await writeFile(generatedPath, finalImageBuffer);
      generatedUrl = `/generated/${generatedFilename}`;
    }

    await updateGenerationStatus(generationId, {
      generatedImageUrl: generatedUrl,
      status: 'completed',
    });

    return NextResponse.json({
      id: generationId,
      originalUrl: imageUrl,
      generatedUrl,
      style,
      status: 'completed',
    });
  } catch (error) {
    console.error('Generate API error:', error);
    await updateGenerationStatus(generationId, { status: 'failed' });

    if (error instanceof GenerationTimeoutError) {
      return NextResponse.json(
        {
          error: 'Image generation is taking too long. Please try again in a moment.',
          id: generationId,
        },
        { status: 504 },
      );
    }

    return NextResponse.json(
      {
        error: 'Image generation failed, please try again later',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined,
        id: generationId,
      },
      { status: 500 },
    );
  }
}
