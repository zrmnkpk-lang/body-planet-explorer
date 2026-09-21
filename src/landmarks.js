/**
 * 地点标注的唯一数据源。
 *
 * 修改 name 即可重命名悬浮文字，不需要修改 Three.js 场景。
 * latitude / longitude 控制球面位置。
 * altitude 控制锚点离球心的距离。
 * minDetailLevel: 0 = 全景可见，1 = 靠近后可见。
 */
export const LANDMARKS = [
  {
    id: "basalt-ridge",
    name: "层岩山脊",
    type: "desert",
    latitude: 27,
    longitude: -36,
    altitude: 1.18,
    minDetailLevel: 1,
    description: "造山带中的层状裸岩地标",
    model: "/assets/landmarks/basalt.glb",
    modelScale: 0.018,
  },
  {
    id: "glacier-tongue",
    name: "裂隙冰舌",
    type: "glacier",
    latitude: 68,
    longitude: 9,
    altitude: 1.12,
    minDetailLevel: 1,
    description: "极地冰盖边缘的破碎冰舌",
    model: "/assets/landmarks/glacier.glb",
    modelScale: 0.014,
  },
  {
    id: "polar-glacier",
    name: "冰川",
    type: "glacier",
    latitude: 70,
    longitude: 4,
    altitude: 1.18,
    minDetailLevel: 0,
    description: "位于北部极区的永久冰川与浮冰带",
  },
  {
    id: "open-ocean",
    name: "海洋",
    type: "ocean",
    latitude: 6,
    longitude: 104,
    altitude: 1.08,
    minDetailLevel: 0,
    description: "大陆以外的深蓝色开放水域",
  },
  {
    id: "living-river",
    name: "河流",
    type: "river",
    latitude: 18,
    longitude: 9.48,
    altitude: 1.16,
    minDetailLevel: 0,
    description: "由北部冰川流向季风大陆的主要水道",
  },
  {
    id: "monsoon-forest",
    name: "森林",
    type: "forest",
    latitude: -18,
    longitude: 29,
    altitude: 1.17,
    minDetailLevel: 1,
    description: "季风大陆中部的森林和生态储备区域",
  },
  {
    id: "western-desert",
    name: "荒漠",
    type: "desert",
    latitude: 10,
    longitude: -42,
    altitude: 1.17,
    minDetailLevel: 1,
    description: "造山带西侧的干旱高原与裸露岩层",
  },
]

export const TERRAIN_TYPES = {
  glacier: {
    displayName: "冰川",
    definition: "永久积雪、冰盖和破碎浮冰组成的高纬地貌",
    color: "#c5d3df",
  },
  ocean: {
    displayName: "海洋",
    definition: "大陆轮廓以外、具有洋流纹理的开放水域",
    color: "#366b83",
  },
  river: {
    displayName: "河流",
    definition: "从极地冰川汇入湖泊并流向南部大陆的连续水系",
    color: "#65ccc8",
  },
  forest: {
    displayName: "森林",
    definition: "灰绿色针叶植被和生态群落集中分布的区域",
    color: "#648069",
  },
  desert: {
    displayName: "荒漠",
    definition: "降水稀少、以铜橙色岩台和裸露峡谷为主的区域",
    color: "#b87955",
  },
}
