import { readFile } from 'fs/promises';
import { join, resolve, sep } from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { submitAPIMartTask } from '@/lib/ai/apimart';
import { generateCartoonAvatar as generateHuggingFaceAvatar } from '@/lib/ai/huggingface';
import { toImageAsset, type ImageAsset } from '@/lib/ai/image-asset';
import { generateMockCartoonAvatar } from '@/lib/ai/mock-generator';
import { generateCartoonAvatar as generateSiliconCloudAvatar } from '@/lib/ai/siliconcloud';
import { db, isDatabaseConnected } from '@/lib/db';
import { generations } from '@/lib/db/schema';
import { persistGeneratedImage, updateGenerationStatus } from '@/lib/generations';

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

async function generateAvatarSync(imageBuffer: Buffer, style: string): Promise<ImageAsset> {
  try {
    const generatedImage = await generateSiliconCloudAvatar(imageBuffer, style);
    const imageAsset = await toImageAsset(generatedImage);
    console.log('SiliconCloud API succeeded');
    return imageAsset;
  } catch (siliconCloudError) {
    console.log('SiliconCloud API failed, trying Hugging Face:', siliconCloudError);
  }

  const generatedImage = await generateHuggingFaceAvatar(imageBuffer, style);
  const imageAsset = await toImageAsset(generatedImage);
  console.log('Hugging Face API succeeded');
  return imageAsset;
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

    if (process.env.MOCK_GENERATION === '1') {
      const imageAsset = await toImageAsset(await generateMockCartoonAvatar(imageBuffer, style));
      const generatedUrl = await persistGeneratedImage(generationId, imageAsset.buffer, imageAsset.mimeType);
      await updateGenerationStatus(generationId, { generatedImageUrl: generatedUrl, status: 'completed' });

      return NextResponse.json({
        id: generationId,
        originalUrl: imageUrl,
        generatedUrl,
        style,
        status: 'completed',
      });
    }

    try {
      console.log('Submitting APIMart task...');
      const taskId = await submitAPIMartTask(imageBuffer, imagePath, style);
      console.log('APIMart task submitted:', taskId);

      return NextResponse.json({
        id: generationId,
        originalUrl: imageUrl,
        taskId,
        style,
        status: 'processing',
      });
    } catch (apimartError) {
      console.log('APIMart submit failed, trying synchronous fallbacks:', apimartError);
    }

    const { buffer: finalImageBuffer, mimeType } = await withGenerationTimeout(
      generateAvatarSync(imageBuffer, style),
    );
    const generatedUrl = await persistGeneratedImage(generationId, finalImageBuffer, mimeType);

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
      { status: 502 },
    );
  }
}
