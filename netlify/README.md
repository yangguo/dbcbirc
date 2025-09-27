# 在线案例搜索系统 - Netlify 部署版本

这是一个基于 Next.js 的在线案例搜索系统，可以部署到 Netlify 平台。

## 功能特性

- 🔍 **全文搜索** - 支持多字段搜索和关键词匹配
- 📅 **日期筛选** - 按发布日期范围过滤案例
- 🏢 **机构筛选** - 按监管机构名称筛选
- 💰 **金额筛选** - 按处罚金额范围筛选
- 📊 **分类筛选** - 按案例类别、行业、省份筛选
- 📱 **响应式设计** - 完美适配桌面和移动设备
- 🌓 **主题切换** - 支持明暗主题模式

## 技术栈

- **Next.js 15** - React 全栈框架
- **TypeScript** - 类型安全的 JavaScript
- **Tailwind CSS** - 实用程序优先的 CSS 框架
- **Radix UI** - 无障碍的 UI 组件库
- **MongoDB** - 文档数据库
- **React Hook Form** - 高性能表单库
- **Recharts** - 数据可视化图表库

## 本地开发

### 前置要求

- Node.js 18 或更高版本
- MongoDB 数据库（本地或云端）

### 安装依赖

```bash
npm install
```

### 环境配置

1. 复制环境变量模板：
```bash
cp .env.example .env.local
```

2. 编辑 `.env.local` 文件，填入你的配置：
```env
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=cbirc
MONGODB_COLLECTION=cases
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 启动开发服务器

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 查看应用。

## Netlify 部署

### 1. 准备部署

确保你的代码已推送到 Git 仓库（GitHub、GitLab 或 Bitbucket）。

### 2. 连接 Netlify

1. 访问 [Netlify](https://netlify.com)
2. 使用 GitHub/GitLab/Bitbucket 账号登录
3. 点击 "New site from Git"
4. 选择你的仓库
5. 选择 `netlify` 目录作为根目录

### 3. 配置构建设置

Netlify 会自动检测到 `netlify.toml` 配置文件，包含以下设置：

- **Build command**: `npm run build`
- **Publish directory**: `.next`
- **Functions directory**: `.netlify/functions`

### 4. 配置环境变量

在 Netlify 项目设置的 "Environment variables" 中添加：

- `MONGODB_URI`: 你的 MongoDB 连接字符串
- `MONGODB_DB`: 数据库名称
- `MONGODB_COLLECTION`: 集合名称
- `NEXT_PUBLIC_APP_URL`: 你的网站 URL

### 5. 部署

点击 "Deploy site" 开始部署。首次部署可能需要几分钟时间。

### 6. 自定义域名（可选）

在 Netlify 设置中配置自定义域名，并设置 SSL 证书。

## 搜索功能

### 支持的搜索字段

- **标题搜索** - 案例标题关键词
- **文号搜索** - 行政处罚决定书文号
- **当事人搜索** - 被处罚当事人名称
- **违法事实搜索** - 主要违法违规事实描述
- **法律依据搜索** - 行政处罚依据
- **处罚决定搜索** - 行政处罚决定内容
- **机构名称搜索** - 作出处罚决定的机关名称

### 筛选选项

- **日期范围** - 按发布日期筛选
- **行业分类** - 银行、保险、证券等
- **省份地区** - 按省份筛选案例
- **案件类别** - 按违规类型分类
- **处罚金额** - 设置最小金额阈值

### 搜索技巧

1. **关键词搜索** - 输入关键词在所有字段中搜索
2. **组合筛选** - 同时使用多个筛选条件
3. **模糊匹配** - 支持部分匹配和正则表达式
4. **分页加载** - 支持加载更多结果

## 数据库结构

### 案例文档结构

```javascript
{
  "_id": ObjectId,
  "标题": "案例标题",
  "发布日期": "2024-01-01",
  "行政处罚决定书文号": "文号",
  "被处罚当事人": "当事人名称",
  "主要违法违规事实": "违法事实描述",
  "行政处罚依据": "法律依据",
  "行政处罚决定": "处罚决定",
  "作出处罚决定的机关名称": "机关名称",
  "作出处罚决定的日期": "2024-01-01",
  "分类": "案件分类",
  "金额": 10000,
  "省份": "省份名称",
  "行业": "行业分类"
}
```

### 索引建议

为提高搜索性能，建议在以下字段创建索引：

```javascript
// 文本搜索索引
db.cases.createIndex({
  "标题": "text",
  "被处罚当事人": "text",
  "主要违法违规事实": "text",
  "行政处罚决定": "text"
});

// 筛选字段索引
db.cases.createIndex({ "发布日期": 1 });
db.cases.createIndex({ "省份": 1 });
db.cases.createIndex({ "行业": 1 });
db.cases.createIndex({ "金额": 1 });
```

## 项目结构

```
netlify/
├── src/
│   ├── app/
│   │   ├── api/search/route.ts    # 搜索 API 路由
│   │   ├── api/debug/route.ts     # 调试 API 路由
│   │   ├── globals.css            # 全局样式
│   │   ├── layout.tsx             # 根布局
│   │   └── page.tsx               # 主页
│   ├── components/
│   │   ├── ui/                    # UI 组件
│   │   ├── search-form.tsx        # 搜索表单
│   │   ├── search-results.tsx     # 搜索结果
│   │   └── theme-toggle.tsx       # 主题切换
│   ├── lib/
│   │   ├── mongodb.ts             # MongoDB 连接
│   │   └── utils.ts               # 工具函数
│   └── types/
│       └── index.ts               # TypeScript 类型定义
├── package.json
├── next.config.js
├── netlify.toml
├── tailwind.config.js
└── tsconfig.json
```

## 性能优化

### Netlify 特定优化

1. **边缘函数** - API 路由自动部署为 Netlify Functions
2. **CDN 缓存** - 静态资源通过全球 CDN 分发
3. **图片优化** - 自动压缩和格式转换
4. **预渲染** - 静态页面预生成
5. **增量构建** - 只重新构建变更的部分

### 数据库优化

1. **连接池** - 复用数据库连接
2. **查询优化** - 使用适当的索引
3. **分页查询** - 限制单次查询结果数量
4. **缓存策略** - 缓存常用查询结果

## 故障排除

### 常见问题

1. **数据库连接失败**
   - 检查 `MONGODB_URI` 环境变量
   - 确认数据库服务器可访问
   - 验证连接字符串格式

2. **搜索结果为空**
   - 检查集合名称是否正确
   - 验证数据库中是否有数据
   - 查看浏览器开发者工具的网络请求

3. **构建失败**
   - 检查 Node.js 版本兼容性
   - 清除缓存：`npm cache clean --force`
   - 重新安装依赖：`rm -rf node_modules && npm install`

4. **部署问题**
   - 检查 Netlify 构建日志
   - 验证环境变量设置
   - 确认 `netlify.toml` 配置正确

### 调试工具

访问 `/api/debug` 端点可以获取系统状态信息，包括：
- 数据库连接状态
- 集合统计信息
- 环境变量配置
- 示例文档结构

## 开发指南

### 添加新的搜索字段

1. 在 `src/types/index.ts` 中更新 `CaseSearchRequest` 接口
2. 在 `src/app/api/search/route.ts` 中添加查询逻辑
3. 在 `src/components/search-form.tsx` 中添加表单字段
4. 更新数据库索引以支持新字段搜索

### 自定义主题

修改 `tailwind.config.js` 中的颜色配置：

```javascript
theme: {
  extend: {
    colors: {
      // 自定义颜色
      primary: {
        DEFAULT: "hsl(your-color)",
        foreground: "hsl(your-foreground-color)",
      },
    },
  },
},
```

### 添加新的 API 端点

在 `src/app/api/` 目录下创建新的路由文件：

```typescript
// src/app/api/your-endpoint/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // 你的 API 逻辑
  return NextResponse.json({ message: 'Hello from API' })
}
```

## 许可证

本项目采用 MIT 许可证。

## 贡献

欢迎提交 Issue 和 Pull Request 来改进这个项目。

## 支持

如果你在使用过程中遇到问题，请：

1. 查看本文档的故障排除部分
2. 在 GitHub 上提交 Issue
3. 查看 Netlify 官方文档
4. 联系项目维护者