import sharp from 'sharp';

interface ImageFeatures {
  dominantColors: string[];
  brightness: 'bright' | 'dark' | 'medium';
  contrast: 'high' | 'low' | 'medium';
  furPattern: 'solid' | 'striped' | 'spotted' | 'mixed';
  eyeRegion: 'light' | 'dark' | 'medium';
}

export async function analyzeImageFeatures(imageBuffer: Buffer): Promise<ImageFeatures> {
  try {
    // 使用Sharp分析图像
    const image = sharp(imageBuffer);
    const { width, height } = await image.metadata();
    
    // 获取图像统计信息
    const stats = await image.stats();
    
    // 分析亮度
    const avgBrightness = stats.channels.reduce((sum, channel) => sum + channel.mean, 0) / stats.channels.length;
    const brightness = avgBrightness > 170 ? 'bright' : avgBrightness < 100 ? 'dark' : 'medium';
    
    // 分析对比度
    const avgStdDev = stats.channels.reduce((sum, channel) => sum + channel.stdev, 0) / stats.channels.length;
    const contrast = avgStdDev > 60 ? 'high' : avgStdDev < 30 ? 'low' : 'medium';
    
    // 简化的颜色分析
    const resizedImage = await image.resize(50, 50, { fit: 'cover' }).raw().toBuffer();
    const dominantColors = await analyzeDominantColors(resizedImage);
    
    // 估计毛发图案（基于方差和边缘检测）
    const furPattern = await estimateFurPattern(image);
    
    // 估计眼部区域（通常在图像上半部分）
    const eyeRegion = avgBrightness > 150 ? 'light' : avgBrightness < 120 ? 'dark' : 'medium';
    
    return {
      dominantColors,
      brightness,
      contrast,
      furPattern,
      eyeRegion
    };
  } catch (error) {
    console.error('Image analysis error:', error);
    // 返回默认值
    return {
      dominantColors: ['brown', 'white'],
      brightness: 'medium',
      contrast: 'medium',
      furPattern: 'solid',
      eyeRegion: 'medium'
    };
  }
}

async function analyzeDominantColors(rgbBuffer: Buffer): Promise<string[]> {
  const colors: { [key: string]: number } = {};
  
  // 简化的颜色分析
  for (let i = 0; i < rgbBuffer.length; i += 3) {
    const r = rgbBuffer[i];
    const g = rgbBuffer[i + 1];
    const b = rgbBuffer[i + 2];
    
    // 将RGB值分类为基本颜色
    const colorName = classifyColor(r, g, b);
    colors[colorName] = (colors[colorName] || 0) + 1;
  }
  
  // 返回最常见的颜色
  const sortedColors = Object.entries(colors)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([color]) => color);
  
  return sortedColors;
}

function classifyColor(r: number, g: number, b: number): string {
  // 灰度值
  const gray = (r + g + b) / 3;
  
  if (gray < 60) return 'black';
  if (gray > 200) return 'white';
  if (gray > 120 && gray < 180) return 'gray';
  
  // 主要颜色判断
  if (r > g && r > b) {
    if (r > 150 && g < 100 && b < 100) return 'red';
    if (r > 120 && g > 80 && b < 80) return 'orange';
    return 'brown';
  }
  if (g > r && g > b) return 'green';
  if (b > r && b > g) return 'blue';
  
  // 混合色
  if (r > 100 && g > 100 && b < 80) return 'yellow';
  if (r > 80 && g > 50 && b > 50) return 'brown';
  
  return 'gray';
}

async function estimateFurPattern(image: sharp.Sharp): Promise<'solid' | 'striped' | 'spotted' | 'mixed'> {
  try {
    // 使用边缘检测来估计图案
    const edges = await image
      .greyscale()
      .convolve({
        width: 3,
        height: 3,
        kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1]
      })
      .raw()
      .toBuffer();
    
    // 计算边缘密度
    let edgeCount = 0;
    for (let i = 0; i < edges.length; i++) {
      if (edges[i] > 50) edgeCount++;
    }
    
    const edgeDensity = edgeCount / edges.length;
    
    if (edgeDensity > 0.3) return 'striped';
    if (edgeDensity > 0.2) return 'spotted';
    if (edgeDensity > 0.1) return 'mixed';
    return 'solid';
  } catch (error) {
    return 'solid';
  }
}

export function generateFeatureBasedPrompt(features: ImageFeatures, baseStyle: string): string {
  const colorDescriptions: Record<string, string> = {
    'black': 'black fur',
    'white': 'white fur',
    'gray': 'gray fur',
    'brown': 'brown fur',
    'orange': 'orange tabby fur',
    'red': 'ginger fur',
    'yellow': 'cream colored fur',
    'blue': 'blue-gray fur',
    'green': 'unusual green-tinted fur'
  };
  
  const furPatterns = {
    'solid': 'solid colored fur',
    'striped': 'striped tabby pattern',
    'spotted': 'spotted pattern',
    'mixed': 'mixed fur patterns'
  };
  
  const eyeDescriptions = {
    'light': 'bright expressive eyes',
    'dark': 'deep dark eyes',
    'medium': 'warm colored eyes'
  };
  
  const brightnessMods = {
    'bright': 'well-lit, bright lighting',
    'dark': 'soft moody lighting',
    'medium': 'natural lighting'
  };
  
  // 构建特征描述
  const furColorDesc = features.dominantColors
    .map(color => colorDescriptions[color] || color)
    .join(' and ');
  
  const furPatternDesc = furPatterns[features.furPattern];
  const eyeDesc = eyeDescriptions[features.eyeRegion];
  const lightingDesc = brightnessMods[features.brightness];
  
  return `3D cartoon cat avatar, Pixar animation style, Disney 3D rendering, ${furColorDesc}, ${furPatternDesc}, ${eyeDesc}, cute round face, big expressive eyes, soft fur texture, vibrant colors, square composition, centered portrait, professional 3D modeling, ${baseStyle} style, high quality, adorable kawaii, chibi proportions, clean simple background, ${lightingDesc}`;
}