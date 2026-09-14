# Body Planet Explorer

一个可旋转、缩放和点击探索的身体成分星球原型。项目使用 Three.js 生成自然地貌，并使用 HTML 图层显示可编辑地点标注。

## 运行

```bash
npm install
npm run dev
```

打开终端提示的本地地址。生产构建：

```bash
npm run build
npm run preview
```

## 修改地点名称

所有地点都在 [src/landmarks.js](src/landmarks.js) 中。修改 `name` 即可更换悬浮文字：

```js
{
  id: "polar-glacier",
  name: "冰川",
  type: "glacier",
  latitude: 70,
  longitude: 4,
  altitude: 1.17,
  minDetailLevel: 0
}
```

- `latitude`：纬度，范围 -90～90。
- `longitude`：经度，范围 -180～180。
- `altitude`：标签锚点与星球中心的距离。
- `minDetailLevel: 0`：全景显示。
- `minDetailLevel: 1`：靠近星球后显示。
- `description`：地形定义，后续可用于详情卡。

标签采用 HTML DOM 渲染，再从三维球面坐标投影到屏幕。它们不会烘焙进地表贴图，因此可以独立改名、移动、隐藏或接入多语言。

## 地形定义

| 类型 | 当前含义 | 视觉规则 |
| --- | --- | --- |
| glacier | 北部永久冰川和浮冰带 | 骨白、冷灰蓝、断裂棱面 |
| ocean | 大陆之外的开放水域 | 深靛蓝、稀疏洋流线 |
| river | 冰川流向南部生态大陆的水道 | 冷青色连续曲线 |
| forest | 季风大陆上的成片森林 | 灰绿、松针状植被群 |
| desert | 造山带周围的干旱高原 | 铜橙和褐色层叠岩台 |

## 主要文件

- `src/app.js`：星球、地形、相机、交互和标注投影。
- `src/landmarks.js`：地点名称、坐标和显示层级。
- `src/styles.css`：界面和悬浮标签样式。
- `index.html`：页面入口。

## 交接给其他 Agent

请告诉 Agent：

> 保留星球的旋转、缩放、点击和 LOD 行为。地点名称只改 src/landmarks.js 的 name 字段；新增地点也应写入该配置。悬浮标注必须继续使用 HTML DOM，不要写进 CanvasTexture 或地表贴图。背面地点自动隐藏，minDetailLevel=1 的地点只在近景出现。
