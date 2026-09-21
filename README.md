# Portal Fitness — Body Planet Explorer

> 你的身体是一颗星球。

一个把真实训练转化为「养成星球」进度的手机端游戏化健身 App。

当前仓库同时包含两部分：已可运行的 React 训练工具，以及尚待接入 React 主界面的 Three.js 星球原型。产品目标、手机端交互和后续功能以 `docs/` 下的稳定版文档为准；代码现状以本 README 的“当前实现范围”为准。

## 当前实现范围

- 🏋️ **训练记录**：支持力量组次、跑步/骑行距离、游泳趟数与泳姿，以及瑜伽、拉伸和球类的时长记录。
- 📅 **训练方案**：创建、编辑、删除并直接开始训练方案；内置新手全身力量示例。
- 📚 **动作库**：覆盖力量、跑步、有氧器械、游泳、户外、恢复、瑜伽和球类运动，支持名称、别名、肌群和器械搜索。
- 🪐 **Credit 原型**：完成训练后按当前前端规则计算 20–120 Credit，按最近 7 天汇总，并保存在浏览器本地；每日额度、服务端账本和进化扣分尚未接入。
- 🌍 **身体星球原型**：`src/app.js` 提供可旋转、缩放、区域点选和地貌标注的 Three.js 场景；`planet.html` 是独立预览入口，当前 `index.html` 仍只加载 `src/main.tsx`，因此该场景尚未进入 React 页面。
- 🌌 **五阶段卡片背景资产**：L1–L5 背景已入库，但尚未被当前代码页面调用。

注册引导、四 Tab 星球主线、每日额度、视频核验、AI 计划生成、AI 地貌进化、守护者 NPC、体成分趋势、账号云同步和服务端 Credit 账本仍在产品方案阶段。

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

## 文件地图与维护指引

| 文件/目录 | 作用 | 当前状态 | 修改时遵循 |
| --- | --- | --- | --- |
| `src/App.tsx` | React 训练记录、方案、动作库、历史和本地 Credit 原型 | 当前运行入口 | 训练交互和字段变更先更新交互文档，再改代码 |
| `src/exerciseLibrary.ts` | 动作库唯一数据源 | 当前运行 | 只保存稳定 `exercise.id`；新增动作同步更新动作库文档 |
| `src/main.tsx` | React 挂载入口和错误边界 | 当前运行入口 | 不在这里写业务状态 |
| `src/app.js` | 独立 Three.js 星球探索原型 | 未接入 React | 地标名称与坐标只改 `src/landmarks.js` |
| `planet.html` | 星球场景独立预览壳 | 可直接运行 | 用于验收程序化地形、交互和移动端布局 |
| `src/landmarks.js` | 星球地标名称、坐标和显示层级 | 星球原型数据源 | 保持稳定唯一 `id`，遵循 `AGENTS.md` |
| `public/assets/` | 运行时图片资源 | 部分已接入 | 新增、替换或压缩资源必须同步 `docs/assets.md` |
| `docs/product-spec.md` | 做什么、规则是什么、如何验收 | 产品唯一规则源 | 产品规则变更先改这里 |
| `docs/interaction-spec.md` | 页面入口、操作、状态、异常和返回 | 交互唯一规则源 | 页面行为变更先改这里 |
| `docs/exercise-library.md` | 动作字段、记录模型、本地键和 Credit 原型规则 | 数据契约说明 | 与 `src/exerciseLibrary.ts` 保持一致 |
| `docs/assets.md` | 所有资源路径、尺寸、大小、用途和状态 | 资源唯一索引 | 不允许只上传文件不补索引 |
| `docs/card-background-assets.md` | 阶段背景的布局、蒙层和预加载示例 | 资源使用说明 | 只描述背景使用，不写产品业务规则 |
| `docs/reference-gap-analysis.md` | 参考项目与当前仓库的差异和迁移决策 | 维护记录 | 新实现落地后更新差异状态 |
| `src/imports/`、`docs/*v1.2.md` | 历史输入和旧版文档 | 只读归档 | 不作为当前规则依据 |

推荐阅读顺序：先看 [产品方案](docs/product-spec.md)，再看 [手机端交互逻辑](docs/interaction-spec.md)，开发训练功能时查看 [动作库契约](docs/exercise-library.md)，处理图片时查看 [资源索引](docs/assets.md)。

产品文档中的“必须完成”代表目标 MVP；代码中的“当前实现”代表仓库现状，两者之间的差异以 [差异记录](docs/reference-gap-analysis.md) 为准。

## Product Docs

- [`docs/product-spec.md`](docs/product-spec.md) — MVP 定义、业务规则、Credit、视频核验、星球进化与验收标准的唯一真源
- [`docs/interaction-spec.md`](docs/interaction-spec.md) — 手机端逐页操作、导航、状态机、异常恢复、离线同步与埋点
- [`docs/reference-gap-analysis.md`](docs/reference-gap-analysis.md) — Figma Make 参考项目与当前仓库差异
- [`docs/exercise-library.md`](docs/exercise-library.md) — 动作库与训练记录数据契约
- [`docs/product-spec-v1.2.md`](docs/product-spec-v1.2.md) 与 [`docs/mobile-interaction-v1.2.md`](docs/mobile-interaction-v1.2.md) — 历史方案，仅供追溯
- [`src/imports/PortalFitness______v1.md`](src/imports/PortalFitness______v1.md) 与 [`src/imports/PortalFitness______v1-1.md`](src/imports/PortalFitness______v1-1.md) — 历史 v1.1 输入，仅供追溯

## 桌面连续球面地形 3.0

打开 `/planet.html` 体验放大的连续大陆、山脊雪线、河谷水系和实例化森林。Sites 展示地址：[养星球 · 地貌探索](https://body-planet-explorer.kinteregla705706.chatgpt.site)。

默认精细档使用 81,920 面全球地形；靠近后启用 327,680 面大陆地形，选择区域并继续靠近可加载 524,288 面局部块。基础地形与细节共用高度场，身体指标保留稳定 zone ID 与更新事件。

实现与数据接入说明：[docs/desktop-terrain.md](docs/desktop-terrain.md)。运行 `node scripts/validate-planet.mjs` 检查几何与绑定。模型生成源、GLB、Web Worker 与资源索引均随源码保存。真实桌面 GPU 帧率尚待实机验收。
