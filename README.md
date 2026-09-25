# LUNAR — Beyond the visible

一个独立的月球艺术展示项目，以 NASA LRO 月面数据与 NASA–IBM Lunar Foundation Model 为叙事背景。React + Vite + TypeScript + react-three-fiber + three.js + postprocessing。

![桌面开场](docs/preview-desktop.png)

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

## 五幕与滚动

页面总长 680svh。下表百分比指 `(scrollY / (documentHeight - viewportHeight))`，不是浏览器窗口高度。底部导航可前往各幕，也可用滚轮、触控、方向键、PageDown、Home、End 自由移动；没有 scroll-snap 或滚轮劫持。

| 进度锚点 | 章节 | 画面 |
| --- | --- | --- |
| 0% | 启程 / Beyond the visible | 右侧完整月球、暖白斜照、左侧编辑式大标题 |
| 25% | 月面档案 / Every scar | 相机推进，月面放大，掠射光强化 LOLA 地形细节 |
| 50% | 阴影之下 / Into the shadow | 月球移向左侧并倾斜展示南极，光线转冷暗，极区示意覆盖出现 |
| 75% | 连接线索 / Many signals | 镜头拉开，金色经纬网、扫描带与轨道线浮现 |
| 100% | 新的地平线 / A new perspective | 月球回到中央远景，模型链接与重新启程按钮出现 |

中间位置连续插值，相机、目标、月球变换、太阳方向、地形夸张度、数据网格与文案交叉淡入共用一个带帧率无关指数阻尼的滚动进度。支持反向滚动、直接跳转和尺寸变化。减少动态效果偏好下去掉阻尼、动效过渡与颗粒；保留用户主动滚动的场景变化。

## 图形实现

- **真实纹理**：NASA SVS CGI Moon Kit 的 LROC 4K 彩色地图与 LOLA 16-bit unsigned 高程。无机器学习权重，无模型推理。
- **高程**：从 5760×2880 高程重采样到4096×2048，16位值打包到 PNG 的 R/G 通道。shader 解码为 `(R*65280 + G*255)*0.5 - 10000` 米，相对1737.4km基准球。保持无色彩空间处理、线性采样与禁用高程mipmap。
- **自定义月面 shader**：顶点真实位移；高程中心差分构造切线空间法线；弱光学纹理细节；Lommel–Seeliger / Lambert混合反射；太阳方向控制晨昏线；适量冷色环境光。地形做约2–3.4倍艺术夸张。
- **辉光**：外壳shader做12步视线积分，结合指数衰减密度与光照方向，产生薄层、有体积感的光学辉光。月球没有地球式浓密大气，本效果仅为艺术表现，网页已标注。
- **后处理**：HDR渲染，Bloom → ACES Filmic → 颗粒与暗角；渲染器使用 NoToneMapping，ACES只在后处理做一次。
- **性能**：桌面384×192球面分段、手机256×128；DPR上限1.6；确定性星空；每帧修改uniforms/ref，不以React状态逐帧重渲染。3D模块懒加载。纹理约15.65MB；使用真实独立高程而非将彩色图假当高程。
- **可访问性**：原生页面滚动、可聚焦导航、当前章节aria-current、不可见章节inert、键盘可关闭的原生dialog、减少动态效果支持、WebGL失败时静态月面降级。字体本地托管，许可证保留。

## 结构

```text
src/
  App.tsx                 文案、章节、导航、来源档案、错误边界
  timeline.ts             同步DOM与WebGL的滚动导演
  styles.css              桌面/手机版式与交互
  scene/
    LunarScene.tsx        相机、月球、星空、轨道、后处理
    shaders.ts            位移、月面光照、法线、体积辉光、数据叠层
  assets/
    lroc-color-4k.webp    NASA彩色纹理
    lola-height-rg.png    NASA 16位高程RG打包纹理
    manifest.json         原始下载URL、文件大小与SHA-256
    SOURCES.md            素材来源与转换说明
    fonts/                本地字体及OFL许可
scripts/prepare-assets.py 可选：重新下载与转换NASA素材
scripts/requirements-assets.txt 可选素材工具的精确版本
tests/journey.spec.ts     WebGL、滚动、导航、手机、降级验证
playwright.config.ts     自动启停生产预览服务器
```

## 验证

```sh
npm test
```

测试使用本机 Google Chrome (`channel: chrome`)，无需下载额外浏览器；在无Chrome机器上安装Chrome，或将配置改为已安装的Playwright Chromium。软件WebGL用于自动化功能验证，不代表真实GPU性能。测试自动启动并关闭4173端口的生产预览，截图写入被git忽略的 `test-results/`。

检查内容包括实际WebGL渲染（不允许偷偷降级）、shader/JS控制台错误、五幕导航、37%中间滚动位置、手机布局、减少动态效果、档案弹窗和NASA署名。本项目未做移动真机GPU性能基准。

完成时验证：`npm install`成功（0 vulnerabilities）、`npm run build`成功、三项Playwright测试全部通过。桌面1440×1000与手机390×844逐幕截图已人工检查；截图示例保存在`docs/`。预览服务由测试结束时自动关闭。

## 科学表述与素材

Image credit: NASA / NASA’s Scientific Visualization Studio.

- [NASA SVS CGI Moon Kit](https://svs.gsfc.nasa.gov/4720/)：LROC彩色图、LOLA高程；彩色图为视觉呈现优化，非定量科学产品。
- [NASA–IBM模型集合](https://huggingface.co/collections/nasa-ibm-ai4science/nasa-ibm-lunar-fm-and-downstream-models)
- [技术报告](https://arxiv.org/abs/2609.13283)

这是独立艺术项目，非NASA或IBM官方产品。极区蓝色覆盖、扫描线、经纬网与坐标为艺术示意，不是实测冰、模型预测或实时地理定位。模型的冰潜力任务回归专家潜力图，不能当作已发现冰资源。没有使用、下载或依赖2.4GB机器学习权重。两种NASA纹理均成功获取，没有程序化替代纹理；程序化内容仅为星空、示意覆盖和光学特效。
