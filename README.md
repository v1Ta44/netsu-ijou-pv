# 熱異常 PV — fan-made

いよわ《熱異常》feat. 足立レイ 的非官方同人 PV 工程：AI 生图出素材 + [Remotion](https://www.remotion.dev/)（React）逐帧合成，节拍/段落由 librosa 分析驱动。风格为故障终端 + 终末氛围、模拟信号劣化。

个人练习、非商用。

## 目录

| 路径 | 内容 |
|---|---|
| `docs/` | 人设锁定、调色、段落划分、分镜（`storyboard_v5.md` 为现行版本） |
| `analysis/` | 音频分析：`analyze.py`（节拍/段落）、`features.py`（逐帧跟拍特征 → `pv/public/features.json`） |
| `data/` | 歌词时间轴、分析结果 |
| `tools/` | 批量生图、AI 抠图（绿幕重画 + 遮罩）、素材预处理、歌词对轴编辑器、静帧联系表 `probe.py` |
| `assets/gen/`, `assets/components/` | 生图过程稿与处理后的组件 |
| `pv/` | Remotion 工程。`src/v5/` 剪辑引擎与各段落，`src/fx/` 失真层，`src/sys/` HUD，`public/c/` 渲染用组件 |

## 运行

仓库**不含**歌曲音频、官方立绘、成片，需自行准备：

- 音频：`assets/audio/netsu_ijou.wav`（分析用）与 `pv/public/netsu_ijou.mp4`（渲染用）
- 官方立绘（仅重新生图时需要）：[足立レイ 公式サイト](https://mechanicalgirl.jp/) 的立ち絵素材，放到 `assets/ref/`

```bash
pip install librosa numpy scipy pillow
python analysis/analyze.py
python analysis/features.py

cd pv
npm install
npm run studio   # 预览
npm run render   # 输出 pv/out/pv.mp4
```

## 许可

本仓库的原创内容（代码、文档、生成图像）以 [CC BY-NC 4.0](LICENSE) 发布：可自由使用和修改，需署名，不得用于商业用途。

例外：`pv/public/fonts/` 下的字体沿用各自原许可；下列第三方作品的权利归原作者所有，不在本许可范围内。

## 致谢与版权

- 乐曲《熱異常》© いよわ；歌词版权归原作者所有，仓库中的歌词仅用于对轴与排版
- 足立レイ © mechanicalgirl.jp，使用遵循其[角色使用规范](https://mechanicalgirl.jp/)
- 字体：[Fusion Pixel Font](https://github.com/TakWolf/fusion-pixel-font)（OFL）、[PixelMplus](https://itouhiro.hatenablog.com/entry/20130602/font)（M+ License）、[DotGothic16](https://fonts.google.com/specimen/DotGothic16)（OFL）
- visuals: Claude Opus 5.5 / guidance: Ud0n
