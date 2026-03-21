import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL, fetchFile } from "@ffmpeg/util";

let ffmpeg: FFmpeg | null = null;

export async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpeg && ffmpeg.loaded) return ffmpeg;

  ffmpeg = new FFmpeg();

  const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm";
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
  });

  return ffmpeg;
}

export interface SilentSegment {
  start: number;
  end: number;
}

export async function detectSilence(
  file: File,
  threshold: number = -35,
  minDuration: number = 0.5,
  onProgress?: (msg: string) => void
): Promise<SilentSegment[]> {
  const ff = await getFFmpeg();
  const data = await fetchFile(file);
  await ff.writeFile("input", data);

  const segments: SilentSegment[] = [];
  let currentStart: number | null = null;

  ff.on("log", ({ message }) => {
    // Parse silence_start
    const startMatch = message.match(/silence_start:\s*([\d.]+)/);
    if (startMatch) {
      currentStart = parseFloat(startMatch[1]);
    }
    // Parse silence_end
    const endMatch = message.match(/silence_end:\s*([\d.]+)/);
    if (endMatch && currentStart !== null) {
      segments.push({ start: currentStart, end: parseFloat(endMatch[1]) });
      currentStart = null;
    }
  });

  onProgress?.("無音区間を検出中...");

  await ff.exec([
    "-i", "input",
    "-af", `silencedetect=noise=${threshold}dB:d=${minDuration}`,
    "-f", "null", "-"
  ]);

  return segments;
}

export async function removeSilence(
  file: File,
  segments: SilentSegment[],
  padding: number = 0.1,
  onProgress?: (msg: string) => void
): Promise<Blob> {
  const ff = await getFFmpeg();
  const data = await fetchFile(file);
  await ff.writeFile("input", data);

  // Get video duration
  let duration = 0;
  ff.on("log", ({ message }) => {
    const durMatch = message.match(/Duration:\s*(\d+):(\d+):(\d+)\.(\d+)/);
    if (durMatch) {
      duration = parseInt(durMatch[1]) * 3600 + parseInt(durMatch[2]) * 60 + parseInt(durMatch[3]) + parseInt(durMatch[4]) / 100;
    }
  });

  await ff.exec(["-i", "input", "-f", "null", "-"]);

  // Build keep segments (non-silent parts)
  const keepSegments: { start: number; end: number }[] = [];
  let pos = 0;

  for (const seg of segments) {
    const segStart = Math.max(0, seg.start - padding);
    const segEnd = Math.min(duration || 9999, seg.end + padding);

    if (pos < segStart) {
      keepSegments.push({ start: pos, end: segStart });
    }
    pos = segEnd;
  }

  if (pos < (duration || 9999)) {
    keepSegments.push({ start: pos, end: duration || 9999 });
  }

  if (keepSegments.length === 0) {
    throw new Error("カット後のコンテンツがありません");
  }

  // Create segments
  const partFiles: string[] = [];
  for (let i = 0; i < keepSegments.length; i++) {
    const seg = keepSegments[i];
    const partName = `part${i}.mp4`;
    onProgress?.(`セグメント ${i + 1}/${keepSegments.length} を処理中...`);

    await ff.exec([
      "-i", "input",
      "-ss", seg.start.toFixed(3),
      "-to", seg.end.toFixed(3),
      "-c", "copy",
      "-avoid_negative_ts", "make_zero",
      partName
    ]);
    partFiles.push(partName);
  }

  // Concat all parts
  onProgress?.("セグメントを結合中...");
  const concatList = partFiles.map((f) => `file '${f}'`).join("\n");
  await ff.writeFile("concat.txt", concatList);

  await ff.exec([
    "-f", "concat",
    "-safe", "0",
    "-i", "concat.txt",
    "-c", "copy",
    "output.mp4"
  ]);

  const result = await ff.readFile("output.mp4");
  const blob = new Blob([new Uint8Array(result as Uint8Array)], { type: "video/mp4" });

  // Cleanup
  for (const f of partFiles) {
    await ff.deleteFile(f);
  }
  await ff.deleteFile("concat.txt");
  await ff.deleteFile("input");
  await ff.deleteFile("output.mp4");

  return blob;
}

export async function trimVideo(
  file: File,
  startTime: number,
  endTime: number,
  onProgress?: (msg: string) => void
): Promise<Blob> {
  const ff = await getFFmpeg();
  const data = await fetchFile(file);
  await ff.writeFile("input", data);

  onProgress?.("トリミング中...");

  await ff.exec([
    "-i", "input",
    "-ss", startTime.toFixed(3),
    "-to", endTime.toFixed(3),
    "-c", "copy",
    "trimmed.mp4"
  ]);

  const result = await ff.readFile("trimmed.mp4");
  const blob = new Blob([new Uint8Array(result as Uint8Array)], { type: "video/mp4" });

  await ff.deleteFile("input");
  await ff.deleteFile("trimmed.mp4");

  return blob;
}

export async function addBgm(
  videoFile: File,
  bgmFile: File,
  bgmVolume: number = 0.3,
  onProgress?: (msg: string) => void
): Promise<Blob> {
  const ff = await getFFmpeg();
  await ff.writeFile("video", await fetchFile(videoFile));
  await ff.writeFile("bgm", await fetchFile(bgmFile));

  onProgress?.("BGMをミックス中...");

  await ff.exec([
    "-i", "video",
    "-i", "bgm",
    "-filter_complex",
    `[1:a]volume=${bgmVolume}[bgm];[0:a][bgm]amix=inputs=2:duration=first[out]`,
    "-map", "0:v",
    "-map", "[out]",
    "-c:v", "copy",
    "-shortest",
    "output.mp4"
  ]);

  const result = await ff.readFile("output.mp4");
  const blob = new Blob([new Uint8Array(result as Uint8Array)], { type: "video/mp4" });

  await ff.deleteFile("video");
  await ff.deleteFile("bgm");
  await ff.deleteFile("output.mp4");

  return blob;
}

export async function exportWithAspectRatio(
  file: File,
  width: number,
  height: number,
  onProgress?: (msg: string) => void
): Promise<Blob> {
  const ff = await getFFmpeg();
  await ff.writeFile("input", await fetchFile(file));

  onProgress?.(`${width}x${height} でエクスポート中...`);

  await ff.exec([
    "-i", "input",
    "-vf", `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black`,
    "-c:a", "copy",
    "output.mp4"
  ]);

  const result = await ff.readFile("output.mp4");
  const blob = new Blob([new Uint8Array(result as Uint8Array)], { type: "video/mp4" });

  await ff.deleteFile("input");
  await ff.deleteFile("output.mp4");

  return blob;
}
