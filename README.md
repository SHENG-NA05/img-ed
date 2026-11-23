# Photoshop Studio - 旗艦級 Windows 桌面影像編輯器

> **技術核心**：Tauri v2 + Rust + React 18 + TypeScript + Vite + Tailwind CSS + lucide-react  
> **介面設計**：對標 Adobe Photoshop 專業深色質感（#181818 / #252526 / #1e1e1e / #3b82f6），全繁體中文介面，支援 Windows 高 DPI 無鋸齒顯示。

---

## 🌟 軟體核心特色與架構

### 1. 雙圖層高效能互動畫布 (Dual-Canvas Architecture)
- **底層 (`BaseImageCanvas`)**：存放原始輸入影像與 Rust 後端高速運算產生的濾波結果。
- **上層 (`DrawingCanvas`)**：存放使用者的自由筆刷筆跡與標註。橡皮擦採用 `destination-out` 模式，僅精準清除塗鴉，絲毫不傷底圖。
- **視角導航**：按住 `Space + 滑鼠左鍵` 平移拖曳畫布，滑鼠滾輪以游標所在位置為中心進行平滑等比縮放（10% ~ 3200%）。

### 2. 即時像素檢驗器 (Pixel Inspector)
- 滑鼠於畫布任意處滑動時，底部狀態列即時取樣合成顯示畫面之像素數值：
  ```text
  座標: X 124, Y 350  |  RGB: (255, 128, 64)  |  HEX: #FF8040  |  影像尺寸: 1920 × 1080 px  |  縮放: 100%
  ```
- 移出畫布外自動切換為 `--`，並提供動態即時色票方塊對比。

### 3. Rust 高性能影像處理管線
- **灰階轉換 (Grayscale)**：依據標準亮度權重公式 $Y = 0.299R + 0.587G + 0.114B$。
- **純黑白二值化 (Binary Threshold)**：支援 0～255 閾值滑桿即時預覽與套用。
- **調色盤色彩量化 (Palette Quantization)**：使用 `color_quant::NeuQuant` 演算法，支援 4、8、16、32、64 色萃取與可選的 Floyd-Steinberg 誤差擴散抖動（Dithering）。
- **負片轉換 (Negative)**：RGB 各通道反轉 $(255 - R, 255 - G, 255 - B)$。
- **空間域中值濾波 (Median Filter)**：支援 3×3、5×5、7×7 滑動窗口，有效去除胡椒鹽雜訊並保護主體邊緣。
- **拉普拉斯銳化濾波 (Laplacian Filter)**：
  - 同步生成三張影像緩衝：**原始影像**、**遮罩影像**（二階微分邊緣灰階圖）、**銳化影像**（原圖＋強度權重）。
  - 頂部控制列提供三段式按鈕（Segmented Control），隨選即切，確認滿意後一鍵套用。

### 4. 專業級多功能筆刷引擎 (5 種筆刷 + 橡皮擦)
- **鋼筆 (Pen)**：實心高銳利度平滑圓形筆頭。
- **蠟筆 (Crayon)**：帶有顆粒噪點遮罩與隨機邊緣散射紋理，重現粗糙畫紙質感。
- **螢光筆 (Highlighter)**：45 度扁平斜筆頭，採用 `multiply` 混合模式半透明透出色。
- **噴槍 (Airbrush)**：徑向漸層羽化粒子，長按原地持續累積噴霧濃度。
- **水彩筆 (Watercolor)**：柔和邊緣擴散搭配自然濕邊（Wet-edge）暈染。
- **橡皮擦 (Eraser)**：精準擦除塗鴉圖層。

### 5. 獨立視窗「GIF 動畫製作工作坊」 (GIF Studio)
- 點擊左側「GIF 製作」按鈕彈出 960×680 獨立子視窗。
- 支援從本機「批次匯入圖片」與一鍵「擷取目前畫布」。
- 底部橫向時間軸支援前移、後移、複製、刪除影格。
- 支援每格延遲時間（ms）、播放速度倍率（0.25x～4.0x）、循環次數（0 = 無限循環）、輸出尺寸縮放。
- 中央動態即時循環播放動畫預覽，並可一鍵匯出高品質動態 `.gif` 檔案。

---

## 🚀 本機開發與執行指引

### 1. 安裝環境需求
- Node.js 18+ 與 npm
- Rust 1.75+ (已配置於本機)

### 2. 開發階段啟動 (前端 + 桌面雙模式)
```powershell
# 安裝前端依賴
npm install

# 啟動網頁瀏覽器預覽模式 (含完整 Mock 與功能測試)
npm run dev

# 啟動原生桌面視窗開發模式 (Tauri v2 + Rust 核心 IPC)
npm run tauri dev
```

### 3. 編譯為 Windows 獨立執行檔 (.exe)
```powershell
# 1. 前端靜態打包
npm run build

# 2. 編譯 Rust 桌面端 Release 獨立執行檔
cargo build --release --manifest-path src-tauri/Cargo.toml
```
編譯完成後，產出之獨立執行檔位於：
- `dist-desktop/photoshop-studio.exe`
- 或 `C:\Users\sam10\.cargo_target\release\photoshop-studio.exe`
