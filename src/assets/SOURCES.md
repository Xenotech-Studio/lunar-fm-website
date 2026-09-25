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
