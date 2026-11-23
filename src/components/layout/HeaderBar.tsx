import React from 'react';
import {
  Undo2,
  Redo2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Image as ImageIcon,
} from 'lucide-react';
import { LaplacianViewMode } from '../../types';

interface HeaderBarProps {
  filename: string;
  imageDimensions: { width: number; height: number } | null;
  activeTool: string;
  laplacianPreviewActive: boolean;
  laplacianMode: LaplacianViewMode;
  onLaplacianModeChange: (mode: LaplacianViewMode) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onResetOriginal: () => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomFit: () => void;
  onZoomReset: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  filename,
  imageDimensions,
  activeTool,
  laplacianPreviewActive,
  laplacianMode,
  onLaplacianModeChange,
  canUndo,
  canRedo,
  onUndo,
  onResetOriginal,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomFit,
  onZoomReset,
}) => {
  return (
    <header className="h-[44px] bg-ps-header border-b border-ps-border px-4 flex items-center justify-between select-none z-30">
      {/* 左側：軟體標題與目前檔名 */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2 text-ps-accent font-bold tracking-wider text-sm">
          <div className="w-5 h-5 rounded bg-ps-accent text-white flex items-center justify-center text-xs font-black">
            Ps
          </div>
          <span className="text-ps-textBright hidden sm:inline">Photoshop Studio</span>
        </div>

        <div className="h-4 w-[1px] bg-ps-border" />

        <div className="flex items-center space-x-2 text-xs text-ps-text">
          <ImageIcon className="w-3.5 h-3.5 text-ps-textMuted" />
          <span className="font-medium text-ps-textBright truncate max-w-[160px]">
            {filename || '未載入影像'}
          </span>
          {imageDimensions && (
            <span className="text-[11px] text-ps-textMuted bg-ps-panel px-1.5 py-0.5 rounded border border-ps-border">
              {imageDimensions.width} × {imageDimensions.height} px
            </span>
          )}
        </div>
      </div>

      {/* 中央動態情境區：拉普拉斯濾波 3 段式切換控制項 */}
      <div className="flex items-center">
        {activeTool === 'laplacian' && laplacianPreviewActive && (
          <div className="flex items-center bg-ps-canvas p-0.5 rounded-lg border border-ps-border shadow-inner">
            <button
              onClick={() => onLaplacianModeChange('original')}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-all duration-150 ${
                laplacianMode === 'original'
                  ? 'bg-ps-accent text-white shadow'
                  : 'text-ps-text hover:text-ps-textBright hover:bg-ps-hover'
              }`}
            >
              原始影像
            </button>
            <button
              onClick={() => onLaplacianModeChange('mask')}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-all duration-150 ${
                laplacianMode === 'mask'
                  ? 'bg-ps-accent text-white shadow'
                  : 'text-ps-text hover:text-ps-textBright hover:bg-ps-hover'
              }`}
            >
              遮罩影像
            </button>
            <button
              onClick={() => onLaplacianModeChange('sharpened')}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-all duration-150 ${
                laplacianMode === 'sharpened'
                  ? 'bg-ps-accent text-white shadow'
                  : 'text-ps-text hover:text-ps-textBright hover:bg-ps-hover'
              }`}
            >
              銳化影像
            </button>
          </div>
        )}
      </div>

      {/* 右側：歷史操作與畫布縮放控制項 */}
      <div className="flex items-center space-x-2">
        {/* 復原 / 重做 / 重設原圖 */}
        <div className="flex items-center space-x-1 border-r border-ps-border pr-2">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="復原 (Ctrl+Z)"
            className={`p-1.5 rounded hover:bg-ps-hover transition-colors ${
              canUndo ? 'text-ps-text hover:text-ps-textBright' : 'text-neutral-600 cursor-not-allowed'
            }`}
          >
            <Undo2 className="w-4 h-4" />
          </button>

          <button
            onClick={onUndo}
            disabled={!canRedo}
            title="重做 (Ctrl+Y)"
            className={`p-1.5 rounded hover:bg-ps-hover transition-colors ${
              canRedo ? 'text-ps-text hover:text-ps-textBright' : 'text-neutral-600 cursor-not-allowed'
            }`}
          >
            <Redo2 className="w-4 h-4" />
          </button>

          <button
            onClick={onResetOriginal}
            title="重設為原圖"
            className="p-1.5 rounded hover:bg-ps-hover text-ps-text hover:text-rose-400 transition-colors ml-1"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* 縮放率控制 */}
        <div className="flex items-center space-x-1 pl-1">
          <button
            onClick={onZoomOut}
            title="縮小"
            className="p-1.5 rounded hover:bg-ps-hover text-ps-text hover:text-ps-textBright"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <button
            onClick={onZoomReset}
            title="還原 100% 原始大小"
            className="text-xs font-mono font-medium text-ps-text px-1.5 py-1 rounded hover:bg-ps-hover min-w-[50px] text-center"
          >
            {Math.round(zoom * 100)}%
          </button>

          <button
            onClick={onZoomIn}
            title="放大"
            className="p-1.5 rounded hover:bg-ps-hover text-ps-text hover:text-ps-textBright"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <button
            onClick={onZoomFit}
            title="適應視窗大小"
            className="p-1.5 rounded hover:bg-ps-hover text-ps-text hover:text-ps-textBright"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
