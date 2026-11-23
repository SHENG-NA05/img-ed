import React from 'react';
import {
  Sliders,
  Check,
  X,
  Layers,
  Info,
  Sparkles,
  Filter,
  Zap,
  Trash2,
  Pen,
  Pencil,
  Highlighter,
  SprayCan,
  Paintbrush,
  Eraser,
} from 'lucide-react';
import { BrushType, ToolType } from '../../types';

interface RightInspectorProps {
  activeTool: ToolType;
  imageLoaded: boolean;
  imageDimensions: { width: number; height: number } | null;
  // Binary threshold
  binaryThreshold: number;
  onBinaryThresholdChange: (val: number) => void;
  onApplyBinary: () => void;
  // Palette
  paletteCount: number;
  onPaletteCountChange: (count: number) => void;
  paletteDither: boolean;
  onPaletteDitherChange: (dither: boolean) => void;
  extractedPalette: [number, number, number][];
  onApplyPalette: () => void;
  // Grayscale & Negative
  onApplyGrayscale: () => void;
  onApplyNegative: () => void;
  // Median
  medianKernel: number;
  onMedianKernelChange: (size: number) => void;
  onApplyMedian: () => void;
  medianCount?: number;
  onResetMedianPreview?: () => void;
  // Laplacian
  laplacianKernelType: string;
  onLaplacianKernelChange: (type: string) => void;
  laplacianStrength: number;
  onLaplacianStrengthChange: (val: number) => void;
  onApplyLaplacian: () => void;
  // Brush & Eraser
  brushType: BrushType;
  onBrushTypeChange: (type: BrushType) => void;
  brushSize: number;
  onBrushSizeChange: (size: number) => void;
  brushOpacity: number;
  onBrushOpacityChange: (opacity: number) => void;
  brushColor: string;
  onBrushColorChange: (color: string) => void;
  onClearDrawingCanvas: () => void;
  // Cancel / Reset preview
  onCancelTool: () => void;
  // Layer visibility toggles
  showDrawingLayer: boolean;
  onToggleDrawingLayer: () => void;
}

export const RightInspector: React.FC<RightInspectorProps> = ({
  activeTool,
  imageLoaded,
  imageDimensions,
  binaryThreshold,
  onBinaryThresholdChange,
  onApplyBinary,
  paletteCount,
  onPaletteCountChange,
  paletteDither,
  onPaletteDitherChange,
  extractedPalette,
  onApplyPalette,
  onApplyGrayscale,
  onApplyNegative,
  medianKernel,
  onMedianKernelChange,
  onApplyMedian,
  medianCount,
  onResetMedianPreview,
  laplacianKernelType,
  onLaplacianKernelChange,
  laplacianStrength,
  onLaplacianStrengthChange,
  onApplyLaplacian,
  brushType,
  onBrushTypeChange,
  brushSize,
  onBrushSizeChange,
  brushOpacity,
  onBrushOpacityChange,
  brushColor,
  onBrushColorChange,
  onClearDrawingCanvas,
  onCancelTool,
  showDrawingLayer,
  onToggleDrawingLayer,
}) => {
  const commonSwatches = [
    '#ffffff', '#000000', '#ef4444', '#f97316',
    '#eab308', '#22c55e', '#3b82f6', '#a855f7',
    '#ec4899', '#64748b'
  ];

  return (
    <aside className="w-[280px] bg-ps-panel border-l border-ps-border flex flex-col h-full select-none z-20 shrink-0">
      {/* 頂部標題 */}
      <div className="h-[44px] border-b border-ps-border px-3 flex items-center justify-between">
        <div className="flex items-center space-x-2 text-xs font-semibold text-ps-textBright uppercase tracking-wider">
          <Sliders className="w-4 h-4 text-ps-accent" />
          <span>屬性控制項</span>
        </div>
        {activeTool !== 'none' && activeTool !== 'brush' && (
          <button
            onClick={onCancelTool}
            className="p-1 rounded hover:bg-ps-hover text-ps-text hover:text-ps-textBright transition-colors"
            title="關閉工具"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 面板滾動區 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* 1. 灰階控制項 */}
        {activeTool === 'grayscale' && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-sm font-semibold text-ps-textBright">
              <Sparkles className="w-4 h-4 text-ps-accent" />
              <span>灰階色彩轉換</span>
            </div>
            <div className="text-xs text-ps-textMuted bg-ps-canvas p-2.5 rounded border border-ps-border leading-relaxed">
              根據 CIE 標準亮度權重公式運算：
              <div className="font-mono text-ps-accent mt-1">Y = 0.299R + 0.587G + 0.114B</div>
              完整保留高頻紋理與光影深度。
            </div>
            <div className="flex space-x-2 pt-2">
              <button
                onClick={onApplyGrayscale}
                disabled={!imageLoaded}
                className="flex-1 py-1.5 px-3 bg-ps-accent hover:bg-ps-accentHover text-white rounded text-xs font-medium flex items-center justify-center space-x-1 shadow transition-colors disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>套用灰階</span>
              </button>
              <button
                onClick={onCancelTool}
                className="py-1.5 px-3 bg-ps-canvas hover:bg-ps-hover text-ps-text rounded text-xs border border-ps-border transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        )}

        {/* 2. 純黑白二值化控制項 */}
        {activeTool === 'binary' && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-sm font-semibold text-ps-textBright">
              <span className="w-2.5 h-2.5 rounded-full bg-ps-accent inline-block" />
              <span>純黑白二值化</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-ps-text">
                <span>分割閾值 (Threshold)</span>
                <span className="font-mono font-bold text-ps-accent">{binaryThreshold}</span>
              </div>
              <input
                type="range"
                min="0"
                max="255"
                value={binaryThreshold}
                onChange={(e) => onBinaryThresholdChange(parseInt(e.target.value, 10))}
                className="w-full accent-ps-accent cursor-pointer h-1.5 bg-ps-canvas rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-ps-textMuted font-mono">
                <span>0 (全白)</span>
                <span>128 (預設)</span>
                <span>255 (全黑)</span>
              </div>
            </div>
            <div className="flex space-x-2 pt-2">
              <button
                onClick={onApplyBinary}
                disabled={!imageLoaded}
                className="flex-1 py-1.5 px-3 bg-ps-accent hover:bg-ps-accentHover text-white rounded text-xs font-medium flex items-center justify-center space-x-1 shadow transition-colors disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>套用黑白</span>
              </button>
              <button
                onClick={onCancelTool}
                className="py-1.5 px-3 bg-ps-canvas hover:bg-ps-hover text-ps-text rounded text-xs border border-ps-border transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        )}

        {/* 3. 調色盤量化控制項 */}
        {activeTool === 'palette' && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-sm font-semibold text-ps-textBright">
              <span className="w-2.5 h-2.5 rounded-full bg-ps-accent inline-block" />
              <span>調色盤色彩量化</span>
            </div>

            {/* 色彩數量選取 */}
            <div className="space-y-1.5">
              <label className="text-xs text-ps-text">目標色彩數量</label>
              <div className="grid grid-cols-5 gap-1">
                {[4, 8, 16, 32, 64].map((count) => (
                  <button
                    key={count}
                    onClick={() => onPaletteCountChange(count)}
                    className={`py-1 text-xs rounded font-mono font-medium transition-all ${
                      paletteCount === count
                        ? 'bg-ps-accent text-white shadow'
                        : 'bg-ps-canvas text-ps-text hover:bg-ps-hover border border-ps-border'
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>

            {/* 抖動演算法開關 */}
            <div className="flex items-center justify-between bg-ps-canvas p-2.5 rounded border border-ps-border">
              <div className="space-y-0.5">
                <div className="text-xs text-ps-text font-medium">Floyd-Steinberg 抖動</div>
                <div className="text-[10px] text-ps-textMuted">消除色階斷層並柔化邊界</div>
              </div>
              <input
                type="checkbox"
                checked={paletteDither}
                onChange={(e) => onPaletteDitherChange(e.target.checked)}
                className="w-4 h-4 accent-ps-accent cursor-pointer"
              />
            </div>

            {/* 萃取調色盤色票 */}
            {extractedPalette.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-xs text-ps-text flex justify-between items-center">
                  <span>萃取之調色盤色票</span>
                  <span className="text-[10px] text-ps-textMuted font-mono">
                    {extractedPalette.length} 色
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 max-h-[100px] overflow-y-auto p-1.5 bg-ps-canvas rounded border border-ps-border">
                  {extractedPalette.map(([r, g, b], idx) => {
                    const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
                    return (
                      <button
                        key={idx}
                        onClick={() => onBrushColorChange(hex)}
                        title={`點擊取色: ${hex} (RGB: ${r},${g},${b})`}
                        style={{ backgroundColor: hex }}
                        className="w-5 h-5 rounded border border-neutral-700 hover:scale-125 transition-transform"
                      />
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex space-x-2 pt-2">
              <button
                onClick={onApplyPalette}
                disabled={!imageLoaded}
                className="flex-1 py-1.5 px-3 bg-ps-accent hover:bg-ps-accentHover text-white rounded text-xs font-medium flex items-center justify-center space-x-1 shadow transition-colors disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>套用調色盤</span>
              </button>
              <button
                onClick={onCancelTool}
                className="py-1.5 px-3 bg-ps-canvas hover:bg-ps-hover text-ps-text rounded text-xs border border-ps-border transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        )}

        {/* 4. 負片控制項 */}
        {activeTool === 'negative' && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-sm font-semibold text-ps-textBright">
              <span className="w-2.5 h-2.5 rounded-full bg-ps-accent inline-block" />
              <span>負片色彩反轉</span>
            </div>
            <div className="text-xs text-ps-textMuted bg-ps-canvas p-2.5 rounded border border-ps-border leading-relaxed">
              逐通道反轉 RGB 像素值：
              <div className="font-mono text-ps-accent mt-1">(255 - R, 255 - G, 255 - B)</div>
              呈現經典底片沖印對比視覺風格。
            </div>
            <div className="flex space-x-2 pt-2">
              <button
                onClick={onApplyNegative}
                disabled={!imageLoaded}
                className="flex-1 py-1.5 px-3 bg-ps-accent hover:bg-ps-accentHover text-white rounded text-xs font-medium flex items-center justify-center space-x-1 shadow transition-colors disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>套用負片</span>
              </button>
              <button
                onClick={onCancelTool}
                className="py-1.5 px-3 bg-ps-canvas hover:bg-ps-hover text-ps-text rounded text-xs border border-ps-border transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        )}

        {/* 5. 中值濾波控制項 */}
        {activeTool === 'median' && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-sm font-semibold text-ps-textBright">
              <Filter className="w-4 h-4 text-ps-accent" />
              <span>空間域中值濾波</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-ps-text">滑動窗口核心大小</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[3, 5, 7].map((k) => (
                  <button
                    key={k}
                    onClick={() => onMedianKernelChange(k)}
                    className={`py-1.5 text-xs rounded font-mono font-medium transition-all ${
                      medianKernel === k
                        ? 'bg-ps-accent text-white shadow'
                        : 'bg-ps-canvas text-ps-text hover:bg-ps-hover border border-ps-border'
                    }`}
                  >
                    {k} × {k}
                  </button>
                ))}
              </div>
            </div>

            {/* 操作說明與已處理計數 */}
            <div className="space-y-2 bg-ps-canvas p-2.5 rounded border border-ps-border">
              <div className="text-[11px] text-ps-accent font-medium flex items-center space-x-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-ps-accent" />
                <span>矩形去噪操作指引：</span>
              </div>
              <p className="text-[11px] text-ps-textMuted leading-relaxed">
                在畫布上按住滑鼠左鍵拖曳出矩形選區，放開後自動對該區域進行中值濾波去噪。可連續框選多個區域。
              </p>
              <div className="flex items-center justify-between pt-1 border-t border-ps-border/60 text-xs">
                <span className="text-ps-textMuted">已處理區域：</span>
                <span className="font-mono font-bold text-ps-accent">
                  {(medianCount || 0) > 0 ? `${medianCount} 處` : '尚未框選'}
                </span>
              </div>
            </div>

            {(medianCount || 0) > 0 && onResetMedianPreview && (
              <button
                onClick={onResetMedianPreview}
                className="w-full py-1.5 px-3 bg-ps-hover hover:bg-ps-active text-ps-text rounded text-xs border border-ps-border transition-colors flex items-center justify-center space-x-1"
              >
                <span>重設預覽（復原所有框選）</span>
              </button>
            )}

            <div className="flex space-x-2 pt-2">
              <button
                onClick={onApplyMedian}
                disabled={!imageLoaded || (medianCount || 0) === 0}
                className="flex-1 py-1.5 px-3 bg-ps-accent hover:bg-ps-accentHover text-white rounded text-xs font-medium flex items-center justify-center space-x-1 shadow transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="w-3.5 h-3.5" />
                <span>套用濾波</span>
              </button>
              <button
                onClick={onCancelTool}
                className="py-1.5 px-3 bg-ps-canvas hover:bg-ps-hover text-ps-text rounded text-xs border border-ps-border transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        )}

        {/* 6. 拉普拉斯濾波控制項 */}
        {activeTool === 'laplacian' && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-sm font-semibold text-ps-textBright">
              <Zap className="w-4 h-4 text-ps-accent" />
              <span>拉普拉斯銳化濾波</span>
            </div>

            {/* 卷積核選擇 */}
            <div className="space-y-1.5">
              <label className="text-xs text-ps-text">卷積核鄰域模式</label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => onLaplacianKernelChange('4')}
                  className={`py-1.5 text-xs rounded font-medium transition-all ${
                    laplacianKernelType === '4'
                      ? 'bg-ps-accent text-white shadow'
                      : 'bg-ps-canvas text-ps-text hover:bg-ps-hover border border-ps-border'
                  }`}
                >
                  4 鄰域 (十字方向)
                </button>
                <button
                  onClick={() => onLaplacianKernelChange('8')}
                  className={`py-1.5 text-xs rounded font-medium transition-all ${
                    laplacianKernelType === '8'
                      ? 'bg-ps-accent text-white shadow'
                      : 'bg-ps-canvas text-ps-text hover:bg-ps-hover border border-ps-border'
                  }`}
                >
                  8 鄰域 (全方位)
                </button>
              </div>
            </div>

            {/* 銳化強度滑桿 */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-ps-text">
                <span>銳化增強強度 (Alpha)</span>
                <span className="font-mono font-bold text-ps-accent">
                  {laplacianStrength.toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="3.0"
                step="0.1"
                value={laplacianStrength}
                onChange={(e) => onLaplacianStrengthChange(parseFloat(e.target.value))}
                className="w-full accent-ps-accent cursor-pointer h-1.5 bg-ps-canvas rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-ps-textMuted font-mono">
                <span>0.1 (微弱)</span>
                <span>1.0 (標準)</span>
                <span>3.0 (強烈)</span>
              </div>
            </div>

            <div className="text-[11px] text-ps-accent bg-ps-accent/10 border border-ps-accent/30 p-2.5 rounded leading-relaxed">
              💡 提示：您可隨時點擊頂部中央按鈕切換「原始影像」、「遮罩影像」與「銳化影像」以即時對比！
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                onClick={onApplyLaplacian}
                disabled={!imageLoaded}
                className="flex-1 py-1.5 px-3 bg-ps-accent hover:bg-ps-accentHover text-white rounded text-xs font-medium flex items-center justify-center space-x-1 shadow transition-colors disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>套用銳化</span>
              </button>
              <button
                onClick={onCancelTool}
                className="py-1.5 px-3 bg-ps-canvas hover:bg-ps-hover text-ps-text rounded text-xs border border-ps-border transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        )}

        {/* 7. 筆刷與橡皮擦控制項 */}
        {activeTool === 'brush' && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-sm font-semibold text-ps-textBright">
              <span className="w-2.5 h-2.5 rounded-full bg-ps-accent inline-block" />
              <span>筆刷引擎與塗鴉屬性</span>
            </div>

            {/* 筆刷模式選擇 */}
            <div className="space-y-1.5">
              <label className="text-xs text-ps-text">筆觸類型</label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { type: 'pen', label: '鋼筆', icon: Pen },
                  { type: 'crayon', label: '蠟筆', icon: Pencil },
                  { type: 'highlighter', label: '螢光筆', icon: Highlighter },
                  { type: 'airbrush', label: '噴槍', icon: SprayCan },
                  { type: 'watercolor', label: '水彩筆', icon: Paintbrush },
                  { type: 'eraser', label: '橡皮擦', icon: Eraser },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.type}
                      onClick={() => onBrushTypeChange(item.type as BrushType)}
                      className={`py-1.5 px-2 text-xs rounded flex items-center space-x-1.5 font-medium transition-all ${
                        brushType === item.type
                          ? 'bg-ps-accent text-white shadow'
                          : 'bg-ps-canvas text-ps-text hover:bg-ps-hover border border-ps-border'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 筆刷大小滑桿 */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-ps-text">
                <span>筆刷大小</span>
                <span className="font-mono font-bold text-ps-accent">{brushSize} px</span>
              </div>
              <input
                type="range"
                min="1"
                max="100"
                value={brushSize}
                onChange={(e) => onBrushSizeChange(parseInt(e.target.value, 10))}
                className="w-full accent-ps-accent cursor-pointer h-1.5 bg-ps-canvas rounded-lg"
              />
            </div>

            {/* 不透明度滑桿 */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-ps-text">
                <span>不透明度</span>
                <span className="font-mono font-bold text-ps-accent">
                  {Math.round(brushOpacity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.01"
                max="1.0"
                step="0.01"
                value={brushOpacity}
                onChange={(e) => onBrushOpacityChange(parseFloat(e.target.value))}
                className="w-full accent-ps-accent cursor-pointer h-1.5 bg-ps-canvas rounded-lg"
              />
            </div>

            {/* 筆刷色彩選擇器 (橡皮擦時隱藏) */}
            {brushType !== 'eraser' && (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs text-ps-text">
                  <span>色彩選擇器</span>
                  <div className="flex items-center space-x-1">
                    <span
                      className="w-3.5 h-3.5 rounded border border-neutral-600 inline-block"
                      style={{ backgroundColor: brushColor }}
                    />
                    <span className="font-mono text-ps-textBright uppercase">{brushColor}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={brushColor}
                    onChange={(e) => onBrushColorChange(e.target.value)}
                    className="w-8 h-8 rounded border-0 bg-transparent cursor-pointer p-0"
                  />
                  <div className="grid grid-cols-5 gap-1 flex-1">
                    {commonSwatches.map((hex) => (
                      <button
                        key={hex}
                        onClick={() => onBrushColorChange(hex)}
                        style={{ backgroundColor: hex }}
                        className={`h-6 rounded border transition-transform ${
                          brushColor.toLowerCase() === hex.toLowerCase()
                            ? 'border-white scale-110 shadow'
                            : 'border-neutral-700 hover:scale-105'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 清除塗鴉按鈕 */}
            <div className="pt-2">
              <button
                onClick={onClearDrawingCanvas}
                className="w-full py-1.5 px-3 bg-ps-canvas hover:bg-rose-950/40 hover:text-rose-400 text-ps-text rounded text-xs border border-ps-border flex items-center justify-center space-x-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>清除所有塗鴉筆跡</span>
              </button>
            </div>
          </div>
        )}

        {/* 8. 預設模式：圖層與影像資訊摘要 */}
        {activeTool === 'none' && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-sm font-semibold text-ps-textBright">
              <Layers className="w-4 h-4 text-ps-accent" />
              <span>圖層與影像摘要</span>
            </div>

            {/* 圖層清單 */}
            <div className="space-y-1.5 bg-ps-canvas p-2.5 rounded border border-ps-border">
              <div className="text-[11px] text-ps-textMuted font-semibold mb-1">圖層結構</div>
              <div className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-ps-hover text-xs">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={showDrawingLayer}
                    onChange={onToggleDrawingLayer}
                    className="accent-ps-accent cursor-pointer"
                  />
                  <span className="text-ps-textBright font-medium">塗鴉畫布 (Drawing Canvas)</span>
                </div>
                <span className="text-[10px] text-ps-accent font-mono">上層</span>
              </div>
              <div className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-ps-hover text-xs">
                <div className="flex items-center space-x-2">
                  <input type="checkbox" checked disabled className="accent-ps-accent" />
                  <span className="text-ps-textBright font-medium">照片底圖 (Base Canvas)</span>
                </div>
                <span className="text-[10px] text-ps-textMuted font-mono">底層</span>
              </div>
            </div>

            {/* 影像詳細規格 */}
            {imageDimensions && (
              <div className="space-y-1.5 bg-ps-canvas p-2.5 rounded border border-ps-border text-xs">
                <div className="text-[11px] text-ps-textMuted font-semibold mb-1">影像屬性</div>
                <div className="flex justify-between py-0.5">
                  <span className="text-ps-textMuted">解析度：</span>
                  <span className="font-mono text-ps-textBright">
                    {imageDimensions.width} × {imageDimensions.height} px
                  </span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-ps-textMuted">寬高比：</span>
                  <span className="font-mono text-ps-textBright">
                    {(imageDimensions.width / imageDimensions.height).toFixed(2)} : 1
                  </span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-ps-textMuted">色彩空間：</span>
                  <span className="font-mono text-ps-textBright">RGBA (32-bit)</span>
                </div>
              </div>
            )}

            {/* 快速鍵指南 */}
            <div className="space-y-1 bg-ps-canvas p-2.5 rounded border border-ps-border text-[11px] text-ps-textMuted leading-relaxed">
              <div className="flex items-center space-x-1 text-ps-text font-semibold mb-1">
                <Info className="w-3.5 h-3.5 text-ps-accent" />
                <span>操作快捷指南</span>
              </div>
              <div>• <kbd className="text-ps-accent font-mono">Space + 左鍵拖曳</kbd> 平移畫布</div>
              <div>• <kbd className="text-ps-accent font-mono">滾輪</kbd> 以游標為中心平滑縮放</div>
              <div>• <kbd className="text-ps-accent font-mono">Ctrl + Z</kbd> 復原上一動作</div>
              <div>• <kbd className="text-ps-accent font-mono">Ctrl + Y</kbd> 重做下一步動作</div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
