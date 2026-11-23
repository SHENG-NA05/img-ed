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
    #[serde(default)]
    pub speed_multiplier: Option<f32>,
    pub loop_count: u16,               // 0 for infinite
    pub scale: f32,                    // 0.25 to 1.0
}

pub fn create_gif_bytes(options: &GifExportOptions) -> Result<Vec<u8>, String> {
    if options.frames.is_empty() {
        return Err("影格清單不可為空".to_string());
    }

    let scale = options.scale.clamp(0.1, 2.0);

    // Determine target dimensions based on the first frame scaled
    let (target_w, target_h) = {
        let first_img = decode_image(&options.frames[0].image_data)?;
        let tw = ((first_img.width() as f32 * scale).round() as u32).max(1);
        let th = ((first_img.height() as f32 * scale).round() as u32).max(1);
        (tw, th)
    };

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

        // Stream encode: decode single frame -> resize to target -> encode -> drop immediately
        for (i, frame_input) in options.frames.iter().enumerate() {
            let dyn_img = decode_image(&frame_input.image_data)?;

            let transformed = if dyn_img.width() != target_w || dyn_img.height() != target_h {
                dyn_img.resize_exact(target_w, target_h, FilterType::Triangle)
            } else {
                dyn_img
            };

            // Use frame delay directly in 10ms units (hundredths of a second)
            let delay_ms = frame_input.delay_ms.unwrap_or(options.global_delay_ms);
            let adjusted_delay = (delay_ms as f32 / 10.0).round().max(1.0) as u16;

            let mut rgba = transformed.to_rgba8().into_raw();
            let mut frame = Frame::from_rgba_speed(target_w as u16, target_h as u16, &mut rgba, 10);
            frame.delay = adjusted_delay;

            encoder
                .write_frame(&frame)
                .map_err(|e| format!("寫入 GIF 影格第 {} 幀失敗: {}", i + 1, e))?;
        }
    }

    Ok(gif_buffer)
}
