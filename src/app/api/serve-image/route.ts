import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { resolve, sep } from 'path';
import { NextRequest, NextResponse } from 'next/server';

function isAllowedTempPath(path: string) {
  const resolved = resolve(path);
  const tempRoot = resolve('/tmp');
  return resolved === tempRoot || resolved.startsWith(`${tempRoot}${sep}`);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');

    if (!path) {
      return NextResponse.json({ error: '缺少文件路径' }, { status: 400 });
    }

    if (!isAllowedTempPath(path)) {
      return NextResponse.json({ error: '非法文件路径' }, { status: 400 });
    }

    if (!existsSync(path)) {
      return NextResponse.json({ error: '文件不存在' }, { status: 404 });
    }

    const buffer = await readFile(path);
    const ext = path.split('.').pop()?.toLowerCase();
    const contentType =
      ext === 'png'
        ? 'image/png'
        : ext === 'jpg' || ext === 'jpeg'
          ? 'image/jpeg'
          : ext === 'webp'
            ? 'image/webp'
            : 'application/octet-stream';

    return new Response(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('文件服务错误:', error);
    return NextResponse.json({ error: '文件读取失败' }, { status: 500 });
  }
}
