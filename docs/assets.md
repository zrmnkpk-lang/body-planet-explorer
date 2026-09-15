# 资源索引

本文档是仓库中所有可视化资源的单一索引。新增或替换资源时，必须同步更新本表。

## 路径与加载约定

- 可运行时素材统一放入 `public/assets/`，在页面中使用绝对路径（例如 `/assets/illustrations/portal-black-hole.webp`）。
- 静态装饰图应使用 WebP、移除元数据，以减小 App 首次加载体积。透明素材必须保留 alpha 通道。
- 卡片背景实现相邻阶段预加载；具体代码与布局见 [card-background-assets.md](card-background-assets.md)。
- 资源文件名不可以上传时的随机 UUID 命名；改用语义化、稳定的 kebab-case 命名。

## 运行时图像

| 类型 | 资源路径 | 尺寸 | 大小 | 用途 | 接入状态 |
| --- | --- | ---: | ---: | --- | --- |
| 系统插画 | `/assets/illustrations/portal-black-hole.webp` | 1024 × 1024 | 111 KB | Portal 入口、动效背景或加载状态 | 已入库，未接入当前页面 |
| 系统插画 | `/assets/illustrations/body-composition-scan.webp` | 720 × 1279 | 72 KB | 「物质扫描」与体成分数据页 | 已入库，未接入当前页面 |
| 阶段背景 | `/assets/card-backgrounds/l1-ocean.webp` | 900 × 500 | 12 KB | L1 沧海纪卡片背景 | 已入库，未接入当前页面 |
| 阶段背景 | `/assets/card-backgrounds/l2-islands.webp` | 900 × 500 | 24 KB | L2 露陆纪卡片背景 | 已入库，未接入当前页面 |
| 阶段背景 | `/assets/card-backgrounds/l3-mountains.webp` | 900 × 500 | 23 KB | L3 山脉纪卡片背景 | 已入库，未接入当前页面 |
| 阶段背景 | `/assets/card-backgrounds/l4-riverlands.webp` | 900 × 500 | 26 KB | L4 江河纪卡片背景 | 已入库，未接入当前页面 |
| 阶段背景 | `/assets/card-backgrounds/l5-terrain.webp` | 900 × 500 | 35 KB | L5 丰壤纪卡片背景 | 已入库，未接入当前页面 |

## 交互星球与配置

| 类型 | 资源路径 | 用途 | 说明 |
| --- | --- | --- | --- |
| Three.js 场景 | `src/app.js` | 可旋转、可缩放的体成分星球 | 地形由程序生成，不依赖图片贴图。 |
| 地点数据 | `src/landmarks.js` | 冰川、海洋、河流、森林、荒漠标注 | 名称、坐标和细节等级的唯一数据源。 |
| SVG 参考稿 | `src/imports/pasted_text/planet-svg.svg` | 原始的 600 × 600 矢量星球结构 | 当前只含 `defs` 和样式，没有完整可渲染的地形路径；不可视为运行时资源。 |

## 版权与追溯

`portal-black-hole.webp` 和 `body-composition-scan.webp` 为当前项目用户提供的源图优化版。在对外发布、商业化或涉及第三方使用前，需由项目方确认源图的使用权利。

## 设计与文档资源

| 类型 | 位置 | 用途 | 状态 |
| --- | --- | --- | --- |
| Figma 设计 | [Portal Fitness MVP — 完整交互设计 v1](https://www.figma.com/design/OX5ETikVlpMD35jVGJapnX) | 手机端页面、组件、变量与交互原型 | 持续更新 |
| 产品方案 | [`product-spec-v1.2.md`](product-spec-v1.2.md) | MVP 范围、Credit、AI 与进化规则的单一真源 | 当前 |
| 手机交互 | [`mobile-interaction-v1.2.md`](mobile-interaction-v1.2.md) | 390 × 844 页面清单、流程与状态规范 | 当前 |
| 差异记录 | [`reference-gap-analysis.md`](reference-gap-analysis.md) | 参考项目与仓库的合并决策 | 当前 |

用户提供的“健身App网页.zip”包含多张 0.8–7 MB 的原始 PNG 和 Figma Make 工程文件，仅作为设计与代码对照输入，不作为 App 运行时资源直接入库。需要使用其中视觉素材时，必须先改为语义化文件名、导出 WebP/AVIF、移除元数据，并补充到本索引。
