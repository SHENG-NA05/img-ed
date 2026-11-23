import React from 'react';
import {
  FolderOpen,
  Download,
  Sparkles,
  Contrast,
  Palette,
  EyeOff,
  Filter,
  Zap,
  Brush,
  Eraser,
  Film,
} from 'lucide-react';
import { ToolType } from '../../types';

interface LeftToolDockProps {
  activeTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  onImport: () => void;
  onExport: () => void;
  onOpenGifStudio: () => void;
}

export const LeftToolDock: React.FC<LeftToolDockProps> = ({
  activeTool,
  onSelectTool,
  onImport,
  onExport,
  onOpenGifStudio,
}) => {
  const toolButton = (
    tool: ToolType,
    label: string,
    icon: React.ReactNode,
    onClick?: () => void,
    isActionOnly?: boolean
  ) => {
    const isActive = activeTool === tool && !isActionOnly;

    return (
      <button
        key={label}
        onClick={onClick ? onClick : () => onSelectTool(tool)}
        className={`w-full py-2 px-1 flex flex-col items-center justify-center rounded-lg transition-all duration-150 group relative ${
          isActive
            ? 'bg-ps-accent text-white shadow-md'
            : 'text-ps-text hover:text-ps-textBright hover:bg-ps-hover active:bg-ps-active'
        }`}
      >
        <div className={`transition-transform duration-150 group-hover:scale-110 mb-1 ${
          isActive ? 'text-white' : 'text-neutral-400 group-hover:text-ps-textBright'
        }`}>
          {icon}
        </div>
        <span className="text-[11px] font-medium tracking-tight text-center leading-none">
          {label}
        </span>
      </button>
    );
  };

  return (
    <aside className="w-[88px] bg-ps-panel border-r border-ps-border flex flex-col items-center py-2 px-1.5 space-y-3 overflow-y-auto z-20 shrink-0">
      {/* 【檔案】分組 */}
      <div className="w-full space-y-1">
        <div className="text-[10px] text-ps-textMuted px-1 font-semibold uppercase tracking-wider text-center">
          檔案
        </div>
        <div className="space-y-1">
          {toolButton('import', '匯入', <FolderOpen className="w-5 h-5" />, onImport, true)}
          {toolButton('export', '匯出', <Download className="w-5 h-5" />, onExport, true)}
        </div>
      </div>

      <div className="w-10 h-[1px] bg-ps-border shrink-0" />

      {/* 【色彩】分組 */}
      <div className="w-full space-y-1">
        <div className="text-[10px] text-ps-textMuted px-1 font-semibold uppercase tracking-wider text-center">
          色彩
        </div>
        <div className="space-y-1">
          {toolButton('grayscale', '灰階', <Sparkles className="w-5 h-5" />)}
          {toolButton('binary', '純黑白', <Contrast className="w-5 h-5" />)}
          {toolButton('palette', '調色盤', <Palette className="w-5 h-5" />)}
          {toolButton('negative', '負片', <EyeOff className="w-5 h-5" />)}
        </div>
      </div>

      <div className="w-10 h-[1px] bg-ps-border shrink-0" />

      {/* 【濾波】分組 */}
      <div className="w-full space-y-1">
        <div className="text-[10px] text-ps-textMuted px-1 font-semibold uppercase tracking-wider text-center">
          濾波
        </div>
        <div className="space-y-1">
          {toolButton('median', '中值濾波', <Filter className="w-5 h-5" />)}
          {toolButton('laplacian', '拉普拉斯', <Zap className="w-5 h-5" />)}
        </div>
      </div>

      <div className="w-10 h-[1px] bg-ps-border shrink-0" />

      {/* 【繪圖】分組 */}
      <div className="w-full space-y-1">
        <div className="text-[10px] text-ps-textMuted px-1 font-semibold uppercase tracking-wider text-center">
          繪圖
        </div>
        <div className="space-y-1">
          {toolButton('brush', '筆刷', <Brush className="w-5 h-5" />)}
          {toolButton('eraser', '橡皮擦', <Eraser className="w-5 h-5" />)}
        </div>
      </div>

      <div className="w-10 h-[1px] bg-ps-border shrink-0" />

      {/* 【動畫】分組 */}
      <div className="w-full space-y-1 pb-2">
        <div className="text-[10px] text-ps-textMuted px-1 font-semibold uppercase tracking-wider text-center">
          動畫
        </div>
        <div>
          {toolButton('gif', 'GIF 製作', <Film className="w-5 h-5" />, onOpenGifStudio, true)}
        </div>
      </div>
    </aside>
  );
};
