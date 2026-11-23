use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use color_quant::NeuQuant;
use image::codecs::png::PngEncoder;
use image::{DynamicImage, ExtendedColorType, GenericImageView, ImageBuffer, ImageEncoder, ImageFormat, Rgba};
use serde::{Deserialize, Serialize};
use std::io::Cursor;

#[derive(Debug, Serialize, Deserialize)]
pub struct PaletteResult {
    pub image_data: String,
    pub palette: Vec<[u8; 3]>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LaplacianResult {
    pub original_data: String,
    pub mask_data: String,
    pub sharpened_data: String,
}

/// Helper to decode base64 data URL or raw base64 string into DynamicImage
pub fn decode_image(image_base64: &str) -> Result<DynamicImage, String> {
    let raw_b64 = if let Some(idx) = image_base64.find(',') {
        &image_base64[idx + 1..]
    } else {
        image_base64
    };

    let bytes = BASE64
        .decode(raw_b64)
        .map_err(|e| format!("Base64 解碼失敗: {}", e))?;

    image::load_from_memory(&bytes).map_err(|e| format!("影像載入解析失敗: {}", e))
}

/// Helper to encode DynamicImage into a PNG base64 data URL
pub fn encode_image_png(img: &DynamicImage) -> Result<String, String> {
    let mut buffer = Vec::new();
    let mut cursor = Cursor::new(&mut buffer);
    img.write_to(&mut cursor, ImageFormat::Png)
        .map_err(|e| format!("影像 PNG 編碼失敗: {}", e))?;

    let b64 = BASE64.encode(&buffer);
    Ok(format!("data:image/png;base64,{}", b64))
}

/// Helper to encode RgbaImage into a PNG base64 data URL without cloning the pixel buffer
pub fn encode_rgba_png(img: &ImageBuffer<Rgba<u8>, Vec<u8>>) -> Result<String, String> {
    let mut buffer = Vec::new();
    let encoder = PngEncoder::new(&mut buffer);
    encoder
        .write_image(
            img.as_raw(),
            img.width(),
            img.height(),
            ExtendedColorType::Rgba8,
        )
        .map_err(|e| format!("影像 PNG 編碼失敗: {}", e))?;

    let b64 = BASE64.encode(&buffer);
    Ok(format!("data:image/png;base64,{}", b64))
}

/// Grayscale conversion using luminance formula: Y = 0.299*R + 0.587*G + 0.114*B
pub fn to_grayscale(img: &DynamicImage) -> Result<String, String> {
    let (width, height) = img.dimensions();
    let mut gray_img = ImageBuffer::<Rgba<u8>, Vec<u8>>::new(width, height);

    for (x, y, pixel) in img.pixels() {
        let r = pixel[0] as f32;
        let g = pixel[1] as f32;
        let b = pixel[2] as f32;
        let a = pixel[3];

        let lum = (0.299 * r + 0.587 * g + 0.114 * b).round().clamp(0.0, 255.0) as u8;
        gray_img.put_pixel(x, y, Rgba([lum, lum, lum, a]));
    }

    encode_rgba_png(&gray_img)
}

/// Binary Thresholding: pixels with luminance >= threshold become 255, else 0
pub fn to_binary(img: &DynamicImage, threshold: u8) -> Result<String, String> {
    let (width, height) = img.dimensions();
    let mut bin_img = ImageBuffer::<Rgba<u8>, Vec<u8>>::new(width, height);

    for (x, y, pixel) in img.pixels() {
        let r = pixel[0] as f32;
        let g = pixel[1] as f32;
        let b = pixel[2] as f32;
        let a = pixel[3];

        let lum = (0.299 * r + 0.587 * g + 0.114 * b).round().clamp(0.0, 255.0) as u8;
        let val = if lum >= threshold { 255 } else { 0 };
        bin_img.put_pixel(x, y, Rgba([val, val, val, a]));
    }

    encode_rgba_png(&bin_img)
}

/// Color Palette Quantization with NeuQuant and optional Floyd-Steinberg dithering
pub fn to_palette(img: &DynamicImage, num_colors: usize, dither: bool) -> Result<PaletteResult, String> {
    let rgba = img.to_rgba8();
    let (width, height) = rgba.dimensions();

    // NeuQuant works on RGBA bytes
    let raw_rgba = rgba.into_raw();
    let nq = NeuQuant::new(10, num_colors.clamp(4, 256), &raw_rgba);

    // Extract unique color palette from color map
    let mut palette_colors: Vec<[u8; 3]> = Vec::new();
    let color_map = nq.color_map_rgb();
    for chunk in color_map.chunks(3) {
        if chunk.len() >= 3 {
            let rgb = [chunk[0], chunk[1], chunk[2]];
            if !palette_colors.contains(&rgb) {
                palette_colors.push(rgb);
            }
        }
    }

    let mut out_img = ImageBuffer::<Rgba<u8>, Vec<u8>>::new(width, height);

    if !dither {
        for y in 0..height {
            for x in 0..width {
                let idx = ((y * width + x) * 4) as usize;
                let r = raw_rgba[idx];
                let g = raw_rgba[idx + 1];
                let b = raw_rgba[idx + 2];
                let a = raw_rgba[idx + 3];

                let pal_idx = nq.index_of(&[r, g, b, a]);
                let pal_offset = pal_idx * 3;
                let qr = color_map[pal_offset];
                let qg = color_map[pal_offset + 1];
                let qb = color_map[pal_offset + 2];

                out_img.put_pixel(x, y, Rgba([qr, qg, qb, a]));
            }
        }
    } else {
        // Floyd-Steinberg dithering
        let mut err_r = vec![0.0f32; (width * height) as usize];
        let mut err_g = vec![0.0f32; (width * height) as usize];
        let mut err_b = vec![0.0f32; (width * height) as usize];

        for y in 0..height {
            for x in 0..width {
                let idx = ((y * width + x) * 4) as usize;
                let e_idx = (y * width + x) as usize;

                let a = raw_rgba[idx + 3];
                let r = (raw_rgba[idx] as f32 + err_r[e_idx]).clamp(0.0, 255.0);
                let g = (raw_rgba[idx + 1] as f32 + err_g[e_idx]).clamp(0.0, 255.0);
                let b = (raw_rgba[idx + 2] as f32 + err_b[e_idx]).clamp(0.0, 255.0);

                let pal_idx = nq.index_of(&[r as u8, g as u8, b as u8, a]);
                let pal_offset = pal_idx * 3;
                let qr = color_map[pal_offset] as f32;
                let qg = color_map[pal_offset + 1] as f32;
                let qb = color_map[pal_offset + 2] as f32;

                out_img.put_pixel(x, y, Rgba([qr as u8, qg as u8, qb as u8, a]));

                let diff_r = r - qr;
                let diff_g = g - qg;
                let diff_b = b - qb;

                // Distribute errors:
                // (x+1, y)   += 7/16
                // (x-1, y+1) += 3/16
                // (x,   y+1) += 5/16
                // (x+1, y+1) += 1/16
                let spread = [
                    (x as i32 + 1, y as i32, 7.0 / 16.0),
                    (x as i32 - 1, y as i32 + 1, 3.0 / 16.0),
                    (x as i32, y as i32 + 1, 5.0 / 16.0),
                    (x as i32 + 1, y as i32 + 1, 1.0 / 16.0),
                ];

                for (nx, ny, factor) in spread {
                    if nx >= 0 && nx < width as i32 && ny >= 0 && ny < height as i32 {
                        let target_idx = (ny as u32 * width + nx as u32) as usize;
                        err_r[target_idx] += diff_r * factor;
                        err_g[target_idx] += diff_g * factor;
                        err_b[target_idx] += diff_b * factor;
                    }
                }
            }
        }
    }

    let b64 = encode_rgba_png(&out_img)?;
    Ok(PaletteResult {
        image_data: b64,
        palette: palette_colors,
    })
}

/// Color Negative conversion: (255 - R, 255 - G, 255 - B)
pub fn to_negative(img: &DynamicImage) -> Result<String, String> {
    let (width, height) = img.dimensions();
    let mut neg_img = ImageBuffer::<Rgba<u8>, Vec<u8>>::new(width, height);

    for (x, y, pixel) in img.pixels() {
        let r = 255 - pixel[0];
        let g = 255 - pixel[1];
        let b = 255 - pixel[2];
        let a = pixel[3];
        neg_img.put_pixel(x, y, Rgba([r, g, b, a]));
    }

    encode_rgba_png(&neg_img)
}

/// Spatial Domain Median Filter: kernel sizes 3, 5, 7
pub fn median_filter(img: &DynamicImage, kernel_size: usize) -> Result<String, String> {
    let k = (kernel_size.clamp(3, 7) / 2) * 2 + 1;
    let radius = (k / 2) as i32;
    let rgba = img.to_rgba8();
    let (width, height) = rgba.dimensions();

    let mut out_img = ImageBuffer::<Rgba<u8>, Vec<u8>>::new(width, height);
    let mut r_vals = Vec::with_capacity(k * k);
    let mut g_vals = Vec::with_capacity(k * k);
    let mut b_vals = Vec::with_capacity(k * k);
    let mid = (k * k) / 2;

    for y in 0..height {
        for x in 0..width {
            r_vals.clear();
            g_vals.clear();
            b_vals.clear();

            for dy in -radius..=radius {
                for dx in -radius..=radius {
                    let nx = (x as i32 + dx).clamp(0, width as i32 - 1) as u32;
                    let ny = (y as i32 + dy).clamp(0, height as i32 - 1) as u32;
                    let p = rgba.get_pixel(nx, ny);
                    r_vals.push(p[0]);
                    g_vals.push(p[1]);
                    b_vals.push(p[2]);
                }
            }

            r_vals.select_nth_unstable(mid);
            g_vals.select_nth_unstable(mid);
            b_vals.select_nth_unstable(mid);

            let a = rgba.get_pixel(x, y)[3];
            out_img.put_pixel(x, y, Rgba([r_vals[mid], g_vals[mid], b_vals[mid], a]));
        }
    }

    encode_rgba_png(&out_img)
}

/// Laplacian Filter: extracts edge mask & sharpened result
/// Supports 4-neighborhood and 8-neighborhood kernel.
/// Returns original, mask (normalized edge map), sharpened image.
pub fn laplacian_filter(
    img: &DynamicImage,
    kernel_type: &str, // "4" or "8"
    strength: f32,     // 0.1 to 3.0
) -> Result<LaplacianResult, String> {
    let rgba = img.to_rgba8();
    let (width, height) = rgba.dimensions();

    // 4-neighborhood vs 8-neighborhood kernel
    // 4-neighborhood: center is 4, 4-cardinal are -1
    // 8-neighborhood: center is 8, 8-neighbors are -1
    let kernel: [[f32; 3]; 3] = if kernel_type == "4" {
        [[0.0, -1.0, 0.0], [-1.0, 4.0, -1.0], [0.0, -1.0, 0.0]]
    } else {
        [[-1.0, -1.0, -1.0], [-1.0, 8.0, -1.0], [-1.0, -1.0, -1.0]]
    };

    let original_b64 = encode_rgba_png(&rgba)?;

    let mut mask_img = ImageBuffer::<Rgba<u8>, Vec<u8>>::new(width, height);
    let mut sharpened_img = ImageBuffer::<Rgba<u8>, Vec<u8>>::new(width, height);

    // Compute Laplacian response for each channel
    // Also track min and max for mask normalization
    let mut responses_r = vec![0.0f32; (width * height) as usize];
    let mut responses_g = vec![0.0f32; (width * height) as usize];
    let mut responses_b = vec![0.0f32; (width * height) as usize];
    let mut max_abs_laplace = 1.0f32;

    for y in 0..height {
        for x in 0..width {
            let mut sum_r = 0.0f32;
            let mut sum_g = 0.0f32;
            let mut sum_b = 0.0f32;

            for (ky, krow) in kernel.iter().enumerate() {
                for (kx, &weight) in krow.iter().enumerate() {
                    if weight == 0.0 {
                        continue;
                    }
                    let nx = (x as i32 + kx as i32 - 1).clamp(0, width as i32 - 1) as u32;
                    let ny = (y as i32 + ky as i32 - 1).clamp(0, height as i32 - 1) as u32;
                    let p = rgba.get_pixel(nx, ny);

                    sum_r += p[0] as f32 * weight;
                    sum_g += p[1] as f32 * weight;
                    sum_b += p[2] as f32 * weight;
                }
            }

            let idx = (y * width + x) as usize;
            responses_r[idx] = sum_r;
            responses_g[idx] = sum_g;
            responses_b[idx] = sum_b;

            let abs_lum = 0.299 * sum_r.abs() + 0.587 * sum_g.abs() + 0.114 * sum_b.abs();
            if abs_lum > max_abs_laplace {
                max_abs_laplace = abs_lum;
            }
        }
    }

    for y in 0..height {
        for x in 0..width {
            let idx = (y * width + x) as usize;
            let p = rgba.get_pixel(x, y);

            // 1. Mask image: edge magnitude normalized to 0-255
            let lr = responses_r[idx];
            let lg = responses_g[idx];
            let lb = responses_b[idx];
            let lum = (0.299 * lr.abs() + 0.587 * lg.abs() + 0.114 * lb.abs()) / max_abs_laplace * 255.0;
            let mask_val = lum.clamp(0.0, 255.0) as u8;
            mask_img.put_pixel(x, y, Rgba([mask_val, mask_val, mask_val, p[3]]));

            // 2. Sharpened image: I_orig + strength * I_laplace
            // For positive center kernel, adding laplace sharpens edges
            let sr = (p[0] as f32 + strength * lr).clamp(0.0, 255.0) as u8;
            let sg = (p[1] as f32 + strength * lg).clamp(0.0, 255.0) as u8;
            let sb = (p[2] as f32 + strength * lb).clamp(0.0, 255.0) as u8;
            sharpened_img.put_pixel(x, y, Rgba([sr, sg, sb, p[3]]));
        }
    }

    let mask_b64 = encode_rgba_png(&mask_img)?;
    let sharpened_b64 = encode_rgba_png(&sharpened_img)?;

    Ok(LaplacianResult {
        original_data: original_b64,
        mask_data: mask_b64,
        sharpened_data: sharpened_b64,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use image::RgbaImage;

    #[test]
    fn test_grayscale_and_binary() {
        let mut img = RgbaImage::new(10, 10);
        img.put_pixel(0, 0, Rgba([100, 150, 200, 255]));
        let dyn_img = DynamicImage::ImageRgba8(img);

        let gray = to_grayscale(&dyn_img);
        assert!(gray.is_ok());

        let binary = to_binary(&dyn_img, 128);
        assert!(binary.is_ok());
    }

    #[test]
    fn test_laplacian_filter() {
        let mut img = RgbaImage::new(20, 20);
        for x in 0..20 {
            for y in 0..20 {
                img.put_pixel(x, y, Rgba([x as u8 * 10, y as u8 * 10, 128, 255]));
            }
        }
        let dyn_img = DynamicImage::ImageRgba8(img);

        let res4 = laplacian_filter(&dyn_img, "4", 1.0);
        assert!(res4.is_ok());

        let res8 = laplacian_filter(&dyn_img, "8", 1.5);
        assert!(res8.is_ok());
        let val8 = res8.unwrap();
        assert!(!val8.mask_data.is_empty());
        assert!(!val8.sharpened_data.is_empty());
    }
}

