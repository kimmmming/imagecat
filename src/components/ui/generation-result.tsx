'use client';

import { useState } from 'react';
import { Download, RefreshCw, Heart } from 'lucide-react';

interface GenerationResultProps {
  originalUrl: string;
  generatedUrl?: string;
  isGenerating: boolean;
  onRegenerate: () => void;
  onDownload: () => void;
}

export function GenerationResult({ 
  originalUrl, 
  generatedUrl, 
  isGenerating, 
  onRegenerate, 
  onDownload 
}: GenerationResultProps) {
  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* 原图 */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-center">原图</h3>
          <div className="relative">
            <img 
              src={originalUrl} 
              alt="原始猫咪照片" 
              className="w-full h-64 object-cover rounded-lg border-2 border-gray-200"
            />
          </div>
        </div>

        {/* 生成结果 */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-center">
            卡通头像 {isGenerating && <span className="text-blue-500">(生成中...)</span>}
          </h3>
          <div className="relative">
            {isGenerating ? (
              <div className="w-full h-64 bg-gray-100 rounded-lg border-2 border-gray-200 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <p className="text-gray-600">AI正在生成你的卡通头像...</p>
                  <p className="text-sm text-gray-500 mt-2">这可能需要30-60秒</p>
                </div>
              </div>
            ) : generatedUrl ? (
              <img 
                src={generatedUrl} 
                alt="生成的卡通头像" 
                className="w-full h-64 object-cover rounded-lg border-2 border-gray-200"
              />
            ) : (
              <div className="w-full h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                <p className="text-gray-500">等待生成...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      {(generatedUrl || isGenerating) && (
        <div className="flex justify-center gap-4 mt-8">
          <button
            onClick={onRegenerate}
            disabled={isGenerating}
            className="flex items-center gap-2 px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw size={20} />
            重新生成
          </button>
          
          {generatedUrl && (
            <button
              onClick={onDownload}
              className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Download size={20} />
              下载头像
            </button>
          )}
        </div>
      )}

      {/* 风格选择器（未来功能） */}
      {generatedUrl && (
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 text-center flex items-center justify-center gap-2">
            <Heart size={16} className="text-red-500" />
            喜欢这个头像吗？更多风格选择即将推出！
          </p>
        </div>
      )}
    </div>
  );
}