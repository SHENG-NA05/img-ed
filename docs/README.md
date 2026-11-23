# Photoshop Studio 專案架構與 UML 模型文件目錄

本目錄 (`docs/`) 存放 **Photoshop Studio - 旗艦級 Windows 桌面影像編輯器** 的完整系統架構規格、UML 模型圖集與原始碼。

---

## 📂 目錄結構

```text
docs/
├── README.md                           # 本指引說明文件
├── UML架構規格書.md                    # 完整 UML 模型規格書 (含系統分析、Mermaid 內嵌圖與對照表)
│
├── 使用者案例.svg                      # 最新版使用者案例圖 (Level-1 全景圖，高清向量)
├── 類別圖.svg                          # 最新版系統類別圖 (含最新型別欄位，高清向量)
├── 循序圖.svg                          # 循序圖總覽 (情境一：濾鏡非同步計算)
├── 循序圖-情境1_濾鏡預覽與套用.svg     # 循序圖一：影像濾鏡非同步計算與套用流程
├── 循序圖-情境2_筆刷塗鴉與復原重做.svg # 循序圖二：雙圖層筆刷塗鴉與 Undo/Redo 歷史管理
├── 循序圖-情境3_GIF擷取與串流匯出.svg  # 循序圖三：GIF 工作坊畫布擷取與跨視窗匯出
│
├── 使用者案例圖/                       # 使用者案例分層高清向量圖 (Level-1 + Level-2)
│   ├── 使用者案例-level_1.svg          # 系統全景總覽圖 (5 大核心模組)
│   ├── 使用者案例-level_2-1.svg        # 子系統一：空間域與色調濾鏡管線
│   ├── 使用者案例-level_2-2.svg        # 子系統二：雙圖層繪圖塗鴉與歷史狀態
│   └── 使用者案例-level_2-3.svg        # 子系統三：GIF 動畫製作工作坊
│
├── plantuml/                           # PlantUML 格式圖檔原始碼 (*.puml) 與 SVG 匯出
│   ├── use_case_diagram.puml          # 使用者案例圖原始碼
│   ├── use_case_diagram.svg           # 使用者案例圖 PlantUML 向量圖
│   ├── class_diagram.puml             # 系統類別圖原始碼
│   ├── class_diagram.svg              # 系統類別圖 PlantUML 向量圖
│   ├── sequence_diagram_filter.puml   # 循序圖一原始碼
│   ├── sequence_diagram_filter.svg    # 循序圖一 PlantUML 向量圖
│   ├── sequence_diagram_drawing.puml  # 循序圖二原始碼
│   ├── sequence_diagram_drawing.svg   # 循序圖二 PlantUML 向量圖
│   ├── sequence_diagram_gif.puml      # 循序圖三原始碼
│   └── sequence_diagram_gif.svg       # 循序圖三 PlantUML 向量圖
│
└── mermaid/                            # Mermaid 格式圖檔原始碼 (*.mmd)
    ├── use_case_diagram.mmd           # 使用者案例圖 (系統全景總覽)
    ├── use_case_subsystem_filter.mmd  # 使用者案例細部圖：濾鏡處理管線
    ├── use_case_subsystem_drawing.mmd # 使用者案例細部圖：雙圖層繪圖與歷史
    ├── use_case_subsystem_gif.mmd     # 使用者案例細部圖：GIF 工作坊
    ├── class_diagram.mmd              # 系統類別圖
    ├── sequence_diagram_filter.mmd    # 循序圖一：濾鏡計算
    ├── sequence_diagram_drawing.mmd   # 循序圖二：筆刷與歷史
    └── sequence_diagram_gif.mmd       # 循序圖三：GIF 匯出
```

---

## 🚀 圖檔檢視與匯出指引

### 1. Markdown 內嵌即時預覽 (推薦)
直接在支援 Markdown 渲染的環境（例如 **GitHub 網頁**、**VS Code (安裝 Markdown Preview Mermaid Support)**、**Obsidian** 或 **GitLab**）開啟：
👉 [`UML架構規格書.md`](./UML架構規格書.md)  
所有圖表均會自動解析並渲染為高解析度的互動向量圖。

### 2. 使用 PlantUML 匯出高解析 SVG / PNG / PDF
本專案的 `plantuml/*.puml` 遵循標準 PlantUML 語法：
- **線上即時渲染**：複製 `.puml` 內容至 [PlantText 線上編輯器](https://www.planttext.com/) 即可直接預覽與下載向量圖。
- **本機 CLI 批次產圖**：
  ```bash
  # 安裝 plantuml (需 Java 環境)
  java -jar plantuml.jar -tsvg docs/plantuml/*.puml
  ```

### 3. 使用 Mermaid Live Editor 或 Mermaid CLI (mmdc)
- **線上檢視**：複製 `mermaid/*.mmd` 內容至 [Mermaid Live Editor](https://mermaid.live/)。
- **CLI 轉圖**：
  ```bash
  npx @mermaid-js/mermaid-cli -i docs/mermaid/class_diagram.mmd -o class_diagram.svg
  ```

---

## 📑 涵蓋的 UML 圖表清單

1. **使用者案例圖 (Use Case Diagram)**
   - 包含 6 大子系統、使用者主參與者、作業系統次參與者、包含 (`<<include>>`) 與擴充 (`<<extend>>`) 關係。
2. **類別圖 (Class Diagram)**
   - 涵蓋前端展示層 (`App`, `CanvasViewport`, `HeaderBar`, `RightInspector` 等)、前端核心引擎 (`BrushEngine`, `TauriBridge`, 型別合約)、後端原生運算層 (`AppState`, `ImageOps`, `GifOps`, `TauriCommands`)。
3. **循序圖 (Sequence Diagrams)**
   - **情境一**：空間域濾鏡非同步計算、防競態條件取消旗標與套用流程。
   - **情境二**：雙圖層畫布筆刷塗鴉渲染、`destination-out` 橡皮擦與統一歷史堆疊 Undo/Redo 還原流程。
   - **情境三**：GIF 工作坊之畫布影格擷取、多視窗 IPC 全域事件廣播 (`gif_frame_added`) 與串流編碼匯出流程。
