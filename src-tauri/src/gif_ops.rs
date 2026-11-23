use crate::image_ops::decode_image;
use gif::{Encoder, Frame, Repeat};
use image::imageops::FilterType;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GifFrameInput {
    pub id: String,
    pub image_data: String,
    pub delay_ms: Option<u32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GifExportOptions {
    pub frames: Vec<GifFrameInput>,
    pub global_delay_ms: u32,
    pub speed_multiplier: f32, // e.g. 0.25 to 4.0
    pub loop_count: u16,       // 0 for infinite
    pub scale: f32,            // 0.25 to 1.0
}

pub fn create_gif_bytes(options: &GifExportOptions) -> Result<Vec<u8>, String> {
    if options.frames.is_empty() {
        return Err("影格清單不可為空".to_string());
    }

    // Decode all frames first to determine target resolution
    let mut decoded_images = Vec::with_capacity(options.frames.len());
    let mut delays = Vec::with_capacity(options.frames.len());

    let speed = if options.speed_multiplier > 0.0 {
        options.speed_multiplier
    } else {
        1.0
    };

    for frame_input in &options.frames {
        let dyn_img = decode_image(&frame_input.image_data)?;
        decoded_images.push(dyn_img);

        let delay_ms = frame_input.delay_ms.unwrap_or(options.global_delay_ms);
        // Effective delay in 10ms (1/100s) ticks
        let adjusted_delay = (delay_ms as f32 / speed / 10.0).round().max(1.0) as u16;
        delays.push(adjusted_delay);
    }

    // Target dimensions based on first frame and scale
    let first = &decoded_images[0];
    let orig_w = first.width();
    let orig_h = first.height();
    let scale = options.scale.clamp(0.1, 2.0);
    let target_w = ((orig_w as f32 * scale).round() as u32).max(1);
    let target_h = ((orig_h as f32 * scale).round() as u32).max(1);

    let mut gif_buffer = Vec::new();
    {
        let mut encoder = Encoder::new(&mut gif_buffer, target_w as u16, target_h as u16, &[])
            .map_err(|e| format!("GIF Encoder 初始化失敗: {}", e))?;

        if options.loop_count == 0 {
            encoder
                .set_repeat(Repeat::Infinite)
                .map_err(|e| format!("設定循環失敗: {}", e))?;
        } else {
            encoder
                .set_repeat(Repeat::Finite(options.loop_count))
                .map_err(|e| format!("設定循環次數失敗: {}", e))?;
        }

        for (i, img) in decoded_images.iter().enumerate() {
            let resized = if img.width() != target_w || img.height() != target_h {
                img.resize_exact(target_w, target_h, FilterType::Triangle)
            } else {
                img.clone()
            };

            let mut rgba = resized.to_rgba8().into_raw();
            let mut frame = Frame::from_rgba_speed(target_w as u16, target_h as u16, &mut rgba, 10);
            frame.delay = delays[i];

            encoder
                .write_frame(&frame)
                .map_err(|e| format!("寫入 GIF 影格第 {} 幀失敗: {}", i + 1, e))?;
        }
    }

    Ok(gif_buffer)
}
