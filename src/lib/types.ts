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
}

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
