import axios from 'axios';
// 使用不依赖Sharp的简化版本
import { analyzeImageFeaturesSimple as analyzeImageFeatures, generateFeatureBasedPrompt } from './image-analyzer-simple';

export async function generateCartoonAvatar(imageBuffer: Buffer, style: string = 'cartoon') {
  try {
    const apiKey = process.env.SILICONCLOUD_API_KEY;
    if (!apiKey) {
      throw new Error('SILICONCLOUD_API_KEY environment variable is not set');
    }

    console.log('分析原图特征...');
    const features = await analyzeImageFeatures(imageBuffer);
    console.log('提取的特征:', features);
    
    const prompt = generateFeatureBasedPrompt(features, style);
    console.log('生成的prompt:', prompt);
    
    console.log('尝试SiliconCloud API调用...');
    
    // SiliconCloud API调用
    const response = await axios.post(
      'https://api.siliconflow.cn/v1/images/generations',
      {
        model: 'stabilityai/stable-diffusion-xl-base-1.0',
        prompt: prompt,
        negative_prompt: 'ugly, blurry, low quality, distorted, nsfw, realistic, photographic, 2D flat art, anime, manga, watermark, text, signature, cropped, rectangular, elongated, stretched',
        image_size: '1024x1024',
        batch_size: 1,
        num_inference_steps: 25,
        guidance_scale: 8.0,
        seed: Math.floor(Math.random() * 1000000)
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 60000, // 60秒超时
      }
    );

    if (response.data && response.data.data && response.data.data.length > 0) {
      const imageUrl = response.data.data[0].url;
      
      // 下载生成的图片
      const imageResponse = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 30000
      });
      
      console.log('SiliconCloud API调用成功');
      console.log('图片下载完成，大小:', imageResponse.data.length, 'bytes');
      return new Blob([imageResponse.data], { type: 'image/png' });
    } else {
      throw new Error('SiliconCloud API返回数据格式错误');
    }
  } catch (error) {
    console.error('SiliconCloud API错误:', error);
    throw new Error('图片生成失败');
  }
}

export async function textToImage(prompt: string) {
  try {
    const apiKey = process.env.SILICONCLOUD_API_KEY;
    if (!apiKey) {
      throw new Error('SILICONCLOUD_API_KEY environment variable is not set');
    }

    const response = await axios.post(
      'https://api.siliconflow.cn/v1/images/generations',
      {
        model: 'stabilityai/stable-diffusion-xl-base-1.0',
        prompt: prompt,
        negative_prompt: 'ugly, blurry, low quality, distorted, nsfw, realistic, photographic, 2D flat art, anime, manga, watermark, text, signature, cropped, rectangular, elongated, stretched',
        image_size: '1024x1024',
        batch_size: 1,
        num_inference_steps: 25,
        guidance_scale: 8.0,
        seed: Math.floor(Math.random() * 1000000)
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 60000,
      }
    );

    if (response.data && response.data.data && response.data.data.length > 0) {
      const imageUrl = response.data.data[0].url;
      
      // 下载生成的图片
      const imageResponse = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 30000
      });
      
      return new Blob([imageResponse.data], { type: 'image/png' });
    } else {
      throw new Error('SiliconCloud API返回数据格式错误');
    }
  } catch (error) {
    console.error('SiliconCloud文字生成图片错误:', error);
    throw new Error('图片生成失败');
  }
}