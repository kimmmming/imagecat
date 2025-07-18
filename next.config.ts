import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 支持图片域名
  images: {
    domains: ['sc-maas.oss-cn-shanghai.aliyuncs.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'sc-maas.oss-cn-shanghai.aliyuncs.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  
  // API路由配置
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
        ],
      },
    ];
  },
  
  // 优化构建
  experimental: {
    optimizePackageImports: [],
  },
};

export default nextConfig;
