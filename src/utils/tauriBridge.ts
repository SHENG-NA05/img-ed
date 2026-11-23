import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { LaplacianResult, PaletteResult } from '../types';

export const isTauri = () => {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
};

export async function invokeGrayscale(imageData: string): Promise<string> {
  if (isTauri()) {
    return await invoke<string>('process_grayscale', { imageData });
  }
  // Client-side fallback if previewed in standard browser
  return fallbackClientFilter(imageData, (r, g, b) => {
    const y = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    return [y, y, y];
  });
}

export async function invokeBinary(imageData: string, threshold: number): Promise<string> {
  if (isTauri()) {
    return await invoke<string>('process_binary', { imageData, threshold });
  }
  return fallbackClientFilter(imageData, (r, g, b) => {
    const y = 0.299 * r + 0.587 * g + 0.114 * b;
    const v = y >= threshold ? 255 : 0;
    return [v, v, v];
  });
}

export async function invokePalette(
  imageData: string,
  numColors: number,
  dither: boolean
): Promise<PaletteResult> {
  if (isTauri()) {
    return await invoke<PaletteResult>('process_palette', {
      imageData,
      numColors,
      dither,
    });
  }
  // Quick fallback
  const img = await fallbackClientFilter(imageData, (r, g, b) => {
    const step = 256 / Math.min(numColors, 8);
    const qr = Math.floor(r / step) * step;
    const qg = Math.floor(g / step) * step;
    const qb = Math.floor(b / step) * step;
    return [qr, qg, qb];
  });
  return {
    image_data: img,
    palette: [
      [255, 0, 0],
      [0, 255, 0],
      [0, 0, 255],
      [255, 255, 0],
    ],
  };
}

export async function invokeNegative(imageData: string): Promise<string> {
  if (isTauri()) {
    return await invoke<string>('process_negative', { imageData });
  }
  return fallbackClientFilter(imageData, (r, g, b) => [255 - r, 255 - g, 255 - b]);
}

export async function invokeMedian(imageData: string, kernelSize: number): Promise<string> {
  if (isTauri()) {
    return await invoke<string>('process_median', { imageData, kernelSize });
  }
  return imageData;
}

export async function invokeLaplacian(
  imageData: string,
  kernelType: string,
  strength: number
): Promise<LaplacianResult> {
  if (isTauri()) {
    return await invoke<LaplacianResult>('process_laplacian', {
      imageData,
      kernelType,
      strength,
    });
  }
  return {
    original_data: imageData,
    mask_data: imageData,
    sharpened_data: imageData,
  };
}

export async function invokeAddSharedGifFrame(frame: {
  id: string;
  image_data: string;
  delay_ms?: number;
}): Promise<number> {
  if (isTauri()) {
    return await invoke<number>('add_shared_gif_frame', { frame });
  }
  return 1;
}

export async function invokeGetSharedGifFrames(): Promise<any[]> {
  if (isTauri()) {
    return await invoke<any[]>('get_shared_gif_frames');
  }
  return [];
}

export async function invokeClearSharedGifFrames(): Promise<void> {
  if (isTauri()) {
    await invoke('clear_shared_gif_frames');
  }
}

export async function invokeExportGif(options: any, filePath: string): Promise<string> {
  if (isTauri()) {
    return await invoke<string>('export_gif', { options, filePath });
  }
  return 'Web preview mode: simulated GIF export';
}

export async function invokeSaveImage(
  imageData: string,
  filePath: string,
  quality?: number
): Promise<string> {
  if (isTauri()) {
    return await invoke<string>('save_image_file', { imageData, filePath, quality });
  }
  // Browser download fallback
  const a = document.createElement('a');
  a.href = imageData;
  a.download = 'edited_image.png';
  a.click();
  return 'Downloaded to browser';
}

export async function invokeReadImage(filePath: string): Promise<string> {
  if (isTauri()) {
    return await invoke<string>('read_image_file', { filePath });
  }
  throw new Error('Not running in Tauri');
}

export async function invokeOpenGifStudio(): Promise<void> {
  if (isTauri()) {
    await invoke('open_gif_studio_window');
  } else {
    window.location.hash = '#/gif-studio';
  }
}

export async function pickImageFile(): Promise<string | null> {
  if (isTauri()) {
    const selected = await open({
      multiple: false,
      filters: [
        {
          name: '影像圖檔 (*.png;*.jpg;*.jpeg;*.bmp;*.webp)',
          extensions: ['png', 'jpg', 'jpeg', 'bmp', 'webp'],
        },
      ],
    });
    if (selected && typeof selected === 'string') {
      return await invokeReadImage(selected);
    }
    return null;
  } else {
    // HTML file picker
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/png,image/jpeg,image/bmp,image/webp';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return resolve(null);
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      };
      input.click();
    });
  }
}

export async function pickMultipleImageFiles(): Promise<string[]> {
  if (isTauri()) {
    const selected = await open({
      multiple: true,
      filters: [
        {
          name: '影像圖檔 (*.png;*.jpg;*.jpeg;*.bmp;*.webp)',
          extensions: ['png', 'jpg', 'jpeg', 'bmp', 'webp'],
        },
      ],
    });
    if (Array.isArray(selected)) {
      const list: string[] = [];
      for (const p of selected) {
        const b64 = await invokeReadImage(p);
        list.push(b64);
      }
      return list;
    } else if (selected && typeof selected === 'string') {
      const b64 = await invokeReadImage(selected);
      return [b64];
    }
    return [];
  } else {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.accept = 'image/png,image/jpeg,image/bmp,image/webp';
      input.onchange = async (e) => {
        const files = Array.from((e.target as HTMLInputElement).files || []);
        const results: string[] = [];
        for (const file of files) {
          const b64 = await new Promise<string>((res) => {
            const reader = new FileReader();
            reader.onload = () => res(reader.result as string);
            reader.readAsDataURL(file);
          });
          results.push(b64);
        }
        resolve(results);
      };
      input.click();
    });
  }
}

export async function pickSavePath(
  defaultName: string,
  filterName: string,
  extensions: string[]
): Promise<string | null> {
  if (isTauri()) {
    return await save({
      defaultPath: defaultName,
      filters: [{ name: filterName, extensions }],
    });
  }
  return defaultName;
}

// Client helper fallback for browser dev mode
function fallbackClientFilter(
  dataUrl: string,
  transform: (r: number, g: number, b: number) => [number, number, number]
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext('2d');
      if (!ctx) return resolve(dataUrl);
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, c.width, c.height);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        const [nr, ng, nb] = transform(d[i], d[i + 1], d[i + 2]);
        d[i] = nr;
        d[i + 1] = ng;
        d[i + 2] = nb;
      }
      ctx.putImageData(imgData, 0, 0);
      resolve(c.toDataURL('image/png'));
    };
    img.src = dataUrl;
  });
}
