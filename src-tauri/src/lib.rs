pub mod gif_ops;
pub mod image_ops;
pub mod state;

use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use gif_ops::{create_gif_bytes, GifExportOptions, GifFrameInput};
use image_ops::{
    decode_image, laplacian_filter, median_filter_region, to_binary, to_grayscale, to_negative,
    to_palette, FilterRegion, LaplacianResult, PaletteResult,
};
use state::AppState;
use std::fs;
use std::path::Path;
use tauri::{AppHandle, Emitter, Manager, State, WebviewUrl, WebviewWindowBuilder};

#[tauri::command]
fn process_grayscale(image_data: String) -> Result<String, String> {
    let img = decode_image(&image_data)?;
    to_grayscale(&img)
}

#[tauri::command]
fn process_binary(image_data: String, threshold: u8) -> Result<String, String> {
    let img = decode_image(&image_data)?;
    to_binary(&img, threshold)
}

#[tauri::command]
fn process_palette(image_data: String, num_colors: usize, dither: bool) -> Result<PaletteResult, String> {
    let img = decode_image(&image_data)?;
    to_palette(&img, num_colors, dither)
}

#[tauri::command]
fn process_negative(image_data: String) -> Result<String, String> {
    let img = decode_image(&image_data)?;
    to_negative(&img)
}

#[tauri::command]
fn process_median(
    image_data: String,
    kernel_size: usize,
    region: Option<FilterRegion>,
) -> Result<String, String> {
    let img = decode_image(&image_data)?;
    median_filter_region(&img, kernel_size, region)
}

#[tauri::command]
fn process_laplacian(
    image_data: String,
    kernel_type: String,
    strength: f32,
) -> Result<LaplacianResult, String> {
    let img = decode_image(&image_data)?;
    laplacian_filter(&img, &kernel_type, strength)
}

#[tauri::command]
fn add_shared_gif_frame(
    frame: GifFrameInput,
    state: State<'_, AppState>,
    app_handle: AppHandle,
) -> Result<usize, String> {
    let mut inner = state.inner.lock().map_err(|e| e.to_string())?;
    inner.shared_frames.push(frame.clone());
    let count = inner.shared_frames.len();

    // Notify all windows about frame addition
    let _ = app_handle.emit("gif_frame_added", &frame);
    Ok(count)
}

#[tauri::command]
fn get_shared_gif_frames(state: State<'_, AppState>) -> Result<Vec<GifFrameInput>, String> {
    let inner = state.inner.lock().map_err(|e| e.to_string())?;
    Ok(inner.shared_frames.clone())
}

#[tauri::command]
fn clear_shared_gif_frames(state: State<'_, AppState>) -> Result<(), String> {
    let mut inner = state.inner.lock().map_err(|e| e.to_string())?;
    inner.shared_frames.clear();
    Ok(())
}

#[tauri::command]
fn export_gif(options: GifExportOptions, file_path: String) -> Result<String, String> {
    let bytes = create_gif_bytes(&options)?;
    fs::write(&file_path, bytes).map_err(|e| format!("儲存 GIF 失敗: {}", e))?;
    Ok(format!("成功匯出 GIF 至 {}", file_path))
}

#[tauri::command]
fn save_image_file(image_data: String, file_path: String, quality: Option<u8>) -> Result<String, String> {
    let img = decode_image(&image_data)?;
    let path = Path::new(&file_path);

    let ext = path
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("png")
        .to_lowercase();

    match ext.as_str() {
        "jpg" | "jpeg" => {
            let rgb = img.to_rgb8();
            let mut file = fs::File::create(&file_path).map_err(|e| format!("建立檔案失敗: {}", e))?;
            let q = quality.unwrap_or(90).clamp(1, 100);
            let mut encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut file, q);
            encoder
                .encode(rgb.as_raw(), rgb.width(), rgb.height(), image::ExtendedColorType::Rgb8)
                .map_err(|e| format!("JPEG 編碼失敗: {}", e))?;
        }
        "bmp" => {
            img.save_with_format(&file_path, image::ImageFormat::Bmp)
                .map_err(|e| format!("BMP 儲存失敗: {}", e))?;
        }
        "webp" => {
            img.save_with_format(&file_path, image::ImageFormat::WebP)
                .map_err(|e| format!("WEBP 儲存失敗: {}", e))?;
        }
        _ => {
            img.save_with_format(&file_path, image::ImageFormat::Png)
                .map_err(|e| format!("PNG 儲存失敗: {}", e))?;
        }
    }

    Ok(format!("成功儲存圖片至 {}", file_path))
}

#[tauri::command]
fn read_image_file(file_path: String) -> Result<String, String> {
    let bytes = fs::read(&file_path).map_err(|e| format!("讀取檔案失敗: {}", e))?;
    let img = image::load_from_memory(&bytes).map_err(|e| format!("解析影像失敗: {}", e))?;

    let mut buf = Vec::new();
    let mut cursor = std::io::Cursor::new(&mut buf);
    img.write_to(&mut cursor, image::ImageFormat::Png)
        .map_err(|e| format!("轉碼 PNG 失敗: {}", e))?;

    let b64 = BASE64.encode(&buf);
    Ok(format!("data:image/png;base64,{}", b64))
}

#[tauri::command]
async fn open_gif_studio_window(app: AppHandle) -> Result<(), String> {
    if let Some(win) = app.get_webview_window("gif_studio") {
        win.show().map_err(|e| e.to_string())?;
        win.set_focus().map_err(|e| e.to_string())?;
        return Ok(());
    }

    WebviewWindowBuilder::new(
        &app,
        "gif_studio",
        WebviewUrl::App("index.html#/gif-studio".into()),
    )
    .title("GIF 動畫製作工作坊")
    .inner_size(960.0, 680.0)
    .min_inner_size(800.0, 560.0)
    .center()
    .resizable(true)
    .build()
    .map_err(|e| format!("開啟 GIF 工作坊視窗失敗: {}", e))?;

    Ok(())
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(AppState::new())
        .invoke_handler(tauri::generate_handler![
            process_grayscale,
            process_binary,
            process_palette,
            process_negative,
            process_median,
            process_laplacian,
            add_shared_gif_frame,
            get_shared_gif_frames,
            clear_shared_gif_frames,
            export_gif,
            save_image_file,
            read_image_file,
            open_gif_studio_window,
        ])
        .run(tauri::generate_context!())
        .expect("啟動 Tauri 應用程式時發生錯誤");
}
