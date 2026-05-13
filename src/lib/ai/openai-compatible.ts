export async function generateCartoonWithOpenAI(_imageBuffer: Buffer, style = 'cartoon') {
  const apiUrl = process.env.OPENAI_COMPATIBLE_URL || 'https://api.openai.com/v1/images/generations';
  const apiKey = process.env.OPENAI_API_KEY || process.env.ALTERNATIVE_AI_KEY;

  if (!apiKey) {
    throw new Error('No AI API key configured');
  }

  const prompt = `Transform this cat photo into a cute cartoon Q-version 3D style avatar. Make it kawaii, adorable, with big eyes, soft colors, and simple background. Style: ${style}`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt,
      size: '1024x1024',
      quality: 'standard',
      n: 1,
    }),
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  const result = await response.json();
  const imageUrl = result.data?.[0]?.url;

  if (!imageUrl) {
    throw new Error('OpenAI compatible API returned no image URL');
  }

  const imageResponse = await fetch(imageUrl);
  const arrayBuffer = await imageResponse.arrayBuffer();

  return new Blob([arrayBuffer], { type: 'image/png' });
}
