# Vercel 部署指南

## 🚀 部署步骤

### 1. 准备工作
确保您已经：
- 将项目推送到GitHub
- 拥有SiliconCloud API密钥
- 拥有Neon数据库连接字符串

### 2. 在Vercel上部署

#### 方法1：通过Vercel Dashboard
1. 访问 [vercel.com](https://vercel.com)
2. 使用GitHub账户登录
3. 点击 "New Project"
4. 选择 `kimmmming/imagecat` 仓库
5. 点击 "Deploy"

#### 方法2：使用Vercel CLI
```bash
npm i -g vercel
vercel login
vercel --prod
```

### 3. 配置环境变量

在Vercel Dashboard中的项目设置 > Environment Variables 添加：

#### 必需的环境变量：
```
SILICONCLOUD_API_KEY=your_siliconcloud_api_key_here
DATABASE_URL=your_neon_database_url_here
NEXTAUTH_URL=https://your-vercel-app-name.vercel.app
NEXTAUTH_SECRET=your_random_secret_string_here
```

#### 可选的备用环境变量：
```
HUGGINGFACE_API_TOKEN=your_huggingface_token_here
OPENAI_API_KEY=your_openai_key_here
BAIDU_API_KEY=your_baidu_api_key_here
BAIDU_SECRET_KEY=your_baidu_secret_key_here
```

### 4. 数据库迁移

部署后，您需要运行数据库迁移：

#### 选项1：本地运行迁移
```bash
npm run db:generate
npm run db:migrate
```

#### 选项2：使用Vercel CLI
```bash
vercel env pull .env.local
npm run db:migrate
```

### 5. 验证部署

部署完成后：
1. 访问您的Vercel应用URL
2. 测试文件上传功能
3. 测试图像生成功能
4. 检查API响应

## 🔧 常见问题解决

### 问题1：API超时
- 确保vercel.json中设置了正确的maxDuration（已配置为60秒）
- 检查SiliconCloud API响应时间

### 问题2：图片上传失败
- 确保上传目录权限正确
- 检查文件大小限制（默认5MB）

### 问题3：数据库连接失败
- 验证DATABASE_URL格式正确
- 确保Neon数据库在线且可访问

### 问题4：环境变量未生效
- 确保所有环境变量都已在Vercel Dashboard中设置
- 重新部署项目以应用新的环境变量

## 📝 性能优化建议

1. **启用缓存**：已在next.config.ts中配置图片优化
2. **API响应时间**：配置了60秒超时以适应AI生成时间
3. **错误处理**：实现了多层备用API系统

## 🔒 安全注意事项

- 永远不要在客户端代码中暴露API密钥
- 定期更新NEXTAUTH_SECRET
- 监控API使用量避免超出限制

## 📞 支持

如果遇到问题：
1. 检查Vercel Function Logs
2. 验证环境变量配置
3. 检查API服务状态