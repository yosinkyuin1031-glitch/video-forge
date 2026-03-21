export interface TextOverlay {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  bgColor: string;
  startTime: number;
  endTime: number;
  bold: boolean;
  italic: boolean;
  outlineColor: string;
  outlineWidth: number;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
}

export const FONT_OPTIONS = [
  { value: "sans-serif", label: "ゴシック" },
  { value: "serif", label: "明朝体" },
  { value: "'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif", label: "ヒラギノ角ゴ" },
  { value: "'Hiragino Mincho ProN', 'Noto Serif JP', serif", label: "ヒラギノ明朝" },
  { value: "'Arial Black', 'Impact', sans-serif", label: "インパクト" },
  { value: "'Courier New', monospace", label: "等幅" },
  { value: "'Comic Sans MS', 'Chalkboard SE', cursive", label: "手書き風" },
  { value: "'Georgia', 'Times New Roman', serif", label: "エレガント" },
] as const;

export interface SubtitleEntry {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
}

export type AspectRatio = "16:9" | "9:16" | "1:1" | "4:5";

export interface AspectRatioPreset {
  label: string;
  platform: string;
  ratio: AspectRatio;
  width: number;
  height: number;
}

export const ASPECT_PRESETS: AspectRatioPreset[] = [
  { label: "YouTube", platform: "YouTube", ratio: "16:9", width: 1920, height: 1080 },
  { label: "TikTok / Reels", platform: "TikTok", ratio: "9:16", width: 1080, height: 1920 },
  { label: "Instagram投稿", platform: "Instagram", ratio: "1:1", width: 1080, height: 1080 },
  { label: "Instagram広告", platform: "Instagram", ratio: "4:5", width: 1080, height: 1350 },
];

export type EditorTool = "select" | "text" | "trim" | "silence" | "bgm" | "subtitle" | "export" | "speed" | "split" | "filter" | "transition" | "sticker" | "collage" | "slideshow" | "pip";

export type CollageLayout = "2h" | "2v" | "3h" | "4grid" | "6grid" | "9grid";

export interface CollageItem {
  id: string;
  file: File | null;
  url: string;
}

export interface CollageSettings {
  layout: CollageLayout;
  items: CollageItem[];
  borderWidth: number; // 0-10px
  borderColor: string;
  outputDuration: number; // seconds
}

export interface SlideshowImage {
  id: string;
  file: File;
  url: string;
  duration: number; // seconds per image, default 3
}

export interface SlideshowSettings {
  images: SlideshowImage[];
  transition: "none" | "fade" | "crossfade";
  transitionDuration: number; // 0.5-2 seconds
}

export type PipPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";

export interface PipSettings {
  file: File | null;
  url: string;
  position: PipPosition;
  size: number; // 15-50 percentage of main video width
  borderRadius: number; // 0-50 for rounded corners
  borderWidth: number;
  borderColor: string;
  startTime: number;
  endTime: number;
}

export type TransitionType = "none" | "fade" | "crossfade" | "wipe-left" | "wipe-right" | "zoom";

export interface TransitionSetting {
  type: TransitionType;
  duration: number; // 0.3 - 2.0 seconds
}

export interface StickerOverlay {
  id: string;
  emoji: string;
  x: number; // 0-100 percentage
  y: number; // 0-100 percentage
  size: number; // 24-200 px
  rotation: number; // 0-360 degrees
  startTime: number;
  endTime: number;
  opacity: number; // 0-1
  animation: "none" | "bounce" | "pulse" | "spin" | "float";
}

export interface ClipMarker {
  id: string;
  startTime: number;
  endTime: number;
}

export interface FilterSettings {
  brightness: number;  // 0-200, default 100
  contrast: number;    // 0-200, default 100
  saturation: number;  // 0-200, default 100
  temperature: number; // -100 to 100, default 0
  vignette: number;    // 0-100, default 0
}
