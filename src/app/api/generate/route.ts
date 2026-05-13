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

async function toImageBuffer(generatedImage: Blob | Buffer | string) {
  if (generatedImage instanceof Blob) {
    return Buffer.from(await generatedImage.arrayBuffer());
  }

  if (Buffer.isBuffer(generatedImage)) {
    return generatedImage;
  }

  if (generatedImage.startsWith('http')) {
    const imageResponse = await fetch(generatedImage);

    if (!imageResponse.ok) {
      throw new Error(`Generated image download failed: ${imageResponse.status}`);
    }

    return Buffer.from(await imageResponse.arrayBuffer());
  }

  if (generatedImage.startsWith('data:image')) {
    return Buffer.from(generatedImage.split(',')[1] || '', 'base64');
  }

  return Buffer.from(generatedImage, 'base64');
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
    let generatedImage: Blob | Buffer | string;

    try {
      console.log('Trying APIMart API...');
      generatedImage = await generateCartoonAvatarWithAPIMart(imageBuffer, imagePath, style);
      console.log('APIMart API succeeded');
    } catch (apimartError) {
      console.log('APIMart API failed, trying SiliconCloud:', apimartError);
      try {
        generatedImage = await generateSiliconCloudAvatar(imageBuffer, style);
        console.log('SiliconCloud API succeeded');
      } catch (siliconCloudError) {
        console.log('SiliconCloud API failed, trying Hugging Face:', siliconCloudError);
        try {
          generatedImage = await generateHuggingFaceAvatar(imageBuffer, style);
          console.log('Hugging Face API succeeded');
        } catch (huggingFaceError) {
          console.log('Hugging Face API failed, using local fallback:', huggingFaceError);
          try {
            generatedImage = await generateWithFallback(imageBuffer, style);
          } catch (fallbackError) {
            console.log('Local fallback failed, using final placeholder:', fallbackError);
            generatedImage = await generateMockCartoonAvatar(imageBuffer, style);
          }
        }
      }
    }

    const finalImageBuffer = await toImageBuffer(generatedImage);
    const isVercel = process.env.VERCEL === '1';
    const generatedFilename = `generated_${generationId}.png`;
    let generatedUrl: string;

    if (isVercel) {
      generatedUrl = `data:image/png;base64,${finalImageBuffer.toString('base64')}`;
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
