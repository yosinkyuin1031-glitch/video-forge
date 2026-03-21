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

  // Use a named handler so we can remove it after exec completes
  const logHandler = ({ message }: { message: string }) => {
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
  };

  ff.on("log", logHandler);

  onProgress?.("無音区間を検出中...");

  try {
    await ff.exec([
      "-i", "input",
      "-af", `silencedetect=noise=${threshold}dB:d=${minDuration}`,
      "-f", "null", "-"
    ]);
  } finally {
    ff.off("log", logHandler);
    await ff.deleteFile("input").catch(() => {});
  }

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
  const durHandler = ({ message }: { message: string }) => {
    const durMatch = message.match(/Duration:\s*(\d+):(\d+):(\d+)\.(\d+)/);
    if (durMatch) {
      duration = parseInt(durMatch[1]) * 3600 + parseInt(durMatch[2]) * 60 + parseInt(durMatch[3]) + parseInt(durMatch[4]) / 100;
    }
  };

  ff.on("log", durHandler);
  try {
    await ff.exec(["-i", "input", "-f", "null", "-"]);
  } finally {
    ff.off("log", durHandler);
  }

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
    await ff.deleteFile("input").catch(() => {});
    throw new Error("カット後のコンテンツがありません");
  }

  // Create segments
  const partFiles: string[] = [];
  try {
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
    return new Blob([new Uint8Array(result as Uint8Array)], { type: "video/mp4" });
  } finally {
    // Cleanup all temp files
    for (const f of partFiles) {
      await ff.deleteFile(f).catch(() => {});
    }
    await ff.deleteFile("concat.txt").catch(() => {});
    await ff.deleteFile("input").catch(() => {});
    await ff.deleteFile("output.mp4").catch(() => {});
  }
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

  try {
    await ff.exec([
      "-i", "input",
      "-ss", startTime.toFixed(3),
      "-to", endTime.toFixed(3),
      "-c", "copy",
      "trimmed.mp4"
    ]);

    const result = await ff.readFile("trimmed.mp4");
    return new Blob([new Uint8Array(result as Uint8Array)], { type: "video/mp4" });
  } finally {
    await ff.deleteFile("input").catch(() => {});
    await ff.deleteFile("trimmed.mp4").catch(() => {});
  }
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

  try {
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
    return new Blob([new Uint8Array(result as Uint8Array)], { type: "video/mp4" });
  } finally {
    await ff.deleteFile("video").catch(() => {});
    await ff.deleteFile("bgm").catch(() => {});
    await ff.deleteFile("output.mp4").catch(() => {});
  }
}

export async function changeSpeed(
  file: File,
  speed: number,
  onProgress?: (msg: string) => void
): Promise<Blob> {
  const ff = await getFFmpeg();
  const data = await fetchFile(file);
  await ff.writeFile("input", data);

  onProgress?.(`速度を ${speed}x に変更中...`);

  // Build atempo filter chain (atempo only accepts 0.5 to 2.0)
  const videoFilter = `setpts=PTS/${speed}`;
  let audioFilter = "";
  if (speed > 2) {
    // Chain multiple atempo filters: e.g. 3x = atempo=2.0,atempo=1.5
    const filters: string[] = [];
    let remaining = speed;
    while (remaining > 2.0) {
      filters.push("atempo=2.0");
      remaining /= 2.0;
    }
    filters.push(`atempo=${remaining.toFixed(4)}`);
    audioFilter = filters.join(",");
  } else if (speed < 0.5) {
    // Chain multiple atempo filters: e.g. 0.25x = atempo=0.5,atempo=0.5
    const filters: string[] = [];
    let remaining = speed;
    while (remaining < 0.5) {
      filters.push("atempo=0.5");
      remaining /= 0.5;
    }
    filters.push(`atempo=${remaining.toFixed(4)}`);
    audioFilter = filters.join(",");
  } else {
    audioFilter = `atempo=${speed}`;
  }

  await ff.exec([
    "-i", "input",
    "-filter:v", videoFilter,
    "-filter:a", audioFilter,
    "speed_output.mp4"
  ]);

  try {
    const result = await ff.readFile("speed_output.mp4");
    return new Blob([new Uint8Array(result as Uint8Array)], { type: "video/mp4" });
  } finally {
    await ff.deleteFile("input").catch(() => {});
    await ff.deleteFile("speed_output.mp4").catch(() => {});
  }
}

export interface ClipSegment {
  id: string;
  startTime: number;
  endTime: number;
}

export async function splitAndReorder(
  file: File,
  clips: ClipSegment[],
  onProgress?: (msg: string) => void
): Promise<Blob> {
  if (clips.length === 0) throw new Error("クリップがありません");

  const ff = await getFFmpeg();
  const data = await fetchFile(file);
  await ff.writeFile("input", data);

  const partFiles: string[] = [];
  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i];
    const partName = `clip${i}.mp4`;
    onProgress?.(`クリップ ${i + 1}/${clips.length} を処理中...`);

    await ff.exec([
      "-i", "input",
      "-ss", clip.startTime.toFixed(3),
      "-to", clip.endTime.toFixed(3),
      "-c", "copy",
      "-avoid_negative_ts", "make_zero",
      partName
    ]);
    partFiles.push(partName);
  }

  onProgress?.("クリップを結合中...");
  const concatList = partFiles.map((f) => `file '${f}'`).join("\n");
  await ff.writeFile("clip_concat.txt", concatList);

  await ff.exec([
    "-f", "concat",
    "-safe", "0",
    "-i", "clip_concat.txt",
    "-c", "copy",
    "clip_output.mp4"
  ]);

  try {
    const result = await ff.readFile("clip_output.mp4");
    return new Blob([new Uint8Array(result as Uint8Array)], { type: "video/mp4" });
  } finally {
    for (const f of partFiles) {
      await ff.deleteFile(f).catch(() => {});
    }
    await ff.deleteFile("clip_concat.txt").catch(() => {});
    await ff.deleteFile("input").catch(() => {});
    await ff.deleteFile("clip_output.mp4").catch(() => {});
  }
}

export interface FilterOptions {
  brightness: number;  // 0-200, default 100
  contrast: number;    // 0-200, default 100
  saturation: number;  // 0-200, default 100
  temperature: number; // -100 to 100, default 0
  vignette: number;    // 0-100, default 0
}

export async function applyFilters(
  file: File,
  filters: FilterOptions,
  onProgress?: (msg: string) => void
): Promise<Blob> {
  const ff = await getFFmpeg();
  const data = await fetchFile(file);
  await ff.writeFile("input", data);

  onProgress?.("フィルターを適用中...");

  // Build FFmpeg filter string
  // brightness/contrast/saturation use eq filter (values normalized: eq expects -1 to 1 for brightness, 0-3 for contrast/saturation factor)
  const brightnessVal = (filters.brightness - 100) / 100; // -1 to 1
  const contrastVal = filters.contrast / 100;             // 0 to 2
  const saturationVal = filters.saturation / 100;         // 0 to 2

  let vfFilters = `eq=brightness=${brightnessVal.toFixed(3)}:contrast=${contrastVal.toFixed(3)}:saturation=${saturationVal.toFixed(3)}`;

  // Temperature: use hue to shift color (warm = slight red boost, cool = slight blue boost)
  if (filters.temperature !== 0) {
    // Use colortemperature-like approach with curves or colorchannelmixer
    const tempNorm = filters.temperature / 100;
    if (tempNorm > 0) {
      // Warm: boost red, reduce blue
      const r = (1 + tempNorm * 0.3).toFixed(3);
      const b = (1 - tempNorm * 0.3).toFixed(3);
      vfFilters += `,colorchannelmixer=rr=${r}:bb=${b}`;
    } else {
      // Cool: boost blue, reduce red
      const r = (1 + tempNorm * 0.3).toFixed(3);
      const b = (1 - tempNorm * 0.3).toFixed(3);
      vfFilters += `,colorchannelmixer=rr=${r}:bb=${b}`;
    }
  }

  // Vignette
  if (filters.vignette > 0) {
    const angle = (filters.vignette / 100) * (Math.PI / 4);
    vfFilters += `,vignette=angle=${angle.toFixed(4)}`;
  }

  await ff.exec([
    "-i", "input",
    "-vf", vfFilters,
    "-c:a", "copy",
    "filter_output.mp4"
  ]);

  try {
    const result = await ff.readFile("filter_output.mp4");
    return new Blob([new Uint8Array(result as Uint8Array)], { type: "video/mp4" });
  } finally {
    await ff.deleteFile("input").catch(() => {});
    await ff.deleteFile("filter_output.mp4").catch(() => {});
  }
}

export interface TransitionOptions {
  transitionInType: string;
  transitionInDuration: number;
  transitionOutType: string;
  transitionOutDuration: number;
  videoDuration: number;
}

export async function applyTransitions(
  file: File,
  options: TransitionOptions,
  onProgress?: (msg: string) => void
): Promise<Blob> {
  const ff = await getFFmpeg();
  const data = await fetchFile(file);
  await ff.writeFile("input", data);

  onProgress?.("トランジションを適用中...");

  const { transitionInType, transitionInDuration, transitionOutType, transitionOutDuration, videoDuration } = options;

  const vfParts: string[] = [];
  const afParts: string[] = [];

  // Fade in
  if (transitionInType === "fade") {
    vfParts.push(`fade=in:st=0:d=${transitionInDuration}`);
    afParts.push(`afade=t=in:ss=0:d=${transitionInDuration}`);
  }

  // Fade out
  if (transitionOutType === "fade") {
    const outStart = Math.max(0, videoDuration - transitionOutDuration);
    vfParts.push(`fade=out:st=${outStart.toFixed(3)}:d=${transitionOutDuration}`);
    afParts.push(`afade=t=out:st=${outStart.toFixed(3)}:d=${transitionOutDuration}`);
  }

  if (vfParts.length === 0) {
    // No transitions, just copy
    await ff.exec(["-i", "input", "-c", "copy", "transition_output.mp4"]);
  } else {
    const vfFilter = vfParts.join(",");
    if (afParts.length > 0) {
      const afFilter = afParts.join(",");
      await ff.exec([
        "-i", "input",
        "-vf", vfFilter,
        "-af", afFilter,
        "transition_output.mp4"
      ]);
    } else {
      await ff.exec([
        "-i", "input",
        "-vf", vfFilter,
        "-c:a", "copy",
        "transition_output.mp4"
      ]);
    }
  }

  try {
    const result = await ff.readFile("transition_output.mp4");
    return new Blob([new Uint8Array(result as Uint8Array)], { type: "video/mp4" });
  } finally {
    await ff.deleteFile("input").catch(() => {});
    await ff.deleteFile("transition_output.mp4").catch(() => {});
  }
}

export interface CollageInput {
  files: File[];
  layout: "2h" | "2v" | "3h" | "4grid" | "6grid" | "9grid";
  borderWidth: number;
  borderColor: string;
  outputDuration: number;
}

export async function createCollage(
  input: CollageInput,
  onProgress?: (msg: string) => void
): Promise<Blob> {
  const ff = await getFFmpeg();

  const { files, layout, outputDuration } = input;

  // Write all input files
  for (let i = 0; i < files.length; i++) {
    onProgress?.(`入力ファイル ${i + 1}/${files.length} を読み込み中...`);
    await ff.writeFile(`collage_in${i}`, await fetchFile(files[i]));
  }

  // Determine grid dimensions and filter
  let outW = 1920;
  let outH = 1080;
  let filterComplex = "";

  // Scale each input to appropriate cell size, then arrange
  if (layout === "2h") {
    // 2 horizontal: side by side 960x1080 each
    const cellW = 960;
    const cellH = 1080;
    outW = 1920; outH = 1080;
    filterComplex = `[0:v]scale=${cellW}:${cellH}:force_original_aspect_ratio=decrease,pad=${cellW}:${cellH}:(ow-iw)/2:(oh-ih)/2:black[v0];[1:v]scale=${cellW}:${cellH}:force_original_aspect_ratio=decrease,pad=${cellW}:${cellH}:(ow-iw)/2:(oh-ih)/2:black[v1];[v0][v1]hstack=inputs=2[out]`;
  } else if (layout === "2v") {
    // 2 vertical: stacked 1920x540 each
    const cellW = 1920;
    const cellH = 540;
    outW = 1920; outH = 1080;
    filterComplex = `[0:v]scale=${cellW}:${cellH}:force_original_aspect_ratio=decrease,pad=${cellW}:${cellH}:(ow-iw)/2:(oh-ih)/2:black[v0];[1:v]scale=${cellW}:${cellH}:force_original_aspect_ratio=decrease,pad=${cellW}:${cellH}:(ow-iw)/2:(oh-ih)/2:black[v1];[v0][v1]vstack=inputs=2[out]`;
  } else if (layout === "3h") {
    // 3 horizontal: 640x1080 each
    const cellW = 640;
    const cellH = 1080;
    outW = 1920; outH = 1080;
    filterComplex = `[0:v]scale=${cellW}:${cellH}:force_original_aspect_ratio=decrease,pad=${cellW}:${cellH}:(ow-iw)/2:(oh-ih)/2:black[v0];[1:v]scale=${cellW}:${cellH}:force_original_aspect_ratio=decrease,pad=${cellW}:${cellH}:(ow-iw)/2:(oh-ih)/2:black[v1];[2:v]scale=${cellW}:${cellH}:force_original_aspect_ratio=decrease,pad=${cellW}:${cellH}:(ow-iw)/2:(oh-ih)/2:black[v2];[v0][v1][v2]hstack=inputs=3[out]`;
  } else if (layout === "4grid") {
    // 2x2 grid: 960x540 each
    const cellW = 960;
    const cellH = 540;
    outW = 1920; outH = 1080;
    filterComplex = `[0:v]scale=${cellW}:${cellH}:force_original_aspect_ratio=decrease,pad=${cellW}:${cellH}:(ow-iw)/2:(oh-ih)/2:black[v0];[1:v]scale=${cellW}:${cellH}:force_original_aspect_ratio=decrease,pad=${cellW}:${cellH}:(ow-iw)/2:(oh-ih)/2:black[v1];[2:v]scale=${cellW}:${cellH}:force_original_aspect_ratio=decrease,pad=${cellW}:${cellH}:(ow-iw)/2:(oh-ih)/2:black[v2];[3:v]scale=${cellW}:${cellH}:force_original_aspect_ratio=decrease,pad=${cellW}:${cellH}:(ow-iw)/2:(oh-ih)/2:black[v3];[v0][v1]hstack[top];[v2][v3]hstack[bottom];[top][bottom]vstack[out]`;
  } else if (layout === "6grid") {
    // 2x3 grid: 640x540 each
    const cellW = 640;
    const cellH = 540;
    outW = 1920; outH = 1080;
    const scales = Array.from({ length: 6 }, (_, i) =>
      `[${i}:v]scale=${cellW}:${cellH}:force_original_aspect_ratio=decrease,pad=${cellW}:${cellH}:(ow-iw)/2:(oh-ih)/2:black[v${i}]`
    ).join(";");
    filterComplex = `${scales};[v0][v1][v2]hstack=inputs=3[top];[v3][v4][v5]hstack=inputs=3[bottom];[top][bottom]vstack[out]`;
  } else if (layout === "9grid") {
    // 3x3 grid: 640x360 each
    const cellW = 640;
    const cellH = 360;
    outW = 1920; outH = 1080;
    const scales = Array.from({ length: 9 }, (_, i) =>
      `[${i}:v]scale=${cellW}:${cellH}:force_original_aspect_ratio=decrease,pad=${cellW}:${cellH}:(ow-iw)/2:(oh-ih)/2:black[v${i}]`
    ).join(";");
    filterComplex = `${scales};[v0][v1][v2]hstack=inputs=3[r0];[v3][v4][v5]hstack=inputs=3[r1];[v6][v7][v8]hstack=inputs=3[r2];[r0][r1][r2]vstack=inputs=3[out]`;
  }

  // Build input args
  const inputArgs: string[] = [];
  for (let i = 0; i < files.length; i++) {
    inputArgs.push("-stream_loop", "-1", "-t", outputDuration.toString(), "-i", `collage_in${i}`);
  }

  // Build audio mix filter
  const audioInputs = files.map((_, i) => `[${i}:a]`).join("");
  const fullFilter = `${filterComplex};${audioInputs}amix=inputs=${files.length}:duration=first[aout]`;

  onProgress?.("コラージュを作成中...");

  await ff.exec([
    ...inputArgs,
    "-filter_complex", fullFilter,
    "-map", "[out]",
    "-map", "[aout]",
    "-t", outputDuration.toString(),
    "-s", `${outW}x${outH}`,
    "-c:v", "libx264",
    "-c:a", "aac",
    "-preset", "ultrafast",
    "collage_out.mp4"
  ]);

  try {
    const result = await ff.readFile("collage_out.mp4");
    return new Blob([new Uint8Array(result as Uint8Array)], { type: "video/mp4" });
  } finally {
    for (let i = 0; i < files.length; i++) {
      await ff.deleteFile(`collage_in${i}`).catch(() => {});
    }
    await ff.deleteFile("collage_out.mp4").catch(() => {});
  }
}

export interface SlideshowInput {
  images: { file: File; duration: number }[];
  transition: "none" | "fade" | "crossfade";
  transitionDuration: number;
}

export async function createSlideshow(
  input: SlideshowInput,
  onProgress?: (msg: string) => void
): Promise<Blob> {
  const ff = await getFFmpeg();

  const { images, transition, transitionDuration } = input;

  for (let i = 0; i < images.length; i++) {
    onProgress?.(`画像 ${i + 1}/${images.length} を読み込み中...`);
    await ff.writeFile(`slide_in${i}`, await fetchFile(images[i].file));
  }

  onProgress?.("スライドショーを作成中...");

  // Build input args: each image is a looped still
  const inputArgs: string[] = [];
  for (let i = 0; i < images.length; i++) {
    inputArgs.push("-loop", "1", "-t", images[i].duration.toString(), "-i", `slide_in${i}`);
  }

  const scaleFilter = "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black,setsar=1";

  let filterComplex = "";
  let mapLabel = "";

  if (transition === "none" || images.length === 1) {
    // Simple concat
    const scaleParts = images.map((_, i) => `[${i}:v]${scaleFilter}[sv${i}]`).join(";");
    const concatInputs = images.map((_, i) => `[sv${i}]`).join("");
    filterComplex = `${scaleParts};${concatInputs}concat=n=${images.length}:v=1:a=0[out]`;
    mapLabel = "[out]";
  } else {
    // xfade transitions between images
    const scaleParts = images.map((_, i) => `[${i}:v]${scaleFilter},fps=25[sv${i}]`).join(";");
    filterComplex = scaleParts;

    // Chain xfade between consecutive images
    // xfade offset = cumulative duration of previous images minus transitionDuration overlap
    let currentLabel = "sv0";
    let cumulativeDuration = images[0].duration;

    for (let i = 1; i < images.length; i++) {
      const offset = Math.max(0, cumulativeDuration - transitionDuration);
      const nextLabel = i === images.length - 1 ? "out" : `xf${i}`;
      const xfadeType = transition === "crossfade" ? "fade" : "fade";
      filterComplex += `;[${currentLabel}][sv${i}]xfade=transition=${xfadeType}:duration=${transitionDuration}:offset=${offset.toFixed(3)}[${nextLabel}]`;
      currentLabel = nextLabel;
      cumulativeDuration += images[i].duration - transitionDuration;
    }
    mapLabel = "[out]";
  }

  await ff.exec([
    ...inputArgs,
    "-filter_complex", filterComplex,
    "-map", mapLabel,
    "-an",
    "-c:v", "libx264",
    "-preset", "ultrafast",
    "-pix_fmt", "yuv420p",
    "slideshow_out.mp4"
  ]);

  try {
    const result = await ff.readFile("slideshow_out.mp4");
    return new Blob([new Uint8Array(result as Uint8Array)], { type: "video/mp4" });
  } finally {
    for (let i = 0; i < images.length; i++) {
      await ff.deleteFile(`slide_in${i}`).catch(() => {});
    }
    await ff.deleteFile("slideshow_out.mp4").catch(() => {});
  }
}

export interface PipInput {
  mainFile: File;
  pipFile: File;
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  size: number; // percentage of main video width (15-50)
  borderWidth: number;
  borderColor: string;
  startTime: number;
  endTime: number;
}

export async function applyPip(
  input: PipInput,
  onProgress?: (msg: string) => void
): Promise<Blob> {
  const ff = await getFFmpeg();

  await ff.writeFile("pip_main", await fetchFile(input.mainFile));
  await ff.writeFile("pip_sub", await fetchFile(input.pipFile));

  onProgress?.("ワイプを適用中...");

  const { position, size, startTime, endTime, borderWidth, borderColor } = input;
  const sizeRatio = size / 100;

  // Scale pip video relative to main video width
  let scaleFilter = `[1:v]scale=iw*0:ih*0[pip_scaled]`; // placeholder
  // Use expression: pip width = main_width * sizeRatio
  const pipW = `(W*${sizeRatio.toFixed(3)})`;
  scaleFilter = `[1:v]scale=${pipW}:-1[pip_scaled]`;

  // Determine overlay position
  let x = "10";
  let y = "10";
  if (position === "top-right") {
    x = `W-w-10`;
    y = "10";
  } else if (position === "bottom-left") {
    x = "10";
    y = `H-h-10`;
  } else if (position === "bottom-right") {
    x = `W-w-10`;
    y = `H-h-10`;
  }

  let filterComplex = "";
  if (borderWidth > 0) {
    // Add border by padding the pip video
    filterComplex = `${scaleFilter};[pip_scaled]pad=iw+${borderWidth * 2}:ih+${borderWidth * 2}:${borderWidth}:${borderWidth}:${borderColor}[pip_bordered];[0:v][pip_bordered]overlay=${x}:${y}:enable='between(t,${startTime},${endTime})'[out]`;
  } else {
    filterComplex = `${scaleFilter};[0:v][pip_scaled]overlay=${x}:${y}:enable='between(t,${startTime},${endTime})'[out]`;
  }

  await ff.exec([
    "-i", "pip_main",
    "-i", "pip_sub",
    "-filter_complex", filterComplex,
    "-map", "[out]",
    "-map", "0:a?",
    "-c:v", "libx264",
    "-c:a", "aac",
    "-preset", "ultrafast",
    "pip_out.mp4"
  ]);

  try {
    const result = await ff.readFile("pip_out.mp4");
    return new Blob([new Uint8Array(result as Uint8Array)], { type: "video/mp4" });
  } finally {
    await ff.deleteFile("pip_main").catch(() => {});
    await ff.deleteFile("pip_sub").catch(() => {});
    await ff.deleteFile("pip_out.mp4").catch(() => {});
  }
}

export interface GifExportInput {
  file: File;
  startTime: number;
  endTime: number;
  fps: number;
  width: number;
}

export async function exportGif(
  input: GifExportInput,
  onProgress?: (msg: string) => void
): Promise<Blob> {
  const ff = await getFFmpeg();

  await ff.writeFile("gif_input", await fetchFile(input.file));

  onProgress?.("GIFを作成中...");

  const { startTime, endTime, fps, width } = input;
  const duration = endTime - startTime;

  const vfFilter = `fps=${fps},scale=${width}:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`;

  await ff.exec([
    "-ss", startTime.toFixed(3),
    "-t", duration.toFixed(3),
    "-i", "gif_input",
    "-vf", vfFilter,
    "-loop", "0",
    "output.gif"
  ]);

  try {
    const result = await ff.readFile("output.gif");
    return new Blob([new Uint8Array(result as Uint8Array)], { type: "image/gif" });
  } finally {
    await ff.deleteFile("gif_input").catch(() => {});
    await ff.deleteFile("output.gif").catch(() => {});
  }
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

  try {
    const result = await ff.readFile("output.mp4");
    return new Blob([new Uint8Array(result as Uint8Array)], { type: "video/mp4" });
  } finally {
    await ff.deleteFile("input").catch(() => {});
    await ff.deleteFile("output.mp4").catch(() => {});
  }
}

// ===== MOSAIC / BLUR =====
export interface MosaicAreaInput {
  x: number; // 0-100 percentage
  y: number; // 0-100 percentage
  width: number; // 0-100 percentage
  height: number; // 0-100 percentage
  type: "mosaic" | "blur" | "black";
  intensity: number;
  startTime: number;
  endTime: number;
}

export async function applyMosaicAreas(
  file: File,
  areas: MosaicAreaInput[],
  videoWidth: number,
  videoHeight: number,
  onProgress?: (msg: string) => void
): Promise<Blob> {
  if (areas.length === 0) throw new Error("モザイクエリアがありません");

  const ff = await getFFmpeg();
  await ff.writeFile("mosaic_in", await fetchFile(file));

  onProgress?.("モザイク/ぼかしを適用中...");

  // Build filter_complex for each area
  // We chain overlays one after another
  let filterParts: string[] = [];
  let prevLabel = "0:v";

  for (let i = 0; i < areas.length; i++) {
    const area = areas[i];
    const px = Math.round((area.x / 100) * videoWidth);
    const py = Math.round((area.y / 100) * videoHeight);
    const pw = Math.max(4, Math.round((area.width / 100) * videoWidth));
    const ph = Math.max(4, Math.round((area.height / 100) * videoHeight));
    const enable = `between(t,${area.startTime},${area.endTime})`;
    const outLabel = i === areas.length - 1 ? "vout" : `v${i}`;

    if (area.type === "black") {
      filterParts.push(`[${prevLabel}]drawbox=x=${px}:y=${py}:w=${pw}:h=${ph}:color=black@1:t=fill:enable='${enable}'[${outLabel}]`);
    } else if (area.type === "blur") {
      const blurAmount = Math.max(1, area.intensity);
      filterParts.push(
        `[${prevLabel}]split[base${i}][blur_src${i}];` +
        `[blur_src${i}]crop=${pw}:${ph}:${px}:${py},boxblur=${blurAmount}[blurred${i}];` +
        `[base${i}][blurred${i}]overlay=${px}:${py}:enable='${enable}'[${outLabel}]`
      );
    } else {
      // mosaic: scale down then up with nearest neighbor
      const blockSize = Math.max(2, area.intensity);
      const scaledW = Math.max(1, Math.round(pw / blockSize));
      const scaledH = Math.max(1, Math.round(ph / blockSize));
      filterParts.push(
        `[${prevLabel}]split[base${i}][mosaic_src${i}];` +
        `[mosaic_src${i}]crop=${pw}:${ph}:${px}:${py},scale=${scaledW}:${scaledH},scale=${pw}:${ph}:flags=neighbor[pixelated${i}];` +
        `[base${i}][pixelated${i}]overlay=${px}:${py}:enable='${enable}'[${outLabel}]`
      );
    }
    prevLabel = outLabel;
  }

  const filterComplex = filterParts.join(";");

  await ff.exec([
    "-i", "mosaic_in",
    "-filter_complex", filterComplex,
    "-map", "[vout]",
    "-map", "0:a?",
    "-c:v", "libx264",
    "-c:a", "copy",
    "-preset", "ultrafast",
    "mosaic_out.mp4"
  ]);

  try {
    const result = await ff.readFile("mosaic_out.mp4");
    return new Blob([new Uint8Array(result as Uint8Array)], { type: "video/mp4" });
  } finally {
    await ff.deleteFile("mosaic_in").catch(() => {});
    await ff.deleteFile("mosaic_out.mp4").catch(() => {});
  }
}

// ===== CHROMA KEY =====
export interface ChromaKeyInput {
  videoFile: File;
  bgFile: File;
  bgIsImage: boolean;
  keyColor: string; // hex e.g. "#00ff00"
  similarity: number; // 0.01-0.5
  blend: number; // 0-1
}

// ===== AUDIO EXTRACTION FOR WHISPER =====
export async function extractAudio(file: File, onProgress?: (msg: string) => void): Promise<Blob> {
  const ff = await getFFmpeg();
  await ff.writeFile("input", await fetchFile(file));
  onProgress?.("音声を抽出中...");
  await ff.exec([
    "-i", "input",
    "-vn",
    "-acodec", "pcm_s16le",
    "-ar", "16000",
    "-ac", "1",
    "audio.wav"
  ]);
  try {
    const result = await ff.readFile("audio.wav");
    return new Blob([new Uint8Array(result as Uint8Array)], { type: "audio/wav" });
  } finally {
    await ff.deleteFile("input").catch(() => {});
    await ff.deleteFile("audio.wav").catch(() => {});
  }
}

export async function applyChromaKey(
  input: ChromaKeyInput,
  onProgress?: (msg: string) => void
): Promise<Blob> {
  const ff = await getFFmpeg();

  await ff.writeFile("ck_video", await fetchFile(input.videoFile));
  await ff.writeFile("ck_bg", await fetchFile(input.bgFile));

  onProgress?.("クロマキー合成中...");

  // Remove # from hex color
  const color = input.keyColor.replace("#", "0x");

  // Build filter: colorkey removes the key color from foreground, then overlay on background
  const filterComplex = `[0:v]colorkey=${color}:${input.similarity.toFixed(3)}:${input.blend.toFixed(3)}[fg];[1:v][fg]overlay[out]`;

  const inputArgs: string[] = [];
  if (input.bgIsImage) {
    inputArgs.push("-loop", "1");
  }

  await ff.exec([
    "-i", "ck_video",
    ...inputArgs,
    "-i", "ck_bg",
    "-filter_complex", filterComplex,
    "-map", "[out]",
    "-map", "0:a?",
    "-c:v", "libx264",
    "-c:a", "copy",
    "-preset", "ultrafast",
    "-shortest",
    "ck_out.mp4"
  ]);

  try {
    const result = await ff.readFile("ck_out.mp4");
    return new Blob([new Uint8Array(result as Uint8Array)], { type: "video/mp4" });
  } finally {
    await ff.deleteFile("ck_video").catch(() => {});
    await ff.deleteFile("ck_bg").catch(() => {});
    await ff.deleteFile("ck_out.mp4").catch(() => {});
  }
}

// ===== LOGO / WATERMARK =====
export interface LogoInput {
  videoFile: File;
  logoFile: File;
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center";
  size: number;    // 5-30, percentage of video width
  opacity: number; // 0-100
  margin: number;  // pixels
}

export async function applyLogo(
  input: LogoInput,
  onProgress?: (msg: string) => void
): Promise<Blob> {
  const ff = await getFFmpeg();

  await ff.writeFile("logo_video", await fetchFile(input.videoFile));
  await ff.writeFile("logo_img", await fetchFile(input.logoFile));

  onProgress?.("ロゴを合成中...");

  const sizeRatio = (input.size / 100).toFixed(3);
  const alpha = (input.opacity / 100).toFixed(3);
  const m = input.margin;

  let x: string;
  let y: string;
  switch (input.position) {
    case "top-left":
      x = `${m}`; y = `${m}`; break;
    case "top-right":
      x = `W-w-${m}`; y = `${m}`; break;
    case "bottom-left":
      x = `${m}`; y = `H-h-${m}`; break;
    case "center":
      x = `(W-w)/2`; y = `(H-h)/2`; break;
    case "bottom-right":
    default:
      x = `W-w-${m}`; y = `H-h-${m}`; break;
  }

  const filterComplex =
    `[1:v]scale=iw*W*${sizeRatio}/iw:-1,format=rgba,` +
    `colorchannelmixer=aa=${alpha}[logo];` +
    `[0:v][logo]overlay=${x}:${y}[out]`;

  await ff.exec([
    "-i", "logo_video",
    "-i", "logo_img",
    "-filter_complex", filterComplex,
    "-map", "[out]",
    "-map", "0:a?",
    "-c:v", "libx264",
    "-c:a", "copy",
    "-preset", "ultrafast",
    "logo_out.mp4"
  ]);

  try {
    const result = await ff.readFile("logo_out.mp4");
    return new Blob([new Uint8Array(result as Uint8Array)], { type: "video/mp4" });
  } finally {
    await ff.deleteFile("logo_video").catch(() => {});
    await ff.deleteFile("logo_img").catch(() => {});
    await ff.deleteFile("logo_out.mp4").catch(() => {});
  }
}
