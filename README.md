# 天气查询（Vite + Vue3 + TypeScript）

城市搜索天气：优先使用 **One Call API 3.0**（8 日每日预报）；若账号未订阅 One Call，则自动降级到 **2.5** 接口并将 3 小时预报按日聚合（约 5 天）。

## 本地运行

1. 安装依赖：

```bash
npm install
```

2. 配置环境变量（建议写到 `.env.local`，不要提交）：

```bash
VITE_WEATHER_API_BASE_URL=https://api.openweathermap.org
VITE_WEATHER_API_KEY=你的key
```

3. 启动：

```bash
npm run dev
```

## 部署（GitHub Pages）

本项目已配置 GitHub Actions 自动部署到 Pages，默认部署路径为 `/ai/`。

