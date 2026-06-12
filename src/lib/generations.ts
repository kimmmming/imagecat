import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { eq } from 'drizzle-orm';
import { db, isDatabaseConnected } from '@/lib/db';
import { generations } from '@/lib/db/schema';

export async function updateGenerationStatus(
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

export async function persistGeneratedImage(generationId: string, buffer: Buffer, mimeType: string) {
  if (process.env.VERCEL === '1') {
    return `data:${mimeType};base64,${buffer.toString('base64')}`;
  }

  const extension = mimeType === 'image/jpeg' ? 'jpg' : mimeType.replace('image/', '');
  const generatedFilename = `generated_${generationId}.${extension}`;
  const generatedDir = join(process.cwd(), 'public', 'generated');

  await mkdir(generatedDir, { recursive: true });
  await writeFile(join(generatedDir, generatedFilename), buffer);

  return `/generated/${generatedFilename}`;
}
