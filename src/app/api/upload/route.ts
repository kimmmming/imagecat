import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const data = await request.formData();
    const file: File | null = data.get('file') as unknown as File;

    if (!file) {
      return NextResponse.json({ error: '没有找到文件' }, { status: 400 });
    }

    // 验证文件类型
    if (!file.type.includes('image')) {
      return NextResponse.json({ error: '文件类型必须是图片' }, { status: 400 });
    }

    // 验证文件大小 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: '文件大小不能超过5MB' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 生成唯一文件名
    const filename = `${uuidv4()}.${file.name.split('.').pop()}`;
    const uploadDir = join(process.cwd(), 'public', 'uploads');
    
    // 确保上传目录存在
    try {
      await writeFile(join(uploadDir, filename), buffer);
    } catch (error) {
      // 如果目录不存在，创建目录
      const { mkdir } = await import('fs/promises');
      await mkdir(uploadDir, { recursive: true });
      await writeFile(join(uploadDir, filename), buffer);
    }

    const fileUrl = `/uploads/${filename}`;

    return NextResponse.json({ 
      message: '文件上传成功',
      filename,
      url: fileUrl,
      size: file.size,
      type: file.type
    });

  } catch (error) {
    console.error('上传错误:', error);
    return NextResponse.json({ error: '上传失败' }, { status: 500 });
  }
}