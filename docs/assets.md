# 资源索引

本文档是仓库中所有可视化资源的单一索引。新增、替换、压缩、改名或删除资源时，必须同步更新本表。

“已入库”只表示文件已经进入 Git；“已接入”表示当前 `index.html` → `src/main.tsx` 的运行路径会实际加载该资源。两者不能混用。

## 路径与加载约定

- 可运行时素材统一放入 `public/assets/`，在页面中使用绝对路径（例如 `/assets/illustrations/portal-black-hole.webp`）。
- 静态装饰图应使用 WebP、移除元数据，以减小 App 首次加载体积。透明素材必须保留 alpha 通道。
- 卡片背景实现相邻阶段预加载；具体代码与布局见 [card-background-assets.md](card-background-assets.md)。
- 资源文件名不可以上传时的随机 UUID 命名；改用语义化、稳定的 kebab-case 命名。

## 运行时图像

| 类型 | 资源路径 | 尺寸 | 大小 | 用途 | 接入状态 |
| --- | --- | ---: | ---: | --- | --- |
| 系统插画 | `/assets/illustrations/portal-black-hole.webp` | 1024 × 1024 | 111 KB | Portal 入口与生态导航图标 | 已接入 `src/App.tsx` |
| 系统插画 | `/assets/illustrations/body-composition-scan.webp` | 720 × 1279 | 72 KB | 「物质扫描」与体成分数据页 | 已接入 `src/App.tsx` |
| 阶段背景 | `/assets/card-backgrounds/l1-ocean.webp` | 900 × 500 | 12 KB | L1 沧海纪卡片背景 | 已接入真实 APP 首页 |
| 阶段背景 | `/assets/card-backgrounds/l2-islands.webp` | 900 × 500 | 24 KB | L2 露陆纪卡片背景 | 已接入真实 APP 首页 |
| 阶段背景 | `/assets/card-backgrounds/l3-mountains.webp` | 900 × 500 | 23 KB | L3 山脉纪卡片背景 | 已接入真实 APP 首页 |
| 阶段背景 | `/assets/card-backgrounds/l4-riverlands.webp` | 900 × 500 | 26 KB | L4 江河纪卡片背景 | 已接入真实 APP 首页 |
| 阶段背景 | `/assets/card-backgrounds/l5-terrain.webp` | 900 × 500 | 35 KB | L5 丰壤纪卡片背景 | 已接入真实 APP 首页 |

## 交互星球与配置

| 类型 | 资源路径 | 用途 | 说明 |
| --- | --- | --- | --- |
| Three.js 场景 | `src/app.js` | 可旋转、可缩放的体成分星球 | 真实 APP 的生态页 iframe 与独立预览共用；由程序生成高细节地形、山脊、冰川、河流与森林。 |
| Three.js 场景壳 | `planet.html` | 星球原型独立预览 | Vite 多页构建入口；`src/PlanetView.tsx` 以 `?mode=app` 嵌入真实 APP。 |
| 地点数据 | `src/landmarks.js` | 冰川、海洋、河流、森林、荒漠标注 | 名称、坐标和细节等级的唯一数据源。 |
| SVG 参考稿 | `src/imports/pasted_text/planet-svg.svg` | 原始的 600 × 600 矢量星球结构 | 当前只含 `defs` 和样式，没有完整可渲染的地形路径；不可视为运行时资源。 |

## 版权与追溯

`portal-black-hole.webp` 和 `body-composition-scan.webp` 为当前项目用户提供的源图优化版。在对外发布、商业化或涉及第三方使用前，需由项目方确认源图的使用权利。

## 设计与文档资源

| 类型 | 位置 | 用途 | 状态 |
| --- | --- | --- | --- |
| 产品与功能 | [`../PRODUCT_FEATURES.md`](../PRODUCT_FEATURES.md) | 真实 APP 的页面、训练流程、生态、数据和个人页范围 | 当前 |
| 地形实现 | [`desktop-terrain.md`](desktop-terrain.md) | 连续球面地形、数据桥接、Worker 和验收 | 当前 |
| APP 入口 | [`../README.md`](../README.md) | 工程入口、文件职责和构建命令 | 当前 |
| Figma 设计 | [Portal Fitness MVP — 历史交互稿](https://www.figma.com/design/OX5ETikVlpMD35jVGJapnX) | 早期视觉探索，仅供参考，不作为产品规则或研发验收依据 | 归档参考 |

用户提供的“健身App网页.zip”是当前真实 APP 的源工程参考；已将其运行时代码和必要资源合并进仓库。压缩包本身保留在本地作为输入文件，不作为运行时资源加载。

## 桌面连续地形地标（2026-09）

| 路径 | 大小 | 用途 | 来源与维护 |
| --- | ---: | --- | --- |
| `public/assets/landmarks/basalt.glb` | 218,688 bytes | 层岩山脊独立地标 | 原创程序化几何，生成源 `scripts/generate-landmarks.mjs` |
| `public/assets/landmarks/glacier.glb` | 306,068 bytes | 裂隙冰舌独立地标 | 原创程序化几何，生成源同上 |

GLB 含网格、法线、顶点色和材质，无外部纹理依赖。名称、经纬度、比例在 `src/landmarks.js` 修改。运行 `node scripts/generate-landmarks.mjs` 可复现资产；未进行高低模烘焙。全局地形、树木和水体由 `src/planet/` 实时构建，不依赖外链图片或 CDN 模型。
