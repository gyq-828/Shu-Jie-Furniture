# 枢界家具智能经营诊断与预警平台

一个面向商务数据分析场景的轻量 AI 工具。用户可上传 CSV、XLS 或 XLSX 文件，在浏览器内完成数据解析和指标计算，再通过 Cloudflare Pages Function 安全调用 DeepSeek 生成经营结论与行动建议。

## 核心能力

- CSV、XLS、XLSX 本地解析，支持中文 CSV 编码回退
- Excel 工作表选择、数据预览和自动字段识别
- 成交额、访客数、订单、转化率、客单价等指标计算
- 趋势、分类贡献、缺失值、重复记录和阈值预警
- DeepSeek 结构化诊断和基于当前数据的继续追问
- 内置枢界家具演示数据，支持打印/导出 PDF
- Cloudflare Turnstile 和 KV 调用配额（可选但推荐）

## 数据安全

原始文件不会上传或落库。文件由浏览器解析，业务指标由本地规则引擎计算。发送给 DeepSeek 的仅包括：

- 字段名称和用户确认的字段含义
- 汇总指标、趋势点、分类排名
- 预警结果和数据质量统计

`DEEPSEEK_API_KEY` 只存在 Cloudflare Secret 中，不会进入前端代码。

## 本地开发

环境要求：Node.js 20 或更高版本。

```bash
npm install
npm run dev
```

仅前端模式不会运行 Pages Function。如需本地调试 DeepSeek：

1. 将 `.dev.vars.example` 复制为 `.dev.vars`，填入 DeepSeek API Key。
2. 执行 `npm run preview:cloudflare`。
3. 打开 Wrangler 输出的本地地址。

`.dev.vars` 已被 Git 忽略，不应提交。

## 工程验证

```bash
npm run lint
npm run test
npm run build
npm run check:functions
npm audit
```

## Cloudflare Pages 部署

### 1. 连接 GitHub

在 Cloudflare Dashboard 中新建 Pages 项目，选择 GitHub 仓库 `gyq-828/Shu-Jie-Furniture`，使用以下构建配置：

| 配置项 | 值 |
| --- | --- |
| Framework preset | React (Vite) |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | `/` |

`functions/` 目录会被 Cloudflare Pages 自动识别为 Pages Functions。

### 2. 配置 DeepSeek

在 Pages 项目的 **Settings > Variables and Secrets** 添加：

| 变量 | 类型 | 值 |
| --- | --- | --- |
| `DEEPSEEK_API_KEY` | Secret | DeepSeek 开放平台生成的 Key |
| `DEEPSEEK_MODEL` | Variable | `deepseek-chat` |

不要使用 `VITE_` 前缀保存 API Key，否则它会进入浏览器构建产物。

### 3. 配置 Turnstile（推荐）

1. 在 Cloudflare Turnstile 创建站点，将 Pages 的 `*.pages.dev` 域名加入允许列表。
2. 在 Pages 构建环境添加公开变量 `VITE_TURNSTILE_SITE_KEY`。
3. 在 Pages Function 环境添加 Secret `TURNSTILE_SECRET_KEY`。
4. 重新部署。

如不配置这两个变量，系统可运行，但不会显示或校验人机验证。

### 4. 配置 KV 配额（推荐）

1. 创建一个 Cloudflare KV Namespace。
2. 在 Pages 项目 **Settings > Bindings** 中新建 KV 绑定。
3. Variable name 必须填写 `RATE_LIMIT`。
4. 重新部署。

绑定后默认限制每个 IP 每日 3 次新 AI 诊断和 15 次追问。未绑定 KV 时不启用该配额，因此公开发布前建议完成配置。

## 技术栈

- React + TypeScript + Vite
- Recharts + Lucide React
- `@e965/xlsx`（支持 CSV/XLS/XLSX）
- Cloudflare Pages + Pages Functions + KV + Turnstile
- DeepSeek Chat Completions API
