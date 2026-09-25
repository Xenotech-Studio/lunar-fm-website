# 地表段验证记录

2026-09-25，macOS，本机 Google Chrome，通过 Playwright 驱动真实 WebGL 浏览器。自动化使用 SwiftShader；手机为 390×844 视口模拟，未做移动真机帧率或驱动级显存基准。

- `npm install`：成功，52 个包审计，0 vulnerabilities。没有修改 npm 依赖版本或锁文件。
- `npm run build`：TypeScript 与 Vite 生产构建成功。
- `npm test`：4 项回归，包括六幕导航/真实 WebGL/档案、手机/减少动态效果、无 WebGL 降级、局部资源生命周期。
- 控制台 error / pageerror：正常完整旅程与地表回归均为 0；包含 shader 编译检查。
- 同一滚动进度在 35%、39%、43%、50% 分别验证约 600 m、65 m、18 m、2.1 m 高度。中间位置保持 scrub，未添加 scroll-snap。
- 首屏不请求 NAC、地表高程或地球贴图。22–65.5% 范围内请求；离开后资源状态 unloaded，地表预算计数归零；反向重访正常且纹理对象不增长。
- 纹理对象冷启动基线 19。Three r186 首次 PBR 渲染额外生成 16×16 RG16F `DFG_LUT`，源码见 `node_modules/three/src/renderers/shaders/DFGLUTData.js`，1024 bytes。退出回到不超过 20 的预热基线；未把内部 LUT 当作局部资源泄漏。
- 桌面 1440×1000、手机 390×844 截图检查：没有瓦片硬接缝，导航不换行，地球与地表均可见。
- 预览服务由 Playwright 自动停止；任务结束另外检查项目开发端口，关闭了项目内已有的 Vite 开发进程。

截图：

- [35%：NAC 陨石坑与坡面细节](preview-descent.png)
- [50%：地表回望地球](preview-surface.png)
- [手机地表段](preview-surface-mobile.png)

内存数值是贴图、网格与合成缓冲的估算，自动化验证的是对象生命周期；不能由这些数据推导出所有设备的显存占用或帧率。素材精度、补齐范围及艺术处理见 [SOURCES](../src/assets/SOURCES.md)。
