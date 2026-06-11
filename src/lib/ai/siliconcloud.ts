import {
  analyzeImageFeaturesSimple as analyzeImageFeatures,
  generateFeatureBasedPrompt,
} from './image-analyzer-simple';

function createTimeoutSignal(timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  return {
    signal: controller.signal,
    clear: () => clearTimeout(timer),
  };
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs: number) {
  const timeout = createTimeoutSignal(timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: timeout.signal,
    });
  } finally {
    timeout.clear();
  }
}

export async function generateCartoonAvatar(imageBuffer: Buffer, style = 'cartoon') {
  const apiKey = process.env.SILICONCLOUD_API_KEY;

  if (!apiKey) {
    throw new Error('SILICONCLOUD_API_KEY environment variable is not set');
  }

  try {
    const features = await analyzeImageFeatures(imageBuffer);
    const prompt = generateFeatureBasedPrompt(features, style);

    const response = await fetchWithTimeout(
      'https://api.siliconflow.cn/v1/images/generations',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'stabilityai/stable-diffusion-xl-base-1.0',
          prompt,
          negative_prompt:
            'ugly, blurry, low quality, distorted, nsfw, realistic, photographic, watermark, text, signature, cropped, stretched',
          image_size: '1024x1024',
          batch_size: 1,
          num_inference_steps: 25,
          guidance_scale: 8,
          seed: Math.floor(Math.random() * 1000000),
        }),
      },
      30000,
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.message || data?.error?.message || `SiliconCloud API failed: ${response.status}`);
    }

    const imageUrl = data?.data?.[0]?.url;
    if (!imageUrl) {
      throw new Error('SiliconCloud API returned an unexpected response shape');
    }

    const imageResponse = await fetchWithTimeout(imageUrl, {}, 15000);

    if (!imageResponse.ok) {
      throw new Error(`SiliconCloud image download failed: ${imageResponse.status}`);
    }

    return new Blob([await imageResponse.arrayBuffer()], { type: 'image/png' });
  } catch (error) {
    console.error('SiliconCloud API failed:', error);
    throw new Error('Image generation failed');
  }
}

export async function textToImage(prompt: string) {
  return generateCartoonAvatar(Buffer.from(''), prompt);
}
