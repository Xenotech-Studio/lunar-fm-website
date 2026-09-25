# 六幕文案复核

基线提交：`a0a4c3f`。完整逐项新旧对照见 [COPY.md](COPY.md)。

## 写作与标注

六幕依次落在月光、坑缘、地球、无日照的坑底、多源观测和抬头望月。英文标题另取意象，不逐字翻译中文。移除“开启探索”“共同起点”“无限可能”等口号及指挥观众看画面的句子。功能按钮明确其去向。

科学标注保留并细化：

- 0.6 m / px 与 2 m / post 属于 NAC 源影像分辨率和源高程采样间距；网页使用裁切、降采样和分级纹理。
- 20 km 是相对落点的设计悬停高度；2.1 m 是设计眼高。范围框、公里网格和扫描为辅助示意，非遥测。
- PSR 为 NASA LOLA 推导的永久阴影区，仅含面积大于 1 km² 的区域。永久阴影不等于实测水冰，此图也不是模型预测。晕渲、配色和边界强调的性质分别写明。
- 地球方位为艺术构图，近景碎石为程序生成；光晕是光学处理。没有加载模型权重或运行推理。
- 1.96 M 指预训练语料规模，不是网站加载量。
- 将旧档案中“局部测量区之外使用平滑参考球面”的过期表述改为当前的 LOLA 全球、WAC / NAC 局部高程来源。

## 逐帧方法与修改

`scripts/review-copy.mjs` 使用真实 Chrome、WebGL 和 Playwright 鼠标滚轮。等待滚动阻尼与相机进度收敛后截图，记录画面状态、文字边界和浏览器错误。保留原滚动时间线，正向、反向均检查。

桌面为 1200×800：全程按叙事进度 2% 采样，在档案与极区进出场加密到 1%，另含章节锚点；每方向 70 帧。手机为 390×844，每方向 24 帧，覆盖六幕及进出场。

发现并修正：模型幕三行正文在桌面入场时把标签推得太靠近导航。将正文压为两行，未改 CSS、字号或布局结构；受影响帧重新采集。修改后，叙事进度 80% 的桌面帧中，标签与导航标题相距约 16 像素。悬停高度标签也在这轮收紧了措辞。

`desktop/forward`、`desktop/reverse`、`mobile/forward`、`mobile/reverse` 保存最终帧。文件名为**内部叙事进度**，不是页面滚动百分比。`frames.json` 的 `scrollProgress` 给出实际页面进度。`index.html` 为逐帧浏览器，可通过本地静态服务打开；左右方向键翻帧。

## 关键帧

| 幕 | 页面滚动约 | 桌面截图 | 手机截图 |
|---|---:|---|---|
| 01 遥望 | 0% | [0.png](desktop/forward/0.png) | [0.png](mobile/forward/0.png) |
| 02 月面档案 | 39.55% | [34.5.png](desktop/forward/34.5.png) | [34.5.png](mobile/forward/34.5.png) |
| 03 立于月面 | 71.82% | [53.5.png](desktop/forward/53.5.png) | [53.5.png](mobile/forward/53.5.png) |
| 04 永久阴影（近看） | 83.33% | [72.5.png](desktop/forward/72.5.png) | [72.5.png](mobile/forward/72.5.png) |
| 05 观测交汇 | 90.30% | [84.png](desktop/forward/84.png) | [84.png](mobile/forward/84.png) |
| 06 回望月光 | 100% | [100.png](desktop/forward/100.png) | [100.png](mobile/forward/100.png) |

## 复现

```sh
npm run build
npm run preview -- --port 4397 --strictPort
LUNAR_REVIEW_URL=http://127.0.0.1:4397 node scripts/review-copy.mjs
LUNAR_REVIEW_URL=http://127.0.0.1:4397 node scripts/review-copy.mjs --mobile
LUNAR_TEST_PORT=4302 npm test
```

端口须自行确认空闲；不要停止占用端口的其他进程。此次 4301 被占用后换至 4397，未处理其占用者。`yarn.lock` 为开始工作前已有的未跟踪文件，不属于本次修改。

## 视觉检查结果

已逐帧查看桌面正反向 140 帧、手机正反向 48 帧，共 188 帧，并查看关键帧原图与档案弹窗的顶部、底部。各序列浏览器错误数组为空；所有记录的可读文字边界均在视口内，无页面横向溢出，详见 [validation.json](validation.json)。文案沿原有透明度曲线进入退出，未改相机、地形、贴图、光照、PSR 图层或滚动分配。

原有字体大小与色阶保留；过场淡入淡出阶段的低对比是原透明度动画，本轮可读性判断以文案显现阶段及章节落点为准。

## 工程验证

- `npm run build` 通过，见 [build.log](build.log)。
- 最终构建的 `LUNAR_TEST_PORT=4302 npm test`：**10 passed**，见 [tests.log](tests.log)。覆盖连续轨迹、六幕导航、手机与减少动态效果、WebGL 降级、地表资源加载释放、PSR、悬停与滚动预算。
- 初稿曾全套通过；中途为修正文案拥挤主动中断了一轮，最终重新完整运行通过。
- `git diff --check` 通过。
- 4397 截图预览服务已结束；4302 测试服务由 Playwright 回收。未启动或停止 5173，未处理被占用的 4301。
