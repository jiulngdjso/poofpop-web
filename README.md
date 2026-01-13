# Poofpop Web

Poofpop 视频/图片 AI 处理工具的前端界面。

## 功能

- **视频去水印** (minimax_remove): 自动移除视频中的水印
- **视频物体移除** (video-object-removal): 使用 AI 移除视频中的指定物体

## 技术栈

- React 19
- Vite 7
- Cloudflare Workers API

## 本地运行

### 1. 安装依赖

```bash
npm ci
# 或
npm install
```

### 2. 配置环境变量（可选）

创建 `.env.local` 文件：

```bash
# API 地址（可选，默认使用生产地址）
VITE_API_BASE=https://poofpop-api.15159759780cjh.workers.dev
```

如果不配置，默认使用 `https://poofpop-api.15159759780cjh.workers.dev`。

### 3. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:5173

## 构建

```bash
npm run build
```

构建产物在 `dist/` 目录。

## 部署到 Cloudflare Pages

### 方式一：通过 GitHub 集成（推荐）

1. 在 Cloudflare Dashboard 创建 Pages 项目
2. 连接 GitHub 仓库 `jiulngdjso/poofpop-web`
3. 配置构建设置：
   - **Build command**: `npm ci && npm run build`
   - **Build output directory**: `dist`
4. 添加环境变量（可选）：
   - `VITE_API_BASE`: API 地址

### 方式二：通过 Wrangler CLI

```bash
# 安装 Wrangler
npm install -g wrangler

# 登录
wrangler login

# 构建
npm ci && npm run build

# 部署
wrangler pages deploy dist --project-name=poofpop-web
```

## 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `VITE_API_BASE` | 后端 API 地址 | `https://poofpop-api.15159759780cjh.workers.dev` |

**注意**：前端只能使用 `VITE_` 前缀的环境变量，不要在前端代码中包含任何密钥。

## API 调用流程

```
1. POST /upload-init    → 获取 presigned PUT URL
2. PUT  {upload_url}    → 直传文件到 R2
3. POST /process        → 提交处理任务
4. GET  /jobs/{job_id}  → 轮询任务状态（每 3 秒）
5. GET  /download/{job_id} → 获取下载链接
```

## 验证方法

### 本地验证

1. 启动开发服务器：`npm run dev`
2. 打开 http://localhost:5173
3. 选择任务类型（如 minimax_remove）
4. 选择一个 mp4 视频文件
5. 点击"开始处理"
6. 观察：
   - 上传进度条
   - Job ID 显示（可点击复制）
   - 状态变化：uploading → pending → processing → completed
7. 处理完成后点击"下载结果"

### 线上验证

1. 部署到 Cloudflare Pages
2. 访问部署后的 URL（如 `https://poofpop-web.pages.dev`）
3. 执行与本地相同的测试步骤

### 错误场景测试

- **无文件上传**：点击"开始处理"应显示错误提示
- **非视频文件**：选择图片文件应显示错误提示
- **API 错误**：断网或 API 不可用时应显示错误信息

## 目录结构

```
src/
├── App.jsx        # 主应用组件
├── App.css        # 样式
├── lib/
│   └── api.js     # API 客户端
└── main.jsx       # 入口文件
```

## 功能特性

- ✅ 任务类型选择（minimax_remove / video-object-removal）
- ✅ 文件选择和大小显示
- ✅ 参数输入（video-object-removal 支持 remove_text）
- ✅ 上传进度条
- ✅ 任务状态实时显示
- ✅ Job ID 可复制
- ✅ 错误提示
- ✅ 下载结果按钮
- ✅ 响应式布局

## License

MIT
