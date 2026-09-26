# 素材来源

Image credit: NASA / NASA’s Scientific Visualization Studio.

页面：https://svs.gsfc.nasa.gov/4720/

## 月面彩色图（全局场景贴图）

- 原始文件：https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_poles_8k.tif
- NASA CGI Moon Kit，LROC WAC Hapke normalized mosaic，8192×4096 RGB，与此前使用的4k版本同一投影/同一镶嵌，仅原生分辨率更高；已用4k降采样与当前4k占位图逐像素比对（均值差1.38/255，>10的像素占0.01%，判定为同一数据集重新导出，无旋转或错位）。
- 本地文件：`lroc-color-8k.webp`，质量92，8,061,976字节。
- 原图极区包含NASA制作的单色反照率补全，不是完整原生极区彩色观测。
- 重建：`python3 scripts/prepare-global.py`。

## 占位图 / WebGL 失败回退

- 原始文件：https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_poles_4k.tif
- 与上面同一NASA产品线的4k版本，4096×2048 RGB，质量94。仅用于`App.tsx`里WebGL就绪前的模糊背景圆与WebGL失败时的静态回退（CSS背景，裁切显示），不参与3D场景，因此保持较小文件以保护首屏。
- 本地文件：`lroc-color-4k.webp`。

## 高程（全局场景位移）

- 原始文件：https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/ldem_64_uint.tif
- LRO LOLA，64像素/度，23040×11520，unsigned 16-bit，每单位0.5米，相对1737400米半径。此前版本使用同一NASA套件里更粗的16像素/度栅格（5760×2880）经双线性重采样得到4096×2048；本轮改用64像素/度（约474米/像素，赤道）真实测量栅格，用面积平均（box filter）直接降采样到相同的4096×2048输出尺寸——交付分辨率不变，但每个像素现在是对真实高分辨率测量的正确抗锯齿平均，而不是对粗栅格的插值放大。
- 已核实：64像素/度栅格按4×4面积平均降到16像素/度后与NASA官方16像素/度栅格逐像素比较，整体均值偏差-0.42（约-0.2米，判定为同一基准/同一投影/无错位），标准差约37米（说明官方16像素/度栅格本身并非严格的面积平均，本轮的64像素/度直接平均更能代表真实地形）。
- 重采样为4096×2048，保存为`lola-height-rg.webp`（无损WEBP，替代此前的PNG，体积从13.18MB降至10.19MB）：R=高8位，G=低8位，B=0；已用真实Chrome离屏canvas解码核对多组像素，字节级一致，确认无损WEBP经浏览器8位canvas回读不引入色彩管理误差。
- 高程（相对1737400米基准）=`uint16 * 0.5 - 10000`米。
- 这是NASA高程的派生浏览器资产，不是程序化生成。
- 未采用27360×13680全球彩色镶嵌（约399米/像素）：全局网格的可见多边形密度约每1°一环（赤道约30公里/环），4096×2048（约2.7公里/像素）已远超该网格实际能表达的几何细节，更高的高程纹理分辨率不会带来任何可见几何变化，因此把预算优先给了彩色贴图分辨率与更真实的高程数据源，而不是单纯堆纹理像素。
- 重建：`python3 scripts/prepare-global.py`；原始TIFF（约580MB）不进入仓库，缓存在仓库外固定目录（用`ASSET_CACHE`环境变量指定），已存在则跳过下载。

原始和派生文件的SHA-256与大小见`manifest.json`。原始TIFF未重复存入git，项目内资产可直接使用，重建脚本可重新取得原始文件。

NASA资源使用指引：https://www.nasa.gov/nasa-brand-center/images-and-media/
本项目未使用NASA徽标、未暗示NASA或IBM背书。NASA资料不等同于本项目代码许可证。

## 字体

Barlow Condensed与DM Sans来源于Google Fonts，SIL Open Font License 1.1；完整许可随字体存放于`fonts/`。

- https://github.com/google/fonts/tree/main/ofl/barlowcondensed
- https://github.com/google/fonts/tree/main/ofl/dmsans

全部字体本地加载，中文使用操作系统字体。

## 新增地表段：Taurus–Littrow 西部 NAC 数据

Image credit: NASA / GSFC / Arizona State University. 地形产品：LROC 团队。

- 产品页：https://data.lroc.im-ldi.com/lroc/view_rdr/NAC_DTM_APOLLO17_4
- 正射影像：`NAC_DTM_APOLLO17_4_M150314689_60CM`，0.60 m/px，8-bit 单色；来源是原始分辨率浏览 GeoTIFF，不是缩略图。
- 高程：`NAC_DTM_APOLLO17_4`，32-bit float GeoTIFF，2 m/post。产品给出的相对 LE 为 0.83 m、LOLA RMS 为 1.62 m；网格间距不代表绝对定位精度。
- [正射影像 TIFF](https://pds.lroc.im-ldi.com/data/LRO-L-LROC-5-RDR-V1.0/LROLRC_2001/EXTRAS/BROWSE/NAC_DTM/APOLLO17_4/NAC_DTM_APOLLO17_4_M150314689_60CM.TIF)
- [独立立体高程 TIFF](https://pds.lroc.im-ldi.com/data/LRO-L-LROC-5-RDR-V1.0/LROLRC_2001/DATA/SDP/NAC_DTM/APOLLO17_4/NAC_DTM_APOLLO17_4.TIF)
- 通过 HTTP Range 读取所需条带：影像约 32.38 MB，高程约 56.93 MB；未下载完整 380 MB 影像、137 MB DEM。服务可能重定向至 NASA PDS 镜像。
- 影像窗口 `(1905, 20000, 4096, 4096)`，覆盖 2457.6 m 正方形。完整窗口降采样为 1024² 背景图；中间 1228.8 m 正方形保留 0.6 m/px，分成四块 1024² 有效像素瓦片，各增加 1 px 邻接边缘，实际文件 1026²。
- 高程按 GeoTIFF 投影/像元中心与影像对齐，双线性重采样为 1025² Float32，每点间距 2.4 m，无垂直夸张。细节区检测并拒绝 NoData。
- 较远区域使用同一 DEM 约 4.74 × 12 km 范围，重采样为 199 × 501 网格（约 24 m）。这段条带边缘约 7.37% NoData 仅沿行插值补齐；不将补齐部分称为实测。其外侧现在接入 GLD100 区域高程，再与 LOLA 全球高程衔接。
- 运行时高程采样间距 2.4 m，嵌套网格最细 1.5 m（不增加测量精度）；手机瓦片在解码时缩至 512²（有效约 1.2 m/px）。页内 0.6 m/px 指源影像精度。
- 所有直接下载 URL、窗口、投影、源条带与派生文件 SHA-256 见 `surface/manifest.json`。重建：`python3 scripts/prepare-surface.py`，需要 `scripts/requirements-assets.txt`。

### 27k 的取舍与真实性边界

CGI Moon Kit 的 27360×13680 全球图赤道采样约 399 m/px（2π × 1737400 / 27360），无法解析米级陨石坑或碎石。本轮把全局场景贴图从 4k 升级到同一数据集的 8192×4096（约 1.33 km/px），仍未加载 27k 全球图：8k 已能匹配轨道视角下月球在屏幕上的实际像素占幅，27k 在该视角下的额外细节会被各向异性过滤与屏幕分辨率吞掉，不会带来可见差异，却会把首屏体积推高约 4 倍。资源预算仍优先投入更高空间分辨率的局部 NAC 影像；不声称这是整个月球的最高精度模型。

源 NAC 图像保留拍摄时的光照与阴影，不是纯反照率。本轮派生 `*-detail.webp`，以局部模糊亮度作除数并限制对数高频的幅度，减弱照片低频阴影与新光照冲突；并未科学恢复反照率。程序化碎石、毫米级微法线、镜头辉光属于艺术补充，不能用于地貌测量。轨道到地表共用一个球面坐标世界和相机，无双场景叠化；轨迹仍是艺术编排。

局部曲率按半径 1737400 m 的球面下沉量计算。2.1 m 眼高的理想平地地平线约 2.7 km；本地真实山坡可遮挡几何地平线，因此不会刻意制造夸张弯曲。

## 地球：NASA Blue Marble

- 官方介绍：https://science.nasa.gov/resource/blue-marble-2002/
- 原始 2048×1024 地表图：https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57730/land_ocean_ice_2048.png
- 派生 `surface/earth-blue-marble.webp`，质量 94。本图含陆地、海洋与冰，不是当前实时云图。
- Image credit: NASA / NASA Earth Observatory.
- 地球视直径约 1.9°，使用 6371 km 半径、约 384400 km 距离保持角尺度；薄大气为 shader 表现。方位与照明服务艺术构图，并非 Taurus–Littrow 的真实地球方位或特定日期星历。该说明也显示在网站中。

## 修复新增：100 m 区域桥接数据

- WAC 全球马赛克产品：https://data.lroc.im-ldi.com/lroc/view_rdr_product/WAC_GLOBAL_E300N0450_100M
- GLD100 实测高程产品：https://data.lroc.im-ldi.com/lroc/view_rdr_product/WAC_GLD100_E300N0450_100M
- 读取 1536×1536 窗口；影像使用 8-bit GeoTIFF，高程使用 PDS IMG 的 signed little-endian Int16、1 m/值、1737400 m 半径基准。没有把灰度预览当成高程。
- HTTP Range 原始条带约 41.92 MB + 83.84 MB；没有下载完整约 0.5 GB / 1 GB 源文件。运行时区域 DEM 约 4.72 MB，区域细节 WebP 约 0.53 MB。
- `surface/regional-manifest.json` 记录 URL、裁剪像素、像元中心投影坐标、源条带及派生文件 SHA-256；`prepare-regional.py` 可重建。
- `surface/appearance-manifest.json` 记录 NAC 高频处理及派生 SHA-256；原始影像仍保留。
- 全局地理注册由 GeoTIFF equirectangular 参数反算。NAC 窗口中心约 20.31797° N、30.37386° E，当前视点位于窗口以南约 96 m、东西偏移 0 m，回到接近 04c35f5 的高精度测量区域。坐标注册不代表消除了各测绘产品的测量误差；边界高程融合是展示处理。
- Image credit: NASA / GSFC / Arizona State University. GLD100: LROC / DLR.

## 极区永久阴影区（本轮）

- 数据：NASA PGDA / LOLA，Barker et al. (2023), *The Planetary Science Journal* 4, 183，https://doi.org/10.3847/PSJ/acf3e1 。数据集 DOI：https://doi.org/10.60903/gsfcpgda-lola-spole 。产品页：https://pgda.gsfc.nasa.gov/products/90 。按产品要求保留论文引用。
- 采用 `LPSR_80S_20MPP_ADJ_1km2.SHP`：https://pgda.gsfc.nasa.gov/data/LOLA_20mpp/LPSR_80S_20MPP_ADJ_1km2.SHP ，1531 个面积大于 1 km² 的 PSR 多边形，是 LOLA 地形推导的永久阴影区，不是冰含量、冰稳定温度或 Lunar FM 输出；更小的 PSR 未展示。
- 原坐标：南极立体投影，中央经线 0°、标准纬线 −90°、月球半径 1737400 m，MOON_ME / DE421。投影定义：https://pgda.gsfc.nasa.gov/data/LOLA_20mpp/LPSR_80S_20MPP_ADJ_1km2.PRJ 。运行时由全球球体的经纬度直接计算同一投影坐标。
- 20 m 指源 DEM 像素间距，不代表网页边界精度。网页派生栅格 `polar/south-psr.png` 为 2048²，覆盖 ±310 km，显示像素约 303 m；先 2× 超采样，再面积平均，保留多边形内洞。不扩张科学覆盖区。
- R 通道为 PSR 覆盖；G 为边界内侧强调，只是显示设计；颜色、边界亮度、经纬细线是艺术处理。阴影区不等于已经证实存在水冰。归档哈希及处理参数见 `polar/manifest.json`，重建脚本为 `scripts/prepare-polar.py`。
- 参考解释：NASA SVS “LRO Peers into Permanent Shadows”，https://svs.gsfc.nasa.gov/4043/ 。
- B 通道采用同产品的 LOLA 晕渲： https://pgda.gsfc.nasa.gov/data/LOLA_20mpp/LDEM_80S_80MPP_ADJ_HILL.TIF 。源像素 80 m、南极立体投影；太阳高度 45°、方位 45° 的模拟地形图，不是实时受光或反照率。通过 COG 的 HTTP range / overview 读取重采样到同一 2048² 网格，没有把整幅 85 MB GeoTIFF 放进项目。`scripts/prepare-polar-relief.py` 保存投影、范围和派生哈希。极区幕将它作为明确标注的制图层平滑叠入，同一个球体的几何与月表照明逻辑不变。

### 中间态读图标记
第 02 幕的约 4.7 × 12 km 框对应 `geography.ts` 中已载入 NAC context 高程的外包范围（x: −2371.8…2370.2 m，z: −5228.2…6769.8 m）。框内并非每个像素都使用亚米级照片：仍按原有区域 WAC、中心 NAC 与地形采样层级显示。公里网格、落点环、扫描带是艺术辅助标记，非遥测、地形等高线或模型输出。20 km 指相对于落点高程的叙事悬停高度。没有新增数据下载或调整原影像再光照流程。
