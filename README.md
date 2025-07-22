# CBIRC 监管处罚分析系统 - Next.js Frontend

一个现代化的 Next.js 前端应用，用于替代原有的 Streamlit 界面，提供更好的用户体验和视觉设计。

## 🚀 特性

- **现代化设计**: 使用 Tailwind CSS 构建的响应式界面
- **组件化架构**: 模块化的 React 组件设计
- **流畅动画**: 平滑的页面切换和交互动画
- **数据可视化**: 集成图表和统计展示
- **移动端适配**: 完全响应式设计，支持各种设备

## 🛠️ 技术栈

- **Next.js 14** - React 框架
- **TypeScript** - 类型安全
- **Tailwind CSS** - 样式框架
- **Heroicons** - 图标库
- **Recharts** - 数据可视化
- **Axios** - HTTP 客户端

## 📦 安装和运行

### 安装依赖
```bash
npm install
```

### 开发模式
```bash
npm run dev
```

### 构建生产版本
```bash
npm run build
npm start
```

## 🏗️ 项目结构

```
├── app/
│   ├── components/          # React 组件
│   │   ├── Header.tsx      # 页面头部
│   │   ├── Sidebar.tsx     # 侧边栏导航
│   │   ├── Dashboard.tsx   # 仪表板
│   │   ├── CaseSearch.tsx  # 案例搜索
│   │   ├── CaseUpdate.tsx  # 案例更新
│   │   ├── CaseDownload.tsx # 案例下载
│   │   ├── CaseClassification.tsx # 案例分类
│   │   └── CaseUpload.tsx  # 案例上线
│   ├── globals.css         # 全局样式
│   ├── layout.tsx          # 根布局
│   └── page.tsx           # 主页面
├── public/                 # 静态资源
├── package.json           # 项目配置
├── tailwind.config.js     # Tailwind 配置
├── next.config.js         # Next.js 配置
└── README.md             # 项目文档
```

## 🎨 界面特性

### 仪表板 (Dashboard)
- 数据统计卡片
- 快速操作面板
- 系统状态概览
- 最近活动记录

### 案例搜索 (Case Search)
- 多条件搜索表单
- 实时搜索结果
- 数据导出功能
- 高级筛选选项

### 案例更新 (Case Update)
- 批量数据更新
- 进度实时显示
- 自动更新设置
- 更新结果反馈

### 案例下载 (Case Download)
- 多格式导出 (CSV, Excel, JSON)
- 自定义日期范围
- 机构选择
- 下载历史记录

### 案例分类 (Case Classification)
- AI 驱动的自动分类
- 批量文本处理
- 标签管理
- 分类统计

### 案例上线 (Case Upload)
- 一键部署功能
- 上线进度跟踪
- 结果状态显示
- 历史记录查看

## 🎯 设计亮点

1. **渐变色彩**: 使用蓝色系渐变，体现专业性
2. **卡片布局**: 清晰的信息层次和视觉分组
3. **交互反馈**: 悬停效果和状态变化
4. **响应式设计**: 适配桌面和移动设备
5. **加载状态**: 优雅的加载动画和进度指示

## 🔧 配置说明

### API 代理
Next.js 配置了 API 代理，将前端请求转发到后端服务：
```javascript
// next.config.js
async rewrites() {
  return [
    {
      source: '/api/:path*',
      destination: 'http://localhost:8000/:path*',
    },
  ]
}
```

### 样式定制
在 `tailwind.config.js` 中定义了自定义颜色和动画：
```javascript
colors: {
  cbirc: {
    50: '#f0f9ff',
    // ... 更多颜色定义
  }
}
```

## 🚀 部署

### 本地部署
```bash
npm run build
npm start
```

### Docker 部署
```bash
# 构建镜像
docker build -t cbirc-frontend .

# 运行容器
docker run -p 3000:3000 cbirc-frontend
```

## 📱 移动端支持

界面完全响应式，在移动设备上提供优化的用户体验：
- 自适应布局
- 触摸友好的交互
- 优化的导航菜单

## 🔮 未来计划

- [ ] 添加更多数据可视化图表
- [ ] 集成实时数据更新
- [ ] 添加用户权限管理
- [ ] 支持主题切换
- [ ] 添加国际化支持

## 📄 许可证

本项目采用 MIT 许可证。