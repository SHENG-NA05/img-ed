export function createSampleTestImage(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 960;
  canvas.height = 640;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // 1. Background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 960, 640);
  bgGrad.addColorStop(0, '#1a365d');
  bgGrad.addColorStop(0.5, '#2d3748');
  bgGrad.addColorStop(1, '#1a202c');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 960, 640);

  // 2. High-contrast geometric shapes for Laplacian & Color Quantization testing
  ctx.fillStyle = '#f56565';
  ctx.beginPath();
  ctx.arc(240, 240, 120, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#48bb78';
  ctx.fillRect(440, 120, 200, 200);

  ctx.fillStyle = '#ecc94b';
  ctx.beginPath();
  ctx.moveTo(760, 320);
  ctx.lineTo(880, 140);
  ctx.lineTo(640, 140);
  ctx.closePath();
  ctx.fill();

  // 3. High-frequency fine detail lines (ideal for Laplacian sharpening & edge mask)
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  for (let x = 80; x <= 880; x += 30) {
    ctx.beginPath();
    ctx.moveTo(x, 400);
    ctx.lineTo(x, 460);
    ctx.stroke();
  }

  // 4. Contrast grid & circles
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 3;
  for (let r = 20; r <= 80; r += 20) {
    ctx.beginPath();
    ctx.arc(480, 520, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 5. Text elements with sharp edges
  ctx.font = 'bold 36px "Segoe UI", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('PHOTOSHOP STUDIO', 80, 80);

  ctx.font = '20px "Segoe UI", sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('高解析度測試圖卡 (High Frequency Test Card)', 80, 115);

  ctx.font = '16px monospace';
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText('Laplacian Edge Sharpness | Median Denoise | NeuQuant Palette', 80, 560);

  // 6. Pepper & Salt noise patch for Median filter demonstration
  const noiseX = 720;
  const noiseY = 400;
  const noiseW = 160;
  const noiseH = 120;
  ctx.fillStyle = '#334155';
  ctx.fillRect(noiseX, noiseY, noiseW, noiseH);

  const imgData = ctx.getImageData(noiseX, noiseY, noiseW, noiseH);
  for (let i = 0; i < imgData.data.length; i += 4) {
    const rand = Math.random();
    if (rand < 0.08) {
      imgData.data[i] = 255;
      imgData.data[i + 1] = 255;
      imgData.data[i + 2] = 255;
    } else if (rand > 0.92) {
      imgData.data[i] = 0;
      imgData.data[i + 1] = 0;
      imgData.data[i + 2] = 0;
    }
  }
  ctx.putImageData(imgData, noiseX, noiseY);

  ctx.font = '12px sans-serif';
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText('雜訊區 (Noise ROI)', noiseX + 10, noiseY + 20);

  return canvas.toDataURL('image/png');
}
