use photoshop_studio_lib::gif_ops::*;
use photoshop_studio_lib::image_ops::*;
use image::{DynamicImage, Rgba, RgbaImage};

fn main() {
    println!("Testing Grayscale & Binary...");
    let mut img = RgbaImage::new(10, 10);
    img.put_pixel(0, 0, Rgba([100, 150, 200, 255]));
    let dyn_img = DynamicImage::ImageRgba8(img);
    assert!(to_grayscale(&dyn_img).is_ok());
    assert!(to_binary(&dyn_img, 128).is_ok());

    println!("Testing Median Filter...");
    let mut med_img = RgbaImage::new(15, 15);
    for x in 0..15 {
        for y in 0..15 {
            med_img.put_pixel(x, y, Rgba([x as u8 * 5, y as u8 * 5, 50, 255]));
        }
    }
    let med_dyn = DynamicImage::ImageRgba8(med_img);
    assert!(median_filter(&med_dyn, 3).is_ok());
    assert!(median_filter(&med_dyn, 4).is_ok()); // checks even k clamping to 5
    assert!(median_filter(&med_dyn, 5).is_ok());
    assert!(median_filter(&med_dyn, 7).is_ok());

    let region = FilterRegion {
        x: 2,
        y: 2,
        width: 8,
        height: 8,
    };
    assert!(median_filter_region(&med_dyn, 3, Some(region)).is_ok());

    println!("Testing Laplacian Filter...");
    let mut lap_img = RgbaImage::new(20, 20);
    for x in 0..20 {
        for y in 0..20 {
            lap_img.put_pixel(x, y, Rgba([x as u8 * 10, y as u8 * 10, 128, 255]));
        }
    }
    let lap_dyn = DynamicImage::ImageRgba8(lap_img);
    let res4 = laplacian_filter(&lap_dyn, "4", 1.0).unwrap();
    let res8 = laplacian_filter(&lap_dyn, "8", 1.5).unwrap();
    assert!(!res4.mask_data.is_empty());
    assert!(!res8.sharpened_data.is_empty());

    println!("Testing GIF stream encoder...");
    let b64 = to_grayscale(&lap_dyn).unwrap();
    let options = GifExportOptions {
        frames: vec![
            GifFrameInput {
                id: "f1".into(),
                image_data: b64.clone(),
                delay_ms: Some(100),
            },
            GifFrameInput {
                id: "f2".into(),
                image_data: b64,
                delay_ms: Some(100),
            },
        ],
        global_delay_ms: 100,
        speed_multiplier: 1.0,
        loop_count: 0,
        scale: 1.0,
    };
    let gif_bytes = create_gif_bytes(&options).unwrap();
    assert!(gif_bytes.len() > 10);

    println!("ALL_TESTS_PASSED");
}
