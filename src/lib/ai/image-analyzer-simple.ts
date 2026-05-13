interface ImageFeatures {
  dominantColors: string[];
  brightness: 'bright' | 'dark' | 'medium';
  contrast: 'high' | 'low' | 'medium';
  furPattern: 'solid' | 'striped' | 'spotted' | 'mixed';
  eyeRegion: 'light' | 'dark' | 'medium';
}

export async function analyzeImageFeaturesSimple(imageBuffer: Buffer): Promise<ImageFeatures> {
  const fileSize = imageBuffer.length;

  return {
    dominantColors: ['brown', 'white', 'gray'],
    brightness: fileSize > 500000 ? 'bright' : fileSize < 200000 ? 'dark' : 'medium',
    contrast: fileSize > 300000 ? 'high' : 'medium',
    furPattern: 'solid',
    eyeRegion: 'medium',
  };
}

export function generateFeatureBasedPrompt(features: ImageFeatures, baseStyle: string): string {
  const colorDescriptions: Record<string, string> = {
    black: 'black fur',
    white: 'white fur',
    gray: 'gray fur',
    brown: 'brown fur',
    orange: 'orange tabby fur',
    red: 'ginger fur',
    yellow: 'cream colored fur',
    blue: 'blue-gray fur',
    green: 'unusual green-tinted fur',
  };

  const furPatterns = {
    solid: 'solid colored fur',
    striped: 'striped tabby pattern',
    spotted: 'spotted pattern',
    mixed: 'mixed fur patterns',
  };

  const eyeDescriptions = {
    light: 'bright expressive eyes',
    dark: 'deep dark eyes',
    medium: 'warm colored eyes',
  };

  const brightnessMods = {
    bright: 'well-lit, bright lighting',
    dark: 'soft moody lighting',
    medium: 'natural lighting',
  };

  const furColorDesc = features.dominantColors
    .map((color) => colorDescriptions[color] || color)
    .join(' and ');

  return [
    '3D cartoon cat avatar',
    'Pixar animation style',
    furColorDesc,
    furPatterns[features.furPattern],
    eyeDescriptions[features.eyeRegion],
    'cute round face',
    'big expressive eyes',
    'soft fur texture',
    'square composition',
    'centered portrait',
    `${baseStyle} style`,
    brightnessMods[features.brightness],
    'high quality',
  ].join(', ');
}
