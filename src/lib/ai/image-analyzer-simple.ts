// 不依赖Sharp的简化版图像分析器
interface ImageFeatures {
  dominantColors: string[];
  brightness: 'bright' | 'dark' | 'medium';
  contrast: 'high' | 'low' | 'medium';
  furPattern: 'solid' | 'striped' | 'spotted' | 'mixed';
  eyeRegion: 'light' | 'dark' | 'medium';
}

export async function analyzeImageFeaturesSimple(imageBuffer: Buffer): Promise<ImageFeatures> {
  try {
    // 简化的特征分析，基于文件大小和基本属性
    const fileSize = imageBuffer.length;
    
    // 基于文件大小的简单推断
    const brightness = fileSize > 500000 ? 'bright' : fileSize < 200000 ? 'dark' : 'medium';
    const contrast = fileSize > 300000 ? 'high' : 'medium';
    
    // 默认的猫咪特征
    return {
      dominantColors: ['brown', 'white', 'gray'],
      brightness,
      contrast,
      furPattern: 'solid',
      eyeRegion: 'medium'
    };
  } catch (error) {
    console.error('Simple image analysis error:', error);
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

export function generateFeatureBasedPrompt(features: ImageFeatures, baseStyle: string): string {
  const colorDescriptions = {
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
    .map(color => colorDescriptions[color as keyof typeof colorDescriptions] || color)
    .join(' and ');
  
  const furPatternDesc = furPatterns[features.furPattern];
  const eyeDesc = eyeDescriptions[features.eyeRegion];
  const lightingDesc = brightnessMods[features.brightness];
  
  return `3D cartoon cat avatar, Pixar animation style, Disney 3D rendering, ${furColorDesc}, ${furPatternDesc}, ${eyeDesc}, cute round face, big expressive eyes, soft fur texture, vibrant colors, square composition, centered portrait, professional 3D modeling, ${baseStyle} style, high quality, adorable kawaii, chibi proportions, clean simple background, ${lightingDesc}`;
}