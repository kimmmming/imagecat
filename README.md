# 🐱 猫咪卡通头像生成器

一个基于Next.js和AI技术的Web应用，能够将真实猫咪照片转换为可爱的卡通风格头像。

## ✨ 功能特点

- 📸 **简单上传**：支持拖拽或点击上传猫咪照片
- 🤖 **AI生成**：使用Hugging Face AI模型生成卡通风格头像  
- 💾 **一键下载**：高质量PNG格式头像下载
- 📱 **响应式设计**：完美支持手机和桌面端
- 🚀 **快速响应**：优化的用户体验和加载速度

## 🛠 技术栈

- **前端框架**：Next.js 14 (App Router)
- **样式**：Tailwind CSS
- **AI服务**：Hugging Face Inference API
- **数据库**：Neon PostgreSQL
- **ORM**：Drizzle
- **部署**：Vercel

## 🚀 快速开始

### 环境要求

- Node.js 18+
- npm 或 yarn

### 安装步骤

1. **克隆项目**
   ```bash
   git clone <your-repo-url>
   cd cat-avatar-generator
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **环境配置**
   
   复制 `.env.local` 文件并填入以下配置：
   
   ```env
   # Hugging Face API配置
   HUGGINGFACE_API_TOKEN=your_huggingface_token_here
   
   # Neon数据库配置  
   DATABASE_URL=your_neon_database_url_here
   
   # Next.js配置
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your_secret_here
   ```

4. **获取API密钥**

   **Hugging Face API Token:**
   - 访问 [Hugging Face](https://huggingface.co/)
   - 注册/登录账户
   - 进入 [Access Tokens](https://huggingface.co/settings/tokens) 页面
   - 创建新的 API Token
   - 将Token填入 `HUGGINGFACE_API_TOKEN`

   **Neon数据库:**
   - 访问 [Neon](https://neon.com/)
   - 创建免费账户
   - 创建新的数据库项目
   - 复制连接字符串到 `DATABASE_URL`

5. **数据库迁移**
   ```bash
   npm run db:generate
   npm run db:migrate
   ```

6. **启动开发服务器**
   ```bash
   npm run dev
   ```

   访问 [http://localhost:3000](http://localhost:3000)

## 📖 使用指南

1. **上传照片**：点击或拖拽上传猫咪照片（支持JPG、PNG、WEBP格式，最大5MB）
2. **等待生成**：AI会自动处理照片并生成卡通头像（约30-60秒）
3. **下载头像**：生成完成后点击下载按钮保存头像

## 🔧 API接口

### 上传图片
```
POST /api/upload
Content-Type: multipart/form-data

Body: { file: File }
```

### 生成头像
```
POST /api/generate
Content-Type: application/json

Body: { 
  imageUrl: string,
  style: string (默认: "cartoon")
}
```

## 📁 项目结构

```
cat-avatar-generator/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/            # API路由
│   │   │   ├── upload/     # 文件上传
│   │   │   └── generate/   # 头像生成
│   │   ├── page.tsx        # 主页
│   │   └── layout.tsx      # 布局
│   ├── components/         # React组件
│   │   └── ui/            # UI组件
│   └── lib/               # 工具库
│       ├── ai/            # AI集成
│       └── db/            # 数据库
├── public/                # 静态文件
│   ├── uploads/          # 上传的原图
│   └── generated/        # 生成的头像
└── drizzle/              # 数据库迁移文件
```

## 💰 成本预估

### 免费额度
- **Hugging Face**：每月1000次免费API调用
- **Neon数据库**：3GB免费存储空间
- **Vercel部署**：免费的Hobby计划

### 付费升级
- Hugging Face Pro：$9/月，更高的API限制
- Neon Pro：$19/月，更大存储和性能
- Vercel Pro：$20/月，更好的性能和分析

## 🔄 未来功能

- [ ] 多种卡通风格选择
- [ ] 用户账户系统
- [ ] 历史记录管理
- [ ] 批量处理功能
- [ ] 社交分享功能
- [ ] 高级图片编辑工具

## 🐛 问题排查

### 常见问题

1. **上传失败**
   - 检查文件格式是否为图片
   - 确认文件大小不超过5MB
   - 检查网络连接

2. **生成失败**
   - 验证Hugging Face API Token是否正确
   - 检查API调用限制是否用完
   - 查看控制台错误信息

3. **数据库连接失败**
   - 确认Neon数据库URL格式正确
   - 检查数据库是否运行中
   - 验证网络访问权限

## 🤝 贡献

欢迎提交Pull Request和Issue！

## 📄 许可证

MIT License

## 📞 联系方式

如有问题或建议，请创建Issue或联系开发者。