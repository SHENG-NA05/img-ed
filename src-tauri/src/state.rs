use crate::gif_ops::GifFrameInput;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;

#[derive(Default, Debug, Serialize, Deserialize, Clone)]
pub struct AppStateInner {
    pub shared_frames: Vec<GifFrameInput>,
}

pub struct AppState {
    pub inner: Mutex<AppStateInner>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            inner: Mutex::new(AppStateInner::default()),
        }
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}
