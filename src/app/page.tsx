'use client';

import { useState } from 'react';
import { UploadZone } from '@/components/ui/upload-zone';
import { GenerationResult } from '@/components/ui/generation-result';

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>('');
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationId, setGenerationId] = useState<string>('');

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('上传失败');
      }
      
      const result = await response.json();
      setUploadedImageUrl(result.url);
      
      // 自动开始生成
      handleGenerate(result.url);
      
    } catch (error) {
      console.error('上传错误:', error);
      alert('上传失败，请重试');
    } finally {
      setIsUploading(false);
    }
  };

  const handleGenerate = async (imageUrl?: string) => {
    const urlToUse = imageUrl || uploadedImageUrl;
    if (!urlToUse) return;
    
    setIsGenerating(true);
    setGeneratedImageUrl('');
    
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: urlToUse,
          style: 'cartoon',
        }),
      });
      
      if (!response.ok) {
        throw new Error('生成失败');
      }
      
      const result = await response.json();
      setGenerationId(result.id);
      setGeneratedImageUrl(result.generatedUrl);
      
    } catch (error) {
      console.error('生成错误:', error);
      alert('生成失败，请重试');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImageUrl) return;
    
    const link = document.createElement('a');
    link.href = generatedImageUrl;
    link.download = `cat-avatar-${generationId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRegenerate = () => {
    handleGenerate();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
      <div className="container mx-auto px-4 py-8">
        {/* 头部 */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-800 mb-4">
            🐱 猫咪头像生成器
          </h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
            上传你家猫咪的照片，AI将为你生成可爱的卡通头像
          </p>
        </div>

        {/* 主要内容 */}
        <div className="max-w-6xl mx-auto">
          {!uploadedImageUrl ? (
            // 上传区域
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <UploadZone 
                onFileSelect={handleFileSelect}
                isUploading={isUploading}
              />
            </div>
          ) : (
            // 结果展示
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <GenerationResult
                originalUrl={uploadedImageUrl}
                generatedUrl={generatedImageUrl}
                isGenerating={isGenerating}
                onRegenerate={handleRegenerate}
                onDownload={handleDownload}
              />
            </div>
          )}
        </div>

        {/* 功能介绍 */}
        <div className="mt-16 text-center">
          <h2 className="text-2xl font-semibold text-gray-800 mb-8">如何使用</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="bg-white rounded-xl p-6 shadow-md">
              <div className="text-3xl mb-4">📸</div>
              <h3 className="text-lg font-semibold mb-2">上传照片</h3>
              <p className="text-gray-600">选择一张清晰的猫咪照片</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-md">
              <div className="text-3xl mb-4">🤖</div>
              <h3 className="text-lg font-semibold mb-2">AI处理</h3>
              <p className="text-gray-600">AI自动生成卡通风格头像</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-md">
              <div className="text-3xl mb-4">💾</div>
              <h3 className="text-lg font-semibold mb-2">下载使用</h3>
              <p className="text-gray-600">下载高质量头像图片</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}