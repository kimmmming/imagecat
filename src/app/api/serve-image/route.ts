import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');
    
    if (!path) {
      return NextResponse.json({ error: '缺少文件路径' }, { status: 400 });
    }

    // 安全检查：确保路径不包含危险字符
    if (path.includes('..') || !path.startsWith('/')) {
      return NextResponse.json({ error: '非法文件路径' }, { status: 400 });
    }

    // 检查文件是否存在
    if (!existsSync(path)) {
      return NextResponse.json({ error: '文件不存在' }, { status: 404 });
    }

    // 读取文件
    const buffer = await readFile(path);
    
    // 根据文件扩展名设置Content-Type
    const ext = path.split('.').pop()?.toLowerCase();
    let contentType = 'application/octet-stream';
    
    switch (ext) {
      case 'png':
        contentType = 'image/png';
        break;
      case 'jpg':
      case 'jpeg':
        contentType = 'image/jpeg';
        break;
      case 'gif':
        contentType = 'image/gif';
        break;
      case 'webp':
        contentType = 'image/webp';
        break;
    }

    return new Response(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000',
      },
    });

  } catch (error) {
    console.error('文件服务错误:', error);
    return NextResponse.json({ error: '文件读取失败' }, { status: 500 });
  }
}