# 在线案例搜索系统 - Vercel 部署版本

这是一个基于 Next.js 的在线案例搜索系统，可以部署到 Vercel 平台。

## 功能特性

- 🔍 强大的搜索功能，支持多种筛选条件
- 📱 响应式设计，支持移动端和桌面端
- ⚡ 基于 Next.js 14 和 App Router
- 🎨 使用 Tailwind CSS 构建现代化 UI
- 🗄️ 直接连接 MongoDB 数据库
- 🚀 优化的 Vercel 部署配置

## 技术栈

- **前端框架**: Next.js 14 (App Router)
- **样式**: Tailwind CSS
- **数据库**: MongoDB
- **部署平台**: Vercel
- **语言**: TypeScript

## 本地开发

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 文件为 `.env.local`：

```bash
cp .env.example .env.local
```

编辑 `.env.local` 文件，配置你的 MongoDB 连接信息：

```env
MONGODB_URI=mongodb://your-mongodb-uri
MONGODB_DB=your_database_name
MONGODB_COLLECTION=your_collection_name
```

### 3. 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

## Vercel 部署

### 1. 准备部署

确保你的代码已推送到 Git 仓库（GitHub、GitLab 或 Bitbucket）。

### 2. 连接 Vercel

1. 访问 [Vercel](https://vercel.com)
2. 使用 GitHub/GitLab/Bitbucket 账号登录
3. 点击 "New Project"
4. 选择你的仓库
5. 选择 `vercel` 目录作为根目录

### 3. 配置环境变量

在 Vercel 项目设置中添加以下环境变量：

- `MONGODB_URI`: 你的 MongoDB 连接字符串
- `MONGODB_DB`: 数据库名称
- `MONGODB_COLLECTION`: 集合名称

### 4. 部署

点击 "Deploy" 按钮，Vercel 会自动构建和部署你的应用。

## 搜索功能

系统支持以下搜索条件：

- **日期范围**: 按开始日期和结束日期筛选
- **标题搜索**: 在案例标题中搜索关键词
- **组织名称**: 按特定组织筛选案例
- **最低罚款金额**: 设置罚款金额的最低阈值
- **通用关键词**: 在所有文本字段中搜索

## 数据库结构

系统期望 MongoDB 集合中的文档具有以下字段：

```typescript
{
  title: string,           // 标题
  org: string,            // 组织名称
  penalty_date: string,   // 处罚日期
  amount: number,         // 罚款金额
  event: string,          // 违法事实
  law: string,           // 法律依据
  penalty: string,       // 处罚决定
  province: string,      // 省份
  industry: string,      // 行业
  // ... 其他字段
}
```

## 项目结构

```
vercel/
├── src/
│   ├── app/
│   │   ├── api/search/route.ts    # 搜索 API 路由
│   │   ├── globals.css            # 全局样式
│   │   ├── layout.tsx             # 根布局
│   │   └── page.tsx               # 主页
│   ├── components/
│   │   ├── ui/                    # UI 组件
│   │   ├── search-form.tsx        # 搜索表单
│   │   └── search-results.tsx     # 搜索结果
│   ├── lib/
│   │   ├── mongodb.ts             # MongoDB 连接
│   │   └── utils.ts               # 工具函数
│   └── types/
│       └── index.ts               # TypeScript 类型定义
├── package.json
├── next.config.js
├── tailwind.config.js
└── tsconfig.json
```

## 性能优化

- 使用 Next.js App Router 进行服务端渲染
- MongoDB 查询优化和索引
- 分页加载减少数据传输
- Tailwind CSS 的 JIT 编译
- Vercel 的边缘网络加速

## 故障排除

### 常见问题

1. **MongoDB 连接失败**
   - 检查 `MONGODB_URI` 环境变量是否正确
   - 确保 MongoDB 服务正在运行
   - 检查网络连接和防火墙设置

2. **搜索结果为空**
   - 检查数据库和集合名称是否正确
   - 确认集合中有数据
   - 检查字段名称是否匹配

3. **部署失败**
   - 检查所有环境变量是否已设置
   - 确认代码没有语法错误
   - 查看 Vercel 部署日志

## 许可证

MIT License