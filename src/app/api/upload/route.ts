import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function POST(request: NextRequest) {
  try {
    const data = await request.formData();
    const file = data.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: '没有找到文件' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: '仅支持 JPG、PNG、WEBP 图片' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: '文件大小不能超过 5MB' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
    const filename = `${uuidv4()}.${extension}`;
    const isVercel = process.env.VERCEL === '1';
    const uploadDir = isVercel ? '/tmp' : join(process.cwd(), 'public', 'uploads');
    const filePath = join(uploadDir, filename);

    await mkdir(uploadDir, { recursive: true });
    await writeFile(filePath, buffer);

    return NextResponse.json({
      message: '文件上传成功',
      filename,
      url: isVercel ? filePath : `/uploads/${filename}`,
      size: file.size,
      type: file.type,
      isTemp: isVercel,
    });
  } catch (error) {
    console.error('上传错误:', error);
    return NextResponse.json(
      {
        error: '上传失败',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
