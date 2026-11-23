import React from 'react';
import { PixelInfo } from '../../types';

interface BottomStatusBarProps {
  pixelInfo: PixelInfo | null;
  imageDimensions: { width: number; height: number } | null;
  zoom: number;
}

export const BottomStatusBar: React.FC<BottomStatusBarProps> = ({
  pixelInfo,
  imageDimensions,
  zoom,
}) => {
  return (
    <footer className="h-[28px] bg-ps-header border-t border-ps-border px-3 flex items-center justify-between text-[11px] select-none z-30 shrink-0 font-mono">
      {/* 像素與色彩資訊 */}
      <div className="flex items-center space-x-3 text-ps-text">
        {/* 座標 */}
        <div className="flex items-center space-x-1">
          <span className="text-ps-textMuted">座標:</span>
          {pixelInfo ? (
            <span className="text-ps-textBright font-semibold">
              X {pixelInfo.x}, Y {pixelInfo.y}
            </span>
          ) : (
            <span className="text-ps-textMuted">--</span>
          )}
        </div>

        <span className="text-ps-border">|</span>

        {/* RGB 色彩 */}
        <div className="flex items-center space-x-1">
          <span className="text-ps-textMuted">RGB:</span>
          {pixelInfo ? (
            <span className="text-ps-textBright font-semibold">
              ({pixelInfo.r}, {pixelInfo.g}, {pixelInfo.b})
            </span>
          ) : (
            <span className="text-ps-textMuted">--</span>
          )}
        </div>

        <span className="text-ps-border">|</span>

        {/* HEX 色碼與動態即時色票 */}
        <div className="flex items-center space-x-1.5">
          <span className="text-ps-textMuted">HEX:</span>
          {pixelInfo ? (
            <>
              <span
                className="w-3 h-3 rounded-sm border border-neutral-600 inline-block shrink-0 shadow-sm"
                style={{ backgroundColor: pixelInfo.hex }}
              />
              <span className="text-ps-textBright font-semibold uppercase">
                {pixelInfo.hex}
              </span>
            </>
          ) : (
            <span className="text-ps-textMuted">--</span>
          )}
        </div>
      </div>

      {/* 影像尺寸與畫布縮放比例 */}
      <div className="flex items-center space-x-3 text-ps-text">
        <div className="flex items-center space-x-1">
          <span className="text-ps-textMuted">影像尺寸:</span>
          {imageDimensions ? (
            <span className="text-ps-textBright font-semibold">
              {imageDimensions.width} × {imageDimensions.height} px
            </span>
          ) : (
            <span className="text-ps-textMuted">--</span>
          )}
        </div>

        <span className="text-ps-border">|</span>

        <div className="flex items-center space-x-1">
          <span className="text-ps-textMuted">縮放:</span>
          <span className="text-ps-accent font-semibold">
            {Math.round(zoom * 100)}%
          </span>
        </div>
      </div>
    </footer>
  );
};
