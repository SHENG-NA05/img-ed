import React, { useState, useEffect, useRef, useCallback } from 'react';
import { HeaderBar } from './components/layout/HeaderBar';
import { LeftToolDock } from './components/layout/LeftToolDock';
import { RightInspector } from './components/layout/RightInspector';
import { BottomStatusBar } from './components/layout/BottomStatusBar';
import { CanvasViewport } from './components/canvas/CanvasViewport';
import { GifStudioWindow } from './components/gif/GifStudioWindow';
import {
  BrushType,
  FilterRegion,
  HistoryStep,
  LaplacianResult,
  LaplacianViewMode,
  PixelInfo,
  ToolType,
} from './types';
import {
  invokeBinary,
  invokeGrayscale,
  invokeLaplacian,
  invokeMedian,
  invokeNegative,
  invokeOpenGifStudio,
  invokePalette,
  invokeSaveImage,
  invokeAddSharedGifFrame,
  pickImageFile,
  pickSavePath,
  isTauri,
} from './utils/tauriBridge';
import { createSampleTestImage } from './utils/sampleImage';

export const App: React.FC = () => {
  // Check if loaded inside independent GIF Studio sub-window (hash router)
  const isGifStudioSubWindow = window.location.hash.includes('gif-studio');

  // Core Application States
  const [filename, setFilename] = useState<string>('未命名專案.png');
  const [baseImageData, setBaseImageData] = useState<string | null>(null);
  const [previewImageData, setPreviewImageData] = useState<string | null>(null);
  const [originalImageData, setOriginalImageData] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(
    null
  );

  // Tools & Modes
  const [activeTool, setActiveTool] = useState<ToolType>('none');
  const [showDrawingLayer, setShowDrawingLayer] = useState<boolean>(true);

  // Brush settings
  const [brushType, setBrushType] = useState<BrushType>('pen');
  const [brushSize, setBrushSize] = useState<number>(8);
  const [brushOpacity, setBrushOpacity] = useState<number>(1.0);
  const [brushColor, setBrushColor] = useState<string>('#ef4444');

  // Filter parameters
  const [binaryThreshold, setBinaryThreshold] = useState<number>(128);
  const [paletteCount, setPaletteCount] = useState<number>(16);
  const [paletteDither, setPaletteDither] = useState<boolean>(true);
  const [extractedPalette, setExtractedPalette] = useState<[number, number, number][]>([]);
  const [medianKernel, setMedianKernel] = useState<number>(3);
  const [medianCount, setMedianCount] = useState<number>(0);
  const [isProcessingFilter, setIsProcessingFilter] = useState<boolean>(false);

  // Laplacian filter states
  const [laplacianKernelType, setLaplacianKernelType] = useState<string>('8');
  const [laplacianStrength, setLaplacianStrength] = useState<number>(1.0);
  const [laplacianMode, setLaplacianMode] = useState<LaplacianViewMode>('sharpened');
  const laplacianModeRef = useRef<LaplacianViewMode>(laplacianMode);
  laplacianModeRef.current = laplacianMode;
  const [laplacianCache, setLaplacianCache] = useState<LaplacianResult | null>(null);

  // Viewport navigation
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [pixelInfo, setPixelInfo] = useState<PixelInfo | null>(null);

  // Unified History Stack (Max 30 steps)
  const [history, setHistory] = useState<HistoryStep[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Web fallback GIF modal
  const [isGifModalOpen, setIsGifModalOpen] = useState<boolean>(false);

  // Canvas Refs
  const baseCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);

  // If this window is the standalone GIF Studio child window:
  if (isGifStudioSubWindow) {
    return <GifStudioWindow />;
  }

  // Push new state to unified history
  const pushHistory = useCallback(
    (description: string, newBase?: string, newDrawing?: string) => {
      const currentBase = newBase !== undefined ? newBase : baseImageData || '';
      const currentDrawing =
        newDrawing !== undefined
          ? newDrawing
          : drawingCanvasRef.current?.toDataURL('image/png') || '';

      const newStep: HistoryStep = {
        baseImageData: currentBase,
        drawingImageData: currentDrawing,
        description,
        timestamp: Date.now(),
      };

      setHistory((prev) => {
        const sliced = prev.slice(0, historyIndex + 1);
        if (sliced.length >= 30) {
          sliced.shift();
        }
        return [...sliced, newStep];
      });
      setHistoryIndex((prev) => Math.min(prev + 1, 29));
    },
    [baseImageData, historyIndex]
  );

  // Load new image buffer
  const loadImageData = useCallback(
    (dataUrl: string, name: string) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        setFilename(name);
        setBaseImageData(dataUrl);
        setOriginalImageData(dataUrl);
        setPreviewImageData(null);
        setImageDimensions({ width: img.width, height: img.height });
        setActiveTool('none');
        setMedianCount(0);

        // Clear drawing canvas
        if (drawingCanvasRef.current) {
          const dCtx = drawingCanvasRef.current.getContext('2d');
          if (dCtx) {
            dCtx.clearRect(0, 0, drawingCanvasRef.current.width, drawingCanvasRef.current.height);
          }
        }

        // Initialize history
        const initialStep: HistoryStep = {
          baseImageData: dataUrl,
          drawingImageData: '',
          description: '載入原始圖片',
          timestamp: Date.now(),
        };
        setHistory([initialStep]);
        setHistoryIndex(0);

        // Center image and fit zoom
        const viewportW = window.innerWidth - 88 - 280;
        const viewportH = window.innerHeight - 44 - 28;
        const scaleW = (viewportW * 0.85) / img.width;
        const scaleH = (viewportH * 0.85) / img.height;
        const fitScale = Math.min(Math.min(scaleW, scaleH), 1.0);
        setZoom(fitScale);
        setPan({
          x: Math.max(20, (viewportW - img.width * fitScale) / 2),
          y: Math.max(20, (viewportH - img.height * fitScale) / 2),
        });
      };
      img.src = dataUrl;
    },
    []
  );

  // Undo (Ctrl+Z)
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prevStep = history[historyIndex - 1];
      setBaseImageData(prevStep.baseImageData);
      setPreviewImageData(null);

      // Restore drawing layer
      if (drawingCanvasRef.current && prevStep.drawingImageData) {
        const dCtx = drawingCanvasRef.current.getContext('2d');
        const img = new Image();
        img.onload = () => {
          if (drawingCanvasRef.current && dCtx) {
            dCtx.clearRect(0, 0, drawingCanvasRef.current.width, drawingCanvasRef.current.height);
            dCtx.drawImage(img, 0, 0);
          }
        };
        img.src = prevStep.drawingImageData;
      } else if (drawingCanvasRef.current) {
        const dCtx = drawingCanvasRef.current.getContext('2d');
        dCtx?.clearRect(0, 0, drawingCanvasRef.current.width, drawingCanvasRef.current.height);
      }

      setHistoryIndex(historyIndex - 1);
    }
  }, [history, historyIndex]);

  // Redo (Ctrl+Y)
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextStep = history[historyIndex + 1];
      setBaseImageData(nextStep.baseImageData);
      setPreviewImageData(null);

      if (drawingCanvasRef.current && nextStep.drawingImageData) {
        const dCtx = drawingCanvasRef.current.getContext('2d');
        const img = new Image();
        img.onload = () => {
          if (drawingCanvasRef.current && dCtx) {
            dCtx.clearRect(0, 0, drawingCanvasRef.current.width, drawingCanvasRef.current.height);
            dCtx.drawImage(img, 0, 0);
          }
        };
        img.src = nextStep.drawingImageData;
      }

      setHistoryIndex(historyIndex + 1);
    }
  }, [history, historyIndex]);

  // Reset to original image
  const handleResetOriginal = useCallback(() => {
    if (originalImageData) {
      setBaseImageData(originalImageData);
      setPreviewImageData(null);
      setMedianCount(0);
      if (drawingCanvasRef.current) {
        const dCtx = drawingCanvasRef.current.getContext('2d');
        dCtx?.clearRect(0, 0, drawingCanvasRef.current.width, drawingCanvasRef.current.height);
      }
      pushHistory('重設為原圖', originalImageData, '');
    }
  }, [originalImageData, pushHistory]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (e.key.toLowerCase() === 'b') {
        setActiveTool('brush');
        if (brushType === 'eraser') {
          setBrushType('pen');
        }
      } else if (e.key.toLowerCase() === 'e') {
        setActiveTool('brush');
        setBrushType('eraser');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Tool Selection (Eliminates redundant double IPC invocation)
  const handleSelectTool = (tool: ToolType) => {
    if (activeTool === 'median' && tool !== 'median') {
      setPreviewImageData(null);
      setMedianCount(0);
    }
    setActiveTool(tool);
    if (tool === 'laplacian') {
      setLaplacianMode('sharpened');
    }
    if (tool === 'median') {
      setPreviewImageData(null);
      setMedianCount(0);
    }
  };

  // Single-source preview computation with async race-condition cancellation
  useEffect(() => {
    if (!baseImageData) return;
    let isCancelled = false;

    if (activeTool === 'grayscale') {
      invokeGrayscale(baseImageData)
        .then((preview) => {
          if (!isCancelled) setPreviewImageData(preview);
        })
        .catch(console.error);
    } else if (activeTool === 'binary') {
      invokeBinary(baseImageData, binaryThreshold)
        .then((preview) => {
          if (!isCancelled) setPreviewImageData(preview);
        })
        .catch(console.error);
    } else if (activeTool === 'palette') {
      invokePalette(baseImageData, paletteCount, paletteDither)
        .then((res) => {
          if (!isCancelled) {
            setPreviewImageData(res.image_data);
            setExtractedPalette(res.palette);
          }
        })
        .catch(console.error);
    } else if (activeTool === 'negative') {
      invokeNegative(baseImageData)
        .then((preview) => {
          if (!isCancelled) setPreviewImageData(preview);
        })
        .catch(console.error);
    } else if (activeTool === 'laplacian') {
      invokeLaplacian(baseImageData, laplacianKernelType, laplacianStrength)
        .then((res) => {
          if (!isCancelled) {
            setLaplacianCache(res);
            const currentMode = laplacianModeRef.current;
            if (currentMode === 'original') setPreviewImageData(res.original_data);
            else if (currentMode === 'mask') setPreviewImageData(res.mask_data);
            else setPreviewImageData(res.sharpened_data);
          }
        })
        .catch(console.error);
    } else if (activeTool !== 'median') {
      setPreviewImageData(null);
      setLaplacianCache(null);
    }

    return () => {
      isCancelled = true;
    };
  }, [
    activeTool,
    binaryThreshold,
    paletteCount,
    paletteDither,
    laplacianKernelType,
    laplacianStrength,
    baseImageData,
  ]);

  // Switch Laplacian mode (original | mask | sharpened)
  const handleLaplacianModeChange = (mode: LaplacianViewMode) => {
    setLaplacianMode(mode);
    if (!laplacianCache) return;
    if (mode === 'original') setPreviewImageData(laplacianCache.original_data);
    else if (mode === 'mask') setPreviewImageData(laplacianCache.mask_data);
    else setPreviewImageData(laplacianCache.sharpened_data);
  };

  // Localized Median Filter Rect handler (continuous boxing support)
  const handleApplyMedianRect = useCallback(
    async (rect: FilterRegion) => {
      const currentSource = previewImageData || baseImageData;
      if (!currentSource) return;

      setIsProcessingFilter(true);
      try {
        const result = await invokeMedian(currentSource, medianKernel, rect);
        setPreviewImageData(result);
        setMedianCount((prev) => prev + 1);
      } catch (err) {
        console.error('局部中值濾波計算失敗:', err);
      } finally {
        setIsProcessingFilter(false);
      }
    },
    [previewImageData, baseImageData, medianKernel]
  );

  const handleResetMedianPreview = useCallback(() => {
    setPreviewImageData(null);
    setMedianCount(0);
  }, []);

  const handleApplyMedian = useCallback(() => {
    if (previewImageData) {
      const countDesc = medianCount > 0 ? ` (${medianCount} 處區域)` : '';
      const desc = `套用局部中值濾波${countDesc}`;
      setBaseImageData(previewImageData);
      setPreviewImageData(null);
      setMedianCount(0);
      setActiveTool('none');
      pushHistory(desc, previewImageData);
    }
  }, [previewImageData, medianCount, pushHistory]);

  // Apply Tools
  const handleApplyCurrentPreview = (desc: string) => {
    if (previewImageData) {
      setBaseImageData(previewImageData);
      setPreviewImageData(null);
      setActiveTool('none');
      pushHistory(desc, previewImageData);
    }
  };

  const handleCancelTool = () => {
    setPreviewImageData(null);
    setActiveTool('none');
    setLaplacianCache(null);
    setMedianCount(0);
  };

  // Drawing commit
  const handleDrawingCommit = (drawingDataUrl: string) => {
    pushHistory('繪製筆刷塗鴉', undefined, drawingDataUrl);
  };

  // Clear drawing canvas
  const handleClearDrawingCanvas = () => {
    if (drawingCanvasRef.current) {
      const dCtx = drawingCanvasRef.current.getContext('2d');
      dCtx?.clearRect(0, 0, drawingCanvasRef.current.width, drawingCanvasRef.current.height);
      pushHistory('清除所有塗鴉', undefined, '');
    }
  };

  // Merge Base Canvas + Drawing Canvas into single full-resolution composite
  const getMergedCompositeDataUrl = useCallback((): string | null => {
    if (!baseCanvasRef.current || !imageDimensions) return null;

    const mergedCanvas = document.createElement('canvas');
    mergedCanvas.width = imageDimensions.width;
    mergedCanvas.height = imageDimensions.height;
    const ctx = mergedCanvas.getContext('2d');
    if (!ctx) return null;

    // Draw active base
    ctx.drawImage(baseCanvasRef.current, 0, 0);

    // Draw active drawing canvas
    if (showDrawingLayer && drawingCanvasRef.current) {
      ctx.drawImage(drawingCanvasRef.current, 0, 0);
    }

    return mergedCanvas.toDataURL('image/png');
  }, [imageDimensions, showDrawingLayer]);

  // Capture canvas for GIF Maker
  const handleCaptureCurrentCanvas = useCallback(async () => {
    const compositeData = getMergedCompositeDataUrl();
    if (!compositeData) return;

    try {
      await invokeAddSharedGifFrame({
        id: `canvas-${Date.now()}`,
        image_data: compositeData,
        delay_ms: 100,
      });
      // Also open or notify
      if (isTauri()) {
        await invokeOpenGifStudio();
      } else {
        setIsGifModalOpen(true);
      }
    } catch (err) {
      console.error('擷取畫布影格失敗', err);
    }
  }, [getMergedCompositeDataUrl]);

  // Export merged image to file
  const handleExport = async () => {
    const compositeData = getMergedCompositeDataUrl();
    if (!compositeData) return;

    try {
      const defaultName = filename.replace(/\.[^/.]+$/, '') + '_edited.png';
      const savePath = await pickSavePath(defaultName, '影像圖檔 (*.png;*.jpg)', ['png', 'jpg']);
      if (savePath) {
        await invokeSaveImage(compositeData, savePath, 92);
      }
    } catch (err) {
      console.error('匯出圖片失敗', err);
    }
  };

  // Import image from file
  const handleImport = async () => {
    try {
      const b64 = await pickImageFile();
      if (b64) {
        loadImageData(b64, '開啟之影像.png');
      }
    } catch (err) {
      console.error('匯入圖片失敗', err);
    }
  };

  // Open GIF Studio
  const handleOpenGifStudio = async () => {
    if (isTauri()) {
      await invokeOpenGifStudio();
    } else {
      setIsGifModalOpen(true);
    }
  };

  // Zoom controls
  const handleZoomIn = () => setZoom((prev) => Math.min(prev * 1.25, 32));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev / 1.25, 0.05));
  const handleZoomReset = () => setZoom(1.0);
  const handleZoomFit = () => {
    if (!imageDimensions) return;
    const viewportW = window.innerWidth - 88 - 280;
    const viewportH = window.innerHeight - 44 - 28;
    const scaleW = (viewportW * 0.9) / imageDimensions.width;
    const scaleH = (viewportH * 0.9) / imageDimensions.height;
    const fitScale = Math.min(Math.min(scaleW, scaleH), 1.0);
    setZoom(fitScale);
    setPan({
      x: Math.max(10, (viewportW - imageDimensions.width * fitScale) / 2),
      y: Math.max(10, (viewportH - imageDimensions.height * fitScale) / 2),
    });
  };

  return (
    <div className="w-screen h-screen flex flex-col bg-ps-canvas overflow-hidden select-none font-sans">
      {/* 1. 頂部控制列 (Header Bar, 高度 44px) */}
      <HeaderBar
        filename={filename}
        imageDimensions={imageDimensions}
        activeTool={activeTool}
        laplacianPreviewActive={activeTool === 'laplacian' && !!laplacianCache}
        laplacianMode={laplacianMode}
        onLaplacianModeChange={handleLaplacianModeChange}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onResetOriginal={handleResetOriginal}
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomFit={handleZoomFit}
        onZoomReset={handleZoomReset}
      />

      {/* 2. 中間三大工作區：左側工具列 + 中央畫布區 + 右側屬性面板 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左側功能工具列 (Left Tool Dock, 寬度 88px) */}
        <LeftToolDock
          activeTool={activeTool}
          onSelectTool={handleSelectTool}
          onImport={handleImport}
          onExport={handleExport}
          onOpenGifStudio={handleOpenGifStudio}
        />

        {/* 中央互動畫布區 (Center Viewport, 雙圖層) */}
        <CanvasViewport
          baseImageData={baseImageData}
          previewImageData={previewImageData}
          activeTool={activeTool}
          brushType={brushType}
          brushSize={brushSize}
          brushOpacity={brushOpacity}
          brushColor={brushColor}
          zoom={zoom}
          onZoomChange={setZoom}
          pan={pan}
          onPanChange={setPan}
          onPixelHover={setPixelInfo}
          onDrawingCommit={handleDrawingCommit}
          onApplyMedianRect={handleApplyMedianRect}
          isProcessingFilter={isProcessingFilter}
          onLoadSample={() => loadImageData(createSampleTestImage(), '高解析測試圖卡.png')}
          onImportFile={handleImport}
          onDropImage={(data, name) => loadImageData(data, name)}
          showDrawingLayer={showDrawingLayer}
          drawingCanvasRef={drawingCanvasRef}
          baseCanvasRef={baseCanvasRef}
        />

        {/* 右側動態屬性面板 (Right Inspector, 寬度 280px) */}
        <RightInspector
          activeTool={activeTool}
          imageLoaded={!!baseImageData}
          imageDimensions={imageDimensions}
          binaryThreshold={binaryThreshold}
          onBinaryThresholdChange={setBinaryThreshold}
          onApplyBinary={() => handleApplyCurrentPreview('套用純黑白二值化')}
          paletteCount={paletteCount}
          onPaletteCountChange={setPaletteCount}
          paletteDither={paletteDither}
          onPaletteDitherChange={setPaletteDither}
          extractedPalette={extractedPalette}
          onApplyPalette={() => handleApplyCurrentPreview(`套用調色盤 (${paletteCount}色)`)}
          onApplyGrayscale={() => handleApplyCurrentPreview('套用灰階色彩轉換')}
          onApplyNegative={() => handleApplyCurrentPreview('套用負片反轉')}
          medianKernel={medianKernel}
          onMedianKernelChange={setMedianKernel}
          onApplyMedian={handleApplyMedian}
          medianCount={medianCount}
          onResetMedianPreview={handleResetMedianPreview}
          laplacianKernelType={laplacianKernelType}
          onLaplacianKernelChange={setLaplacianKernelType}
          laplacianStrength={laplacianStrength}
          onLaplacianStrengthChange={setLaplacianStrength}
          onApplyLaplacian={() =>
            handleApplyCurrentPreview(
              `套用拉普拉斯銳化 (${laplacianMode === 'mask' ? '遮罩' : '銳化'})`
            )
          }
          brushType={brushType}
          onBrushTypeChange={setBrushType}
          brushSize={brushSize}
          onBrushSizeChange={setBrushSize}
          brushOpacity={brushOpacity}
          onBrushOpacityChange={setBrushOpacity}
          brushColor={brushColor}
          onBrushColorChange={setBrushColor}
          onClearDrawingCanvas={handleClearDrawingCanvas}
          onCancelTool={handleCancelTool}
          showDrawingLayer={showDrawingLayer}
          onToggleDrawingLayer={() => setShowDrawingLayer(!showDrawingLayer)}
        />
      </div>

      {/* 3. 底部即時狀態列 (Bottom Status Bar, 高度 28px) */}
      <BottomStatusBar
        pixelInfo={pixelInfo}
        imageDimensions={imageDimensions}
        zoom={zoom}
      />

      {/* 4. 網頁預覽環境專用之 GIF Studio 模態視窗 */}
      {isGifModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6">
          <div className="w-[960px] h-[680px] bg-ps-canvas rounded-xl overflow-hidden shadow-2xl border border-ps-border flex flex-col relative">
            <button
              onClick={() => setIsGifModalOpen(false)}
              className="absolute top-3 right-4 z-50 text-xs px-2.5 py-1 bg-ps-panel hover:bg-ps-hover border border-ps-border rounded text-ps-text hover:text-white"
            >
              關閉視窗 ✕
            </button>
            <GifStudioWindow
              onCaptureCurrentCanvas={handleCaptureCurrentCanvas}
            />
          </div>
        </div>
      )}
    </div>
  );
};
