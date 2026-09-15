# 星球养成卡片背景资产

这组背景服务于「左侧信息 + 右侧模型球」的横向卡片，不包含文字、按钮、标签或模型球本体。

## 文件

| 阶段 | 文件 | 地貌表达 | 颜色基调 | 大小 |
| --- | --- | --- | --- | --- |
| L1 沧海纪 | `l1-ocean.webp` | 海底山脊与洋流 | 酸性青蓝、薄荷绿 | 900 × 500，12 KB |
| L2 露陆纪 | `l2-islands.webp` | 初生岩台与熔岩海岸 | 桃橙、青绿、深紫 | 900 × 500，24 KB |
| L3 山脉纪 | `l3-mountains.webp` | 冰川与岩脊 | 浅黄、淡紫、青蓝 | 900 × 500，23 KB |
| L4 江河纪 | `l4-riverlands.webp` | 河谷、台地与瀑布 | 酸性薄荷绿、青绿 | 900 × 500，26 KB |
| L5 丰壤纪 | `l5-terrain.webp` | 完整的山川、水系与高原 | 淡紫、青绿、珊瑚色 | 900 × 500，35 KB |

## 布局规则

- 左侧约 60% 是正文区，使用深色标题和描述。
- 模型球独立放在右侧中间；背景只从右上和右下边缘切入，不需要环绕球体。
- 资产内已带一层轻度浅色蒙层；实际页面仍可按文字内容追加 CSS 渐变蒙层。
- 推荐卡片宽高比约为 `1.8:1`，背景使用 `cover` 和 `center right` 定位。

```css
.planet-stage-card {
  background-image:
    linear-gradient(90deg, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.08) 58%, transparent 78%),
    url('/assets/card-backgrounds/l1-ocean.webp');
  background-position: center right;
  background-repeat: no-repeat;
  background-size: cover;
}
```

## 相邻阶段预加载

在进入阶段或切换阶段时，预加载当前、前一张和后一张，避免背景切换时出现空白。

```js
const stageBackgrounds = [
  '/assets/card-backgrounds/l1-ocean.webp',
  '/assets/card-backgrounds/l2-islands.webp',
  '/assets/card-backgrounds/l3-mountains.webp',
  '/assets/card-backgrounds/l4-riverlands.webp',
  '/assets/card-backgrounds/l5-terrain.webp',
];

const loaded = new Set();

function preloadBackground(src) {
  if (loaded.has(src)) return;
  loaded.add(src);
  const image = new Image();
  image.decoding = 'async';
  image.src = src;
  image.decode?.().catch(() => {});
}

export function preloadStageNeighbors(stageIndex) {
  [stageIndex - 1, stageIndex, stageIndex + 1]
    .filter((index) => index >= 0 && index < stageBackgrounds.length)
    .forEach((index) => preloadBackground(stageBackgrounds[index]));
}
```

对带版本号的生产静态资源，建议设置：

```http
Cache-Control: public, max-age=31536000, immutable
```
