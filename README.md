# 飞鸟 · 山水之间 —— 个人主页

一个纯 HTML / CSS / 原生 JavaScript 手写的个人主页，零依赖、零构建：
青山流水 Canvas 背景（随访客本地时间昼夜变色）、居中头像、打字机签名、
联系方式按钮（微信 / QQ 弹二维码 + 一键复制，GitHub / X 直接跳转）、
萤火虫粒子、问候时钟、作品展示第二屏。

## 本地预览

直接双击 `index.html` 就能打开；推荐用本地服务器（复制功能在 `http://` 下更稳）：

```bash
cd feiniao-homepage
python -m http.server 8321
# 浏览器打开 http://localhost:8321
```

预览指定时刻的风景（调试 / 截图用）：`http://localhost:8321/?hour=19.5`

## 怎么改成你自己的信息

几乎所有个人信息都集中在两个地方：

1. **`js/main.js` 顶部的 `CONFIG`** —— 昵称、打字机签名句、微信号、QQ 号、
   二维码图片路径、弹窗提示语。
2. **`index.html` 里"作品与折腾"区块** —— 三张作品卡片，替换标题 / 描述 / 链接即可。

其它可改的位置：

- 头像：替换 `assets/avatar.jpg`（建议 500×500 以上）。
- 签名句：`js/main.js` 的 `CONFIG.phrases` 数组，随便加几句。
- 昼夜配色：`js/scenery.js` 顶部的 `KEYS` 关键帧调色板。
- 山的形状：`js/scenery.js` 里的 `LAYERS`（base 高度 / amps 起伏）。

## 换成真实的微信 / QQ 二维码

当前的 `assets/qr-wechat.png` 和 `assets/qr-qq.png` 是"账号文字"占位二维码，
扫码只能看到号码。建议换成官方名片码：

- **微信**：手机微信 → 我 → 点击自己头像 → 二维码名片 → 右上角"…" → 保存图片，
  覆盖 `assets/qr-wechat.png`。
- **QQ**：手机 QQ → 左上角头像 → 我的二维码 → 保存图片，覆盖 `assets/qr-qq.png`。

## 部署到 GitHub Pages（免费上线）

1. 在 GitHub 新建仓库，名字用 `hongmortise.github.io`（就是你的主页域名），
   或者任意名字（之后通过 `用户名.github.io/仓库名` 访问）。
2. 把本目录全部文件推上去：

   ```bash
   cd feiniao-homepage
   git init
   git add -A
   git commit -m "feat: 个人主页"
   git remote add origin https://github.com/hongmortise/<仓库名>.git
   git push -u origin main
   ```

3. 仓库 Settings → Pages → Source 选 `main` 分支 / root，保存后等一两分钟生效。

## 目录结构

```
feiniao-homepage/
├── index.html          # 页面结构（含内联品牌图标、作品卡片）
├── css/style.css       # 玻璃拟态样式 + 响应式
├── js/bg-data.js       # 背景底图数据（base64 内嵌，避免部分浏览器/代理压缩图片）
├── js/background.js    # 动态风景背景：昼夜调色/雾气/星空/飞鸟/体积光/视差/Ken Burns
├── js/fireflies.js     # 萤火虫粒子（夜晚更亮，会追随鼠标）
├── js/main.js          # 个人信息配置 + 时钟 / 打字机 / 弹窗 / 复制
└── assets/             # 头像、二维码、风景原图、品牌图标（SVG 来自 simple-icons）
```

背景底图：Unsplash 免费授权摄影（雾谷日出）。想换风景：把新图覆盖
`assets/bg-valley-2000.jpg`，然后重新生成内嵌数据：

```bash
python -c "
import base64, io
from PIL import Image
im = Image.open('assets/bg-valley-2000.jpg').convert('RGB')
buf = io.BytesIO(); im.save(buf, 'JPEG', quality=72, optimize=True)
b64 = base64.b64encode(buf.getvalue()).decode()
open('js/bg-data.js', 'w').write('window.BG_PHOTO_DATA = \"data:image/jpeg;base64,' + b64 + '\";')
"
```

## 无障碍与性能

- 尊重系统"减少动态效果"（`prefers-reduced-motion`）：静态画面、停用粒子。
- 移动端自动减少粒子数量；高分屏按设备像素比渲染（上限 2x）。
- 页面标签切走时暂停绘制，不空耗电。
