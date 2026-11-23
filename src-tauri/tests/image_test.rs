use photoshop_studio_lib::image_ops::*;
use image::{DynamicImage, Rgba, RgbaImage};

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
