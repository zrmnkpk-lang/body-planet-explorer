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
| Three.js 场景 | `src/app.js` | 可旋转、可缩放的体成分星球 | 独立原型；由程序生成高细节地形、山脊、冰川、河流与森林，不依赖图片贴图。 |
| Three.js 场景壳 | `planet.html` | 星球原型独立预览 | Vite 多页构建入口；当前 React 页面仍不加载该场景。 |
| 地点数据 | `src/landmarks.js` | 冰川、海洋、河流、森林、荒漠标注 | 名称、坐标和细节等级的唯一数据源。 |
| SVG 参考稿 | `src/imports/pasted_text/planet-svg.svg` | 原始的 600 × 600 矢量星球结构 | 当前只含 `defs` 和样式，没有完整可渲染的地形路径；不可视为运行时资源。 |

## 版权与追溯

`portal-black-hole.webp` 和 `body-composition-scan.webp` 为当前项目用户提供的源图优化版。在对外发布、商业化或涉及第三方使用前，需由项目方确认源图的使用权利。

## 设计与文档资源

| 类型 | 位置 | 用途 | 状态 |
| --- | --- | --- | --- |
| 产品方案 | [`product-spec.md`](product-spec.md) | MVP 范围、业务规则、Credit、AI、数据和验收标准的唯一真源 | 当前 |
| 手机交互 | [`interaction-spec.md`](interaction-spec.md) | 页面行为、跳转、状态、异常恢复、离线同步与埋点 | 当前 |
| 差异记录 | [`reference-gap-analysis.md`](reference-gap-analysis.md) | 参考项目与仓库的合并决策 | 当前 |
| Figma 设计 | [Portal Fitness MVP — 历史交互稿](https://www.figma.com/design/OX5ETikVlpMD35jVGJapnX) | 早期视觉探索，仅供参考，不作为产品规则或研发验收依据 | 归档参考 |
| 历史文档 | [`product-spec-v1.2.md`](product-spec-v1.2.md)、[`mobile-interaction-v1.2.md`](mobile-interaction-v1.2.md) | v1.2 方案与页面清单 | 归档 |

用户提供的“健身App网页.zip”包含多张 0.8–7 MB 的原始 PNG 和 Figma Make 工程文件，仅作为设计与代码对照输入，不作为 App 运行时资源直接入库。需要使用其中视觉素材时，必须先改为语义化文件名、导出 WebP/AVIF、移除元数据，并补充到本索引。

## 桌面连续地形地标（2026-09）

| 路径 | 大小 | 用途 | 来源与维护 |
| --- | ---: | --- | --- |
| `public/assets/landmarks/basalt.glb` | 218,688 bytes | 层岩山脊独立地标 | 原创程序化几何，生成源 `scripts/generate-landmarks.mjs` |
| `public/assets/landmarks/glacier.glb` | 306,068 bytes | 裂隙冰舌独立地标 | 原创程序化几何，生成源同上 |

GLB 含网格、法线、顶点色和材质，无外部纹理依赖。名称、经纬度、比例在 `src/landmarks.js` 修改。运行 `node scripts/generate-landmarks.mjs` 可复现资产；未进行高低模烘焙。全局地形、树木和水体由 `src/planet/` 实时构建，不依赖外链图片或 CDN 模型。
