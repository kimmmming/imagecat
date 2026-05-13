import axios from 'axios';
import {
  analyzeImageFeaturesSimple as analyzeImageFeatures,
  generateFeatureBasedPrompt,
} from './image-analyzer-simple';

export async function generateCartoonAvatar(imageBuffer: Buffer, style = 'cartoon') {
  const apiKey = process.env.SILICONCLOUD_API_KEY;

  if (!apiKey) {
    throw new Error('SILICONCLOUD_API_KEY environment variable is not set');
  }

  try {
    const features = await analyzeImageFeatures(imageBuffer);
    const prompt = generateFeatureBasedPrompt(features, style);

    const response = await axios.post(
      'https://api.siliconflow.cn/v1/images/generations',
      {
        model: 'stabilityai/stable-diffusion-xl-base-1.0',
        prompt,
        negative_prompt:
          'ugly, blurry, low quality, distorted, nsfw, realistic, photographic, watermark, text, signature, cropped, stretched',
        image_size: '1024x1024',
        batch_size: 1,
        num_inference_steps: 25,
        guidance_scale: 8,
        seed: Math.floor(Math.random() * 1000000),
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 60000,
      },
    );

    const imageUrl = response.data?.data?.[0]?.url;
    if (!imageUrl) {
      throw new Error('SiliconCloud API 返回数据格式错误');
    }

    const imageResponse = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 30000,
    });

    return new Blob([imageResponse.data], { type: 'image/png' });
  } catch (error) {
    console.error('SiliconCloud API 错误:', error);
    throw new Error('图片生成失败');
  }
}

export async function textToImage(prompt: string) {
  return generateCartoonAvatar(Buffer.from(''), prompt);
}
