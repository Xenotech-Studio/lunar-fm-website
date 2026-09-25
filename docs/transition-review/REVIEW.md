# 月面连续过渡修复记录

## 检查方法

修改代码前，使用 Playwright 驱动真实 Chrome / WebGL，在 1200×800 视口按 1% 步长记录 20%–66%，共 47 张截图，并逐张查看。完整原图在 `before/20.png` 至 `before/66.png`；联络表按顺序覆盖所有帧，并非精选图。

修复后以相同视口和步长通过真实滚轮重新检查，等待 DOM 阻尼进度及相机进度达到目标后截图；`after/` 是正向序列，`reverse/` 是反向序列。每轮 `frames.json` 保存实际相机位置、四元数、高度、纹理数量、可见月面数量和浏览器错误列表。浏览器使用软件 WebGL，不能据此推断真实 GPU 帧率。

[打开完整逐帧对照播放器](index.html)。播放器支持左右键、进度拖动、自动逐帧播放，以及修复前/后同位置对照。

## 修改前亲眼观察到的问题

| 进度 | 具体问题 |
| --- | --- |
| 26–32% | 全球月球与局部地面各走一套相机；矩形高精度区域浮在另一片粗糙地面上，地理特征对不上 |
| 33–37% | 瓦片清晰度边界显眼，区域像贴在表面的一块面板 |
| 38–44% | 影像原有阴影被放大，与新太阳方向和地形光照叠加，形成模糊黑斑 |
| 45–52% | 大块重复碎石、多边形外观和缺少接触阴影削弱真实感；坡面缺少有辨识度的实测特征 |
| 53% | 镜头穿过一块前景石头 |
| 62–63% | 局部地形还没退出，另一个不同朝向的完整月球已经叠入，明显双重表面 |

## 修复

1. 删除双场景、独立局部相机与 FBO 交叉淡化。月球固定在米制世界内；一个相机从轨道连续飞向同一个经纬度，最终回到轨道。不同分辨率几何在高轨道切换，任意时刻只有一个可见月面网格。
2. 用 NAC GeoTIFF 投影参数反算实际经纬度，统一 1737400 m 半径和高程基准。全球网格为精细区域留孔，嵌套环网格不重叠；细边顶点对齐父网格边，边界高程与法线过渡一致。
3. 新增真实 WAC / GLD100 100 m 区域数据，桥接全球 LOLA 和局部 NAC。采用固定走廊按需加载，不把局部高精度误称为全球高精度。
4. 全程共享一个太阳方向和材质体系。提取影像受限高频信息、衰减低频拍摄阴影的影响；近地面逐渐减少被过度放大的影像细节，补以明确标注的程序化微法线。未从单张照片科学反演反照率。
5. 改为实测小坑的坑缘视点。缩小、减少大块石头，采用多种形状与尺度、实例化、统一投影/接触阴影；固定 2.1 m 驻足眼高，镜头周围留出安全距离。
6. 迭代中发现粗网格法线欠采样导致的放射条纹，按空间尺度过滤，并在轨道距离衰减无法正确采样的法线细节。发现垂直俯视的 up 方向退化，改用月面北向作为俯视参考。后者另以 0.01% 步长测试桌面/手机完整轨迹。
7. 退出范围释放局部纹理、ImageBitmap、几何、实例、材质和阴影贴图；取消未完成请求。无需独立全屏场景合成缓冲。

## 最终序列检查位置

- 20–31%：完整月球到区域地形，查看是否有第二球面、矩形面板或法线条纹。
- 32–43%：连续跟踪同一小撞击坑放大，检查地理位置、光照和分辨率衔接。
- 44–49%：检查俯视到地平线的抬头过程，是否穿地、穿石或突然转向。
- 50–56%：坑缘、实测山坡、碎石阴影与地球同处一个深度世界。
- 57–66%：连续升空，重点检查原来 62–63% 的双月球位置。

## 数据与呈现边界

全球底图仍为 4K；区域数据为 100 m，NAC 原影像最高 0.6 m/px、源高程 2 m/post，浏览器高程采样 2.4 m。各层的解析能力不同，远处仍会比固定 NAC 走廊柔和；没有伪称全球都达到亚米级。碎石和毫米级纹理为艺术补充，不是测量所得。地球大小/距离保持真实角尺度，方位是已在页面标注的艺术构图。

高频处理、LOD 过滤和边界融合是展示方法，不等于定量科学数据融合。地平线受真实坡面遮挡，没有人为拉弯月球曲率。

## 构建与测试结果

- `npm run build`：通过，日志 [build.log](build.log)。
- `LUNAR_TEST_PORT=4183 npm test`：全部 5 项通过，日志 [tests.log](tests.log)。端口变量仅让测试和逐帧预览互不占用端口；默认 `npm test` 使用 4173。
- 覆盖桌面导航/弹窗、手机/减少动态、WebGL 降级、地表按需加载/释放/重访，以及桌面/手机相机按 0.01% 步长的连续性与基准地面高度检查。
- 正向 47 帧：JS / shader / 控制台错误 0；每帧可见月面数量 1；相机进度与目标进度最大偏差 0.0045 个百分点。
- 反向 47 帧也已逐张查看：浏览器错误 0、可见月面数量始终为 1；未发现反向触发的叠面、位置突换或穿石。汇总见 [verification.json](verification.json)。
- 16 条素材 SHA-256 校验全部通过；`git diff --check` 无空白错误。
- 完整重跑前曾遇到软件 WebGL 并行截图下的单项 90 秒总时限，调为 180 秒后保留全部断言通过；没有放宽资源回收或无错误断言。

## 各进度截图路径

相对于本目录；点击可查看原始 1200×800 截图。

| 进度 | 修改前 | 最终正向 | 最终反向 |
| --- | --- | --- | --- |
| 20% | [before/20.png](before/20.png) | [after/20.png](after/20.png) | [reverse/20.png](reverse/20.png) |
| 21% | [before/21.png](before/21.png) | [after/21.png](after/21.png) | [reverse/21.png](reverse/21.png) |
| 22% | [before/22.png](before/22.png) | [after/22.png](after/22.png) | [reverse/22.png](reverse/22.png) |
| 23% | [before/23.png](before/23.png) | [after/23.png](after/23.png) | [reverse/23.png](reverse/23.png) |
| 24% | [before/24.png](before/24.png) | [after/24.png](after/24.png) | [reverse/24.png](reverse/24.png) |
| 25% | [before/25.png](before/25.png) | [after/25.png](after/25.png) | [reverse/25.png](reverse/25.png) |
| 26% | [before/26.png](before/26.png) | [after/26.png](after/26.png) | [reverse/26.png](reverse/26.png) |
| 27% | [before/27.png](before/27.png) | [after/27.png](after/27.png) | [reverse/27.png](reverse/27.png) |
| 28% | [before/28.png](before/28.png) | [after/28.png](after/28.png) | [reverse/28.png](reverse/28.png) |
| 29% | [before/29.png](before/29.png) | [after/29.png](after/29.png) | [reverse/29.png](reverse/29.png) |
| 30% | [before/30.png](before/30.png) | [after/30.png](after/30.png) | [reverse/30.png](reverse/30.png) |
| 31% | [before/31.png](before/31.png) | [after/31.png](after/31.png) | [reverse/31.png](reverse/31.png) |
| 32% | [before/32.png](before/32.png) | [after/32.png](after/32.png) | [reverse/32.png](reverse/32.png) |
| 33% | [before/33.png](before/33.png) | [after/33.png](after/33.png) | [reverse/33.png](reverse/33.png) |
| 34% | [before/34.png](before/34.png) | [after/34.png](after/34.png) | [reverse/34.png](reverse/34.png) |
| 35% | [before/35.png](before/35.png) | [after/35.png](after/35.png) | [reverse/35.png](reverse/35.png) |
| 36% | [before/36.png](before/36.png) | [after/36.png](after/36.png) | [reverse/36.png](reverse/36.png) |
| 37% | [before/37.png](before/37.png) | [after/37.png](after/37.png) | [reverse/37.png](reverse/37.png) |
| 38% | [before/38.png](before/38.png) | [after/38.png](after/38.png) | [reverse/38.png](reverse/38.png) |
| 39% | [before/39.png](before/39.png) | [after/39.png](after/39.png) | [reverse/39.png](reverse/39.png) |
| 40% | [before/40.png](before/40.png) | [after/40.png](after/40.png) | [reverse/40.png](reverse/40.png) |
| 41% | [before/41.png](before/41.png) | [after/41.png](after/41.png) | [reverse/41.png](reverse/41.png) |
| 42% | [before/42.png](before/42.png) | [after/42.png](after/42.png) | [reverse/42.png](reverse/42.png) |
| 43% | [before/43.png](before/43.png) | [after/43.png](after/43.png) | [reverse/43.png](reverse/43.png) |
| 44% | [before/44.png](before/44.png) | [after/44.png](after/44.png) | [reverse/44.png](reverse/44.png) |
| 45% | [before/45.png](before/45.png) | [after/45.png](after/45.png) | [reverse/45.png](reverse/45.png) |
| 46% | [before/46.png](before/46.png) | [after/46.png](after/46.png) | [reverse/46.png](reverse/46.png) |
| 47% | [before/47.png](before/47.png) | [after/47.png](after/47.png) | [reverse/47.png](reverse/47.png) |
| 48% | [before/48.png](before/48.png) | [after/48.png](after/48.png) | [reverse/48.png](reverse/48.png) |
| 49% | [before/49.png](before/49.png) | [after/49.png](after/49.png) | [reverse/49.png](reverse/49.png) |
| 50% | [before/50.png](before/50.png) | [after/50.png](after/50.png) | [reverse/50.png](reverse/50.png) |
| 51% | [before/51.png](before/51.png) | [after/51.png](after/51.png) | [reverse/51.png](reverse/51.png) |
| 52% | [before/52.png](before/52.png) | [after/52.png](after/52.png) | [reverse/52.png](reverse/52.png) |
| 53% | [before/53.png](before/53.png) | [after/53.png](after/53.png) | [reverse/53.png](reverse/53.png) |
| 54% | [before/54.png](before/54.png) | [after/54.png](after/54.png) | [reverse/54.png](reverse/54.png) |
| 55% | [before/55.png](before/55.png) | [after/55.png](after/55.png) | [reverse/55.png](reverse/55.png) |
| 56% | [before/56.png](before/56.png) | [after/56.png](after/56.png) | [reverse/56.png](reverse/56.png) |
| 57% | [before/57.png](before/57.png) | [after/57.png](after/57.png) | [reverse/57.png](reverse/57.png) |
| 58% | [before/58.png](before/58.png) | [after/58.png](after/58.png) | [reverse/58.png](reverse/58.png) |
| 59% | [before/59.png](before/59.png) | [after/59.png](after/59.png) | [reverse/59.png](reverse/59.png) |
| 60% | [before/60.png](before/60.png) | [after/60.png](after/60.png) | [reverse/60.png](reverse/60.png) |
| 61% | [before/61.png](before/61.png) | [after/61.png](after/61.png) | [reverse/61.png](reverse/61.png) |
| 62% | [before/62.png](before/62.png) | [after/62.png](after/62.png) | [reverse/62.png](reverse/62.png) |
| 63% | [before/63.png](before/63.png) | [after/63.png](after/63.png) | [reverse/63.png](reverse/63.png) |
| 64% | [before/64.png](before/64.png) | [after/64.png](after/64.png) | [reverse/64.png](reverse/64.png) |
| 65% | [before/65.png](before/65.png) | [after/65.png](after/65.png) | [reverse/65.png](reverse/65.png) |
| 66% | [before/66.png](before/66.png) | [after/66.png](after/66.png) | [reverse/66.png](reverse/66.png) |
