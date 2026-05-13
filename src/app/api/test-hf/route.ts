import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const token = process.env.HUGGINGFACE_API_TOKEN;

    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'API Token 未配置',
      });
    }

    if (!token.startsWith('hf_')) {
      return NextResponse.json({
        success: false,
        error: 'API Token 格式错误，应以 hf_ 开头',
        currentPrefix: token.substring(0, 4),
      });
    }

    const response = await fetch(
      'https://api-inference.huggingface.co/models/runwayml/stable-diffusion-v1-5',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: 'test',
        }),
      },
    );

    const result = await response.text();

    return NextResponse.json({
      success: true,
      message: 'API 连接测试完成',
      status: response.status,
      response: result.substring(0, 200),
    });
  } catch (error: unknown) {
    console.error('API 测试错误:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.toString() : String(error),
      },
      { status: 500 },
    );
  }
}
