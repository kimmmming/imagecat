import { NextRequest, NextResponse } from 'next/server';
import { getAPIMartTaskState } from '@/lib/ai/apimart';
import { toImageAsset } from '@/lib/ai/image-asset';
import { persistGeneratedImage, updateGenerationStatus } from '@/lib/generations';

export const maxDuration = 30;

const GENERATION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const generationId = searchParams.get('id') || '';
  const taskId = searchParams.get('taskId') || '';

  if (!GENERATION_ID_PATTERN.test(generationId) || !taskId || taskId.length > 200) {
    return NextResponse.json({ error: 'Invalid generation id or task id' }, { status: 400 });
  }

  try {
    const taskState = await getAPIMartTaskState(taskId);

    if (taskState.status === 'processing') {
      return NextResponse.json({ id: generationId, status: 'processing' });
    }

    if (taskState.status === 'failed') {
      console.error('APIMart task failed:', taskState.error);
      await updateGenerationStatus(generationId, { status: 'failed' });

      return NextResponse.json({
        id: generationId,
        status: 'failed',
        error: 'Image generation failed, please try again later',
      });
    }

    const { buffer, mimeType } = await toImageAsset(taskState.image);
    const generatedUrl = await persistGeneratedImage(generationId, buffer, mimeType);

    await updateGenerationStatus(generationId, {
      generatedImageUrl: generatedUrl,
      status: 'completed',
    });

    return NextResponse.json({
      id: generationId,
      status: 'completed',
      generatedUrl,
    });
  } catch (error) {
    console.error('Generation status error:', error);

    return NextResponse.json(
      { error: 'Failed to check generation status, please retry', id: generationId },
      { status: 502 },
    );
  }
}
