# Adilia Screen Recorder (Capura) 📹

[English](./README.md#english) | [中文说明](./README.md#中文说明)

---

## English

Adilia Screen Recorder (Capura) is an elegant, premium, and fully client-side browser screen recorder engineered for power users, developers, and educators. It operates **100% offline inside your browser sandbox**, guaranteeing absolute data privacy and physical isolation.

### 🌟 Key Features

*   **Zero-Latency Dual-Track Audio Mixing**: Dynamically blends system loopback audio (speaker/tab) with your microphone voice in real-time on the local Web Audio API thread.
*   **Incremental Crash Disaster Recovery**: Stores video slices to local IndexedDB every 3 seconds. If your browser crashes, freezes, or experiences power loss, you can fully recover your recording lossless upon reloading.
*   **4K Ultra-HD Resolution Presets**: Supports modular constraint switching, from space-saving 720P 30fps up to extreme 4K (2160P) 60fps captures.
*   **Picture-in-Picture Monitor (PiP)**: Includes a floating monitor viewport overlay with native play, pause, and stop controls.
*   **Dynamic UX Checklist**: Features an integrated sidebar checklist to guide you through steps and procedures while recording.
*   **Strict Offline Security (Zero Server Uploads)**: Fully serverless. No registration, no tracking, and zero database uploads.

### 🛠️ Subpath Deployment (Silo Structure)

This app is optimized for seamless deployment under subpaths (e.g. `https://www.yourdomain.com/tools/screen-recorder`).
All asset imports (`app.js`, `style.css`, etc.) use strictly relative paths to ensure zero 404 resource errors under cascading routes.

#### Configuring Vercel Rewrites

To proxy this app under your primary site, add the following to your root domain's `vercel.json`:

```json
{
  "rewrites": [
    {
      "source": "/tools/screen-recorder",
      "destination": "https://your-recording-project.vercel.app"
    },
    {
      "source": "/tools/screen-recorder/:path*",
      "destination": "https://your-recording-project.vercel.app/:path*"
    }
  ]
}
```

---

## 中文说明

Adilia 录屏仪 (Capura) 是一款优雅、高端且完全在本地浏览器沙箱中运行的 4K 高保真网页录屏 Web App。免安装任何插件，数据隐私 100% 物理隔离，安全无忧，专为教程创作者、开发者与极客设计。

### 🌟 核心特性

*   **双声道高保真本地混音**：智能捕获浏览器扬声器（系统声音）与麦克风人声，在本地 Web Audio API 线程中进行毫秒级高保真融合混音。
*   **增量式防崩溃灾备系统**：每 3 秒将录制分片增量写入本地浏览器 IndexedDB 数据库。即使录制过程中浏览器意外关闭、崩溃死机或电脑断电，在下一次打开网页时即可一键完美组装找回！
*   **4K 极客超清画质支持**：支持多档位参数动态调节，支持从超长省空间 720P 30fps 至极清 4K (2160P) 60fps 的实时采集约束重构。
*   **悬浮监控窗监控 (PiP)**：支持一键开启桌面置顶悬浮小窗，并深度拦截并映射系统级媒体控制键，支持在悬浮窗内直接暂停、继续和保存录制。
*   **极客演示步骤清单**：内置交互式任务检查清单，辅助教程录制者在录屏时跟随步骤进度，避免错漏。
*   **100% 本地安全（零服务器上传）**：纯 Serverless 设计，断网可用，数据绝对不出您的本地设备。

### 🛠️ 完美的子路由部署支持 (Silo 结构)

本项目为子路由嵌套部署进行了专项优化（例如部署在个人主站的 `https://www.cust.net.cn/tools/screen-recorder` 下）。
所有静态资源引用全部采用**严格相对路径**，确保在级联子目录中资源百分之百正确加载。

#### 主站 Vercel 反向代理配置

在您个人网站根域名的 `vercel.json` 配置文件中添加如下 `rewrites` 规则，即可实现无缝子路由嵌套：

```json
{
  "rewrites": [
    {
      "source": "/tools/screen-recorder",
      "destination": "https://your-recording-project.vercel.app"
    },
    {
      "source": "/tools/screen-recorder/:path*",
      "destination": "https://your-recording-project.vercel.app/:path*"
    }
  ]
}
```

---

## 📄 License

Open-sourced under the MIT License.
