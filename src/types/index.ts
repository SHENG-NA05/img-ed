export type ToolType =
  | 'none'
  | 'import'
  | 'export'
  | 'grayscale'
  | 'binary'
  | 'palette'
  | 'negative'
  | 'median'
  | 'laplacian'
  | 'brush'
  | 'eraser'
  | 'gif';

export type BrushType =
  | 'pen'
  | 'crayon'
  | 'highlighter'
  | 'airbrush'
  | 'watercolor'
  | 'eraser';

export type LaplacianViewMode = 'original' | 'mask' | 'sharpened';

export interface PixelInfo {
  x: number;
  y: number;
  r: number;
  g: number;
  b: number;
  hex: string;
}

export interface HistoryStep {
  baseImageData: string;
  drawingImageData: string;
  description: string;
  timestamp: number;
}

export interface FilterRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PaletteResult {
  image_data: string;
  palette: [number, number, number][];
}

export interface LaplacianResult {
  original_data: string;
  mask_data: string;
  sharpened_data: string;
}

export interface GifFrameItem {
  id: string;
  imageData: string;
  delayMs?: number;
}

export interface GifFrameInput {
  id: string;
  image_data: string;
  delay_ms?: number;
}

export interface GifExportOptions {
  frames: GifFrameInput[];
  global_delay_ms: number;
  speed_multiplier?: number;
  loop_count: number;
  scale: number;
}
