# LUNAR — Beyond the visible

一个独立的月球艺术展示项目，以 NASA LRO 月面数据与 NASA–IBM Lunar Foundation Model 为叙事背景。React + Vite + TypeScript + react-three-fiber + three.js + postprocessing。

![修复后的月面视角](docs/pace-detail-review/matched/50.png)

## 本地运行

要求 Node.js **22.12 或更高版本**。

```sh
cd /Users/steven/Projects/lunar-fm-website
npm install
npm run dev
```

打开终端输出的本地地址，通常是 http://127.0.0.1:5173/ 。所有纹理和字体均在项目内，无运行时 CDN 依赖。退出开发服务器使用 Ctrl+C。

```sh
npm run build
npm run preview
```

`package.json` 中所有直接依赖均使用精确版本，`package-lock.json` 固定传递依赖。CI 或要求严格按锁文件安装时使用 `npm ci`。

## 六幕与滚动

页面总长 1260svh。下降段单独增加滚动行程；下表为更新后的实际页面滚动位置。百分比指 `(scrollY / (documentHeight - viewportHeight))`，不是浏览器窗口高度。底部导航可前往各幕，也可用滚轮、触控、方向键、PageDown、Home、End 自由移动；没有 scroll-snap 或滚轮劫持。

| 实际滚动进度（内部叙事锚点） | 章节 | 画面 |
| --- | --- | --- |
| 0% | 启程 / Beyond the visible | 右侧完整月球、暖白斜照、左侧编辑式大标题 |
| 12.4%（18%） | 月面档案 / Every scar | 相机推进，月面放大，掠射光强化 LOLA 地形细节 |
| 65.1%（50%） | 立于月面 / So far. So home. | 新增 NAC 地表段，2.1 m 眼高回望地球 |
| 77.9%（68%） | 阴影之下 / Into the shadow | 月球移向左侧并倾斜展示南极，光线转冷暗，极区示意覆盖出现 |
| 89.0%（84%） | 连接线索 / Many signals | 镜头拉开，金色经纬网、扫描带与轨道线浮现 |
| 100% | 新的地平线 / A new perspective | 月球回到中央远景，模型链接与重新启程按钮出现 |

中间位置连续插值，相机、太阳方向、数据网格与文案交叉淡入共用一个带帧率无关指数阻尼的滚动进度。支持反向滚动、直接跳转和尺寸变化。减少动态效果偏好下去掉阻尼、动效过渡与颗粒；保留用户主动滚动的场景变化。

## 图形实现与结构

- 单一米制世界、单一相机、单一可见月面网格，没有局部场景 FBO、第二相机或两个球面的透明叠化。
- `src/scene/geography.ts`：从 GeoTIFF 的投影坐标反算经纬度，半径 1737400 m；LOLA → GLD100 → NAC 共用地理坐标和高程基准，无垂直夸张。非重叠嵌套网格增加近景密度，边缘奇数顶点落在父网格边上。
- `src/scene/flight.ts`：一条连续相机轨迹，对数高度的单调 Hermite 插值；近地面没有位置切换。沿程抬头看地球，再沿同一地理位置升空。
- `src/scene/planetMaterial.ts`：共享太阳方向，PBR 粗糙表面，按空间尺度过滤高程法线，影像高频细节和带限的毫米级程序化微法线。轨道远景降低超出像素尺度的几何法线细节，避免欠采样条纹。
- `src/scene/SurfaceJourney.tsx`：按需加载测量数据、地球与实例化碎石；统一深度缓冲、真实投影阴影。碎石是艺术补充，不能称为测量结果。
- `src/scene/LunarScene.tsx`：渲染与资源生命周期、动态裁剪面、对数深度、4× MSAA、Bloom、ACES、颗粒和暗角。DPR 上限 1.5。月球没有虚构大气壳；地球有薄层辉光。
- `src/timeline.ts`：原生滚动、帧率无关阻尼、DOM 文案与场景进度；支持反向滚动、键盘导航、减少动态效果和 WebGL 降级。
- `src/assets/SOURCES.md`、各 manifest：来源、处理方法、空间精度、SHA-256。

## 验证与逐帧证据

```sh
npm run build
LUNAR_TEST_PORT=4277 npm test
# 单独逐帧复查：先另开终端 npm run preview -- --port 4276 --strictPort
REVIEW_START=14 REVIEW_END=78 node scripts/review-scroll.mjs docs/pace-detail-review/forward 1
REVIEW_START=14 REVIEW_END=78 node scripts/review-scroll.mjs docs/pace-detail-review/reverse 1 --reverse
```

测试使用本机 Chrome 的实际 WebGL（自动化使用 SwiftShader，不代表硬件 GPU 性能）。测试自动启停独立的生产预览；上述命令使用 4277 端口，端口被占用时拒绝复用。

上一轮修复前和修复后均在 1200×800 的真实浏览器中，从 20% 到 66% 每 1% 截图一次。完整序列、相机/高度/资源诊断和错误列表保存在 [逐帧复查](docs/transition-review/index.html)，问题清单见 [复查记录](docs/transition-review/REVIEW.md)。手机布局、导航、弹窗、WebGL 降级、资源释放及重访另由 Playwright 覆盖。

## 科学表述与素材

Image credit: NASA / NASA’s Scientific Visualization Studio.

- [NASA SVS CGI Moon Kit](https://svs.gsfc.nasa.gov/4720/)：LROC彩色图、LOLA高程；彩色图为视觉呈现优化，非定量科学产品。
- [NASA–IBM模型集合](https://huggingface.co/collections/nasa-ibm-ai4science/nasa-ibm-lunar-fm-and-downstream-models)
- [技术报告](https://arxiv.org/abs/2609.13283)

这是独立艺术项目，非NASA或IBM官方产品。极区蓝色覆盖、扫描线、经纬网与坐标为艺术示意，不是实测冰、模型预测或实时地理定位。模型的冰潜力任务回归专家潜力图，不能当作已发现冰资源。没有使用、下载或依赖2.4GB机器学习权重。实际地形来自 NASA 数据；碎石、微法线和示意覆盖是明确标注的艺术补充。


## 地表段的滚动节奏与资源管理

下表为内部叙事进度，用于相机曲线；实际浏览器滚动比例见上方六幕表及本轮复查记录。

| 滚动进度 | 观察内容 |
| --- | --- |
| 18–20% | 预取局部数据，轨道中替换为同位置的高精度网格；任意时刻仅一张月面可见 |
| 20–31% | 连续飞向约 20.32° N、30.37° E 的固定位置，31% 高约 80 km |
| 31–39% | 80 km → 9 km → 1 km；GLD100 区域地形逐渐过渡到 NAC 小撞击坑 |
| 39–50% | 1 km → 110 m → 9 m → 2.1 m；俯视连续抬向坡面地平线 |
| 50–56% | 坑缘驻足，看向地球；细小碎石和接触阴影 |
| 56–68% | 连续升空，恢复轨道构图；没有两个球面交叉淡化 |
| 69.5% 之后 / 18% 之前 | 卸载局部资源；反向进入重新加载 |

局部影像覆盖固定走廊，并非全球在线 NAC 瓦片服务。新增 153.6 km 见方的 100 m WAC / GLD100 区域桥接层，四块 NAC 瓦片带 1 px gutter。高程与材质边界在同一地理坐标下平滑融合；全球网格在精细网格区域挖空，避免双层表面。

加载慢时，相机暂留高轨道，资源就绪后连续追上滚动位置；不会跳到空白地面。离开时取消请求、关闭 ImageBitmap、释放纹理/材质/几何/实例和局部阴影贴图，保留浏览器正常 HTTP 缓存。没有额外全屏 HDR 场景合成缓冲。手机 NAC 纹理解码为 512²；地形保持相同的实测高程基准。显存数字是对象与尺寸预算，不是驱动实际显存实测。

重建资源的可选 Python 工具在 `scripts/prepare-surface.py`、`prepare-regional.py` 和 `prepare-appearance.py`。未下载 27k 全球图或机器学习权重：27k 约 399 m/px，不能替代局部 0.6 m 影像和 2 m 源高程。影像高频提取只是艺术再光照方法，不是科学反照率反演。

## 本轮节奏与清晰度修复

[完整根因和验证记录](docs/pace-detail-review/REVIEW.md) · [三版逐帧对照 / 正反向播放器](docs/pace-detail-review/index.html)。

只有下降段增加滚动行程：中央区间每单位叙事进度的实际行程为之前的 2.5 倍，入口/出口使用平滑密度过渡，其他幕的像素行程保持原值。实际滚动约 14–65% 为轨道到地表，59–65% 为贴地减速缓冲，65–70% 为地表停留，70–78% 升空。

贴地恢复到 NAC 高精度瓦片内部、接近 04c35f5 的测量区域；继续使用同一个地理世界与相机。保留受限高频影像而不恢复照片大块阴影；缩窄清晰度混合带，恢复带限微法线与颗粒，并让近处地面进入镜头。碎石、微法线仍为艺术补充，原始 0.6 m 影像 / 2 m 源高程精度没有变化。

本轮测试使用独立端口：`LUNAR_TEST_PORT=4277 npm test`。逐帧复查使用自己启动的 `npm run preview -- --port 4276 --strictPort`，不会操作用户的 5173 服务。
