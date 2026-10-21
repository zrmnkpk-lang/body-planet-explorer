# Portal Fitness · APP 界面与图片规范

## 设计原则

参考 Apple Human Interface Guidelines 的信息层级、材质、触控和可访问性原则，使用网页组件实现；保留原有深色运动品牌、人物插画和真实 3D 星球。

1. 内容层使用稳定的深色表面，依靠间距、字号和亮度区分层级。玻璃效果仅用于底部导航；内容卡片不叠加大面积模糊。
2. 一张卡片围绕一个主题，保留一个主要动作。主要按钮使用品牌浅绿，次要动作使用中性底色或文字。
3. 导航选中态同时使用文字、颜色和背景区分。按压有轻微的缩放与底色反馈；键盘焦点清晰可见。
4. 表单与弹层采用一致的输入框、关闭按钮、底部安全区和抽屉／底部面板行为。

下表是本项目的组件标注值，属于对 HIG 原则的适配，并非 Apple 对所有 APP 的强制尺寸。

| 项目 | 本项目标注 |
| --- | --- |
| 基础间距 | 4 / 8 / 12 / 16 / 24 px |
| 页面左右边距 | 16 px；360 px 以下为 12 px |
| 一级标题 | 28 / 34 px，半粗体；首页问候 26 / 32 px |
| 模块标题 | 19 / 24 px，半粗体 |
| 正文 / 次级正文 | 15 px / 13 px；紧凑数据标签 11 px |
| 内容卡片 | 22 px 圆角、14 px 内边距、12 px 卡片间距 |
| 数据单元格 | 13 px 圆角，使用较浅底色；选中时单层描边 |
| 按钮 | 46 px 高，14 px 圆角；点击区域至少 44 × 44 px |
| 图标 | 导航 23 px；同一组使用一致的线宽 |
| 底部导航 | 64 px 高，25 px 圆角，独立半透明导航层 |
| 底部面板 | 顶部 28 px 圆角，拖动提示条，适配安全区 |
| 动效 | 控件 160 ms，面板进入 240 ms；尊重减少动态效果设置 |
| 字体 | 系统字体栈；Apple 设备优先系统字体，免下载字体文件 |

支持 `prefers-reduced-motion`、应用内减少动态效果、`prefers-reduced-transparency` 和高对比偏好。关键操作保留原有语义、焦点恢复与表单验证。

## 图片交付

以实际显示宽度生成 WebP，保留透明通道。使用 `srcSet` / `sizes` 选择合适版本，图片声明固有尺寸并异步解码；首页人物优先下载，其余人物按需加载。

| 资源 | 显示宽度 | 输出宽度 | 输出体积 |
| --- | --- | --- | --- |
| Alex 头像 | 34–58 px | 96 / 192 px | 4.3 / 10.6 KB |
| Maya 训练人物 | 144–168 px | 320 / 480 px | 36.1 / 64.6 KB |
| Maya 身体分析人物 | 72–88 px | 192 / 288 px | 22.5 / 40.2 KB |
| 山地背景 | 按视口裁切 | 960 / 1440 px | 52.3 / 99.2 KB |
| 四指标图集 | 单格 22–32 px | 整图 256 px | 15.8 KB |
| 九动作图集 | 单格 54–180 px | 整图 576 / 1080 px | 75.6 / 211.3 KB |

原 6 张运行时 PNG 共 10,167,482 bytes，全部 11 个 WebP 版本共 632,556 bytes，减少 93.8%。这是资源体积对比，不代表已测得相同比例的加载时间缩短。390 px / 2× 首页主体插画和图标约 84.7 KB（不含 JavaScript 和 3D 资源）；训练动作图集不会在首页请求。

图片使用带内容哈希的 URL 和一年 immutable 缓存；HTML 必须重新验证，确保发布后获取新文件名。非哈希资源使用短缓存，支持 ETag / 304。地标 GLB、地形 Worker 和星球渲染器保持原有行为。

源 PNG 可从 Git 提交 `9d06632dacc384b30da3eb6307434d3ad4499bab` 恢复；不再放入运行时 `public` 目录。生成方法：

```bash
python scripts/optimize-app-images.py
npm run typecheck
npm run build
```

需要 Python Pillow。原图和生成文件的精确映射、尺寸与字节数见 `image-budget.json`。文档与未被页面引用的历史设计图不计入运行时图片预算。

## 参考

- [Apple HIG · Materials](https://developer.apple.com/design/human-interface-guidelines/materials)
- [Apple HIG · Layout](https://developer.apple.com/design/human-interface-guidelines/layout)
- [Apple HIG · Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)
- [Apple HIG · Typography](https://developer.apple.com/design/human-interface-guidelines/typography)
