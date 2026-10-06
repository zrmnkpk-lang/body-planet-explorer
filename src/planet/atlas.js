// Art/interaction atlas: descriptions point to the existing geographic anchors.
// New simulation features belong in GLM's backlog, not in the demo copy.
export const TERRAIN_ATLAS = [
  { id: "range", title: "山脉与层岩", landmark: "basalt-ridge", distance: 2.12, body: "肌肉 · 造山带", layer: "生态 → 地表", appearance: "连续主脊、宽缓山麓与裸露岩层；高处出现破碎雪线。近看层岩山脊，可辨认错落的柱状岩壁。", weather: "高空风带经过山系，云层随缩放减弱，保留山脊轮廓。", boundary: "地形由共享高度场生成；没有实时板块运动或侵蚀模拟。", detail: true },
  { id: "river", title: "河流与湖泊", landmark: "living-river", distance: 2.12, body: "水分 · 水系", layer: "气候 → 地表", appearance: "主河道连接弯曲支流，向下游渐宽；河床与水面共用路径。湖岸有凹口、浅滩和深浅水色。", weather: "河面有朝下游的细微流纹，雨区的降雨是独立视觉效果。", boundary: "河流按规划流域生成，雨水不会实时改变湖泊水位。", detail: true },
  { id: "woodland", title: "森林与草原", landmark: "monsoon-forest", distance: 2.12, body: "体脂 · 季风大陆", layer: "生态 → 地表", appearance: "林地按湿度、海拔和坡度聚集；四种针叶树轮廓交错，坡顶留白，林缘过渡到草原。", weather: "季风流带经过湿润大陆，局部风暴周期出现。", boundary: "植被是固定种子实例；阔叶树、季节生长、落叶和风摆动画尚未实现。", detail: true },
  { id: "shore", title: "海岸与群岛", landmark: "star-chain-islands", distance: 2.78, body: "水分 · 大陆架", layer: "板块 → 生态", appearance: "曲折海湾、半岛与岛弧连接深浅海；海岸线沿真实高度场零等高线生成。", weather: "海面流纹随时间变化，远处有浅薄云层。", boundary: "有火山岛弧的外形，尚无火山口、熔岩或喷发效果。", detail: true },
  { id: "arid", title: "荒漠与高原", landmark: "red-sand-continent", distance: 2.12, body: "肌肉地貌 / 气候过渡", layer: "板块 → 地表", appearance: "低饱和赭色沙地与层状岩台，裸岩和草原逐渐过渡，植被稀疏。", weather: "干旱区抑制常规雨云分布；全球风带仍可经过。", boundary: "目前没有独立沙尘暴、沙丘迁移或地表扬尘。", detail: true },
  { id: "ice", title: "冰盖与峡湾", landmark: "glacier-tongue", distance: 2.12, body: "骨量 · 极地", layer: "板块 → 地表", appearance: "冷白冰原、冰脊、蓝灰裂隙与淹没峡谷。冰舌由宽阔错层冰台组成，保留深色缝隙。", weather: "极地气旋的云墙与螺旋风线出现；其附近排开普通云，不联动雷雨。", boundary: "静态冰雪地貌已实现；动态降雪、积雪与融冰变化未实现。", detail: true },
  { id: "wetland", title: "湿地与河岸", landmark: "wetland-bank", distance: 1.7, body: "水分 · 湿润地带", layer: "地表", appearance: "低洼河岸和湖缘分布浅水、草甸与不规则芦苇群；水岸轮廓共用湖盆数据。", weather: "附近可看到季风与雨幕，当前不模拟洪水。", boundary: "芦苇是地表实例；晨雾与水面蒸腾尚未实现。", detail: true },
  { id: "ocean", title: "开放海洋", landmark: "open-ocean", distance: 3.45, body: "水分 · 深蓝寰海", layer: "天际 → 气候", appearance: "深蓝大洋保留大面积平静区域，靠近海岸逐渐转为青蓝大陆架，表面有克制的流场纹理。", weather: "全球风带经过海面；另一处海洋气旋在指定海域周期生成。", boundary: "洋流为着色器流纹，没有流体求解、潮汐或真实波浪位移。", detail: false },
]

export const WEATHER_ATLAS = [
  { id: "clouds", title: "晴空薄云", location: [6, 65], distance: 3.45, layer: "天际 / 板块", body: "全球大气", appearance: "大、中、小云簇以固定种子分布并缓慢漂移；本轮缩小云体与厚度，让地貌成为主体。", weather: "靠近地表时逐步降低不透明度。", boundary: "云形为实例化几何与着色器，不是体积云模拟。" },
  { id: "wind", title: "全球风带", location: [20, 65], distance: 2.78, layer: "气候", body: "全球大气", appearance: "520 条 GPU 风线按纬度流动，渐入渐出，经过气旋时向旋涡汇聚。", weather: "缩放到气候层最容易观察，风线不代表实测风速。", boundary: "固定风场的艺术动画，没有数值天气预测。" },
  { id: "monsoon", title: "季风流带", location: [-18, 27], distance: 2.78, layer: "气候 / 生态", body: "季风大陆", appearance: "120 条季风带形成连续弧线，经过森林与湿润大陆。", weather: "与全球细风线共同呈现流动方向。", boundary: "当前流带独立播放，不由训练、体脂或真实季节驱动。" },
  { id: "storm", title: "局地雷雨", location: [15, 12], distance: 2.78, layer: "气候 / 生态", body: "四处局地风暴", appearance: "暗色云团、720 条雨线和 25 组闪电共享局地风暴时序；四处风暴独立生灭。", weather: "每处周期约 20–30 秒，活跃约 10–15 秒；切到这里后可能需要等待一个周期。", boundary: "降雨不改变河流水量；减少动态效果时关闭闪电。" },
  { id: "ocean-cyclone", title: "海洋气旋", location: [5, -85], distance: 2.78, layer: "气候", body: "大洋天气", appearance: "移动的螺旋云墙与风线周期生成，逐渐增强、漂移、衰减；附近的活跃雷雨可以使其变暗并增强雨电。", weather: "固定 30 秒周期，每轮活跃约 15 秒，大小和移动方向按种子变化。", boundary: "只有邻近活跃风暴才联动，不是全局持续强风暴。" },
  { id: "polar-cyclone", title: "极地气旋", location: [79, -55], distance: 2.78, layer: "气候", body: "极地大气", appearance: "淡色螺旋云墙沿极地移动，周围普通云和雷雨云被让开，可观察冰盖与旋流关系。", weather: "与海洋气旋错相运行，同为 30 秒周期。", boundary: "极地气旋不触发雷雨加深；目前没有暴风雪粒子。" },
  { id: "currents", title: "洋流与河面流纹", landmark: "living-river", distance: 1.9, layer: "生态 / 地表", body: "水分的视觉语义", appearance: "海面有两组交叉流纹；河道有沿下游推进的轻微纹理，形状与水位保持稳定。", weather: "靠近时河面流动更明显；减少动态效果时水面流动冻结。", boundary: "不是血流测量、潮汐或流体仿真。" },
]
