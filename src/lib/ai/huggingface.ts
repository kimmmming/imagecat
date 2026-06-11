import { HfInference } from '@huggingface/inference';

const hf = new HfInference(process.env.HUGGINGFACE_API_TOKEN);

export async function generateCartoonAvatar(_imageBuffer: Buffer, style = 'cartoon') {
  if (!process.env.HUGGINGFACE_API_TOKEN) {
    throw new Error('HUGGINGFACE_API_TOKEN is not configured');
  }

  const models = [
    'prompthero/openjourney-v4',
    'runwayml/stable-diffusion-v1-5',
    'stabilityai/stable-diffusion-2-1',
    'dreamlike-art/dreamlike-anime-1.0',
  ];

  const prompt = `cute Q-version 3D cartoon cat avatar, kawaii style, big eyes, soft colors, chibi, adorable, simple background, ${style} style, high quality`;

  for (const model of models) {
    try {
      const result = await hf.textToImage({
        model,
        inputs: prompt,
        parameters: {
          negative_prompt: 'ugly, blurry, low quality, distorted, nsfw, realistic, photographic',
          num_inference_steps: 20,
          guidance_scale: 9,
          width: 512,
          height: 512,
        },
      });

      return result;
    } catch (modelError) {
      console.log(`Hugging Face model ${model} failed, trying next model:`, modelError);
    }
  }

  throw new Error('All Hugging Face models failed');
}

export async function textToImage(prompt: string) {
  if (!process.env.HUGGINGFACE_API_TOKEN) {
    throw new Error('HUGGINGFACE_API_TOKEN is not configured');
  }

  try {
    return await hf.textToImage({
      model: 'runwayml/stable-diffusion-v1-5',
      inputs: prompt,
      parameters: {
        negative_prompt: 'ugly, blurry, low quality, distorted, nsfw',
        num_inference_steps: 20,
        guidance_scale: 7.5,
      },
    });
  } catch (error) {
    console.error('Hugging Face text-to-image failed:', error);
    throw new Error('Image generation failed');
  }
}
