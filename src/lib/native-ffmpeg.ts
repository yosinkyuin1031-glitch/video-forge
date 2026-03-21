/**
 * Native FFmpeg bridge for Tauri desktop app.
 * When running as a Tauri app, uses native FFmpeg for 50x faster processing.
 * Falls back to FFmpeg.wasm when running in browser.
 */

// Check if running in Tauri
export function isTauri(): boolean {
  return typeof window !== "undefined" && !!(window as any).__TAURI_INTERNALS__;
}

interface FfmpegResult {
  success: boolean;
  output: string;
  error: string;
}

// Tauri invoke wrapper
async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke: tauriInvoke } = await import("@tauri-apps/api/core");
  return tauriInvoke<T>(cmd, args);
}

export async function checkNativeFFmpeg(): Promise<boolean> {
  if (!isTauri()) return false;
  try {
    return await invoke<boolean>("check_ffmpeg");
  } catch {
    return false;
  }
}

export async function nativeFFmpegExec(args: string[]): Promise<FfmpegResult> {
  return invoke<FfmpegResult>("run_ffmpeg", { args });
}

export async function nativeFFprobeExec(args: string[]): Promise<FfmpegResult> {
  return invoke<FfmpegResult>("run_ffprobe", { args });
}

export async function getTempDir(): Promise<string> {
  return invoke<string>("get_temp_dir");
}

export async function writeFileNative(path: string, data: Uint8Array): Promise<void> {
  return invoke("write_file_bytes", { path, data: Array.from(data) });
}

export async function readFileNative(path: string): Promise<Uint8Array> {
  const bytes = await invoke<number[]>("read_file_bytes", { path });
  return new Uint8Array(bytes);
}

export async function deleteFileNative(path: string): Promise<void> {
  return invoke("delete_file", { path });
}

/**
 * High-level: Run FFmpeg with native binary, handling temp file I/O.
 * Takes input as File/Blob, runs FFmpeg, returns output as Blob.
 */
export async function processWithNativeFFmpeg(
  inputFile: File | Blob,
  ffmpegArgs: (inputPath: string, outputPath: string) => string[],
  outputType: string = "video/mp4",
  onProgress?: (msg: string) => void
): Promise<Blob> {
  const tempDir = await getTempDir();
  const timestamp = Date.now();
  const inputPath = `${tempDir}/input_${timestamp}`;
  const outputPath = `${tempDir}/output_${timestamp}.mp4`;

  try {
    // Write input file to temp
    onProgress?.("ファイルを準備中...");
    const arrayBuffer = await inputFile.arrayBuffer();
    await writeFileNative(inputPath, new Uint8Array(arrayBuffer));

    // Run FFmpeg
    onProgress?.("処理中（ネイティブ高速モード）...");
    const args = ffmpegArgs(inputPath, outputPath);
    const result = await nativeFFmpegExec(["-y", ...args]);

    if (!result.success) {
      throw new Error(`FFmpegエラー: ${result.error.slice(0, 200)}`);
    }

    // Read output
    onProgress?.("完了処理中...");
    const outputData = await readFileNative(outputPath);
    return new Blob([new Uint8Array(outputData)], { type: outputType });
  } finally {
    // Cleanup
    await deleteFileNative(inputPath).catch(() => {});
    await deleteFileNative(outputPath).catch(() => {});
  }
}
