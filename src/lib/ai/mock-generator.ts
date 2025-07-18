// 模拟AI生成器，用于测试和开发
export async function generateMockCartoonAvatar(imageBuffer: Buffer, style: string = 'cartoon') {
  // 模拟API延迟
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 使用Sharp创建一个简单的占位符图片
  const sharp = require('sharp');
  
  try {
    // 创建一个400x400的渐变图片
    const mockImage = await sharp({
      create: {
        width: 400,
        height: 400,
        channels: 4,
        background: { r: 255, g: 107, b: 107, alpha: 1 }
      }
    })
    .png()
    .toBuffer();
    
    return new Blob([mockImage], { type: 'image/png' });
  } catch (error) {
    console.error('模拟生成器错误:', error);
    throw new Error('模拟生成失败');
  }
}