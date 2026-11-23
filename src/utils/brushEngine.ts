import { BrushType } from '../types';

export interface BrushOptions {
  type: BrushType;
  size: number;
  opacity: number;
  color: string;
}

export interface Point {
  x: number;
  y: number;
}

export function parseHexColor(hexStr: string): { r: number; g: number; b: number } {
  let hex = hexStr.replace('#', '').trim();
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const num = parseInt(hex, 16);
  if (isNaN(num) || hex.length < 6) {
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export class BrushEngine {
  private ctx: CanvasRenderingContext2D;
  private lastPoint: Point | null = null;
  private isDrawing = false;
  private drewSomething = false;
  private options: BrushOptions;
  private cachedRgb: { r: number; g: number; b: number };
  private airbrushTimer: number | null = null;

  constructor(ctx: CanvasRenderingContext2D, options: BrushOptions) {
    this.ctx = ctx;
    this.options = options;
    this.cachedRgb = parseHexColor(options.color);
  }

  public setContext(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  public updateOptions(options: BrushOptions) {
    this.options = options;
    this.cachedRgb = parseHexColor(options.color);
  }

  public startStroke(p: Point) {
    this.isDrawing = true;
    this.drewSomething = true;
    this.lastPoint = p;
    this.renderStroke(p, p);

    if (this.options.type === 'airbrush') {
      this.startAirbrushAccumulation(p);
    }
  }

  public continueStroke(p: Point) {
    if (!this.isDrawing || !this.lastPoint) return;

    const dist = Math.hypot(p.x - this.lastPoint.x, p.y - this.lastPoint.y);
    const stepSize = Math.max(1, this.options.size * 0.2);
    const steps = Math.ceil(dist / stepSize);

    let prevPoint = this.lastPoint;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const interpX = this.lastPoint.x + (p.x - this.lastPoint.x) * t;
      const interpY = this.lastPoint.y + (p.y - this.lastPoint.y) * t;
      const currentPoint = { x: interpX, y: interpY };
      this.renderStroke(currentPoint, prevPoint);
      prevPoint = currentPoint;
    }

    this.lastPoint = p;
    this.drewSomething = true;
  }

  public endStroke(): boolean {
    const didDraw = this.isDrawing && this.drewSomething;
    this.isDrawing = false;
    this.drewSomething = false;
    this.lastPoint = null;
    this.stopAirbrushAccumulation();
    return didDraw;
  }

  private startAirbrushAccumulation(_p: Point) {
    this.stopAirbrushAccumulation();
    const spray = () => {
      if (!this.isDrawing || !this.lastPoint) return;
      this.renderAirbrush(this.lastPoint);
      this.drewSomething = true;
      this.airbrushTimer = window.requestAnimationFrame(spray);
    };
    this.airbrushTimer = window.requestAnimationFrame(spray);
  }

  private stopAirbrushAccumulation() {
    if (this.airbrushTimer !== null) {
      window.cancelAnimationFrame(this.airbrushTimer);
      this.airbrushTimer = null;
    }
  }

  private renderStroke(p: Point, prev?: Point) {
    this.ctx.save();

    switch (this.options.type) {
      case 'pen':
        this.renderPen(p, prev);
        break;
      case 'crayon':
        this.renderCrayon(p);
        break;
      case 'highlighter':
        this.renderHighlighter(p);
        break;
      case 'airbrush':
        this.renderAirbrush(p);
        break;
      case 'watercolor':
        this.renderWatercolor(p);
        break;
      case 'eraser':
        this.renderEraser(p, prev);
        break;
    }

    this.ctx.restore();
  }

  // 1. 鋼筆：高銳利度、實心平滑圓形與平滑連接線
  private renderPen(p: Point, prev?: Point) {
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.globalAlpha = Math.max(0.01, this.options.opacity);
    this.ctx.fillStyle = this.options.color;
    this.ctx.strokeStyle = this.options.color;
    this.ctx.lineWidth = this.options.size;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    this.ctx.beginPath();
    this.ctx.arc(p.x, p.y, this.options.size / 2, 0, Math.PI * 2);
    this.ctx.fill();

    if (prev && (prev.x !== p.x || prev.y !== p.y)) {
      this.ctx.beginPath();
      this.ctx.moveTo(prev.x, prev.y);
      this.ctx.lineTo(p.x, p.y);
      this.ctx.stroke();
    }
  }

  // 2. 蠟筆：噪點顆粒遮罩與隨機散射邊緣
  private renderCrayon(p: Point) {
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.fillStyle = this.options.color;
    const radius = this.options.size / 2;
    const density = Math.max(12, Math.floor(radius * 3));

    for (let i = 0; i < density; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * radius;
      const dotX = p.x + Math.cos(angle) * r;
      const dotY = p.y + Math.sin(angle) * r;
      const particleRadius = Math.random() * 1.5 + 0.5;

      // Random jitter opacity for chalk/crayon texture
      this.ctx.globalAlpha = (Math.random() * 0.4 + 0.2) * this.options.opacity;
      this.ctx.beginPath();
      this.ctx.arc(dotX, dotY, particleRadius, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  // 3. 螢光筆：45度扁平斜角筆頭、multiply 模式半透明透色
  private renderHighlighter(p: Point) {
    this.ctx.globalCompositeOperation = 'multiply';
    this.ctx.globalAlpha = this.options.opacity * 0.6;
    this.ctx.fillStyle = this.options.color;

    this.ctx.translate(p.x, p.y);
    this.ctx.rotate((Math.PI / 180) * 45);

    const width = this.options.size * 1.4;
    const height = Math.max(2, this.options.size * 0.35);
    this.ctx.fillRect(-width / 2, -height / 2, width, height);
  }

  // 4. 噴槍：中心濃外圍漸層羽化，停留持續累積
  private renderAirbrush(p: Point) {
    this.ctx.globalCompositeOperation = 'source-over';
    const radius = Math.max(2, this.options.size / 2);
    const grad = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);

    const { r, g, b } = this.cachedRgb;
    const baseAlpha = this.options.opacity * 0.12;
    grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${baseAlpha})`);
    grad.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${baseAlpha * 0.5})`);
    grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

    this.ctx.fillStyle = grad;
    this.ctx.beginPath();
    this.ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    this.ctx.fill();
  }

  // 5. 水彩筆：柔和水感擴散與自然濕邊 (Wet-edge)
  private renderWatercolor(p: Point) {
    this.ctx.globalCompositeOperation = 'source-over';
    const radius = this.options.size / 2;
    const { r, g, b } = this.cachedRgb;

    // Outer wet edge ring (slightly darker rim)
    const rimGrad = this.ctx.createRadialGradient(p.x, p.y, radius * 0.65, p.x, p.y, radius);
    const rimAlpha = this.options.opacity * 0.28;
    rimGrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${rimAlpha * 0.5})`);
    rimGrad.addColorStop(0.85, `rgba(${r}, ${g}, ${b}, ${rimAlpha * 1.2})`);
    rimGrad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

    this.ctx.fillStyle = rimGrad;
    this.ctx.beginPath();
    this.ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    this.ctx.fill();

    // Inner soft body
    const bodyGrad = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius * 0.7);
    const bodyAlpha = this.options.opacity * 0.15;
    bodyGrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${bodyAlpha})`);
    bodyGrad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

    this.ctx.fillStyle = bodyGrad;
    this.ctx.beginPath();
    this.ctx.arc(p.x, p.y, radius * 0.7, 0, Math.PI * 2);
    this.ctx.fill();
  }

  // 6. 橡皮擦：使用 destination-out 精準消除 DrawingCanvas 筆劃，並支援平滑連接線
  private renderEraser(p: Point, prev?: Point) {
    this.ctx.globalCompositeOperation = 'destination-out';
    this.ctx.fillStyle = '#000000';
    this.ctx.strokeStyle = '#000000';
    this.ctx.globalAlpha = Math.max(0.01, this.options.opacity);
    this.ctx.lineWidth = this.options.size;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    this.ctx.beginPath();
    this.ctx.arc(p.x, p.y, this.options.size / 2, 0, Math.PI * 2);
    this.ctx.fill();

    if (prev && (prev.x !== p.x || prev.y !== p.y)) {
      this.ctx.beginPath();
      this.ctx.moveTo(prev.x, prev.y);
      this.ctx.lineTo(p.x, p.y);
      this.ctx.stroke();
    }
  }
}
