fn main() {
    let icon_path = std::path::PathBuf::from("C:/Users/sam10/.cargo_target/icon.ico");
    let attrs = tauri_build::Attributes::new()
        .windows_attributes(tauri_build::WindowsAttributes::new().window_icon_path(icon_path));
    tauri_build::try_build(attrs).expect("failed to run tauri-build");
}
