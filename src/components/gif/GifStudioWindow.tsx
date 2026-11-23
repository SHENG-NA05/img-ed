import React, { useState, useEffect, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import {
  Play,
  Pause,
  Upload,
  Camera,
  Download,
  Trash2,
  Copy,
  ChevronLeft,
  ChevronRight,
  Film,
  Sparkles,
} from 'lucide-react';
import { GifExportOptions, GifFrameInput, GifFrameItem } from '../../types';
import {
  invokeExportGif,
  invokeGetSharedGifFrames,
  isTauri,
  pickMultipleImageFiles,
  pickSavePath,
} from '../../utils/tauriBridge';

interface GifStudioWindowProps {
  onClose?: () => void;
  capturedFrames?: GifFrameItem[];
  onCaptureCurrentCanvas?: () => void;
}

export const GifStudioWindow: React.FC<GifStudioWindowProps> = ({
  capturedFrames: propFrames,
  onCaptureCurrentCanvas,
}) => {
  const [frames, setFrames] = useState<GifFrameItem[]>([]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  // Settings
  const [globalDelayMs, setGlobalDelayMs] = useState(100); // 100ms = 10fps
  const [loopCount, setLoopCount] = useState(0); // 0 = infinite
  const [scale, setScale] = useState(1.0);
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  // Timeline Pointer Drag & Drop states
  const [dragSourceIndex, setDragSourceIndex] = useState<number | null>(null);
  const [dragTargetIndex, setDragTargetIndex] = useState<number | null>(null);
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef<boolean>(false);

  // Synchronize global delay change to all frames immediately
  const handleGlobalDelayChange = (newDelay: number) => {
    setGlobalDelayMs(newDelay);
    setFrames((prev) => prev.map((f) => ({ ...f, delayMs: newDelay })));
  };

  // Load shared frames from Rust backend or props
  useEffect(() => {
    const fetchShared = async () => {
      try {
        const shared = await invokeGetSharedGifFrames();
        if (shared && shared.length > 0) {
          const mapped: GifFrameItem[] = shared.map((f: GifFrameInput, idx: number) => ({
            id: f.id || `frame-${Date.now()}-${idx}`,
            imageData: f.image_data,
            delayMs: f.delay_ms || 100,
          }));
          setFrames(mapped);
        }
      } catch (err) {
        console.error('取得共享影格失敗', err);
      }
    };

    if (propFrames && propFrames.length > 0) {
      setFrames(propFrames);
    } else {
      fetchShared();
    }
  }, [propFrames]);

  // Listen for gif_frame_added event dispatched from main window via Rust
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    if (isTauri()) {
      const setupListener = async () => {
        try {
          unlisten = await listen<GifFrameInput>('gif_frame_added', (event) => {
            const payload = event.payload;
            if (payload && payload.image_data) {
              setFrames((prev) => [
                ...prev,
                {
                  id: payload.id || `frame-${Date.now()}`,
                  imageData: payload.image_data,
                  delayMs: payload.delay_ms || globalDelayMs,
                },
              ]);
            }
          });
        } catch (err) {
          console.error('註冊 gif_frame_added 事件監聽失敗', err);
        }
      };
      setupListener();
    }
    return () => {
      if (unlisten) unlisten();
    };
  }, [globalDelayMs]);

  // Dynamic looping preview engine (strictly follows delayMs in real-time)
  useEffect(() => {
    if (!isPlaying || frames.length === 0) return;

    const currentFrame = frames[currentFrameIndex];
    const delay = Math.max(10, currentFrame?.delayMs ?? globalDelayMs);

    const timer = setTimeout(() => {
      setCurrentFrameIndex((prev) => (prev + 1) % frames.length);
    }, delay);

    return () => clearTimeout(timer);
  }, [isPlaying, frames, currentFrameIndex, globalDelayMs]);

  // Batch import images from local drive
  const handleBatchImport = async () => {
    try {
      const images = await pickMultipleImageFiles();
      if (images && images.length > 0) {
        const newFrames: GifFrameItem[] = images.map((b64, idx) => ({
          id: `batch-${Date.now()}-${idx}`,
          imageData: b64,
          delayMs: globalDelayMs,
        }));
        setFrames((prev) => [...prev, ...newFrames]);
      }
    } catch (err) {
      console.error('批次匯入失敗', err);
    }
  };

  // Capture canvas
  const handleCaptureCanvas = () => {
    if (onCaptureCurrentCanvas) {
      onCaptureCurrentCanvas();
    }
  };

  // Move frame left
  const handleMoveLeft = (index: number) => {
    if (index === 0) return;
    setFrames((prev) => {
      const copy = [...prev];
      const temp = copy[index - 1];
      copy[index - 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
    if (currentFrameIndex === index) {
      setCurrentFrameIndex(index - 1);
    }
  };

  // Move frame right
  const handleMoveRight = (index: number) => {
    if (index >= frames.length - 1) return;
    setFrames((prev) => {
      const copy = [...prev];
      const temp = copy[index + 1];
      copy[index + 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
    if (currentFrameIndex === index) {
      setCurrentFrameIndex(index + 1);
    }
  };

  // Duplicate frame
  const handleDuplicate = (index: number) => {
    const target = frames[index];
    const newFrame: GifFrameItem = {
      ...target,
      id: `dup-${Date.now()}`,
    };
    setFrames((prev) => {
      const copy = [...prev];
      copy.splice(index + 1, 0, newFrame);
      return copy;
    });
  };

  // Delete frame
  const handleDelete = (index: number) => {
    setFrames((prev) => prev.filter((_, i) => i !== index));
    if (currentFrameIndex >= frames.length - 1 && currentFrameIndex > 0) {
      setCurrentFrameIndex(currentFrameIndex - 1);
    }
  };

  // Timeline pointer-based horizontal drag & drop reordering
  const handlePointerDownCard = (e: React.PointerEvent, index: number) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button')) return;

    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    isDraggingRef.current = false;
    setDragSourceIndex(index);
    setDragTargetIndex(null);

    // Capture pointer on this card element
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handlePointerMoveCard = (e: React.PointerEvent) => {
    if (dragSourceIndex === null || !dragStartPosRef.current) return;

    const dx = e.clientX - dragStartPosRef.current.x;
    const dy = e.clientY - dragStartPosRef.current.y;

    if (!isDraggingRef.current && Math.sqrt(dx * dx + dy * dy) > 5) {
      isDraggingRef.current = true;
    }

    if (isDraggingRef.current) {
      // Find element under cursor
      const elem = document.elementFromPoint(e.clientX, e.clientY);
      const cardElem = elem?.closest('[data-frame-index]');
      if (cardElem) {
        const idx = parseInt(cardElem.getAttribute('data-frame-index') || '-1', 10);
        if (idx >= 0 && idx < frames.length && idx !== dragSourceIndex) {
          setDragTargetIndex(idx);
        } else if (idx === dragSourceIndex) {
          setDragTargetIndex(null);
        }
      }
    }
  };

  const handlePointerUpCard = (e: React.PointerEvent, index: number) => {
    if (dragSourceIndex === null) return;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    if (isDraggingRef.current && dragTargetIndex !== null && dragTargetIndex !== dragSourceIndex) {
      const source = dragSourceIndex;
      const target = dragTargetIndex;
      setFrames((prev) => {
        const updated = [...prev];
        const [moved] = updated.splice(source, 1);
        updated.splice(target, 0, moved);
        return updated;
      });
      setCurrentFrameIndex(target);
    } else if (!isDraggingRef.current) {
      setCurrentFrameIndex(index);
    }

    setDragSourceIndex(null);
    setDragTargetIndex(null);
    dragStartPosRef.current = null;
    isDraggingRef.current = false;
  };

  const handlePointerCancelCard = (e: React.PointerEvent) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    setDragSourceIndex(null);
    setDragTargetIndex(null);
    dragStartPosRef.current = null;
    isDraggingRef.current = false;
  };

  // Export GIF
  const handleExportGif = async () => {
    if (frames.length === 0) return;

    try {
      setIsExporting(true);
      setExportMessage(null);

      const savePath = await pickSavePath(
        'animation.gif',
        'GIF 動畫圖檔 (*.gif)',
        ['gif']
      );

      if (!savePath) {
        setIsExporting(false);
        return;
      }

      const options: GifExportOptions = {
        frames: frames.map((f) => ({
          id: f.id,
          image_data: f.imageData,
          delay_ms: f.delayMs || globalDelayMs,
        })),
        global_delay_ms: globalDelayMs,
        loop_count: loopCount,
        scale,
      };

      const result = await invokeExportGif(options, savePath);
      setExportMessage(result);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setExportMessage(`匯出失敗: ${errMsg}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Calculated FPS
  const currentFps = Math.round((1000 / globalDelayMs) * 10) / 10;

  return (
    <div className="w-full h-full bg-ps-canvas text-ps-text flex flex-col select-none overflow-hidden font-sans">
      {/* 頂部操作列 */}
      <header className="h-[48px] bg-ps-header border-b border-ps-border px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded bg-ps-accent flex items-center justify-center text-white">
            <Film className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm text-ps-textBright tracking-wide">
            GIF 動畫製作工作坊 (GIF Studio)
          </span>
          <span className="text-[11px] text-ps-textMuted bg-ps-panel px-2 py-0.5 rounded border border-ps-border">
            {frames.length} 個影格
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleBatchImport}
            className="py-1.5 px-3 bg-ps-panel hover:bg-ps-hover text-ps-textBright rounded text-xs font-medium flex items-center space-x-1.5 border border-ps-border transition-colors shadow-sm"
          >
            <Upload className="w-3.5 h-3.5 text-ps-accent" />
            <span>批次匯入圖片</span>
          </button>

          {onCaptureCurrentCanvas && (
            <button
              onClick={handleCaptureCanvas}
              className="py-1.5 px-3 bg-ps-panel hover:bg-ps-hover text-ps-textBright rounded text-xs font-medium flex items-center space-x-1.5 border border-ps-border transition-colors shadow-sm"
            >
              <Camera className="w-3.5 h-3.5 text-emerald-400" />
              <span>擷取目前畫布</span>
            </button>
          )}

          <button
            onClick={handleExportGif}
            disabled={frames.length === 0 || isExporting}
            className="py-1.5 px-4 bg-ps-accent hover:bg-ps-accentHover text-white rounded text-xs font-semibold flex items-center space-x-1.5 shadow-md transition-colors disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? '編碼匯出中...' : '匯出 GIF 檔案'}</span>
          </button>
        </div>
      </header>

      {/* 中間主體：中央預覽區 + 右側參數調整區 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 中央動態循環預覽區 */}
        <div className="flex-1 bg-[#121212] flex flex-col items-center justify-center p-6 relative">
          {frames.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center max-w-sm bg-ps-panel/60 rounded-xl border border-ps-border">
              <Film className="w-12 h-12 text-ps-textMuted mb-3" />
              <div className="text-sm font-semibold text-ps-textBright mb-1">
                目前尚無影格
              </div>
              <p className="text-xs text-ps-textMuted mb-4">
                請點擊右上角「批次匯入圖片」或「擷取目前畫布」開始建立動畫序列。
              </p>
              <button
                onClick={handleBatchImport}
                className="py-2 px-4 bg-ps-accent hover:bg-ps-accentHover text-white rounded text-xs font-medium flex items-center space-x-1.5 shadow transition-colors"
              >
                <Upload className="w-4 h-4" />
                <span>立即匯入多張圖片</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center max-h-full max-w-full">
              {/* 預覽視窗畫布 */}
              <div className="relative max-h-[360px] max-w-[540px] flex items-center justify-center rounded-lg overflow-hidden border border-ps-border shadow-2xl bg-checkerboard">
                <img
                  src={frames[currentFrameIndex]?.imageData}
                  alt={`Frame ${currentFrameIndex + 1}`}
                  className="max-h-[360px] max-w-[540px] object-contain block"
                />
              </div>

              {/* 播放控制列 */}
              <div className="flex items-center space-x-4 mt-4 bg-ps-panel/90 px-4 py-2 rounded-full border border-ps-border shadow-lg">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-8 h-8 rounded-full bg-ps-accent hover:bg-ps-accentHover text-white flex items-center justify-center transition-colors shadow"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>

                <div className="flex items-center space-x-2 text-xs font-mono">
                  <span className="text-ps-textMuted">幀:</span>
                  <span className="text-ps-textBright font-bold">
                    {currentFrameIndex + 1}
                  </span>
                  <span className="text-ps-textMuted">/ {frames.length}</span>
                </div>

                <div className="h-4 w-[1px] bg-ps-border" />

                <div className="text-xs font-mono text-ps-accent font-semibold">
                  {currentFps} FPS
                </div>
              </div>
            </div>
          )}

          {/* 訊息反饋通知 */}
          {exportMessage && (
            <div className="absolute bottom-4 left-6 right-6 bg-ps-panel border border-ps-accent p-3 rounded-lg shadow-xl text-xs flex items-center justify-between z-30">
              <span className="text-ps-textBright font-medium">{exportMessage}</span>
              <button
                onClick={() => setExportMessage(null)}
                className="text-ps-textMuted hover:text-ps-text"
              >
                關閉
              </button>
            </div>
          )}
        </div>

        {/* 右側參數控制面板 */}
        <aside className="w-[280px] bg-ps-panel border-l border-ps-border p-4 flex flex-col space-y-4 overflow-y-auto shrink-0">
          <div className="text-xs font-semibold text-ps-textBright uppercase tracking-wider flex items-center space-x-1.5 pb-2 border-b border-ps-border">
            <Sparkles className="w-4 h-4 text-ps-accent" />
            <span>動畫參數調控</span>
          </div>

          {/* 全域延遲時間 */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-ps-text">
              <span>每格延遲時間 (Delay)</span>
              <span className="font-mono font-bold text-ps-accent">{globalDelayMs} ms</span>
            </div>
            <input
              type="range"
              min="20"
              max="1000"
              step="10"
              value={globalDelayMs}
              onChange={(e) => handleGlobalDelayChange(parseInt(e.target.value, 10))}
              className="w-full accent-ps-accent cursor-pointer h-1.5 bg-ps-canvas rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-ps-textMuted font-mono">
              <span>20ms (極速)</span>
              <span>100ms (標準)</span>
              <span>1000ms (慢速)</span>
            </div>
          </div>

          {/* 循環播放次數 */}
          <div className="space-y-1.5">
            <label className="text-xs text-ps-text">循環模式 (Loop)</label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => setLoopCount(0)}
                className={`py-1.5 text-xs rounded font-medium transition-all ${
                  loopCount === 0
                    ? 'bg-ps-accent text-white shadow'
                    : 'bg-ps-canvas text-ps-text hover:bg-ps-hover border border-ps-border'
                }`}
              >
                無限循環 (0)
              </button>
              <button
                onClick={() => setLoopCount(1)}
                className={`py-1.5 text-xs rounded font-medium transition-all ${
                  loopCount === 1
                    ? 'bg-ps-accent text-white shadow'
                    : 'bg-ps-canvas text-ps-text hover:bg-ps-hover border border-ps-border'
                }`}
              >
                播放一次 (1)
              </button>
            </div>
          </div>

          {/* 輸出尺寸縮放 */}
          <div className="space-y-1.5">
            <label className="text-xs text-ps-text">輸出解析度縮放</label>
            <div className="grid grid-cols-4 gap-1">
              {[1.0, 0.75, 0.5, 0.25].map((s) => (
                <button
                  key={s}
                  onClick={() => setScale(s)}
                  className={`py-1 text-xs rounded font-mono font-medium transition-all ${
                    scale === s
                      ? 'bg-ps-accent text-white shadow'
                      : 'bg-ps-canvas text-ps-text hover:bg-ps-hover border border-ps-border'
                  }`}
                >
                  {Math.round(s * 100)}%
                </button>
              ))}
            </div>
          </div>

          {/* 清空所有影格 */}
          <div className="pt-4 border-t border-ps-border">
            <button
              onClick={() => setFrames([])}
              disabled={frames.length === 0}
              className="w-full py-1.5 px-3 bg-ps-canvas hover:bg-rose-950/40 hover:text-rose-400 text-ps-text rounded text-xs border border-ps-border flex items-center justify-center space-x-1.5 transition-colors disabled:opacity-40"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>清空所有影格序列</span>
            </button>
          </div>
        </aside>
      </div>

      {/* 底部時間軸序列 (Horizontal Timeline) */}
      <footer className="h-[120px] bg-ps-header border-t border-ps-border p-2 flex flex-col shrink-0">
        <div className="text-[10px] text-ps-textMuted font-semibold px-2 mb-1 flex justify-between items-center">
          <span className="flex items-center space-x-1">
            <Film className="w-3 h-3 text-ps-accent" />
            <span>影格序列時間軸 (TIMELINE)</span>
          </span>
          <span className="text-ps-accent font-medium">💡 支援滑鼠左右拖曳直接調整影格順序</span>
        </div>

        <div className="flex-1 flex space-x-2 overflow-x-auto px-1 py-0.5">
          {frames.map((frame, index) => {
            const isSelected = currentFrameIndex === index;
            const isDraggingSource = dragSourceIndex === index;
            const isDragTarget = dragTargetIndex === index;

            return (
              <div
                key={frame.id}
                data-frame-index={index}
                onPointerDown={(e) => handlePointerDownCard(e, index)}
                onPointerMove={handlePointerMoveCard}
                onPointerUp={(e) => handlePointerUpCard(e, index)}
                onPointerCancel={handlePointerCancelCard}
                className={`w-[84px] h-full shrink-0 rounded-lg p-1 flex flex-col items-center justify-between border cursor-grab active:cursor-grabbing transition-all select-none relative ${
                  isSelected
                    ? 'border-ps-accent bg-ps-accent/15 shadow-md'
                    : 'border-ps-border bg-ps-panel hover:bg-ps-hover'
                } ${isDraggingSource ? 'opacity-35 scale-95 border-dashed border-ps-accent shadow-inner' : ''} ${
                  isDragTarget ? 'ring-2 ring-ps-accent scale-105 z-20 bg-ps-accent/25' : ''
                }`}
              >
                {/* 拖曳置放指示疊加層 */}
                {isDragTarget && (
                  <div className="absolute inset-0 bg-ps-accent/30 rounded-lg border-2 border-ps-accent pointer-events-none flex items-center justify-center z-30">
                    <span className="text-[10px] text-white font-bold bg-ps-accent px-1.5 py-0.5 rounded shadow whitespace-nowrap">
                      移至此處
                    </span>
                  </div>
                )}

                {/* 影格縮圖 */}
                <div className="w-full flex-1 rounded overflow-hidden bg-checkerboard flex items-center justify-center pointer-events-none">
                  <img
                    src={frame.imageData}
                    alt={`Thumb ${index + 1}`}
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                </div>

                {/* 控制項與序號 */}
                <div className="w-full flex items-center justify-between pt-1 text-[10px]">
                  <span className="font-mono text-ps-textMuted font-bold">#{index + 1}</span>

                  <div className="flex items-center space-x-0.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveLeft(index);
                      }}
                      disabled={index === 0}
                      title="前移"
                      className="p-0.5 hover:text-ps-textBright disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronLeft className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveRight(index);
                      }}
                      disabled={index === frames.length - 1}
                      title="後移"
                      className="p-0.5 hover:text-ps-textBright disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronRight className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicate(index);
                      }}
                      title="複製幀"
                      className="p-0.5 hover:text-ps-textBright cursor-pointer"
                    >
                      <Copy className="w-2.5 h-2.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(index);
                      }}
                      title="刪除幀"
                      className="p-0.5 hover:text-rose-400 cursor-pointer"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </footer>
    </div>
  );
};
