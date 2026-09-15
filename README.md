# Portal Fitness — Body Planet Explorer

> 你的身体是一颗星球。

一个把日常训练包装为「养成星球」的游戏化健身 App 原型。当前仓库的实现重点是 Three.js 身体星球可视化；完整的产品设想与交互流程见「产品文档」。

## 当前实现范围

- 🌍 **身体星球**：肌肉、水分、骨量、体脂映射为可点选的山脉、河流、极地与大陆。
- 🔎 **探索交互**：支持拖拽旋转、缩放、区域点选、近景细节和地点标注。
- 🌌 **五阶段卡片背景资产**：L1–L5 背景已入库，但尚未被当前代码页面调用。

训练流程、XP/连击、守护者 NPC、数据录入、趋势与「我的」页目前仅在产品方案中定义，尚未作为可用页面提交。

## 技术栈

- **Vite 8**
- **Three.js** — 程序化 3D 星球渲染
- **React 19 / TypeScript** — 项目依赖已预置，但当前星球原型的实体逻辑在 `src/app.js`

## Planet Zones

| Zone | Body Metric | Visual Feature |
|------|------------|----------------|
| 造山带 (Highlands) | Muscle mass | Mountain range height |
| 极地骨骼要塞 (Polar Cap) | Bone density | Arctic ice cap size |
| 生命水道 (Rivers) | Body water % | River network width |
| 季风大陆 (Monsoon Plains) | Body fat % | Southern continent |

## Getting Started

```bash
npm install
npm run dev
```

## 资源

全部可运行时资源均纳入 Git 并位于 `public/assets/`。请参阅完整的[资源索引](docs/assets.md)，其中包括路径、尺寸、文件大小、用途、加载约定与版权待办事项。
卡片背景的布局与相邻预加载策略参阅 [卡片背景资产说明](docs/card-background-assets.md)。

## Product Docs

- [`src/imports/PortalFitness______v1.md`](src/imports/PortalFitness______v1.md) — Product spec v1.0
- [`src/imports/PortalFitness______v1-1.md`](src/imports/PortalFitness______v1-1.md) — Interaction design doc v1.0
