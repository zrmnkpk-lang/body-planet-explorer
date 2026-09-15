# Portal Fitness — Body Planet Explorer

> 你的身体是一颗星球。

一个把日常训练包装为「养成星球」的手机端游戏化健身 App 原型。当前仓库已经包含可运行的基础训练记录工具、训练方案和广覆盖动作库；账户、新手星球、每日额度、可选视频核验和周期进化按照 v1.2 文档继续整合。

## 当前实现范围

- 🏋️ **训练记录**：支持力量组次、跑步/骑行距离、游泳趟数与泳姿，以及瑜伽、拉伸和球类的时长记录。
- 📅 **训练方案**：创建、编辑、删除并直接开始训练方案；内置新手全身力量示例。
- 📚 **动作库**：覆盖力量、跑步、有氧器械、游泳、户外、恢复、瑜伽和球类运动，支持名称、别名、肌群和器械搜索。
- 🪐 **Credit 结算**：训练记录自动转换为周进化 Credit，并保存在浏览器本地。
- 🌍 **身体星球代码**：`src/app.js` 保留可旋转、缩放、区域点选和地貌标注的 Three.js 原型，尚待整合进入 React 主界面。
- 🌌 **五阶段卡片背景资产**：L1–L5 背景已入库，但尚未被当前代码页面调用。

注册引导、AI 计划生成、AI 地貌周进化、守护者 NPC、体成分趋势与账号云同步仍在产品方案阶段。

## 技术栈

- **Vite 8**
- **React 19 / TypeScript** — 训练工具主界面与本地状态管理
- **Three.js** — 程序化 3D 星球原型
- **localStorage** — 当前 MVP 的训练、方案、收藏与未完成训练持久化

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

生产构建：

```bash
npm run build
```

## 资源

全部可运行时资源均纳入 Git 并位于 `public/assets/`。请参阅完整的[资源索引](docs/assets.md)，其中包括路径、尺寸、文件大小、用途、加载约定与版权待办事项。
卡片背景的布局与相邻预加载策略参阅 [卡片背景资产说明](docs/card-background-assets.md)。

## Product Docs

- [`docs/product-spec-v1.2.md`](docs/product-spec-v1.2.md) — 当前产品方案与 MVP 单一真源
- [`docs/mobile-interaction-v1.2.md`](docs/mobile-interaction-v1.2.md) — 390 × 844 手机端交互规范与 20 屏清单
- [`docs/reference-gap-analysis.md`](docs/reference-gap-analysis.md) — Figma Make 参考项目与当前仓库差异
- [`docs/exercise-library.md`](docs/exercise-library.md) — 动作库与训练记录数据契约
- [`src/imports/PortalFitness______v1.md`](src/imports/PortalFitness______v1.md) 与 [`src/imports/PortalFitness______v1-1.md`](src/imports/PortalFitness______v1-1.md) — 历史 v1.1 输入，仅供追溯
