# Photoshop Studio 專案 UML 架構規格與模型圖集

> **專案定位**：基於 **Tauri v2 + Rust + React 18 + TypeScript + Vite + Tailwind CSS** 建構之旗艦級 Windows 桌面影像編輯器。  
> **建模標準**：遵循 **OMG UML 2.5.1** 規範與軟體架構視覺化原則，支援 Mermaid 內嵌即時渲染與 PlantUML 原始碼匯出。

---

## 📌 建模背景與視覺化架構決策 (Modeling Decisions)

| 決策項目 | 選定方案 | 備選方案 (Fallback) | 決策依據與工程考量 |
|---|---|---|---|
| **使用者案例圖 (Use Case Diagram)** | Mermaid Flowchart (具備系統邊界與標準語義) | PlantUML UseCase | 清楚劃定系統邊界 (System Boundary)，分離主參與者 (使用者) 與次參與者 (作業系統檔案系統)，標記 `<<include>>` 與 `<<extend>>`。 |
| **類別圖 (Class Diagram)** | Mermaid Class Diagram (分層式結構) | PlantUML Class | 分為前端展示層 (React)、引擎與橋接層 (TypeScript)、後端運算層 (Rust)，揭示屬性、方法、型別與依賴關係。 |
| **循序圖 (Sequence Diagram)** | Mermaid Sequence Diagram (3大關鍵情境) | PlantUML Sequence | 針對「影像濾鏡非同步運算與套用」、「雙圖層筆刷繪圖與 Undo/Redo 歷史管理」、「GIF 工作坊跨視窗 IPC 與串流匯出」繪製時序互動。 |

---

## 一、使用者案例圖 (Use Case Diagram)

### 1.1 需求層次化劃分原則 (Goal-Oriented Decomposition)
為了避免傳統單一全景圖中「20 餘個細部案例與多個參與者之間連線交錯穿插、視覺雜亂」的反模式，本專案依據 **UML 2.5.1 標準軟體工程方法論**，採用「**全景目標總覽 (Level 1) + 核心子系統細部分解 (Level 2)**」的清晰分層架構：
1. **Level-1 系統全景圖 (Overview)**：僅呈現使用者的核心目標（Primary Goals）與系統五大核心模組，消除多餘交叉線，視覺清晰純淨。
2. **Level-2 子系統細化圖 (Subsystem Decomposition)**：
   - **子系統一 (影像濾鏡管線)**：聚焦濾鏡泛化、即時運算預覽 `<<include>>` 與局部矩形框選 `<<extend>>`。
   - **子系統二 (雙圖層塗鴉與歷史)**：聚焦筆刷繪製、`destination-out` 橡皮擦、參數設定 `<<extend>>` 與歷史快照保存 `<<include>>`。
   - **子系統三 (GIF 動畫工作坊)**：聚焦時間軸管理、畫布擷取、多圖匯入與串流編碼匯出。

---

### 1.2 系統全景使用者案例圖 (Level-1 Overview)

> **特點**：主參與者（使用者）位於左側，次參與者（作業系統檔案系統）位於右側，五大模組分區明確，線條零交錯。

```mermaid
flowchart LR
    %% 參與者定義
    User(["👤 使用者 (User)"])
    OS(["💻 作業系統 / 檔案系統 (OS / FS)"])

    %% 系統邊界
    subgraph SystemBoundary ["Photoshop Studio 系統核心邊界 (目標層次架構)"]
        direction TB
        
        subgraph Group_File ["1. 影像檔案管理子系統"]
            UC_Import(["匯入影像 (檔案選取 / 拖放 / 測試圖卡)"])
            UC_Export(["匯出合成影像 (PNG / JPG / BMP)"])
            UC_Reset(["重設為原始圖檔"])
        end

        subgraph Group_Filter ["2. 影像濾鏡增強子系統"]
            UC_ApplyTone(["色調處理 (灰階 / 二值化 / 調色盤 / 負片)"])
            UC_ApplySpatial(["空間域處理 (中值去噪 / 拉普拉斯銳化)"])
        end

        subgraph Group_Draw ["3. 雙圖層繪圖與標註子系統"]
            UC_Draw(["筆刷自由塗鴉 (5種專業筆刷)"])
            UC_Erase(["橡皮擦除標註 (不傷底圖)"])
            UC_Clear(["清除所有塗鴉"])
        end

        subgraph Group_NavHistory ["4. 視角導航與歷史管理子系統"]
            UC_PanZoom(["畫布平移與滾輪縮放 (10%~3200%)"])
            UC_PixelProbe(["即時像素探針取樣 (座標 / RGB / HEX)"])
            UC_UndoRedo(["歷史狀態復原與重做 (Undo / Redo)"])
        end

        subgraph Group_Gif ["5. GIF 動畫製作工作坊子系統"]
            UC_GifStudio(["製作與匯出動態 GIF 動畫"])
        end
    end

    %% 使用者直接目標關聯 (清楚無雜線)
    User --> UC_Import
    User --> UC_Export
    User --> UC_Reset
    User --> UC_ApplyTone
    User --> UC_ApplySpatial
    User --> UC_Draw
    User --> UC_Erase
    User --> UC_Clear
    User --> UC_PanZoom
    User --> UC_PixelProbe
    User --> UC_UndoRedo
    User --> UC_GifStudio

    %% 作業系統次參與者關聯
    UC_Import --> OS
    UC_Export --> OS
    UC_GifStudio --> OS
```

---

### 1.3 核心子系統細部案例圖 (Level-2 Subsystem Detail)

#### A. 空間域與色調濾鏡管線 (Image Enhancement Pipeline)
展示各項濾鏡的選擇泛化、即時運算預覽的包含關係，以及中值去噪框選與拉普拉斯三段檢視的擴充關係：

```mermaid
flowchart LR
    User(["👤 使用者 (User)"])

    subgraph FilterBoundary ["子系統 1：空間域與色調濾鏡管線"]
        direction TB

        UC_MainFilter(["套用影像增強濾鏡"])

        UC_Grayscale(["灰階轉換 (Luminance)"])
        UC_Binary(["純黑白二值化 (0-255)"])
        UC_Palette(["調色盤量化 (NeuQuant)"])
        UC_Negative(["負片色彩反轉"])
        UC_Median(["空間域中值濾波"])
        UC_Laplacian(["拉普拉斯邊緣銳化"])

        UC_Preview(["即時參數運算預覽"])
        UC_BoxNoise(["局部矩形框選去噪 (3x3/5x5/7x7)"])
        UC_LaplacianView(["原圖 / 遮罩 / 銳化三段檢視"])
    end

    User --> UC_MainFilter

    UC_MainFilter --> UC_Grayscale
    UC_MainFilter --> UC_Binary
    UC_MainFilter --> UC_Palette
    UC_MainFilter --> UC_Negative
    UC_MainFilter --> UC_Median
    UC_MainFilter --> UC_Laplacian

    UC_MainFilter -.->|<<include>>| UC_Preview
    UC_Median -.->|<<extend>>| UC_BoxNoise
    UC_Laplacian -.->|<<extend>>| UC_LaplacianView
```

#### B. 雙圖層筆刷塗鴉與歷史狀態管理 (Drawing & History Stack)
展示繪圖層獨立渲染、橡皮擦精準擦除、參數微調擴充與雙圖層歷史快照自動保存的包含關係：

```mermaid
flowchart LR
    User(["👤 使用者 (User)"])

    subgraph DrawBoundary ["子系統 2：雙圖層筆刷塗鴉與歷史狀態管理"]
        direction TB

        UC_Draw(["自由筆刷塗鴉繪製"])
        UC_Erase(["精準橡皮擦除 (destination-out)"])
        UC_Clear(["清空塗鴉圖層"])
        UC_Param(["配置筆刷參數 (粗細 / 透明度 / 色碼)"])
        UC_Toggle(["切換塗鴉層顯示 / 隱藏"])

        UC_HistoryCommit(["保存雙圖層狀態快照 (HistoryStep)"])
        UC_Undo(["復原操作 (Undo Ctrl+Z)"])
        UC_Redo(["重做操作 (Redo Ctrl+Y)"])
    end

    User --> UC_Draw
    User --> UC_Erase
    User --> UC_Clear
    User --> UC_Toggle
    User --> UC_Undo
    User --> UC_Redo

    UC_Draw -.->|<<extend>>| UC_Param
    UC_Draw -.->|<<include>>| UC_HistoryCommit
    UC_Erase -.->|<<include>>| UC_HistoryCommit
    UC_Clear -.->|<<include>>| UC_HistoryCommit
    UC_Undo -.->|<<include>>| UC_HistoryCommit
    UC_Redo -.->|<<include>>| UC_HistoryCommit
```

#### C. GIF 動畫製作工作坊 (GIF Studio Workshop)
展示獨立子視窗環境下的畫布影格擷取、外部圖檔批次匯入、時間軸管理與串流匯出流程：

```mermaid
flowchart LR
    User(["👤 使用者 (User)"])
    OS(["💻 作業系統 / 檔案系統 (OS / FS)"])

    subgraph GifBoundary ["子系統 3：GIF 動畫製作工作坊 (獨立視窗)"]
        direction TB

        UC_ProduceGif(["製作 GIF 動畫"])
        
        UC_Capture(["擷取當前主畫布影格"])
        UC_BatchImport(["本機批次匯入圖檔"])
        UC_Timeline(["時間軸影格管理 (拖曳排序 / 複製 / 延遲)"])
        UC_Preview(["動態循環播放即時預覽"])
        UC_Export(["匯出動態 .gif 檔案"])
    end

    User --> UC_ProduceGif

    UC_ProduceGif -.->|<<include>>| UC_Timeline
    UC_ProduceGif -.->|<<include>>| UC_Preview
    UC_ProduceGif -.->|<<include>>| UC_Export

    UC_ProduceGif -.->|<<extend>>| UC_Capture
    UC_ProduceGif -.->|<<extend>>| UC_BatchImport

    UC_BatchImport --> OS
    UC_Export --> OS
```

---

## 二、類別圖 (Class Diagram)

### 2.1 架構分層說明
本專案為標準的三層架構（展示層、引擎與橋接層、後端原生核心運算層）：
1. **展示層 (Presentation Layer - React Components)**：
   - `App`：主應用程式中樞，負責整體全域狀態協調、工具切換、歷史堆疊管控。
   - `CanvasViewport`：雙畫布渲染容器 (`BaseCanvas` 與 `DrawingCanvas`)，掌管滑鼠平移縮放事件、筆刷事件派送、局部去噪框選與像素懸浮探針。
   - `HeaderBar`：頂部導航與檔案資訊、拉普拉斯檢視模式分段切換、Undo/Redo 觸發。
   - `LeftToolDock`：左側工具列，負責工具選取與子視窗喚起。
   - `RightInspector`：右側動態屬性檢查器，依當前啟用工具動態展示參數滑桿與控制元件。
   - `BottomStatusBar`：底部即時狀態列，呈現像素值、座標與縮放倍率。
   - `GifStudioWindow`：獨立之 GIF 動畫工作坊視窗元件。
2. **領域引擎與資料橋接層 (Core Engine & Bridge Layer - TypeScript)**：
   - `BrushEngine`：筆刷渲染核心類別，封裝鋼筆、粗糙蠟筆、半透明螢光筆、計時噴槍、水彩筆與橡皮擦演算法。
   - `TauriBridge`：靜態/非同步函式庫，封裝與 Rust 後端通訊之 `invoke` 指令與檔案對話框。
   - 核心型別合約 (`HistoryStep`, `PixelInfo`, `BrushOptions`, `FilterRegion`, `PaletteResult`, `LaplacianResult`, `GifFrameItem`, `GifExportOptions`)。
3. **原生高效運算層 (Native Backend Layer - Rust / Tauri Core)**：
   - `AppState` / `AppStateInner`：後端執行緒安全受管狀態，以 `Mutex` 保護跨視窗共享之影格資料。
   - `ImageOps`：無狀態影像演算法模組，包含灰階權重轉換、二值化、`color_quant::NeuQuant` 色彩量化、中值排序去雜訊、拉普拉斯邊緣二階微分等。
   - `GifOps`：串流式 GIF 編碼器模組，支援縮放、尺寸適配與全域/逐格延遲控制。
   - `TauriCommands`：註冊於 `lib.rs` 的 IPC 入口函式。

### 2.2 Mermaid 類別圖

```mermaid
classDiagram
    direction TB

    %% ---------------- 前端展示層 ----------------
    class App {
        -string filename
        -string baseImageData
        -string previewImageData
        -string originalImageData
        -ToolType activeTool
        -boolean showDrawingLayer
        -BrushType brushType
        -number brushSize
        -number brushOpacity
        -string brushColor
        -number binaryThreshold
        -number paletteCount
        -number medianKernel
        -number medianCount
        -string laplacianKernelType
        -number laplacianStrength
        -LaplacianViewMode laplacianMode
        -number zoom
        -Point pan
        -HistoryStep[] history
        -number historyIndex
        +pushHistory(description, newBase, newDrawing) void
        +loadImageData(dataUrl, name) void
        +handleUndo() void
        +handleRedo() void
        +handleResetOriginal() void
        +handleSelectTool(tool) void
        +handleApplyCurrentPreview(desc) void
        +handleApplyMedianRect(rect) void
        +handleDrawingCommit(drawingDataUrl) void
        +getMergedCompositeDataUrl() string
        +handleExport() void
        +handleImport() void
        +handleCaptureCurrentCanvas() void
        +handleOpenGifStudio() void
    }

    class CanvasViewport {
        -boolean isPanning
        -boolean spacePressed
        -Point panStart
        -boolean isSelectingRect
        -Point rectStart
        -FilterRegion currentRect
        -BrushEngine brushEngine
        +handleMouseDown(e) void
        +handleMouseMove(e) void
        +handleMouseUp(e) void
        +handleWheel(e) void
        +handleDrop(e) void
        +samplePixelAtPoint(screenX, screenY) PixelInfo
    }

    class HeaderBar {
        +string filename
        +LaplacianViewMode laplacianMode
        +boolean canUndo
        +boolean canRedo
        +number zoom
        +onUndo() void
        +onRedo() void
        +onLaplacianModeChange(mode) void
        +onZoomIn() void
        +onZoomOut() void
        +onZoomFit() void
    }

    class LeftToolDock {
        +ToolType activeTool
        +onSelectTool(tool) void
        +onImport() void
        +onExport() void
        +onOpenGifStudio() void
    }

    class RightInspector {
        +ToolType activeTool
        +number binaryThreshold
        +number paletteCount
        +number medianKernel
        +number medianCount
        +string laplacianKernelType
        +number laplacianStrength
        +BrushType brushType
        +number brushSize
        +string brushColor
        +onApplyBinary() void
        +onApplyPalette() void
        +onApplyMedian() void
        +onApplyLaplacian() void
    }

    class BottomStatusBar {
        +PixelInfo pixelInfo
        +Dimensions imageDimensions
        +number zoom
    }

    class GifStudioWindow {
        -GifFrameItem[] frames
        -number currentFrameIndex
        -boolean isPlaying
        -number globalDelayMs
        -number loopCount
        -number scale
        -number dragSourceIndex
        -number dragTargetIndex
        +handleImportBatch() void
        +handleCaptureFromCanvas() void
        +handleMoveFrame(from, to) void
        +handleDuplicateFrame(idx) void
        +handleDeleteFrame(idx) void
        +handleExportGif() void
    }

    %% ---------------- 前端引擎與資料型別 ----------------
    class BrushEngine {
        -CanvasRenderingContext2D ctx
        -Point lastPoint
        -boolean isDrawing
        -BrushOptions options
        -RGB cachedRgb
        -number airbrushTimer
        +startStroke(p) void
        +continueStroke(p) void
        +endStroke() boolean
        -renderStroke(p1, p2) void
        -drawPen(p1, p2) void
        -drawCrayon(p1, p2) void
        -drawHighlighter(p1, p2) void
        -drawAirbrush(p) void
        -drawWatercolor(p1, p2) void
        -drawEraser(p1, p2) void
    }

    class HistoryStep {
        +string baseImageData
        +string drawingImageData
        +string description
        +number timestamp
    }

    class PixelInfo {
        +number x
        +number y
        +number r
        +number g
        +number b
        +string hex
    }

    class BrushOptions {
        +BrushType type
        +number size
        +number opacity
        +string color
    }

    class FilterRegion {
        +number x
        +number y
        +number width
        +number height
    }

    class PaletteResult {
        +string image_data
        +number[][] palette
    }

    class LaplacianResult {
        +string original_data
        +string mask_data
        +string sharpened_data
    }

    class GifFrameItem {
        +string id
        +string imageData
        +number delayMs
    }

    class GifExportOptions {
        +GifFrameInput[] frames
        +number global_delay_ms
        +number loop_count
        +number scale
        +string resize_mode
    }

    class TauriBridge {
        <<module>>
        +invokeGrayscale(imageData) Promise~string~
        +invokeBinary(imageData, threshold) Promise~string~
        +invokePalette(imageData, numColors, dither) Promise~PaletteResult~
        +invokeNegative(imageData) Promise~string~
        +invokeMedian(imageData, kernel, region) Promise~string~
        +invokeLaplacian(imageData, kernel, strength) Promise~LaplacianResult~
        +invokeAddSharedGifFrame(frame) Promise~number~
        +invokeGetSharedGifFrames() Promise~GifFrameInput[]~
        +invokeExportGif(options, path) Promise~string~
        +invokeSaveImage(data, path, quality) Promise~string~
        +invokeOpenGifStudio() Promise~void~
        +pickImageFile() Promise~string~
        +pickSavePath(title, filter) Promise~string~
    }

    %% ---------------- 後端 Rust 原生層 ----------------
    class AppState {
        +Mutex~AppStateInner~ inner
        +new() AppState
    }

    class AppStateInner {
        +Vec~GifFrameInput~ shared_frames
    }

    class ImageOps {
        <<module>>
        +decode_image(b64) Result~DynamicImage~
        +encode_image_png(img) Result~string~
        +encode_rgba_png(buf) Result~string~
        +to_grayscale(img) Result~string~
        +to_binary(img, thresh) Result~string~
        +to_palette(img, n_colors, dither) Result~PaletteResult~
        +to_negative(img) Result~string~
        +median_filter_region(img, k_size, region) Result~string~
        +laplacian_filter(img, k_type, strength) Result~LaplacianResult~
    }

    class GifOps {
        <<module>>
        +create_gif_bytes(options) Result~Vec_u8~
    }

    class TauriCommands {
        <<interface>>
        +process_grayscale(image_data)
        +process_binary(image_data, threshold)
        +process_palette(image_data, num_colors, dither)
        +process_negative(image_data)
        +process_median(image_data, kernel_size, region)
        +process_laplacian(image_data, kernel_type, strength)
        +add_shared_gif_frame(frame, state, app_handle)
        +get_shared_gif_frames(state)
        +export_gif(options, file_path)
        +save_image_file(image_data, file_path, quality)
    }

    %% ---------------- 關聯性與依賴關係 ----------------
    App *-- HeaderBar : 組合
    App *-- LeftToolDock : 組合
    App *-- CanvasViewport : 組合
    App *-- RightInspector : 組合
    App *-- BottomStatusBar : 組合
    App o-- GifStudioWindow : 聚合與開啟
    App *-- "0..30" HistoryStep : 維護歷史堆疊

    CanvasViewport *-- BrushEngine : 持有並調用繪圖
    CanvasViewport ..> PixelInfo : 產生探針資料
    CanvasViewport ..> FilterRegion : 產生局部框選範圍
    BrushEngine ..> BrushOptions : 依賴配置參數

    App ..> TauriBridge : 透過 IPC 調用原生服務
    GifStudioWindow ..> TauriBridge : 調用影格共享與匯出
    GifStudioWindow *-- "*" GifFrameItem : 包含時間軸影格

    TauriBridge ..> PaletteResult : 回傳資料結構
    TauriBridge ..> LaplacianResult : 回傳資料結構
    TauriBridge ..> GifExportOptions : 傳遞匯出參數

    TauriBridge ..> TauriCommands : Tauri IPC 通訊
    TauriCommands ..> AppState : 存取受管狀態
    AppState *-- AppStateInner : 互斥鎖保護
    TauriCommands ..> ImageOps : 呼叫核心演算法
    TauriCommands ..> GifOps : 呼叫動畫編碼
```

---

## 三、循序圖 (Sequence Diagram)

### 3.1 循序圖一：影像濾鏡非同步計算與預覽套用流程

> **設計亮點**：展示使用者滑動參數滑桿時，前端透過 `isCancelled` 旗標防止網路/IPC 非同步回應交錯引起的競態條件 (Race Condition)，並透過 Base64 資料交換完成即時預覽與歷史確認套用。

```mermaid
sequenceDiagram
    autonumber
    actor User as 👤 使用者
    participant Inspector as 🖥️ RightInspector
    participant App as ⚛️ App 控制核心
    participant Bridge as 🌉 TauriBridge
    participant TauriCmd as 🦀 TauriCommand (lib.rs)
    participant RustCore as ⚙️ image_ops 影像核心
    participant Viewport as 🎨 CanvasViewport (BaseCanvas)

    User->>Inspector: 拖動二值化閾值滑桿 (Threshold = 180)
    Inspector->>App: 觸發 onBinaryThresholdChange(180)
    
    rect rgb(30, 41, 59)
        note over App: 建立非同步取消旗標 (isCancelled = false)
        App->>Bridge: invokeBinary(baseImageData, 180)
        Bridge->>TauriCmd: invoke("process_binary", { image_data, threshold: 180 })
        
        TauriCmd->>RustCore: decode_image(&image_data)
        RustCore-->>TauriCmd: DynamicImage 實例
        TauriCmd->>RustCore: to_binary(&img, 180)
        note over RustCore: 遍歷像素矩陣計算亮度 Y >= 180 ? 255 : 0<br/>使用 encode_rgba_png 零拷貝編碼
        RustCore-->>TauriCmd: 回傳 DataURL (data:image/png;base64,...)
        TauriCmd-->>Bridge: IPC 回傳 Base64 結果字串
        Bridge-->>App: Promise.resolve(previewUrl)
        
        opt 驗證取消旗標 (若使用者中途未再次拖動滑桿)
            App->>App: setPreviewImageData(previewUrl)
            App->>Viewport: 傳入 previewImageData
            Viewport->>Viewport: BaseCanvas 繪製預覽圖片
        end
    end

    User->>Inspector: 滿意預覽效果，點擊「套用變更」按鈕
    Inspector->>App: 觸發 onApplyBinary()
    App->>App: setBaseImageData(previewImageData)
    App->>App: setPreviewImageData(null)
    App->>App: setActiveTool('none')
    App->>App: pushHistory("套用純黑白二值化", previewImageData)
    note over App: 歷史堆疊新增步驟 (Unified History Step)
    App->>Viewport: 重新以 baseImageData 渲染底圖
```

---

### 3.2 循序圖二：雙圖層筆刷塗鴉繪製與歷史堆疊復原/重做流程

> **設計亮點**：底圖層 (`BaseCanvas`) 與繪圖層 (`DrawingCanvas`) 獨立運作。橡皮擦以 `destination-out` 擦除塗鴉，滑鼠釋放時提交增量快照至歷史堆疊。使用者按下 `Ctrl+Z` 時精準還原雙圖層畫面。

```mermaid
sequenceDiagram
    autonumber
    actor User as 👤 使用者
    participant Viewport as 🎨 CanvasViewport
    participant Engine as 🖌️ BrushEngine
    participant DrawingCanvas as 🖼️ DrawingCanvas (上層畫布)
    participant App as ⚛️ App 控制器
    participant History as 📚 歷史堆疊 (Unified History)

    User->>Viewport: 滑鼠於畫布按下 (MouseDown at P1)
    Viewport->>Engine: startStroke(P1)
    note over Engine: 記錄 lastPoint = P1, isDrawing = true
    Engine->>DrawingCanvas: renderStroke(P1, P1) 繪製起點圓點

    loop 滑鼠持續拖曳移動 (MouseMove)
        User->>Viewport: 滑鼠移動至 P2 (座標經 Zoom 與 Pan 逆轉換)
        Viewport->>Engine: continueStroke(P2)
        alt 筆刷類型為橡皮擦 (Eraser)
            Engine->>DrawingCanvas: 設定 globalCompositeOperation = "destination-out"
            Engine->>DrawingCanvas: 擦除上層塗鴉筆跡 (絲毫不傷底圖)
        else 筆刷類型為鋼筆 / 蠟筆 / 螢光筆
            Engine->>DrawingCanvas: 進行筆刷紋理插值與 Bezier 平滑渲染
        end
        Viewport->>App: onPixelHover(取樣合成畫面座標與色碼)
    end

    User->>Viewport: 釋放滑鼠按鈕 (MouseUp)
    Viewport->>Engine: endStroke()
    Engine-->>Viewport: 回傳 drewSomething = true
    Viewport->>DrawingCanvas: toDataURL("image/png")
    DrawingCanvas-->>Viewport: 取得塗鴉層 DataURL
    Viewport->>App: onDrawingCommit(drawingDataUrl)
    App->>History: pushHistory("繪製筆刷塗鴉", currentBase, drawingDataUrl)
    note over History: 歷史指標 index 推進至新步驟 (最多保留 30 階)

    rect rgb(45, 25, 30)
        note over User, History: 復原流程 (Undo Workflow)
        User->>App: 按下鍵盤快捷鍵 Ctrl + Z
        App->>App: handleUndo()
        App->>History: 讀取 history[index - 1]
        History-->>App: 回傳前一步驟快照 (prevBase, prevDrawing)
        App->>App: setBaseImageData(prevBase)
        App->>DrawingCanvas: clearRect(0, 0, width, height)
        App->>DrawingCanvas: drawImage(prevDrawing)
        App->>App: setHistoryIndex(index - 1)
        note over App: 畫布雙圖層狀態完全復原至塗鴉前
    end
```

---

### 3.3 循序圖三：GIF 動畫工作坊之畫布擷取、多視窗 IPC 廣播與匯出流程

> **設計亮點**：主視窗將底圖與塗鴉層合成完整畫面，透過 Tauri IPC 寫入全域狀態，後端發布 `gif_frame_added` 事件喚醒獨立工作坊視窗，最終以串流編碼器 (`gif::Encoder`) 輸出動態 GIF。

```mermaid
sequenceDiagram
    autonumber
    actor User as 👤 使用者
    participant MainWin as 🖥️ 主視窗 (App)
    participant Bridge as 🌉 TauriBridge
    participant TauriCore as 🦀 Tauri 後端核心 (lib.rs)
    participant State as 📦 AppState (Mutex)
    participant GifWin as 🪟 GIF 工作坊視窗 (GifStudioWindow)
    participant GifOps as 🎞️ gif_ops 動畫編碼器
    participant OS as 💻 作業系統檔案系統

    User->>MainWin: 點擊「擷取目前畫布為 GIF 影格」按鈕
    MainWin->>MainWin: getMergedCompositeDataUrl()
    note over MainWin: 新建臨時 Canvas，將 BaseCanvas 與 DrawingCanvas 合成一體
    
    MainWin->>Bridge: invokeAddSharedGifFrame(frameItem)
    Bridge->>TauriCore: invoke("add_shared_gif_frame", { frame })
    
    TauriCore->>State: inner.lock().shared_frames.push(frame)
    note over State: 存入後端受管狀態 (執行緒安全)
    
    TauriCore->>TauriCore: app_handle.emit("gif_frame_added", &frame)
    note over TauriCore: 向所有 Webview 視窗廣播影格新增事件
    
    TauriCore-->>Bridge: 回傳目前總影格數量
    Bridge-->>MainWin: Promise.resolve(count)
    
    MainWin->>Bridge: invokeOpenGifStudio()
    Bridge->>TauriCore: invoke("open_gif_studio_window")
    TauriCore->>GifWin: 顯示並聚焦 960x680 獨立工作坊視窗

    GifWin->>GifWin: 收到 "gif_frame_added" 廣播事件監聽回呼
    GifWin->>GifWin: setFrames(prev => [...prev, newFrame])
    note over GifWin: 時間軸動態更新，中央即時播放循環預覽

    User->>GifWin: 於時間軸拖曳調整影格次序、設定全域延遲 120ms
    User->>GifWin: 點擊「匯出動態 GIF」按鈕
    GifWin->>Bridge: pickSavePath("animation.gif", ...)
    Bridge->>OS: 開啟儲存檔案對話框
    OS-->>Bridge: 回傳選定路徑 "C:/Images/output.gif"
    Bridge-->>GifWin: savePath

    GifWin->>Bridge: invokeExportGif(options, savePath)
    Bridge->>TauriCore: invoke("export_gif", { options, file_path })
    
    TauriCore->>GifOps: create_gif_bytes(&options)
    note over GifOps: 1. 計算目標尺寸 (crop / min_fit)<br/>2. 串流編碼 Frame (包含 NeuQuant 局部量化與延遲)<br/>3. 設定重複循環次數 Repeat::Infinite
    GifOps-->>TauriCore: 回傳完整 GIF 二進位位元組 (Vec<u8>)
    
    TauriCore->>OS: std::fs::write(&file_path, bytes)
    OS-->>TauriCore: 寫入成功
    TauriCore-->>Bridge: Ok("成功匯出 GIF 至 C:/Images/output.gif")
    Bridge-->>GifWin: 匯出成功回傳
    GifWin->>User: 顯示綠色成功徽章與檔案匯出通知
```

---

## 四、架構特徵與原始碼對應驗證表

| UML 模型實體 / 關聯 | 系統模組 / 原始碼位置 | 實作特性與驗證說明 |
|---|---|---|
| **雙圖層架構 (Dual-Canvas)** | `src/components/canvas/CanvasViewport.tsx` | 分設 `baseCanvasRef` 與 `drawingCanvasRef`，底層承載濾鏡運算，上層承載筆刷，互不干擾。 |
| **橡皮擦 destination-out** | `src/utils/brushEngine.ts` | `ctx.globalCompositeOperation = 'destination-out'`，僅精準清除透明塗鴉層，保護原圖無損。 |
| **統一歷史堆疊 (HistoryStep)** | `src/App.tsx` 與 `src/types/index.ts` | 上限 30 階，每個 Step 同時封裝 `baseImageData` 與 `drawingImageData`，達成完美復原/重做。 |
| **非同步防競態預覽** | `src/App.tsx` (L281-L341) | `useEffect` 內部配置 `isCancelled` 清理旗標，徹底消除滑動參數時的非同步 Race Condition。 |
| **高效能空間域與銳化** | `src-tauri/src/image_ops.rs` | 以純 Rust 實作 4-鄰域與 8-鄰域拉普拉斯矩陣微分、奇數窗口中值濾波與 `NeuQuant` 調色盤量化。 |
| **跨視窗影格廣播** | `src-tauri/src/lib.rs` 與 `src/components/gif/GifStudioWindow.tsx` | 透過 `app_handle.emit("gif_frame_added")` 實現 Tauri 多視窗 IPC 雙向同步。 |
| **零拷貝串流 GIF 編碼** | `src-tauri/src/gif_ops.rs` | 支援 `min_fit` 最小邊長自適應與串流式 `gif::Encoder`，避免多影格匯出時記憶體爆增。 |
