import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { generateCartoonAvatar as generateSiliconCloudAvatar } from '@/lib/ai/siliconcloud';
import { generateCartoonAvatar as generateHuggingFaceAvatar } from '@/lib/ai/huggingface';
import { generateMockCartoonAvatar } from '@/lib/ai/mock-generator';
import { generateWithFallback } from '@/lib/ai/alternative';
import { db } from '@/lib/db';
import { generations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const { imageUrl, style = 'cartoon' } = await request.json();

    if (!imageUrl) {
      return NextResponse.json({ error: '缺少图片URL' }, { status: 400 });
    }

    // 生成唯一ID
    const generationId = uuidv4();

    // 在数据库中创建记录（如果数据库可用）
    if (db) {
      await db.insert(generations).values({
        id: generationId,
        originalImageUrl: imageUrl,
        style,
        status: 'processing',
      });
    }

    try {
      // 读取原图片文件
      const imagePath = join(process.cwd(), 'public', imageUrl);
      const imageBuffer = await readFile(imagePath);

      // 调用AI生成卡通头像（多级备用方案）
      let generatedImage;
      try {
        console.log('尝试SiliconCloud API...');
        generatedImage = await generateSiliconCloudAvatar(imageBuffer, style);
        console.log('SiliconCloud API成功');
      } catch (aiError) {
        console.log('SiliconCloud API失败，尝试Hugging Face API备用方案');
        try {
          generatedImage = await generateHuggingFaceAvatar(imageBuffer, style);
          console.log('Hugging Face API备用方案成功');
        } catch (hfError) {
          console.log('Hugging Face API失败，使用图像处理备用方案');
          try {
            generatedImage = await generateWithFallback(imageBuffer, style);
            console.log('图像处理备用方案成功');
          } catch (fallbackError) {
            console.log('图像处理失败，使用最终备用方案');
            generatedImage = await generateMockCartoonAvatar(imageBuffer, style);
          }
        }
      }

      // 将生成的图片保存到本地
      const generatedFilename = `generated_${generationId}.png`;
      const generatedPath = join(process.cwd(), 'public', 'generated', generatedFilename);
      
      console.log('准备保存图片到:', generatedPath);
      
      // 确保生成目录存在
      try {
        const imageBuffer = generatedImage instanceof Blob 
          ? Buffer.from(await generatedImage.arrayBuffer())
          : Buffer.from(generatedImage);
        console.log('图片buffer大小:', imageBuffer.length, 'bytes');
        await writeFile(generatedPath, imageBuffer);
        console.log('图片保存成功:', generatedPath);
      } catch (error) {
        console.log('目录不存在，创建目录...');
        const { mkdir } = await import('fs/promises');
        await mkdir(join(process.cwd(), 'public', 'generated'), { recursive: true });
        const imageBuffer = generatedImage instanceof Blob 
          ? Buffer.from(await generatedImage.arrayBuffer())
          : Buffer.from(generatedImage);
        await writeFile(generatedPath, imageBuffer);
        console.log('图片保存成功 (新建目录):', generatedPath);
      }

      const generatedUrl = `/generated/${generatedFilename}`;

      // 更新数据库记录（如果数据库可用）
      if (db) {
        await db.update(generations)
          .set({
            generatedImageUrl: generatedUrl,
            status: 'completed',
            updatedAt: new Date(),
          })
          .where(eq(generations.id, generationId));
      }

      return NextResponse.json({
        id: generationId,
        originalUrl: imageUrl,
        generatedUrl,
        style,
        status: 'completed'
      });

    } catch (aiError) {
      console.error('AI生成错误:', aiError);
      
      // 更新数据库记录为失败状态（如果数据库可用）
      if (db) {
        await db.update(generations)
          .set({
            status: 'failed',
            updatedAt: new Date(),
          })
          .where(eq(generations.id, generationId));
      }

      return NextResponse.json({ 
        error: '图片生成失败，请稍后重试',
        id: generationId 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('生成API错误:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}