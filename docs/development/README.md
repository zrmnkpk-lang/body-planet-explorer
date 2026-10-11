# Portal Fitness 正式开发 V1

开发目录：`D:\AIworkspace\portal-fitness-app`。独立 Git 仓库，分支 `codex/portal-fitness-development`。源目录 `D:\AIworkspace\myplanet` 保持原状。

## 基线与设计

本项目复制原项目的实际工作区，而不是只取旧的 Git 提交。包含最新未提交的连续山脊、河流、冰川、植被、地标、着色器和地形校验脚本。`baseline.json` 保存逐文件 SHA256、源提交和源 Git index 指纹；独立仓库的首个提交是复制基线。

交互与状态依据：[Portal Fitness 正式交互稿 V1](https://www.figma.com/design/ccBI9Wxbj1gTnZI9D6yplY)。视觉依据为用户确认的 [Home / Account / AI V6](../visual-interactions/2026-10-11/03-home-account-membership-v6.png)、[Body Planet V5](../visual-interactions/2026-10-11/02-body-planet-linked-data-v5.png) 和 [Train V2](../visual-interactions/2026-10-07/03-train-free-add-planned-session-v2.png)。首轮正式稿转换曾简化颜色、图标和材质，本次按照已确认概念稿恢复这些视觉层次；原生 Figma V1 中旧的平色样式不再作为本开发版视觉的唯一依据。

实现使用 React 19、Vite、Tailwind v4、Inter 本地字体和 Lucide 图标，保留原来的 `src/main.tsx → ./App.tsx` 显式入口，避免与独立星球的 `src/app.js` 混淆。不是整页图片贴图。对照、素材及生成提示词见 [视觉修正记录](visual-refinement/2026-10-11/README.md)。

| 区域 | 实际运行功能 |
|---|---|
| Home | 四张核心卡片、真实星球缩略预览、今日计划展开/编辑、历史、提醒空态、小头像账户入口 |
| Train | 无计划自由训练、有计划内容预览、动作搜索与多选、组数、计时、休息、暂停/恢复、刷新继续、完整/部分完成保存 |
| Body Planet | 同一真实渲染器、球体无人物、半身分析插画、指标选择和区域聚焦、缩放/复位/键盘/触控、输入校验、草稿取消、保存后真实地貌重建 |
| AI Coach | 全局快捷入口、来源上下文、共享会话与输入草稿、会话历史、服务不可用/生成/停止/失败重试、建议计划审阅/版本冲突/明确保存 |
| Account | 左侧抽屉、账户编辑、减少动态效果设置、会员入口及套餐不可用状态；无 weekly goal |

正式稿的 89 个画面是可交互状态参考，不是 89 个固定网页；通过共享状态机实现计划版、自由版、15 分钟版、不同指标、不同错误/加载/空状态。页面覆盖映射见 `interaction-coverage.json`。

## 运行与验证

```powershell
cd D:\AIworkspace\portal-fitness-app
npm ci
npm run dev
```

浏览器：`http://127.0.0.1:8445/`。四个入口可直接使用 `#home`、`#train`、`#body`、`#coach`。独立星球仍为 `/planet.html`，APP 内使用 `/planet.html?mode=app&embed=1`。开发环境使用自己的 8445 端口。

```powershell
npm run typecheck
node scripts/sync-planet-atlas.mjs
npm run build
node scripts/validate-planet.mjs
node scripts/coach-adapter-test.mjs
$env:NO_PROXY='127.0.0.1,localhost,::1'
npm test
node scripts/visual-smoke.mjs
```

Playwright 首次使用可运行 `npx playwright install chromium`。Windows 验证脚本也可使用已有 Codex Chromium 缓存；可用 `PLAYWRIGHT_CHROMIUM_EXECUTABLE` 指定浏览器。科学地形校验和真实浏览器检查分别记录，不把构建成功当作视觉验收。

生产本地启动：`npm run build` 后 `npm start`。Node 静态服务器同样提供 `/api/coach`，密钥只留在服务器。没有自动对外部署。

## 真实星球替换

Home 与 Body Planet 都嵌入最新 `src/app.js` 的 Three.js 场景，而不是概念图。同一高度场驱动全局地形、局部地形、河道、植被、地标和拾取；嵌入模式隐藏独立图鉴的旧面板，界面控件通过严格同源消息连接。首页缩略预览采用低细节级别；Body Planet 在后台加载 63 级网格。APP 限制渲染帧率与高细节网格，独立图鉴保留精细探索模式。

保存身体数据后，新的数值通过 iframe URL 传入；主线程和 worker 使用同一组参数重新构建真实几何。不是只修改卡片文字或换一张球体图片。原先的默认地形保持不变：

| 身体数据 | 几何/生态联动 | V1 可视化参数 |
|---|---|---|
| Muscle | 山地与连续山脊高度 | `clamp(muscle / 32.8, 0.65, 1.65)` |
| Water | 河谷与实际河道宽度 | `clamp(water / 58.3, 0.65, 1.45)` |
| Bone | 冰原高原起伏 | `clamp(bone / 3.1, 0.65, 1.65)` |
| Body fat | 地表湿度、森林分布 | `clamp((18.7 - fat) / 100, -0.25, 0.18)` |

这些是艺术参数，不是测量算法或健康评价；不会据此诊断用户。百分比输入接受 0–100；kg 输入要求大于 0、最多 500。保存后才发布，取消和保存失败保留原值。WebGL 不可用/上下文丢失/超时有明确错误与重试，不自动用静态概念图冒充真实替换。

## 数据与训练规则

`portal-fitness:v1` 为独立 localStorage key，源应用的数据不受影响。首个展示采用批准稿中的 Alex、20 分钟计划、身体样例数值和 320 XP；历史样例明确标注 Sample。后续记录来自实际操作。账户和测量当前为本地资料，尚未配置云登录、身体测量硬件、通知推送服务。

活动训练保存独立动作快照，编辑今日计划不会覆盖进行中的训练。暂停冻结时间；运行中的时间使用实际时间戳，刷新和切换页面后可继续。完成组数决定完整/部分完成；空训练只能丢弃。以 session ID 防重复保存；存储成功后才发布状态。

V1 开发规则暂定完整训练 +20 XP、部分训练 +0 XP，沿用设计样例 LV.5 / 800 XP 展示；最终跨时代升级与长期奖励规则仍待产品确定。计划时间是训练目标，休息与动作间分配按比例估计，实际训练时间取计时器，不伪造完成分钟数。每日计划有日期与版本检查。

## AI Coach 接口

当前未提供真实 AI 服务地址，因此界面明确显示服务未连接；没有本地编造的智能回复。配置服务后 UI 可直接调用。自动化测试中的响应替身只验证接口和审阅流程，不代表已连接真实模型。

复制 `.env.example` 为 `.env`，设置仅服务器读取的 `COACH_SERVICE_URL` 与可选 `COACH_SERVICE_KEY`，重启服务。地址指向健身 agent 的 HTTP JSON 适配接口；密钥通过服务器 Authorization 请求头传入，不使用 `VITE_` 前缀。

请求：

```json
{
  "messages": [{"role":"user","content":"I only have 15 minutes"}],
  "context": {"source":"train","body":{},"plan":{},"activeWorkout":null},
  "exerciseIds": ["arm-circles","squat","push-up","plank","stretch"]
}
```

响应：

```json
{
  "content":"Review this shorter workout before saving.",
  "plan":{"duration":15,"exerciseIds":["arm-circles","squat","push-up","plank","stretch"]}
}
```

`plan` 可省略。动作必须来自已知目录，时间范围 5–180 分钟，重复/未知动作被拒绝。服务不能直接执行本地计划写入；用户必须先 Review changes 再 Save。日期或版本改变时会提示重新审阅。服务器有请求体大小、来源、角色和响应校验、60 秒超时；客户端 Stop 会中断请求。

## 资源与边界

`public/assets/companions/` 的 Maya 运动半身、半透视身体分析和 Alex 头像均来自正式 Figma 设计使用的独立透明 PNG，复制哈希可追踪；不是整页截图，也没有真人照片。`public/assets/visual-v2/` 为参照确认稿生成并实际接入的身体彩色图标 atlas、Maya 动作 atlas 和山地背景；角色与数据图标使用图片，通用操作与导航采用 Lucide。真实星球使用 `public/assets/landmarks/` 原 GLB 与程序地貌；背景插画不替代 3D 地形。Inter 来自 @fontsource/inter；favicon 为该库 Globe2。

会员页面按正式稿保留“套餐不可用”，未虚构价格或接入支付；账户云同步、真实 AI 提供者、测量硬件与商店支付属于后续服务接入工作。当前交付是可运行、可验证的正式开发版本，不代表已上线欧美市场。
