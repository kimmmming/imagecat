import { extname } from 'path';

const API_BASE_URL = process.env.APIMART_API_BASE_URL || 'https://api.apimart.ai';
const MODEL = process.env.APIMART_IMAGE_MODEL || 'gpt-image-2';
const DEFAULT_SIZE = process.env.APIMART_IMAGE_SIZE || '1:1';
const DEFAULT_RESOLUTION = process.env.APIMART_IMAGE_RESOLUTION || '1k';

function getImageMimeType(path: string) {
  const ext = extname(path).toLowerCase();

  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  return 'image/png';
}

function buildPrompt(style: string) {
  return [
    'Transform the reference cat photo into a polished square cartoon avatar for a social media profile picture.',
    'Preserve the cat identity: fur colors, face shape, eye color, markings, ear shape, and overall expression should remain recognizable.',
    'Create a cute 3D mascot-style portrait with rounded proportions, soft fur detail, big expressive eyes, clean lighting, and a simple warm background.',
    'Center the cat head and upper shoulders in the frame, with both ears visible and no important features cropped.',
    'Avoid text, watermark, extra animals, human features, distorted face, mismatched eyes, busy background, harsh shadows, and low quality rendering.',
    'Premium app icon quality, charming but not overly childish.',
    `Requested style: ${style}.`,
  ].join(' ');
}

async function parseApiResponse(response: Response) {
  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`APIMart returned non-JSON response: ${text.slice(0, 200)}`);
  }
}

function findImageValue(value: unknown): string | null {
  if (typeof value === 'string') {
    if (value.startsWith('http') || value.startsWith('data:image')) return value;
    if (value.length > 200 && /^[A-Za-z0-9+/=]+$/.test(value)) return value;
    return null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const imageValue = findImageValue(item);
      if (imageValue) return imageValue;
    }

    return null;
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const preferredKeys = ['url', 'image_url', 'b64_json', 'base64', 'data', 'images', 'output', 'result'];

    for (const key of preferredKeys) {
      const imageValue = findImageValue(record[key]);
      if (imageValue) return imageValue;
    }

    for (const item of Object.values(record)) {
      const imageValue = findImageValue(item);
      if (imageValue) return imageValue;
    }
  }

  return null;
}

function requireApiKey() {
  const apiKey = process.env.APIMART_API_KEY;

  if (!apiKey) {
    throw new Error('APIMART_API_KEY is not configured');
  }

  return apiKey;
}

export async function submitAPIMartTask(imageBuffer: Buffer, imagePath: string, style = 'cartoon') {
  const apiKey = requireApiKey();
  const mimeType = getImageMimeType(imagePath);
  const imageDataUrl = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;

  const submitResponse = await fetch(`${API_BASE_URL}/v1/images/generations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      prompt: buildPrompt(style),
      n: 1,
      size: DEFAULT_SIZE,
      resolution: DEFAULT_RESOLUTION,
      image_urls: [imageDataUrl],
    }),
  });

  const submitData = await parseApiResponse(submitResponse);

  if (!submitResponse.ok || submitData.error) {
    throw new Error(submitData.error?.message || `APIMart submit failed: ${submitResponse.status}`);
  }

  const taskId = submitData.data?.[0]?.task_id;

  if (!taskId) {
    throw new Error('APIMart submit response did not include task_id');
  }

  return String(taskId);
}

export type APIMartTaskState =
  | { status: 'processing' }
  | { status: 'completed'; image: string }
  | { status: 'failed'; error: string };

export async function getAPIMartTaskState(taskId: string): Promise<APIMartTaskState> {
  const apiKey = requireApiKey();

  const statusResponse = await fetch(`${API_BASE_URL}/v1/tasks/${encodeURIComponent(taskId)}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  const statusData = await parseApiResponse(statusResponse);

  if (!statusResponse.ok || statusData.error) {
    throw new Error(statusData.error?.message || `APIMart task query failed: ${statusResponse.status}`);
  }

  const task = statusData.data;

  if (task?.status === 'completed') {
    const image = findImageValue(task.result);

    if (!image) {
      return {
        status: 'failed',
        error: `APIMart completed task did not include image output: ${JSON.stringify(task.result).slice(0, 500)}`,
      };
    }

    return { status: 'completed', image };
  }

  if (task?.status === 'failed') {
    return { status: 'failed', error: task.error?.message || 'APIMart image generation failed' };
  }

  return { status: 'processing' };
}
