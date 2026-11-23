import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ImagePlus, Sparkles, Upload } from 'lucide-react';
import { BrushEngine, BrushOptions } from '../../utils/brushEngine';
import { BrushType, PixelInfo, ToolType } from '../../types';

interface CanvasViewportProps {
  baseImageData: string | null;
  previewImageData: string | null;
  activeTool: ToolType;
  brushType: BrushType;
  brushSize: number;
  brushOpacity: number;
  brushColor: string;
  zoom: number;
  onZoomChange: (newZoom: number) => void;
  pan: { x: number; y: number };
  onPanChange: (newPan: { x: number; y: number }) => void;
  onPixelHover: (info: PixelInfo | null) => void;
  onDrawingCommit: (drawingDataUrl: string) => void;
  onLoadSample: () => void;
  onImportFile: () => void;
  showDrawingLayer: boolean;
  drawingCanvasRef: React.RefObject<HTMLCanvasElement>;
  baseCanvasRef: React.RefObject<HTMLCanvasElement>;
}

export const CanvasViewport: React.FC<CanvasViewportProps> = ({
  baseImageData,
  previewImageData,
  activeTool,
  brushType,
  brushSize,
  brushOpacity,
  brushColor,
  zoom,
  onZoomChange,
  pan,
  onPanChange,
  onPixelHover,
  onDrawingCommit,
  onLoadSample,
  onImportFile,
  showDrawingLayer,
  drawingCanvasRef,
  baseCanvasRef,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const brushEngineRef = useRef<BrushEngine | null>(null);

  const [isPanning, setIsPanning] = useState(false);
  const [spacePressed, setSpacePressed] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);

  // Keyboard Space listener for Pan mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && !(e.target instanceof HTMLInputElement)) {
        setSpacePressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpacePressed(false);
        setIsPanning(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Initialize and update Brush Engine
  useEffect(() => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const options: BrushOptions = {
      type: activeTool === 'eraser' ? 'eraser' : brushType,
      size: brushSize,
      opacity: brushOpacity,
      color: brushColor,
    };

    if (!brushEngineRef.current) {
      brushEngineRef.current = new BrushEngine(ctx, options);
    } else {
      brushEngineRef.current.updateOptions(options);
    }
  }, [activeTool, brushType, brushSize, brushOpacity, brushColor, drawingCanvasRef]);

  // Load and draw base image onto BaseCanvas
  useEffect(() => {
    const canvas = baseCanvasRef.current;
    const drawingCanvas = drawingCanvasRef.current;
    if (!canvas || !baseImageData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      setImageSize({ width: img.width, height: img.height });

      if (drawingCanvas && (drawingCanvas.width !== img.width || drawingCanvas.height !== img.height)) {
        // Preserve drawing buffer if already resized
        const dCtx = drawingCanvas.getContext('2d');
        const prevContent = dCtx?.getImageData(0, 0, drawingCanvas.width, drawingCanvas.height);
        drawingCanvas.width = img.width;
        drawingCanvas.height = img.height;
        if (prevContent && dCtx) {
          dCtx.putImageData(prevContent, 0, 0);
        }
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
    img.src = previewImageData || baseImageData;
  }, [baseImageData, previewImageData, baseCanvasRef, drawingCanvasRef]);

  // Mouse wheel zoom centered on cursor
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!containerRef.current || !imageSize) return;

    const rect = containerRef.current.getBoundingClientRect();
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const newZoom = Math.min(Math.max(zoom * zoomFactor, 0.05), 32);

    // Maintain cursor relative to canvas
    const newPanX = cursorX - (cursorX - pan.x) * (newZoom / zoom);
    const newPanY = cursorY - (cursorY - pan.y) * (newZoom / zoom);

    onZoomChange(newZoom);
    onPanChange({ x: newPanX, y: newPanY });
  };

  // Convert client viewport coordinates to image pixel coordinates
  const clientToImageCoords = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      if (!containerRef.current || !imageSize) return null;
      const rect = containerRef.current.getBoundingClientRect();
      const vx = clientX - rect.left - pan.x;
      const vy = clientY - rect.top - pan.y;

      const ix = Math.floor(vx / zoom);
      const iy = Math.floor(vy / zoom);

      if (ix >= 0 && ix < imageSize.width && iy >= 0 && iy < imageSize.height) {
        return { x: ix, y: iy };
      }
      return null;
    },
    [imageSize, pan, zoom]
  );

  // Sample pixel from combined composite view
  const samplePixel = useCallback(
    (coords: { x: number; y: number } | null) => {
      if (!coords || !baseCanvasRef.current) {
        onPixelHover(null);
        return;
      }

      const baseCanvas = baseCanvasRef.current;
      const baseCtx = baseCanvas.getContext('2d');
      if (!baseCtx) return;

      const pBase = baseCtx.getImageData(coords.x, coords.y, 1, 1).data;
      let r = pBase[0];
      let g = pBase[1];
      let b = pBase[2];

      // Sample overlay drawing canvas if enabled
      if (showDrawingLayer && drawingCanvasRef.current) {
        const dCtx = drawingCanvasRef.current.getContext('2d');
        if (dCtx) {
          const pDraw = dCtx.getImageData(coords.x, coords.y, 1, 1).data;
          const alpha = pDraw[3] / 255.0;
          if (alpha > 0) {
            r = Math.round(pDraw[0] * alpha + r * (1 - alpha));
            g = Math.round(pDraw[1] * alpha + g * (1 - alpha));
            b = Math.round(pDraw[2] * alpha + b * (1 - alpha));
          }
        }
      }

      const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
      onPixelHover({ x: coords.x, y: coords.y, r, g, b, hex });
    },
    [baseCanvasRef, drawingCanvasRef, onPixelHover, showDrawingLayer]
  );

  // Mouse event handlers for Drawing and Panning
  const handlePointerDown = (e: React.PointerEvent) => {
    // Middle click or Space + Left click = Pan
    if (e.button === 1 || (e.button === 0 && spacePressed)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    if (e.button === 0 && (activeTool === 'brush' || activeTool === 'eraser')) {
      const coords = clientToImageCoords(e.clientX, e.clientY);
      if (coords && brushEngineRef.current) {
        brushEngineRef.current.startStroke(coords);
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isPanning) {
      onPanChange({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
      return;
    }

    const coords = clientToImageCoords(e.clientX, e.clientY);
    samplePixel(coords);

    if (brushEngineRef.current && (activeTool === 'brush' || activeTool === 'eraser')) {
      if (coords) {
        brushEngineRef.current.continueStroke(coords);
      }
    }
  };

  const handlePointerUp = () => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (brushEngineRef.current) {
      brushEngineRef.current.endStroke();
      if (drawingCanvasRef.current) {
        onDrawingCommit(drawingCanvasRef.current.toDataURL('image/png'));
      }
    }
  };

  const handlePointerLeave = () => {
    onPixelHover(null);
    if (isPanning) setIsPanning(false);
    if (brushEngineRef.current) {
      brushEngineRef.current.endStroke();
    }
  };

  // Drag and drop image files onto canvas
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          // Trigger file load via click simulation or state callback
          const img = new Image();
          img.onload = () => {
            onLoadSample(); // fallback or custom drop
          };
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className={`flex-1 relative overflow-hidden bg-ps-canvas flex items-center justify-center select-none ${
        spacePressed || isPanning
          ? 'cursor-grab active:cursor-grabbing'
          : activeTool === 'brush' || activeTool === 'eraser'
          ? 'cursor-crosshair'
          : 'cursor-default'
      }`}
    >
      {/* 1. 若無圖片時呈現：Photoshop 質感情境引導區 */}
      {!baseImageData && (
        <div className="flex flex-col items-center justify-center p-8 max-w-md text-center bg-ps-panel/80 rounded-2xl border border-ps-border shadow-2xl backdrop-blur">
          <div className="w-16 h-16 rounded-2xl bg-ps-accent/15 border border-ps-accent/30 flex items-center justify-center mb-4 text-ps-accent shadow-inner">
            <ImagePlus className="w-8 h-8" />
          </div>

          <h2 className="text-lg font-bold text-ps-textBright mb-1 tracking-wide">
            歡迎使用 Photoshop Studio
          </h2>
          <p className="text-xs text-ps-textMuted mb-6 leading-relaxed">
            拖放圖片至此，或點擊下方按鈕立即開啟影像。嚴格支援 Windows 高解析度色彩與向量筆觸。
          </p>

          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <button
              onClick={onImportFile}
              className="flex-1 py-2.5 px-4 bg-ps-accent hover:bg-ps-accentHover text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 shadow-lg transition-colors"
            >
              <Upload className="w-4 h-4" />
              <span>開啟本機圖片</span>
            </button>

            <button
              onClick={onLoadSample}
              className="flex-1 py-2.5 px-4 bg-ps-hover hover:bg-ps-active text-ps-textBright rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 border border-ps-border transition-colors shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>載入測試範例圖</span>
            </button>
          </div>

          <div className="text-[11px] text-ps-textMuted mt-5">
            支援格式：PNG、JPG、JPEG、BMP、WEBP
          </div>
        </div>
      )}

      {/* 2. 雙層畫布疊加視角 (底層 BaseImageCanvas + 上層 DrawingCanvas) */}
      {baseImageData && (
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
          className="absolute top-0 left-0 shadow-2xl bg-checkerboard"
        >
          {/* 底層：照片與濾波結果 */}
          <canvas
            ref={baseCanvasRef}
            className="block pointer-events-none"
            style={{ imageRendering: zoom > 2 ? 'pixelated' : 'auto' }}
          />

          {/* 上層：筆刷塗鴉圖層 */}
          <canvas
            ref={drawingCanvasRef}
            className={`absolute top-0 left-0 block pointer-events-none ${
              showDrawingLayer ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ imageRendering: zoom > 2 ? 'pixelated' : 'auto' }}
          />
        </div>
      )}
    </div>
  );
};
