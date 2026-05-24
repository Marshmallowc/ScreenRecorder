# Capura Visual & UX Design Language System
> **基于用户极致极简主义、大幕布中心化与状态解耦的“未来主义 HUD”设计规范**

本规范提炼并定义了 **Capura** 的核心设计语言。它不仅是一套视觉指南，更是未来功能迭代、多模态重构和 AI 智能体（Skills）自动生成代码时必须严格遵守的**底层设计哲学**。

---

## 👁️ 核心设计哲学 (Core Philosophy)

### 「巨幕中心，交互即内容」 (Cinema-Centric, Content as UI)
传统的工具软件倾向于在侧边或右侧堆叠大量静态属性面板、配置项和说明文字，导致视觉重心失衡。
本系统的核心哲学是**把视窗（Screen Viewport）作为绝对的视觉与交互主宰**：
- **拒绝侧栏与右面板**：将一切不必要的右侧设置区彻底移除。屏幕需要尽可能地撑满，用极具沉浸感的无边框大巨幕（Cinema Screen）作为最强烈的视觉锚点。
- **直觉式的屏幕内引导**：将最初的“开启屏幕分享”等核心引导按钮，直接、醒目地居中内嵌于大屏幕中央的雷达 HUD 区域，而非置于外部。用户一进入，视觉自然聚焦于中央。

---

## 📐 核心交互设计法则 (UX Axioms)

### 1. 状态驱动的渐进式披露 (State-Driven Progressive Disclosure)
> *“在不需要的时候，让干扰视觉的杂讯彻底消失。”*

界面绝不应提前展示无法操作的置灰选项或死板的配置面板：
- **零共享不显控制舱**：在用户未点击“开启屏幕分享”之前，所有的录制、音轨控制、画质配置参数按钮全部处于**不可见或不渲染**状态，只展示最纯粹的大屏与居中开启按钮。
- **状态渐进展现**：只有当屏幕分享成功建立（状态由 `idle` 切换为 `sharing`）后，位于屏幕底部的**变形控制舱（Metamorphic HUD Capsule）**才会优雅地浮现或解锁，展示相关的麦克风、系统音与录制配置。
- **录制中极简收敛**：一旦进入正式录制（`recording`）状态，设置面板与开关自动锁定收束，避免用户误触，最大化录像视野。

### 2. 功能与状态的“就地融合” (In-situ Metamorphic Fusion)
> *“不要参数列表，让按钮本身开口说话。”*

避免设置冗余的状态指示区，交互控制与状态反馈必须在同一个物理空间内完成融合：
- **按钮即是仪表盘**：不把麦克风与系统音的波动电平放在外部独立的参数设置卡片中，而是直接**内嵌于对应的控制按钮内**。
- **微型 LCD 状态电平**：在“麦克风”与“系统音”按钮的文字右侧，预留固定的微型 Canvas 空间。
  - **关闭/未授权状态**：Canvas 保持 100% 透明，完全融入按钮背景，无任何多余线条与黑块，界面干净无瑕。
  - **开启且有信号状态**：激活极细的动态荧光能量柱（麦克风为青色 `#06b6d4`，系统音为翠绿 `#10b981`），实时跳动，给用户最高级的科技回馈感。

### 3. 无抖动防崩塌结构 (Zero-Jitter Structural Stability)
为了实现纯粹的极简，绝不能以破坏布局稳定性为代价：
- **预留物理空间**：所有融合了动态波形 Canvas 的按钮，其容器宽度、内边距和排布在 CSS 中均做了精准的预留与约束（如 `white-space: nowrap` 和 `flex-shrink: 0`）。
- **杜绝布局抖动**：当波形在“静止”与“跳动”之间切换时，按钮的宽度和文字排布绝对不会发生任何 1 像素的位移或折行，确保极致的视觉平滑感。

---

## 🎨 视觉要素与规范 (Visual Specifications)

### 1. 超宽巨幕网格 (Cinema Workspace Grid)
- **主体容器宽度**：`.workspace-container` 升级为 **1360px**（自适应大屏设备），呈现出巨幕级的视觉张力。
- **背景肌理**：深色科技背景搭配雷达星轨 HUD 动画（`.hud-radar-wrapper`）以及微妙的扫描线纹理（`.stage-scanlines`），烘托出纯客户端本地编译的“沙箱仪器感”。

### 2. 状态色彩系统 (Harmonious Color Tokens)
不使用饱和度过高的刺眼纯色，选用高端、和谐的科技色彩体系：
| 状态/元素 | 颜色代码 | 视觉语境 |
| :--- | :--- | :--- |
| **主色 (Primary)** | `#6366f1` / 紫罗兰 | 核心品牌色，用于高光、悬浮与首要操作 |
| **麦克风 (Mic Active)** | `#06b6d4` / 赛博青 | 代表人声的纯净捕获 |
| **系统音 (Sys Active)** | `#10b981` / 荧光绿 | 代表系统声波的高保真反馈 |
| **危险/终止 (Danger)** | `#ef4444` / 警示红 | 停止、放弃或严重预警状态 |
| **背景/毛玻璃** | `rgba(10, 12, 22, 0.65)` | 搭配 `backdrop-filter: blur(20px)` 的高级毛玻璃卡片（Glassmorphism） |

---

## 📂 典型组件 HTML/CSS 结构蓝图 (Code Blueprint)

将来如需对本系统的交互按钮进行微调，请严格参考以下标准模板：

### 1. 悬浮舱嵌入式按钮 (Metamorphic Button)
```html
<button id="btn-float-mic" class="float-btn" title="切换麦克风录制">
  <span class="float-btn-icon">
    <!-- 图标渲染区 -->
    <span data-capura-icon="mic"></span>
  </span>
  <span class="float-btn-label">麦克风</span>
  <!-- 预留的零抖动 LCD 动态波形容器 -->
  <div class="mini-visualizer-wrap">
    <canvas id="mini-mic-visualizer" class="mini-canvas"></canvas>
  </div>
</button>
```

### 2. 零换行弹性控制 CSS (Jitter-Free Layout)
```css
.float-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: var(--radius-pill);
  color: var(--text-secondary);
  white-space: nowrap; /* 绝对禁止中英文折行 */
  flex-shrink: 0;      /* 绝对禁止按钮在窄屏下被挤压 */
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.mini-visualizer-wrap {
  width: 36px;
  height: 12px;
  background: transparent; /* 保持隐形 */
  border-radius: 3px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 4px;
}

.mini-canvas {
  width: 100%;
  height: 100%;
  display: block;
}
```

---

## 🤖 智能体行为指引 (AI Instruction / Skill Prompts)
当你（AI 助手）在后续维护此项目，或将此规范打包成 Skill 时，请遵循以下指令：
1. **严格禁止**引入任何右侧固定面板或额外的侧边控制栏。
2. **任何新增的配置项**，都应优先考虑放入底部的参数设置气泡（`.float-settings-popover`）中，保持主舞台的纯净。
3. **保持状态驱动**：在编写 `app.js` 时，任何与录制、音频相关的 DOM 交互都必须随 `appState` 的切换（`idle` -> `sharing` -> `recording`）进行显式且优雅的过渡渐显（利用 CSS `opacity` 与 `pointer-events`），而非生硬的开关。
4. **Canvas 绘制规范**：在渲染声音波动电平时，静止状态下必须将 Canvas 完全擦除（`clearRect`），严禁保留任何具有突兀背景的实色黑块或硬边线条。
