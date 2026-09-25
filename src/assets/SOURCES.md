# 素材来源

Image credit: NASA / NASA’s Scientific Visualization Studio.

页面：https://svs.gsfc.nasa.gov/4720/

## 月面彩色图

- 原始文件：https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_poles_4k.tif
- NASA CGI Moon Kit 2019版本，LROC WAC Hapke normalized mosaic，4096×2048 RGB。
- 本地文件：`lroc-color-4k.webp`，质量94。
- 原图极区包含NASA制作的单色反照率补全，不是完整原生极区彩色观测。

## 高程

- 原始文件：https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/ldem_16_uint.tif
- LRO LOLA，5760×2880，unsigned 16-bit，每单位0.5米，相对1727400米半径。
- 重采样为4096×2048，保存为`lola-height-rg.png`：R=高8位，G=低8位，B=0。
- 高程（相对1737400米基准）=`uint16 * 0.5 - 10000`米。
- 这是NASA高程的派生浏览器资产，不是程序化生成。

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

CGI Moon Kit 的 27360×13680 全球图赤道采样约 399 m/px（2π × 1737400 / 27360），无法解析米级陨石坑或碎石。本次保留轨道 4K 底图，将资源预算投入更高空间分辨率的局部 NAC 影像，而非加载 27k 全球图；不声称这是整个月球的最高精度模型。

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
- 全局地理注册由 GeoTIFF equirectangular 参数反算。NAC 窗口中心约 20.31797° N、30.37386° E，当前坑缘视点在窗口以南约 585 m、以西约 235 m。坐标注册不代表消除了各测绘产品的测量误差；边界高程融合是展示处理。
- Image credit: NASA / GSFC / Arizona State University. GLD100: LROC / DLR.
