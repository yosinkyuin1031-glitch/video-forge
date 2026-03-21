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

export type EditorTool = "select" | "text" | "trim" | "silence" | "bgm" | "subtitle" | "export";
