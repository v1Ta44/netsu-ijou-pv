# 足立レイ 人设锁定

> 来源：`足立レイ_立ち絵RF_1920_v3`（みさいる 2021-10-14，立ち絵リファイン版，readme 注明"動画素材等にどうぞ"；角色使用规范见公式サイト https://mechanicalgirl.jp/ ）。
> ASCII 副本：`assets/ref/rei/`（对照表 `index.txt`）。生图参考：`assets/ref/rei_front.png`（正面公式立绘）、`assets/ref/rei_back.png`（背面线稿）。

## 形象要素（以公式立绘为准）

| 部位 | 设定 |
|---|---|
| 发 | 橙色（非红色），齐肩碎发，一束侧马尾在她自己的左侧（正面视角下位于画面右侧），白色长缎带系住；额前有橙色发夹 |
| 头饰 | 黑色头带式头戴设备，顶部有一个小圆形灯/镜头，右侧有黑色天线状尖片 |
| 眼 | 橙色瞳，表情平静 |
| 上衣 | 宽大的白色外套（背后有兜帽），表面有细线电路纹样；袖口有橙色宽带；左胸 "00" 标牌 |
| 内搭 | 黑色高领 |
| 腰 | 橙色腰带 + 银色方扣，两侧挂黑色小包 |
| 下装 | 灰色格纹百褶短裙，带电路纹 |
| 腿 | 黑色连裤袜，带回纹/电路纹，小腿处一圈橙色带 |
| 鞋 | 橙白配色运动鞋，橙色鞋带（实机也穿橙色 New Balance） |
| 手 | 白色手套 |
| 机械特征 | 外套下摆垂出两三根数据线，末端带接头；实机为肤色外壳 + 黑色舵机关节 |
| 体型 | 实机身高 1592mm，头身比约 6.9（设计图：头 231 / 躯干 497 / 腿 887） |

主色：橙 `#F26B1D` / 白 / 黑 / 灰。橙色是她的识别色，调色时（`grade.tsx` 角色层）要保住。

## 定稿（2026-10-08）

| 用途 | 文件 | 来源 |
|---|---|---|
| 正面基准 | `assets/gen/char_final/REI_front.png` | char_lock_v2 `REI_front-2` |
| 背面基准 | `assets/gen/char_final/REI_back.png` | char_lock_v2 `REI_back-1`，原图不翻转 |

- 气质：美型、有英气，克制不夸张；杏眼、细平眉、下颌线清晰、无脸红。
- 面部：完整保留生成原图，逐像素未改动（`tools/reproportion.py` 校验差值为 0）。
- 身体比例：约 6.0 头身，取 v1（约 5.0）与 v2（约 6.5–7.1）的中值。由 `tools/reproportion.py` 在下颌以下缩放身体（k=0.86）并按目标头身求解腿长，颈肩处平滑过渡。
- 后续所有角色组件用多参考图生图：画风 `style_ref_rei.png` + 设计 `rei_front.png`（背影加 `rei_back.png`）+ 形象基准 `char_final/REI_front.png`；出图后统一过 `reproportion.py --heads 6.0` 再 `prep_asset.py`。

## 与此前测试图的差异

v8 CH01 是从原 PV 参照图推出来的，和公式形象有出入：发色偏红、外套过于简洁（缺电路纹、橙袖带、"00"）、下装是白裙 + 白过膝袜 + 白靴（公式是灰格裙 + 黑电路纹连裤袜 + 橙白运动鞋）、缺腰带和数据线。v8 作废，以本文件为准。

## 生图方式

图生图，多参考：
1. `assets/ref/style_ref_rei.png` —— 只取画风
2. `assets/ref/rei_front.png` —— 角色设计（正面）
3. `assets/ref/rei_back.png` —— 角色设计（背面，需要背影时加）

prompt 明确区分："first image = drawing style only; other images = character design only, do not copy their rendering or pose"。比例按用户要求不做标准化：头略大、腿略短、站姿僵硬（相对公式的 6.9 头身略压缩）。
