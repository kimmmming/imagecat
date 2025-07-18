import { HfInference } from '@huggingface/inference';

const hf = new HfInference(process.env.HUGGINGFACE_API_TOKEN);

export async function generateCartoonAvatar(imageBuffer: Buffer, style: string = 'cartoon') {
  try {
    // 尝试多个不同的模型，直到找到可用的
    const models = [
      'prompthero/openjourney-v4',
      'runwayml/stable-diffusion-v1-5', 
      'stabilityai/stable-diffusion-2-1',
      'dreamlike-art/dreamlike-anime-1.0'
    ];
    
    const prompt = `cute Q-version 3D cartoon cat avatar, kawaii style, big eyes, soft colors, chibi, adorable, simple background, ${style} style, high quality`;
    
    console.log('尝试Hugging Face API调用...');
    
    for (const model of models) {
      try {
        console.log(`尝试模型: ${model}`);
        
        const result = await hf.textToImage({
          model,
          inputs: prompt,
          parameters: {
            negative_prompt: 'ugly, blurry, low quality, distorted, nsfw, realistic, photographic',
            num_inference_steps: 20,
            guidance_scale: 9.0,
            width: 512,
            height: 512,
          },
        });

        console.log(`模型 ${model} 调用成功`);
        return result;
      } catch (modelError) {
        console.log(`模型 ${model} 失败，尝试下一个...`);
        continue;
      }
    }
    
    throw new Error('所有模型都失败了');
  } catch (error) {
    console.error('Hugging Face API错误:', error);
    throw new Error('图片生成失败');
  }
}

export async function textToImage(prompt: string) {
  try {
    const result = await hf.textToImage({
      model: 'runwayml/stable-diffusion-v1-5',
      inputs: prompt,
      parameters: {
        negative_prompt: 'ugly, blurry, low quality, distorted, nsfw',
        num_inference_steps: 20,
        guidance_scale: 7.5,
      },
    });

    return result;
  } catch (error) {
    console.error('Hugging Face文字生成图片错误:', error);
    throw new Error('图片生成失败');
  }
}