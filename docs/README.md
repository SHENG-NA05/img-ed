# Photoshop Studio 專案架構與 UML 模型文件目錄

本目錄 (`docs/`) 存放 **Photoshop Studio - 旗艦級 Windows 桌面影像編輯器** 的完整系統架構規格、UML 模型圖集與原始碼。

---

## 📂 目錄結構

```text
docs/
├── README.md                           # 本指引說明文件
├── UML架構規格書.md                    # 完整 UML 模型規格書 (含系統分析、Mermaid 內嵌圖與對照表)
│
├── plantuml/                           # PlantUML 格式圖檔原始碼 (*.puml)
│   ├── use_case_diagram.puml          # 使用者案例圖 (Use Case Diagram)
│   ├── class_diagram.puml             # 系統類別圖 (Class Diagram)
│   ├── sequence_diagram_filter.puml   # 循序圖一：影像濾鏡非同步運算與套用流程
│   ├── sequence_diagram_drawing.puml  # 循序圖二：雙圖層筆刷塗鴉與 Undo/Redo 歷史管理
│   └── sequence_diagram_gif.puml      # 循序圖三：GIF 工作坊畫布擷取與跨視窗匯出
│
└── mermaid/                            # Mermaid 格式圖檔原始碼 (*.mmd)
    ├── use_case_diagram.mmd           # 使用者案例圖
    ├── class_diagram.mmd              # 系統類別圖
    ├── sequence_diagram_filter.mmd    # 循序圖一
    ├── sequence_diagram_drawing.mmd   # 循序圖二
    └── sequence_diagram_gif.mmd       # 循序圖三
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
