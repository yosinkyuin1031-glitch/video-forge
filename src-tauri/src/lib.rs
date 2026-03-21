use std::process::Command;
use serde::{Deserialize, Serialize};
use tauri::command;

#[derive(Debug, Serialize, Deserialize)]
pub struct FfmpegResult {
    pub success: bool,
    pub output: String,
    pub error: String,
}

#[command]
async fn run_ffmpeg(args: Vec<String>) -> Result<FfmpegResult, String> {
    let output = Command::new("ffmpeg")
        .args(&args)
        .output()
        .map_err(|e| format!("FFmpeg実行エラー: {}. FFmpegがインストールされているか確認してください。", e))?;

    Ok(FfmpegResult {
        success: output.status.success(),
        output: String::from_utf8_lossy(&output.stdout).to_string(),
        error: String::from_utf8_lossy(&output.stderr).to_string(),
    })
}

#[command]
async fn run_ffprobe(args: Vec<String>) -> Result<FfmpegResult, String> {
    let output = Command::new("ffprobe")
        .args(&args)
        .output()
        .map_err(|e| format!("FFprobe実行エラー: {}", e))?;

    Ok(FfmpegResult {
        success: output.status.success(),
        output: String::from_utf8_lossy(&output.stdout).to_string(),
        error: String::from_utf8_lossy(&output.stderr).to_string(),
    })
}

#[command]
async fn check_ffmpeg() -> Result<bool, String> {
    match Command::new("ffmpeg").arg("-version").output() {
        Ok(output) => Ok(output.status.success()),
        Err(_) => Ok(false),
    }
}

#[command]
async fn get_temp_dir() -> Result<String, String> {
    let temp = std::env::temp_dir();
    let vf_temp = temp.join("videoforge");
    std::fs::create_dir_all(&vf_temp).map_err(|e| e.to_string())?;
    Ok(vf_temp.to_string_lossy().to_string())
}

#[command]
async fn read_file_bytes(path: String) -> Result<Vec<u8>, String> {
    std::fs::read(&path).map_err(|e| format!("ファイル読み込みエラー: {}", e))
}

#[command]
async fn write_file_bytes(path: String, data: Vec<u8>) -> Result<(), String> {
    std::fs::write(&path, &data).map_err(|e| format!("ファイル書き込みエラー: {}", e))
}

#[command]
async fn delete_file(path: String) -> Result<(), String> {
    if std::path::Path::new(&path).exists() {
        std::fs::remove_file(&path).map_err(|e| format!("ファイル削除エラー: {}", e))?;
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            run_ffmpeg,
            run_ffprobe,
            check_ffmpeg,
            get_temp_dir,
            read_file_bytes,
            write_file_bytes,
            delete_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
