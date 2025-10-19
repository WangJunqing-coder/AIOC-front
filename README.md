语言/Language: [中文](README.zh-CN.md) | [English](README.en.md)

## AIOC 前端（Vue 3 + Vite）

本项目是一个基于Spring Boot 3 + Vue3的AI综合服务平台，集成了AI聊天、图片生成、视频生成和AI PPT制作以及会员充值等功能。
* 后端源码：[https://github.com/WangJunqing-coder/AIOC](https://github.com/WangJunqing-coder/AIOC)
* 前端源码：[https://github.com/WangJunqing-coder/AIOC-front](https://github.com/WangJunqing-coder/AIOC-front)
## 环境要求

- Node.js 20.x 或 22.x（package.json 已声明 engines）
- npm（或兼容的包管理器）

## 快速开始（Windows cmd）

1) 安装依赖

```bat
npm install
```

2) 设置后端地址（可选）

默认后端地址为 `http://localhost:8080`。如需修改，创建 `.env.development` 并设置：

```env
VITE_API_BASE=http://127.0.0.1:8080
```

`vite.config.js` 中已配置代理：将以 `/api` 开头的请求转发到 `VITE_API_BASE`。

3) 启动开发服务器

```bat
npm run dev
```

启动后会提示本地访问地址，通常为 `http://localhost:5173/`。

## 构建与预览

```bat
npm run build
npm run preview
```

构建产物默认位于 `dist/` 目录，可部署到任意静态资源服务器（Nginx、静态网站托管等）。

## 接口与鉴权约定

- Axios 基地址：`import.meta.env.VITE_API_BASE || http://localhost:8080`
- 请求头：登录后会自动附加 `Authorization: Bearer <token>`（见 `src/api/http.js`）
- 统一响应：后端返回形如 `{ code, message, data }` 时，前端会自动解包并在成功时弹出 message（如有意义）
- 401 处理：清理本地 token，可在路由守卫中跳转到登录页（本项目路由已处理）

## 常见问题（FAQ）

- 接口 404 或 CORS：确保后端已启动且端口一致；本地开发建议使用代理（已在 `vite.config.js` 配置）。
- 不能访问受保护页面：请先登录；或检查 token 是否写入 `localStorage`。
- 样式错乱：请确认 Element Plus 版本与样式导入正确，清缓存后重试。
- API 基址不同环境：可以按环境创建 `.env.development`、`.env.production` 等文件分别指定 `VITE_API_BASE`。

## 目录结构（简）

```
front/
├── public/
├── src/
│   ├── api/           # http 封装与模块化接口
│   ├── layouts/
│   ├── pages/
│   ├── router/
│   ├── stores/
│   ├── styles/
│   └── main.js / App.vue
├── index.html
├── vite.config.js
└── package.json
```

## 部署指引（示例）

1) 后端部署到服务器并配置 Nginx 反向代理到后端 8080 端口；
2) 前端执行 `npm run build`，将 `dist/` 上传至 Nginx 的静态目录；
3) 在 Nginx 中将 `/api` 反向代理到后端服务地址，静态路由使用 `try_files` 支持前端路由。

更多环境或一键部署脚本可在后续版本补充。
