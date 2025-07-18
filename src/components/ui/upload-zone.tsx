'use client';

import { useState, useCallback } from 'react';
import { Upload, X, Image } from 'lucide-react';

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  uploadedImageUrl?: string;
  isUploading?: boolean;
}

export function UploadZone({ onFileSelect, uploadedImageUrl, isUploading }: UploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
      onFileSelect(imageFile);
    }
  }, [onFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  }, [onFileSelect]);

  if (uploadedImageUrl) {
    return (
      <div className="relative w-full max-w-md mx-auto">
        <img 
          src={uploadedImageUrl} 
          alt="上传的猫咪照片" 
          className="w-full h-64 object-cover rounded-lg border-2 border-gray-200"
        />
        <button
          onClick={() => window.location.reload()}
          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`
        relative w-full max-w-md mx-auto h-64 border-2 border-dashed rounded-lg 
        transition-all duration-200 cursor-pointer hover:border-blue-400
        ${isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
        ${isUploading ? 'opacity-50 pointer-events-none' : ''}
      `}
    >
      <input
        type="file"
        accept="image/*"
        onChange={handleFileInput}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        disabled={isUploading}
      />
      
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        {isUploading ? (
          <>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-600">上传中...</p>
          </>
        ) : (
          <>
            {isDragOver ? (
              <Image className="w-12 h-12 text-blue-500 mb-4" />
            ) : (
              <Upload className="w-12 h-12 text-gray-400 mb-4" />
            )}
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              上传猫咪照片
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              拖拽图片到这里，或点击选择文件
            </p>
            <p className="text-xs text-gray-400">
              支持 JPG、PNG、WEBP 格式，文件大小不超过 5MB
            </p>
          </>
        )}
      </div>
    </div>
  );
}