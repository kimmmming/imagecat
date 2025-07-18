// 使用OpenAI兼容的API服务
export async function generateCartoonWithOpenAI(imageBuffer: Buffer, style: string = 'cartoon') {
  try {
    // 将图片转换为base64
    const base64Image = imageBuffer.toString('base64');
    
    // 使用任何OpenAI兼容的服务
    const prompt = `Transform this cat photo into a cute cartoon Q-version 3D style avatar. Make it kawaii, adorable, with big eyes, soft colors, and simple background. Style: ${style}`;
    
    // 这里可以配置任何兼容OpenAI格式的API
    const apiUrl = process.env.OPENAI_COMPATIBLE_URL || 'https://api.openai.com/v1/images/generations';
    const apiKey = process.env.OPENAI_API_KEY || process.env.ALTERNATIVE_AI_KEY;
    
    if (!apiKey) {
      throw new Error('No AI API key configured');
    }
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: prompt,
        size: '1024x1024',
        quality: 'standard',
        n: 1,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    const result = await response.json();
    
    // 下载生成的图片
    const imageUrl = result.data[0].url;
    const imageResponse = await fetch(imageUrl);
    const arrayBuffer = await imageResponse.arrayBuffer();
    
    return new Blob([arrayBuffer], { type: 'image/png' });
    
  } catch (error) {
    console.error('OpenAI兼容API错误:', error);
    throw error;
  }
}