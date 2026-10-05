# Portal Fitness / Body Planet Explorer

> 你的身体是一颗星球。

这是压缩包 `健身App网页.zip` 中的真实 Portal Fitness React 应用，已经接入当前仓库的高精度连续球面星球。应用保留首页、训练、生态、数据和个人五个页面；星球使用统一的 standalone renderer，避免 APP 内嵌版本和独立预览版本出现视觉与交互分叉。

## 当前实现

- **首页**：生态阶段卡、今日训练入口、经验值、本周训练进度、每日任务和训练菜单。
- **宇宙背景与首页星球卡片**：恢复真实 APP 使用的宇宙背景图，所有页面共享柔化后的背景层；首页阶段卡片继续显示阶段背景图片，并在首张卡片右侧显示小型缓慢旋转星球预览。预览画布使用透明圆形切口，去除深空底色与背景星点，让球体直接叠在卡片图片上。生态页保留完整的可交互星球画布。
- **训练页**：造山力量、季风有氧、晨雾恢复三种训练状态，以及训练结算后进入生态页的入口。
- **生态页**：加载 `/planet.html?mode=app` 的最新连续球面地形，进入页面先显示模糊星球加载态，加载完成后再显示真实画布；支持旋转、缩放、区域拾取、分层细节、地标和气候粒子；地图下方展示造山带、深蓝寰海、极地要塞和季风大陆与身体成分的比例映射。
- **数据页**：显示肌肉、水分、骨量和体脂率，并将录入值发送给星球区域卡片。
- **个人页**：用户等级、经验值和提醒开关原型。
- **独立星球预览**：`/planet.html` 保留完整探索控件和调试信息。

当前仍是纯前端原型，状态主要保存在页面内存中，尚未连接账户、健康设备或服务端账本。

## 选定的视觉与页面规划

<!-- 2026-10-06：整合已选方向与完整星球图册；删除未使用历史组件并精简旧探索资料，运行视觉未替换。 -->

[设计总入口](docs/design/README.md)：都市美漫 + 轻度写实人物，暗黑潮流运动界面，自然地貌星球。包含 [美术规范](docs/design/ART_DIRECTION.md)、[星球规范](docs/design/PLANET_ART.md)、[五页内容与 GLM 交接](docs/design/PAGE_CONTENT.md)、[五张星球概念图](docs/design/planet-concepts/README.md) 和 [五页交互图](docs/visual-interactions/2026-10-06/README.md)。

设计图与目标文案尚未接入 APP；可靠保存、真实计时/奖励、搭档选择与数据驱动地貌仍为待开发需求。当前行为以交互基线为准，概念素材不加入运行时资源包。维护及清理记录见 [变更记录](docs/CHANGELOG.md)。

## 交互文档

<!-- 2026-10-04：建立以当前代码行为为准的标准交互文档；原型及待完善功能单独标注。 -->

- [Figma 标准交互文档 v1.0](https://www.figma.com/design/Xkv9smQZoCNX6F5FukRuPP?node-id=5-2)：九个章节，包含导航流程、五页操作、加载状态、数据规则和开发交接。
- [本地交互说明](docs/interaction-spec.md)：代码基线 `8afc3e3`，与 Figma 对应；页面截图是现状定位参考，规则及流程为可编辑内容。
- 以交互文档区分真实操作与展示原型。训练奖励入账、数据持久化、数据驱动地形重建等尚未实现。

## 技术栈

- React 19 + TypeScript
- Vite 8 + Tailwind CSS v4
- Three.js 0.180
- `@figma/astraui` 与 Lucide
- Web Worker 计算连续地形细节

## 启动与构建

```bash
npm install
npm run dev
npm run build
```

开发服务器默认运行在 `http://localhost:8443/`。生产构建同时输出 `index.html` 和 `planet.html`，并包含地形 Worker 与 `public/assets/landmarks/` 下的 GLB 资源。

## 入口与职责

| 文件/目录 | 作用 |
| --- | --- |
| `src/App.tsx` | 真实 APP 的五页导航、训练状态、任务、数据录入和页面交互 |
| `src/PlanetView.tsx` | 将最新星球预览嵌入生态页，并把体成分数据发送到星球 iframe |
| `src/app.js` | 最新连续球面星球的独立渲染器，供 `planet.html` 与 APP iframe 共用 |
| `src/planet/` | 高度场、地形、河流、生态、气候和语义缩放模块 |
| `planet.html` | 独立完整星球预览入口 |
| `src/landmarks.js` | 地标名称、坐标、层级与 GLB 配置的唯一数据源 |
| `public/assets/landmarks/` | `basalt.glb` 与 `glacier.glb` 地标模型 |
| `src/index.css` | 真实 APP 的视觉系统和最新星球 iframe 容器样式 |
| `docs/desktop-terrain.md` | 连续球面地形、数据桥接与验收说明 |
| `docs/design/` | 已选美术、星球概念、页面内容与后续功能交接的统一入口 |
| `PRODUCT_FEATURES.md` | 压缩包真实 APP 的功能说明和产品边界 |

## 验证

```bash
node scripts/validate-planet.mjs
npm run build
```

`validate-planet.mjs` 负责检查星球几何、地貌数据、地标资源、Worker 和交互契约；浏览器验收需要分别打开根路径和生态页确认 APP 页面与星球 iframe 都能加载。
