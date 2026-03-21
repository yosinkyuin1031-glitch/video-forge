"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { TextOverlay, SubtitleEntry, EditorTool, ASPECT_PRESETS, FONT_OPTIONS, ClipMarker, FilterSettings, TransitionSetting, TransitionType, StickerOverlay, CollageLayout, CollageItem, CollageSettings, SlideshowImage, SlideshowSettings, PipSettings } from "@/lib/types";
import { detectSilence, removeSilence, trimVideo, addBgm, exportWithAspectRatio, SilentSegment, changeSpeed, splitAndReorder, applyFilters, applyTransitions, createCollage, createSlideshow, applyPip, exportGif } from "@/lib/ffmpeg-utils";

// ===== UNDO/REDO HISTORY =====
interface HistoryState {
  textOverlays: TextOverlay[];
  subtitles: SubtitleEntry[];
  silentSegments: SilentSegment[];
  videoUrl: string;
}

export default function VideoEditor() {
  // Video state
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Tool state
  const [activeTool, setActiveTool] = useState<EditorTool>("select");
  const [processing, setProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");

  // Silence detection
  const [silentSegments, setSilentSegments] = useState<SilentSegment[]>([]);
  const [silenceThreshold, setSilenceThreshold] = useState(-35);
  const [silenceMinDuration, setSilenceMinDuration] = useState(0.5);

  // Trim
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);

  // Text overlays
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  // Subtitles
  const [subtitles, setSubtitles] = useState<SubtitleEntry[]>([]);
  const [isListening, setIsListening] = useState(false);

  // BGM
  const [bgmFile, setBgmFile] = useState<File | null>(null);
  const [bgmVolume, setBgmVolume] = useState(0.3);

  // Export
  const [selectedPresetIdx, setSelectedPresetIdx] = useState(0);

  // FFmpeg loading
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);
  const [ffmpegLoading, setFfmpegLoading] = useState(false);

  // ===== UNDO/REDO =====
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isApplyingHistory = useRef(false);

  // Push to history when key state changes
  const pushHistory = useCallback((state: HistoryState) => {
    if (isApplyingHistory.current) return;
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(state);
      // Limit to 50 states
      if (newHistory.length > 50) newHistory.shift();
      return newHistory;
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 49));
  }, [historyIndex]);

  const handleUndo = useCallback(() => {
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    const state = history[newIndex];
    if (!state) return;
    isApplyingHistory.current = true;
    setTextOverlays(state.textOverlays);
    setSubtitles(state.subtitles);
    setSilentSegments(state.silentSegments);
    if (state.videoUrl !== videoUrl) setVideoUrl(state.videoUrl);
    setHistoryIndex(newIndex);
    isApplyingHistory.current = false;
  }, [history, historyIndex, videoUrl]);

  const handleRedo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    const state = history[newIndex];
    if (!state) return;
    isApplyingHistory.current = true;
    setTextOverlays(state.textOverlays);
    setSubtitles(state.subtitles);
    setSilentSegments(state.silentSegments);
    if (state.videoUrl !== videoUrl) setVideoUrl(state.videoUrl);
    setHistoryIndex(newIndex);
    isApplyingHistory.current = false;
  }, [history, historyIndex, videoUrl]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo]);

  // ===== SPEED =====
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const SPEED_PRESETS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];

  const handleSpeedPreview = useCallback((speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  }, []);

  const handleApplySpeed = async () => {
    if (!videoFile || playbackSpeed === 1) return;
    await ensureFFmpeg();
    setProcessing(true);
    try {
      const blob = await changeSpeed(videoFile, playbackSpeed, setProgressMsg);
      const newFile = new File([blob], "speed.mp4", { type: "video/mp4" });
      const newUrl = URL.createObjectURL(blob);
      setVideoFile(newFile);
      setVideoUrl(newUrl);
      setPlaybackSpeed(1);
      pushHistory({ textOverlays, subtitles, silentSegments, videoUrl: newUrl });
      setProgressMsg("速度変更完了!");
    } catch (e) {
      setProgressMsg("速度変更に失敗しました");
    }
    setProcessing(false);
  };

  // ===== SPLIT & REORDER =====
  const [clipMarkers, setClipMarkers] = useState<ClipMarker[]>([]);

  const handleSplitAtCurrent = useCallback(() => {
    if (!duration) return;
    const time = currentTime;
    // If no clips yet, create initial full clip
    if (clipMarkers.length === 0) {
      const firstId = `clip-${Date.now()}-1`;
      const secondId = `clip-${Date.now()}-2`;
      setClipMarkers([
        { id: firstId, startTime: 0, endTime: time },
        { id: secondId, startTime: time, endTime: duration },
      ]);
    } else {
      // Find which clip contains current time and split it
      setClipMarkers((prev) => {
        const newClips: ClipMarker[] = [];
        for (const clip of prev) {
          if (time > clip.startTime && time < clip.endTime) {
            newClips.push({ id: `clip-${Date.now()}-a`, startTime: clip.startTime, endTime: time });
            newClips.push({ id: `clip-${Date.now()}-b`, startTime: time, endTime: clip.endTime });
          } else {
            newClips.push(clip);
          }
        }
        return newClips;
      });
    }
  }, [currentTime, duration, clipMarkers.length]);

  const handleDeleteClip = (id: string) => {
    setClipMarkers((prev) => prev.filter((c) => c.id !== id));
  };

  const handleMoveClipUp = (index: number) => {
    if (index === 0) return;
    setClipMarkers((prev) => {
      const arr = [...prev];
      [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
      return arr;
    });
  };

  const handleMoveClipDown = (index: number) => {
    setClipMarkers((prev) => {
      if (index >= prev.length - 1) return prev;
      const arr = [...prev];
      [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
      return arr;
    });
  };

  const handleResetClips = () => {
    setClipMarkers([]);
  };

  const handleApplySplit = async () => {
    if (!videoFile || clipMarkers.length === 0) return;
    await ensureFFmpeg();
    setProcessing(true);
    try {
      const blob = await splitAndReorder(videoFile, clipMarkers, setProgressMsg);
      const newFile = new File([blob], "split.mp4", { type: "video/mp4" });
      const newUrl = URL.createObjectURL(blob);
      setVideoFile(newFile);
      setVideoUrl(newUrl);
      setClipMarkers([]);
      pushHistory({ textOverlays, subtitles, silentSegments, videoUrl: newUrl });
      setProgressMsg("分割・並び替え完了!");
    } catch (e) {
      setProgressMsg("分割処理に失敗しました");
    }
    setProcessing(false);
  };

  // ===== FILTERS =====
  const DEFAULT_FILTERS: FilterSettings = {
    brightness: 100,
    contrast: 100,
    saturation: 100,
    temperature: 0,
    vignette: 0,
  };

  const [filterSettings, setFilterSettings] = useState<FilterSettings>({ ...DEFAULT_FILTERS });

  const FILTER_PRESETS = [
    { label: "オリジナル", settings: { ...DEFAULT_FILTERS } },
    { label: "暖かい", settings: { brightness: 105, contrast: 105, saturation: 110, temperature: 50, vignette: 10 } },
    { label: "クール", settings: { brightness: 100, contrast: 110, saturation: 90, temperature: -50, vignette: 15 } },
    { label: "ビンテージ", settings: { brightness: 95, contrast: 90, saturation: 75, temperature: 30, vignette: 40 } },
    { label: "モノクロ", settings: { brightness: 100, contrast: 120, saturation: 0, temperature: 0, vignette: 20 } },
    { label: "鮮やか", settings: { brightness: 105, contrast: 115, saturation: 150, temperature: 0, vignette: 0 } },
  ];

  const handleApplyFiltersExport = async () => {
    if (!videoFile) return;
    await ensureFFmpeg();
    setProcessing(true);
    try {
      const blob = await applyFilters(videoFile, filterSettings, setProgressMsg);
      const newFile = new File([blob], "filtered.mp4", { type: "video/mp4" });
      const newUrl = URL.createObjectURL(blob);
      setVideoFile(newFile);
      setVideoUrl(newUrl);
      pushHistory({ textOverlays, subtitles, silentSegments, videoUrl: newUrl });
      setProgressMsg("フィルター適用完了!");
    } catch (e) {
      setProgressMsg("フィルター適用に失敗しました");
    }
    setProcessing(false);
  };

  // ===== TRANSITIONS =====
  const DEFAULT_TRANSITION: TransitionSetting = { type: "none", duration: 0.5 };
  const [transitionIn, setTransitionIn] = useState<TransitionSetting>({ ...DEFAULT_TRANSITION });
  const [transitionOut, setTransitionOut] = useState<TransitionSetting>({ ...DEFAULT_TRANSITION });
  const [clipTransitions, setClipTransitions] = useState<TransitionSetting[]>([]);

  const TRANSITION_TYPES: { value: TransitionType; label: string; icon: string }[] = [
    { value: "none", label: "なし", icon: "✕" },
    { value: "fade", label: "フェード", icon: "◑" },
    { value: "crossfade", label: "クロスフェード", icon: "⇌" },
    { value: "wipe-left", label: "ワイプ左", icon: "◀" },
    { value: "wipe-right", label: "ワイプ右", icon: "▶" },
    { value: "zoom", label: "ズーム", icon: "⊕" },
  ];

  const handleApplyTransitions = async () => {
    if (!videoFile) return;
    await ensureFFmpeg();
    setProcessing(true);
    try {
      const blob = await applyTransitions(videoFile, {
        transitionInType: transitionIn.type,
        transitionInDuration: transitionIn.duration,
        transitionOutType: transitionOut.type,
        transitionOutDuration: transitionOut.duration,
        videoDuration: duration,
      }, setProgressMsg);
      const newFile = new File([blob], "transition.mp4", { type: "video/mp4" });
      const newUrl = URL.createObjectURL(blob);
      setVideoFile(newFile);
      setVideoUrl(newUrl);
      pushHistory({ textOverlays, subtitles, silentSegments, videoUrl: newUrl });
      setProgressMsg("トランジション適用完了!");
    } catch (e) {
      setProgressMsg("トランジション適用に失敗しました");
    }
    setProcessing(false);
  };

  // Sync clipTransitions array length to clipMarkers count of boundaries
  useEffect(() => {
    if (clipMarkers.length < 2) {
      setClipTransitions([]);
      return;
    }
    const boundaryCount = clipMarkers.length - 1;
    setClipTransitions((prev) => {
      if (prev.length === boundaryCount) return prev;
      const next: TransitionSetting[] = [];
      for (let i = 0; i < boundaryCount; i++) {
        next.push(prev[i] ?? { type: "none", duration: 0.5 });
      }
      return next;
    });
  }, [clipMarkers.length]);

  // ===== STICKERS =====
  const STICKER_CATEGORIES = [
    {
      label: "リアクション",
      emojis: ["😀","😂","🤣","😍","🥰","😎","🤩","😱","😡","🥺","👍","👏","🙌","💪","🔥","❤️","💯","⭐","🎉","🎊"],
    },
    {
      label: "矢印・記号",
      emojis: ["➡️","⬅️","⬆️","⬇️","❗","❓","⭕","❌","✅","⚠️","💡","🔔","📌","🏷️","💬","🗯️","💭","📢","🎯","🔍"],
    },
    {
      label: "装飾",
      emojis: ["✨","💫","⚡","🌟","💥","💢","💦","🌈","🎵","🎶","🌸","🍀","🦋","🎀","👑","💎","🏆","🎁","🎈","🎗️"],
    },
    {
      label: "SNS",
      emojis: ["📱","💻","🖥️","📷","🎬","🎥","🎤","🎧","📺","📡","▶️","⏸️","⏹️","🔴","🟢","🔵","🟡","⚪","⚫","🟣"],
    },
  ];

  const [stickers, setStickers] = useState<StickerOverlay[]>([]);
  const [editingStickerId, setEditingStickerId] = useState<string | null>(null);
  const [activeStickerCategory, setActiveStickerCategory] = useState(0);

  const addSticker = (emoji: string) => {
    const newSticker: StickerOverlay = {
      id: `sticker-${Date.now()}`,
      emoji,
      x: 50,
      y: 50,
      size: 64,
      rotation: 0,
      startTime: currentTime,
      endTime: Math.min(currentTime + 5, duration || currentTime + 5),
      opacity: 1,
      animation: "none",
    };
    setStickers((prev) => [...prev, newSticker]);
    setEditingStickerId(newSticker.id);
  };

  const updateSticker = (id: string, updates: Partial<StickerOverlay>) => {
    setStickers((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const deleteSticker = (id: string) => {
    setStickers((prev) => prev.filter((s) => s.id !== id));
    if (editingStickerId === id) setEditingStickerId(null);
  };

  // ===== COLLAGE =====
  const COLLAGE_LAYOUT_OPTIONS: { key: CollageLayout; label: string; count: number; icon: string }[] = [
    { key: "2h", label: "2分割(横)", count: 2, icon: "⬛⬛" },
    { key: "2v", label: "2分割(縦)", count: 2, icon: "⬛\n⬛" },
    { key: "3h", label: "3分割", count: 3, icon: "⬛⬛⬛" },
    { key: "4grid", label: "4分割(2x2)", count: 4, icon: "⬛⬛\n⬛⬛" },
    { key: "6grid", label: "6分割(2x3)", count: 6, icon: "⬛⬛⬛\n⬛⬛⬛" },
    { key: "9grid", label: "9分割(3x3)", count: 9, icon: "⬛⬛⬛\n⬛⬛⬛\n⬛⬛⬛" },
  ];

  const makeCollageItems = (count: number): CollageItem[] =>
    Array.from({ length: count }, (_, i) => ({ id: `ci-${Date.now()}-${i}`, file: null, url: "" }));

  const [collageSettings, setCollageSettings] = useState<CollageSettings>({
    layout: "2h",
    items: makeCollageItems(2),
    borderWidth: 2,
    borderColor: "#000000",
    outputDuration: 10,
  });
  const collageFileRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleCollageLayoutChange = (layout: CollageLayout, count: number) => {
    setCollageSettings((prev) => ({
      ...prev,
      layout,
      items: Array.from({ length: count }, (_, i) => prev.items[i] ?? { id: `ci-${Date.now()}-${i}`, file: null, url: "" }),
    }));
  };

  const handleCollageFileSelect = (index: number, file: File) => {
    const url = URL.createObjectURL(file);
    setCollageSettings((prev) => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], file, url };
      return { ...prev, items: newItems };
    });
  };

  const handleCreateCollage = async () => {
    const { items, layout, borderWidth, borderColor, outputDuration } = collageSettings;
    const readyFiles = items.filter((item) => item.file !== null).map((item) => item.file as File);
    const layoutOption = COLLAGE_LAYOUT_OPTIONS.find((o) => o.key === layout);
    if (!layoutOption || readyFiles.length < layoutOption.count) {
      setProgressMsg(`すべてのスロット(${layoutOption?.count}個)に動画をアップロードしてください`);
      return;
    }
    await ensureFFmpeg();
    setProcessing(true);
    try {
      const blob = await createCollage({ files: readyFiles, layout, borderWidth, borderColor, outputDuration }, setProgressMsg);
      const newFile = new File([blob], "collage.mp4", { type: "video/mp4" });
      const newUrl = URL.createObjectURL(blob);
      setVideoFile(newFile);
      setVideoUrl(newUrl);
      pushHistory({ textOverlays, subtitles, silentSegments, videoUrl: newUrl });
      setProgressMsg("コラージュ作成完了!");
    } catch (e) {
      setProgressMsg("コラージュ作成に失敗しました");
    }
    setProcessing(false);
  };

  // ===== SLIDESHOW =====
  const [slideshowSettings, setSlideshowSettings] = useState<SlideshowSettings>({
    images: [],
    transition: "none",
    transitionDuration: 0.5,
  });
  const slideshowFileInputRef = useRef<HTMLInputElement>(null);

  const handleSlideshowImagesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const newImages: SlideshowImage[] = files.map((file) => ({
      id: `si-${Date.now()}-${Math.random()}`,
      file,
      url: URL.createObjectURL(file),
      duration: 3,
    }));
    setSlideshowSettings((prev) => ({ ...prev, images: [...prev.images, ...newImages] }));
    e.target.value = "";
  };

  const handleSlideshowImageMove = (index: number, dir: "up" | "down") => {
    setSlideshowSettings((prev) => {
      const arr = [...prev.images];
      const swapIdx = dir === "up" ? index - 1 : index + 1;
      if (swapIdx < 0 || swapIdx >= arr.length) return prev;
      [arr[index], arr[swapIdx]] = [arr[swapIdx], arr[index]];
      return { ...prev, images: arr };
    });
  };

  const handleSlideshowImageDelete = (id: string) => {
    setSlideshowSettings((prev) => ({ ...prev, images: prev.images.filter((img) => img.id !== id) }));
  };

  const handleSlideshowImageDuration = (id: string, duration: number) => {
    setSlideshowSettings((prev) => ({
      ...prev,
      images: prev.images.map((img) => (img.id === id ? { ...img, duration } : img)),
    }));
  };

  const handleCreateSlideshow = async () => {
    if (slideshowSettings.images.length < 1) {
      setProgressMsg("1枚以上の画像をアップロードしてください");
      return;
    }
    await ensureFFmpeg();
    setProcessing(true);
    try {
      const blob = await createSlideshow({
        images: slideshowSettings.images.map((img) => ({ file: img.file, duration: img.duration })),
        transition: slideshowSettings.transition,
        transitionDuration: slideshowSettings.transitionDuration,
      }, setProgressMsg);
      const newFile = new File([blob], "slideshow.mp4", { type: "video/mp4" });
      const newUrl = URL.createObjectURL(blob);
      setVideoFile(newFile);
      setVideoUrl(newUrl);
      pushHistory({ textOverlays, subtitles, silentSegments, videoUrl: newUrl });
      setProgressMsg("スライドショー作成完了!");
    } catch (e) {
      setProgressMsg("スライドショー作成に失敗しました");
    }
    setProcessing(false);
  };

  // ===== PIP =====
  const [pipSettings, setPipSettings] = useState<PipSettings>({
    file: null,
    url: "",
    position: "bottom-right",
    size: 25,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: "#ffffff",
    startTime: 0,
    endTime: 0,
  });
  const pipFileInputRef = useRef<HTMLInputElement>(null);

  const handlePipFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPipSettings((prev) => ({ ...prev, file, url: URL.createObjectURL(file) }));
  };

  const handleApplyPip = async () => {
    if (!videoFile || !pipSettings.file) {
      setProgressMsg("メイン動画とワイプ動画が必要です");
      return;
    }
    await ensureFFmpeg();
    setProcessing(true);
    try {
      const pipEnd = pipSettings.endTime > pipSettings.startTime ? pipSettings.endTime : duration;
      const blob = await applyPip({
        mainFile: videoFile,
        pipFile: pipSettings.file,
        position: pipSettings.position,
        size: pipSettings.size,
        borderWidth: pipSettings.borderWidth,
        borderColor: pipSettings.borderColor,
        startTime: pipSettings.startTime,
        endTime: pipEnd,
      }, setProgressMsg);
      const newFile = new File([blob], "pip.mp4", { type: "video/mp4" });
      const newUrl = URL.createObjectURL(blob);
      setVideoFile(newFile);
      setVideoUrl(newUrl);
      pushHistory({ textOverlays, subtitles, silentSegments, videoUrl: newUrl });
      setProgressMsg("ワイプ適用完了!");
    } catch (e) {
      setProgressMsg("ワイプ適用に失敗しました");
    }
    setProcessing(false);
  };

  // ===== GIF EXPORT =====
  const [gifStart, setGifStart] = useState(0);
  const [gifEnd, setGifEnd] = useState(10);
  const [gifFps, setGifFps] = useState(15);
  const [gifWidth, setGifWidth] = useState(480);

  const handleExportGif = async () => {
    if (!videoFile) return;
    await ensureFFmpeg();
    setProcessing(true);
    try {
      const blob = await exportGif({
        file: videoFile,
        startTime: gifStart,
        endTime: Math.min(gifEnd, duration),
        fps: gifFps,
        width: gifWidth,
      }, setProgressMsg);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `videoforge_${Date.now()}.gif`;
      a.click();
      URL.revokeObjectURL(url);
      setProgressMsg("GIF書き出し完了!");
    } catch (e) {
      setProgressMsg("GIF書き出しに失敗しました");
    }
    setProcessing(false);
  };

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgmInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Load FFmpeg on first use
  const ensureFFmpeg = useCallback(async () => {
    if (ffmpegLoaded) return;
    setFfmpegLoading(true);
    setProgressMsg("FFmpegを読み込み中...");
    try {
      const { getFFmpeg } = await import("@/lib/ffmpeg-utils");
      await getFFmpeg();
      setFfmpegLoaded(true);
    } catch (e) {
      setProgressMsg("FFmpegの読み込みに失敗しました。ブラウザを更新してください。");
    }
    setFfmpegLoading(false);
  }, [ffmpegLoaded]);

  // Handle video upload
  const handleVideoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideoFile(file);
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setSilentSegments([]);
    setTextOverlays([]);
    setSubtitles([]);
    setClipMarkers([]);
    setFilterSettings({ ...DEFAULT_FILTERS });
    // Initialize history
    setHistory([{ textOverlays: [], subtitles: [], silentSegments: [], videoUrl: url }]);
    setHistoryIndex(0);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Video metadata loaded
  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setTrimEnd(videoRef.current.duration);
    }
  }, []);

  // Time update
  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  }, []);

  // Play/Pause
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  // Seek
  const handleSeek = useCallback((time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  // Format time
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // === SILENCE DETECTION ===
  const handleDetectSilence = async () => {
    if (!videoFile) return;
    await ensureFFmpeg();
    setProcessing(true);
    try {
      const segments = await detectSilence(videoFile, silenceThreshold, silenceMinDuration, setProgressMsg);
      setSilentSegments(segments);
      setProgressMsg(`${segments.length}箇所の無音区間を検出しました`);
    } catch (e) {
      setProgressMsg("無音検出に失敗しました");
    }
    setProcessing(false);
  };

  const handleRemoveSilence = async () => {
    if (!videoFile || silentSegments.length === 0) return;
    await ensureFFmpeg();
    setProcessing(true);
    try {
      const blob = await removeSilence(videoFile, silentSegments, 0.1, setProgressMsg);
      const newFile = new File([blob], "edited.mp4", { type: "video/mp4" });
      const newUrl = URL.createObjectURL(blob);
      setVideoFile(newFile);
      setVideoUrl(newUrl);
      setSilentSegments([]);
      pushHistory({ textOverlays, subtitles, silentSegments: [], videoUrl: newUrl });
      setProgressMsg("無音カット完了!");
    } catch (e) {
      setProgressMsg("無音カットに失敗しました");
    }
    setProcessing(false);
  };

  // === TRIM ===
  const handleTrim = async () => {
    if (!videoFile) return;
    await ensureFFmpeg();
    setProcessing(true);
    try {
      const blob = await trimVideo(videoFile, trimStart, trimEnd, setProgressMsg);
      const newFile = new File([blob], "trimmed.mp4", { type: "video/mp4" });
      const newUrl = URL.createObjectURL(blob);
      setVideoFile(newFile);
      setVideoUrl(newUrl);
      pushHistory({ textOverlays, subtitles, silentSegments, videoUrl: newUrl });
      setProgressMsg("トリミング完了!");
    } catch (e) {
      setProgressMsg("トリミングに失敗しました");
    }
    setProcessing(false);
  };

  // === TEXT OVERLAY ===
  const addTextOverlay = () => {
    const newText: TextOverlay = {
      id: `text-${Date.now()}`,
      text: "テキストを入力",
      x: 50,
      y: 50,
      fontSize: 32,
      fontFamily: "sans-serif",
      color: "#ffffff",
      bgColor: "rgba(0,0,0,0.7)",
      startTime: currentTime,
      endTime: Math.min(currentTime + 5, duration),
      bold: true,
      italic: false,
      outlineColor: "#000000",
      outlineWidth: 0,
      shadowColor: "rgba(0,0,0,0.8)",
      shadowBlur: 0,
      shadowOffsetX: 2,
      shadowOffsetY: 2,
    };
    const newOverlays = [...textOverlays, newText];
    setTextOverlays(newOverlays);
    setEditingTextId(newText.id);
    pushHistory({ textOverlays: newOverlays, subtitles, silentSegments, videoUrl });
  };

  const updateTextOverlay = (id: string, updates: Partial<TextOverlay>) => {
    setTextOverlays((prev) => {
      const newOverlays = prev.map((t) => (t.id === id ? { ...t, ...updates } : t));
      return newOverlays;
    });
  };

  const deleteTextOverlay = (id: string) => {
    const newOverlays = textOverlays.filter((t) => t.id !== id);
    setTextOverlays(newOverlays);
    if (editingTextId === id) setEditingTextId(null);
    pushHistory({ textOverlays: newOverlays, subtitles, silentSegments, videoUrl });
  };

  // === VOICE SUBTITLE ===
  const startVoiceRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setProgressMsg("このブラウザは音声認識に対応していません。Chromeをお使いください。");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "ja-JP";
    recognition.continuous = true;
    recognition.interimResults = true;

    let lastFinalTime = currentTime;

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          const text = event.results[i][0].transcript;
          const now = videoRef.current?.currentTime || 0;
          const entry: SubtitleEntry = {
            id: `sub-${Date.now()}-${i}`,
            text,
            startTime: lastFinalTime,
            endTime: now,
          };
          setSubtitles((prev) => [...prev, entry]);
          lastFinalTime = now;
        }
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);

    // Start video playback
    if (videoRef.current?.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const stopVoiceRecognition = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  // === BGM ===
  const handleBgmUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setBgmFile(file);
  };

  const handleAddBgm = async () => {
    if (!videoFile || !bgmFile) return;
    await ensureFFmpeg();
    setProcessing(true);
    try {
      const blob = await addBgm(videoFile, bgmFile, bgmVolume, setProgressMsg);
      const newFile = new File([blob], "with-bgm.mp4", { type: "video/mp4" });
      const newUrl = URL.createObjectURL(blob);
      setVideoFile(newFile);
      setVideoUrl(newUrl);
      pushHistory({ textOverlays, subtitles, silentSegments, videoUrl: newUrl });
      setProgressMsg("BGM追加完了!");
    } catch (e) {
      setProgressMsg("BGM追加に失敗しました");
    }
    setProcessing(false);
  };

  // === EXPORT ===
  const handleExport = async () => {
    if (!videoFile) return;
    const preset = ASPECT_PRESETS[selectedPresetIdx];
    await ensureFFmpeg();
    setProcessing(true);
    try {
      const blob = await exportWithAspectRatio(videoFile, preset.width, preset.height, setProgressMsg);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `videoforge_${preset.platform}_${Date.now()}.mp4`;
      a.click();
      URL.revokeObjectURL(url);
      setProgressMsg("エクスポート完了!");
    } catch (e) {
      setProgressMsg("エクスポートに失敗しました");
    }
    setProcessing(false);
  };

  const handleDownloadOriginal = () => {
    if (!videoUrl) return;
    const a = document.createElement("a");
    a.href = videoUrl;
    a.download = `videoforge_${Date.now()}.mp4`;
    a.click();
  };

  // Helper to compute CSS filter string for canvas (brightness/contrast/saturation)
  const getCanvasFilter = useCallback(() => {
    const { brightness, contrast, saturation } = filterSettings;
    return `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
  }, [filterSettings]);

  // Draw video + filters + text overlays on canvas
  useEffect(() => {
    if (!canvasRef.current || !videoRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const drawFrame = () => {
      const video = videoRef.current!;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 360;

      // Apply CSS filter for brightness/contrast/saturation
      ctx.filter = getCanvasFilter();
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx.filter = "none";

      // Temperature overlay
      if (filterSettings.temperature !== 0) {
        const tempNorm = filterSettings.temperature / 100;
        if (tempNorm > 0) {
          ctx.fillStyle = `rgba(255, 140, 0, ${tempNorm * 0.15})`;
        } else {
          ctx.fillStyle = `rgba(0, 100, 255, ${Math.abs(tempNorm) * 0.15})`;
        }
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Vignette overlay
      if (filterSettings.vignette > 0) {
        const vigStrength = filterSettings.vignette / 100;
        const gradient = ctx.createRadialGradient(
          canvas.width / 2, canvas.height / 2, canvas.width * 0.3,
          canvas.width / 2, canvas.height / 2, canvas.width * 0.8
        );
        gradient.addColorStop(0, "rgba(0,0,0,0)");
        gradient.addColorStop(1, `rgba(0,0,0,${vigStrength * 0.8})`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Draw text overlays
      const time = video.currentTime;
      for (const overlay of textOverlays) {
        if (time >= overlay.startTime && time <= overlay.endTime) {
          const fontStyle = `${overlay.bold ? "bold" : ""} ${overlay.italic ? "italic" : ""} ${overlay.fontSize}px ${overlay.fontFamily}`;
          ctx.font = fontStyle.trim();
          const metrics = ctx.measureText(overlay.text);
          const textHeight = overlay.fontSize * 1.3;
          const px = (overlay.x / 100) * canvas.width;
          const py = (overlay.y / 100) * canvas.height;

          // Shadow
          if (overlay.shadowBlur > 0) {
            ctx.shadowColor = overlay.shadowColor;
            ctx.shadowBlur = overlay.shadowBlur;
            ctx.shadowOffsetX = overlay.shadowOffsetX;
            ctx.shadowOffsetY = overlay.shadowOffsetY;
          }

          // Background
          if (overlay.bgColor && overlay.bgColor !== "transparent") {
            ctx.fillStyle = overlay.bgColor;
            ctx.fillRect(px - 8, py - textHeight + 4, metrics.width + 16, textHeight + 8);
          }

          // Reset shadow for text (apply separately)
          ctx.shadowColor = "transparent";
          ctx.shadowBlur = 0;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;

          // Re-apply shadow for text
          if (overlay.shadowBlur > 0) {
            ctx.shadowColor = overlay.shadowColor;
            ctx.shadowBlur = overlay.shadowBlur;
            ctx.shadowOffsetX = overlay.shadowOffsetX;
            ctx.shadowOffsetY = overlay.shadowOffsetY;
          }

          // Outline (stroke)
          if (overlay.outlineWidth > 0) {
            ctx.strokeStyle = overlay.outlineColor;
            ctx.lineWidth = overlay.outlineWidth;
            ctx.lineJoin = "round";
            ctx.strokeText(overlay.text, px, py);
          }

          // Fill text
          ctx.fillStyle = overlay.color;
          ctx.fillText(overlay.text, px, py);

          // Reset shadow
          ctx.shadowColor = "transparent";
          ctx.shadowBlur = 0;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
        }
      }

      // Draw stickers
      for (const sticker of stickers) {
        if (time >= sticker.startTime && time <= sticker.endTime) {
          ctx.save();

          const baseX = (sticker.x / 100) * canvas.width;
          const baseY = (sticker.y / 100) * canvas.height;

          // Compute animation offsets based on video currentTime
          let offsetX = 0;
          let offsetY = 0;
          let scale = 1;
          let extraRotation = 0;
          const t = time;

          switch (sticker.animation) {
            case "bounce":
              offsetY = -Math.abs(Math.sin(t * 3)) * 12;
              break;
            case "pulse":
              scale = 1 + Math.sin(t * 4) * 0.15;
              break;
            case "spin":
              extraRotation = (t * 90) % 360;
              break;
            case "float":
              offsetX = Math.sin(t * 2) * 6;
              offsetY = Math.cos(t * 2) * 4;
              break;
            default:
              break;
          }

          ctx.globalAlpha = sticker.opacity;
          ctx.translate(baseX + offsetX, baseY + offsetY);
          ctx.rotate(((sticker.rotation + extraRotation) * Math.PI) / 180);
          ctx.scale(scale, scale);

          ctx.font = `${sticker.size}px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(sticker.emoji, 0, 0);

          ctx.restore();
        }
      }

      // Draw subtitles
      for (const sub of subtitles) {
        if (time >= sub.startTime && time <= sub.endTime) {
          const fontSize = Math.max(16, Math.floor(canvas.height / 20));
          ctx.font = `bold ${fontSize}px sans-serif`;
          ctx.textAlign = "left";
          ctx.textBaseline = "alphabetic";
          const metrics = ctx.measureText(sub.text);
          const x = (canvas.width - metrics.width) / 2;
          const y = canvas.height - 40;

          ctx.fillStyle = "rgba(0,0,0,0.7)";
          ctx.fillRect(x - 10, y - fontSize - 4, metrics.width + 20, fontSize + 16);
          ctx.fillStyle = "#ffffff";
          ctx.fillText(sub.text, x, y);
        }
      }

      requestAnimationFrame(drawFrame);
    };

    const animId = requestAnimationFrame(drawFrame);
    return () => cancelAnimationFrame(animId);
  }, [textOverlays, subtitles, filterSettings, getCanvasFilter, stickers]);

  // Determine if canvas should be shown
  const showCanvas =
    textOverlays.length > 0 ||
    subtitles.length > 0 ||
    stickers.length > 0 ||
    filterSettings.brightness !== 100 ||
    filterSettings.contrast !== 100 ||
    filterSettings.saturation !== 100 ||
    filterSettings.temperature !== 0 ||
    filterSettings.vignette !== 0;

  // Tool buttons
  const TOOLS: { key: EditorTool; label: string; icon: string }[] = [
    { key: "silence", label: "無音カット", icon: "✂️" },
    { key: "trim", label: "トリミング", icon: "🎬" },
    { key: "text", label: "テロップ", icon: "T" },
    { key: "subtitle", label: "字幕", icon: "💬" },
    { key: "bgm", label: "BGM", icon: "🎵" },
    { key: "speed", label: "速度変更", icon: "⚡" },
    { key: "split", label: "分割", icon: "✂" },
    { key: "transition", label: "トランジション", icon: "✨" },
    { key: "filter", label: "フィルター", icon: "🎨" },
    { key: "sticker", label: "スタンプ", icon: "😀" },
    { key: "collage", label: "コラージュ", icon: "🖼" },
    { key: "slideshow", label: "スライドショー", icon: "🎞" },
    { key: "pip", label: "ワイプ", icon: "📺" },
    { key: "export", label: "書き出し", icon: "📤" },
  ];

  // No video uploaded
  if (!videoUrl) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            VideoForge
          </h1>
          <p className="text-gray-400 text-sm mb-8">AI動画エディタ</p>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full p-8 border-2 border-dashed border-gray-600 rounded-2xl hover:border-indigo-500 hover:bg-indigo-500/5 transition-all group"
          >
            <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">🎥</div>
            <p className="text-lg font-medium text-gray-300 mb-1">動画をアップロード</p>
            <p className="text-sm text-gray-500">MP4, MOV, WebM対応</p>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleVideoUpload}
            className="hidden"
          />

          <div className="mt-8 grid grid-cols-3 gap-3">
            {[
              { icon: "✂️", label: "自動無音カット" },
              { icon: "💬", label: "音声字幕" },
              { icon: "T", label: "テロップ" },
              { icon: "🎵", label: "BGM追加" },
              { icon: "🎬", label: "トリミング" },
              { icon: "📤", label: "SNS書き出し" },
            ].map((f) => (
              <div key={f.label} className="bg-gray-800/50 rounded-xl p-3 text-center">
                <div className="text-xl mb-1">{f.icon}</div>
                <p className="text-[11px] text-gray-400">{f.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const editingText = textOverlays.find((t) => t.id === editingTextId);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 bg-gray-900/80 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">VF</span>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-xs px-3 py-1.5 bg-gray-800 rounded-lg text-gray-300 hover:bg-gray-700"
          >
            別の動画
          </button>
          <input ref={fileInputRef} type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" />
          {/* Undo/Redo */}
          <button
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            title="元に戻す (Ctrl+Z)"
            className="text-xs px-2 py-1.5 bg-gray-800 rounded-lg text-gray-300 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ↩
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            title="やり直す (Ctrl+Shift+Z)"
            className="text-xs px-2 py-1.5 bg-gray-800 rounded-lg text-gray-300 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ↪
          </button>
        </div>
        <button
          onClick={handleDownloadOriginal}
          className="text-xs px-3 py-1.5 bg-indigo-600 rounded-lg text-white hover:bg-indigo-500"
        >
          保存
        </button>
      </header>

      {/* Video Preview */}
      <div className="relative bg-black flex items-center justify-center" style={{ minHeight: "40vh" }}>
        <video
          ref={videoRef}
          src={videoUrl}
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => setIsPlaying(false)}
          className="max-w-full max-h-[40vh]"
          style={{ display: showCanvas ? "none" : "block" }}
          playsInline
        />
        <canvas
          ref={canvasRef}
          className="max-w-full max-h-[40vh]"
          style={{ display: showCanvas ? "block" : "none" }}
        />

        {/* Play/Pause overlay */}
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-transparent hover:bg-black/20 transition-colors"
        >
          {!isPlaying && (
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          )}
        </button>

        {/* Playback speed badge */}
        {playbackSpeed !== 1 && (
          <div className="absolute top-2 right-2 bg-indigo-600/90 backdrop-blur-sm rounded px-2 py-0.5 text-xs text-white font-bold">
            {playbackSpeed}x
          </div>
        )}

        {/* Progress message */}
        {progressMsg && (
          <div className="absolute bottom-2 left-2 right-2 bg-black/80 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-center">
            {processing && <span className="inline-block w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mr-2 align-middle" />}
            {progressMsg}
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="px-4 py-3 bg-gray-900 border-t border-gray-800">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={togglePlay} className="text-white text-sm">
            {isPlaying ? "⏸" : "▶"}
          </button>
          <span className="text-xs text-gray-400 font-mono">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
        <div className="relative">
          <input
            type="range"
            min={0}
            max={duration}
            step={0.01}
            value={currentTime}
            onChange={(e) => handleSeek(parseFloat(e.target.value))}
            className="w-full"
          />
          {/* Silent segments markers */}
          {silentSegments.map((seg, i) => (
            <div
              key={i}
              className="absolute top-0 h-1 bg-red-500/60 rounded"
              style={{
                left: `${(seg.start / duration) * 100}%`,
                width: `${((seg.end - seg.start) / duration) * 100}%`,
              }}
            />
          ))}
          {/* Clip markers */}
          {clipMarkers.map((clip) => (
            <div
              key={clip.id}
              className="absolute top-3 w-0.5 h-3 bg-yellow-400"
              style={{ left: `${(clip.startTime / duration) * 100}%` }}
            />
          ))}
        </div>
      </div>

      {/* Tool Bar */}
      <div className="flex gap-1 px-2 py-2 bg-gray-900 border-t border-gray-800 overflow-x-auto scrollbar-hide">
        {TOOLS.map((tool) => (
          <button
            key={tool.key}
            onClick={() => setActiveTool(tool.key)}
            disabled={processing}
            className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-xs font-medium transition-all flex-shrink-0 ${
              activeTool === tool.key
                ? "bg-indigo-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200"
            } ${processing ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <span className="text-base">{tool.icon}</span>
            <span>{tool.label}</span>
          </button>
        ))}
      </div>

      {/* Tool Panel */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-950">
        {/* Silence Cut Tool */}
        {activeTool === "silence" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-200">自動無音カット</h3>
            <p className="text-xs text-gray-500">動画内の無音部分を検出して自動カットします（Vrew風）</p>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">
                  検出感度（{silenceThreshold}dB）
                </label>
                <input
                  type="range"
                  min={-60}
                  max={-10}
                  value={silenceThreshold}
                  onChange={(e) => setSilenceThreshold(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-[10px] text-gray-600">
                  <span>高感度（小さい音もカット）</span>
                  <span>低感度</span>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">
                  最短無音時間（{silenceMinDuration}秒）
                </label>
                <input
                  type="range"
                  min={0.1}
                  max={3}
                  step={0.1}
                  value={silenceMinDuration}
                  onChange={(e) => setSilenceMinDuration(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>

            <button
              onClick={handleDetectSilence}
              disabled={processing}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-500 disabled:opacity-50 transition-colors"
            >
              {processing ? "検出中..." : "無音区間を検出"}
            </button>

            {silentSegments.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-indigo-400 font-medium">
                  {silentSegments.length}箇所の無音区間を検出
                </p>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {silentSegments.map((seg, i) => (
                    <div key={i} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-1.5 text-xs">
                      <span className="text-gray-400">#{i + 1}</span>
                      <span className="text-red-400 font-mono">
                        {formatTime(seg.start)} → {formatTime(seg.end)}
                      </span>
                      <span className="text-gray-500">{(seg.end - seg.start).toFixed(1)}秒</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleRemoveSilence}
                  disabled={processing}
                  className="w-full py-3 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-500 disabled:opacity-50 transition-colors"
                >
                  {processing ? "カット中..." : "無音部分をすべてカット"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Trim Tool */}
        {activeTool === "trim" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-200">トリミング</h3>
            <p className="text-xs text-gray-500">動画の不要な部分をカットします</p>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">
                  開始: {formatTime(trimStart)}
                </label>
                <input
                  type="range"
                  min={0}
                  max={duration}
                  step={0.1}
                  value={trimStart}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setTrimStart(v);
                    handleSeek(v);
                  }}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">
                  終了: {formatTime(trimEnd)}
                </label>
                <input
                  type="range"
                  min={0}
                  max={duration}
                  step={0.1}
                  value={trimEnd}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setTrimEnd(v);
                    handleSeek(v);
                  }}
                  className="w-full"
                />
              </div>
              <p className="text-xs text-gray-500 text-center">
                トリミング後の長さ: {formatTime(Math.max(0, trimEnd - trimStart))}
              </p>
            </div>

            <button
              onClick={handleTrim}
              disabled={processing || trimStart >= trimEnd}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-500 disabled:opacity-50 transition-colors"
            >
              {processing ? "トリミング中..." : "トリミング実行"}
            </button>
          </div>
        )}

        {/* Text Overlay Tool */}
        {activeTool === "text" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-200">テロップ追加</h3>
              <button
                onClick={addTextOverlay}
                className="text-xs px-3 py-1.5 bg-indigo-600 rounded-lg text-white hover:bg-indigo-500"
              >
                + 追加
              </button>
            </div>

            {textOverlays.length === 0 && (
              <p className="text-xs text-gray-500 text-center py-6">
                「+ 追加」でテロップを配置できます
              </p>
            )}

            {textOverlays.map((overlay) => (
              <div
                key={overlay.id}
                className={`p-3 rounded-xl border transition-colors ${
                  editingTextId === overlay.id ? "border-indigo-500 bg-gray-800" : "border-gray-700 bg-gray-800/50"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <button
                    onClick={() => setEditingTextId(overlay.id === editingTextId ? null : overlay.id)}
                    className="text-xs text-indigo-400"
                  >
                    {overlay.id === editingTextId ? "閉じる" : "編集"}
                  </button>
                  <button
                    onClick={() => deleteTextOverlay(overlay.id)}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    削除
                  </button>
                </div>

                {editingTextId === overlay.id && (
                  <div className="space-y-3">
                    {/* テキスト入力 */}
                    <input
                      type="text"
                      value={overlay.text}
                      onChange={(e) => updateTextOverlay(overlay.id, { text: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white"
                      placeholder="テキストを入力..."
                    />

                    {/* フォント選択 */}
                    <div>
                      <label className="text-[10px] text-gray-500 block mb-1">フォント</label>
                      <select
                        value={overlay.fontFamily}
                        onChange={(e) => updateTextOverlay(overlay.id, { fontFamily: e.target.value })}
                        className="w-full px-2 py-2 bg-gray-900 border border-gray-700 rounded-lg text-xs text-white"
                      >
                        {FONT_OPTIONS.map((f) => (
                          <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* サイズ + 太字/斜体 */}
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <label className="text-[10px] text-gray-500 block mb-1">サイズ ({overlay.fontSize}px)</label>
                        <input
                          type="range"
                          min={12}
                          max={120}
                          value={overlay.fontSize}
                          onChange={(e) => updateTextOverlay(overlay.id, { fontSize: parseInt(e.target.value) })}
                          className="w-full"
                        />
                      </div>
                      <button
                        onClick={() => updateTextOverlay(overlay.id, { bold: !overlay.bold })}
                        className={`w-9 h-9 rounded-lg text-sm font-bold flex items-center justify-center transition-colors ${
                          overlay.bold ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                        }`}
                      >
                        B
                      </button>
                      <button
                        onClick={() => updateTextOverlay(overlay.id, { italic: !overlay.italic })}
                        className={`w-9 h-9 rounded-lg text-sm italic font-serif flex items-center justify-center transition-colors ${
                          overlay.italic ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                        }`}
                      >
                        I
                      </button>
                    </div>

                    {/* 文字色 + 背景色 */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-gray-500 block mb-1">文字色</label>
                        <div className="flex gap-1">
                          <input
                            type="color"
                            value={overlay.color}
                            onChange={(e) => updateTextOverlay(overlay.id, { color: e.target.value })}
                            className="w-10 h-8 rounded cursor-pointer border border-gray-700"
                          />
                          {["#ffffff", "#000000", "#ff0000", "#ffff00", "#00ff00", "#00bfff"].map((c) => (
                            <button
                              key={c}
                              onClick={() => updateTextOverlay(overlay.id, { color: c })}
                              className={`w-6 h-8 rounded border ${overlay.color === c ? "border-indigo-400 ring-1 ring-indigo-400" : "border-gray-600"}`}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 block mb-1">背景色</label>
                        <div className="flex gap-1">
                          <input
                            type="color"
                            value={overlay.bgColor.startsWith("rgba") ? "#000000" : overlay.bgColor}
                            onChange={(e) => updateTextOverlay(overlay.id, { bgColor: e.target.value + "cc" })}
                            className="w-10 h-8 rounded cursor-pointer border border-gray-700"
                          />
                          <button
                            onClick={() => updateTextOverlay(overlay.id, { bgColor: "transparent" })}
                            className={`px-2 h-8 rounded border text-[10px] ${overlay.bgColor === "transparent" ? "border-indigo-400 text-indigo-400" : "border-gray-600 text-gray-400"}`}
                          >
                            なし
                          </button>
                          <button
                            onClick={() => updateTextOverlay(overlay.id, { bgColor: "rgba(0,0,0,0.7)" })}
                            className="px-2 h-8 rounded border border-gray-600 text-[10px] text-gray-400 bg-black/70"
                          >
                            黒
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* 縁取り */}
                    <div>
                      <label className="text-[10px] text-gray-500 block mb-1">
                        縁取り（{overlay.outlineWidth}px）
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min={0}
                          max={10}
                          value={overlay.outlineWidth}
                          onChange={(e) => updateTextOverlay(overlay.id, { outlineWidth: parseInt(e.target.value) })}
                          className="flex-1"
                        />
                        <input
                          type="color"
                          value={overlay.outlineColor}
                          onChange={(e) => updateTextOverlay(overlay.id, { outlineColor: e.target.value })}
                          className="w-8 h-8 rounded cursor-pointer border border-gray-700"
                        />
                      </div>
                    </div>

                    {/* 影 */}
                    <div>
                      <label className="text-[10px] text-gray-500 block mb-1">
                        影（ぼかし: {overlay.shadowBlur}px）
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min={0}
                          max={20}
                          value={overlay.shadowBlur}
                          onChange={(e) => updateTextOverlay(overlay.id, { shadowBlur: parseInt(e.target.value) })}
                          className="flex-1"
                        />
                        <input
                          type="color"
                          value={overlay.shadowColor.startsWith("rgba") ? "#000000" : overlay.shadowColor}
                          onChange={(e) => updateTextOverlay(overlay.id, { shadowColor: e.target.value })}
                          className="w-8 h-8 rounded cursor-pointer border border-gray-700"
                        />
                      </div>
                    </div>

                    {/* 位置 */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-gray-500 block mb-1">X位置 ({overlay.x}%)</label>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={overlay.x}
                          onChange={(e) => updateTextOverlay(overlay.id, { x: parseInt(e.target.value) })}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 block mb-1">Y位置 ({overlay.y}%)</label>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={overlay.y}
                          onChange={(e) => updateTextOverlay(overlay.id, { y: parseInt(e.target.value) })}
                          className="w-full"
                        />
                      </div>
                    </div>

                    {/* 位置プリセット */}
                    <div>
                      <label className="text-[10px] text-gray-500 block mb-1">位置プリセット</label>
                      <div className="grid grid-cols-3 gap-1">
                        {[
                          { label: "左上", x: 5, y: 15 },
                          { label: "中央上", x: 50, y: 15 },
                          { label: "右上", x: 85, y: 15 },
                          { label: "左中", x: 5, y: 50 },
                          { label: "中央", x: 50, y: 50 },
                          { label: "右中", x: 85, y: 50 },
                          { label: "左下", x: 5, y: 85 },
                          { label: "中央下", x: 50, y: 85 },
                          { label: "右下", x: 85, y: 85 },
                        ].map((pos) => (
                          <button
                            key={pos.label}
                            onClick={() => updateTextOverlay(overlay.id, { x: pos.x, y: pos.y })}
                            className="px-1 py-1.5 bg-gray-800 rounded text-[10px] text-gray-400 hover:bg-gray-700 hover:text-gray-200 transition-colors"
                          >
                            {pos.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 表示時間 */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-gray-500 block mb-1">表示開始（秒）</label>
                        <input
                          type="number"
                          step={0.1}
                          value={overlay.startTime}
                          onChange={(e) => updateTextOverlay(overlay.id, { startTime: parseFloat(e.target.value) })}
                          className="w-full px-2 py-1.5 bg-gray-900 border border-gray-700 rounded text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 block mb-1">表示終了（秒）</label>
                        <input
                          type="number"
                          step={0.1}
                          value={overlay.endTime}
                          onChange={(e) => updateTextOverlay(overlay.id, { endTime: parseFloat(e.target.value) })}
                          className="w-full px-2 py-1.5 bg-gray-900 border border-gray-700 rounded text-xs text-white"
                        />
                      </div>
                    </div>

                    {/* スタイルプリセット */}
                    <div>
                      <label className="text-[10px] text-gray-500 block mb-1">スタイルプリセット</label>
                      <div className="grid grid-cols-4 gap-1">
                        <button
                          onClick={() => updateTextOverlay(overlay.id, {
                            color: "#ffffff", bgColor: "rgba(0,0,0,0.7)", outlineWidth: 0, shadowBlur: 0,
                          })}
                          className="px-1 py-2 bg-gray-800 rounded text-[10px] text-white hover:bg-gray-700"
                        >
                          シンプル
                        </button>
                        <button
                          onClick={() => updateTextOverlay(overlay.id, {
                            color: "#ffffff", bgColor: "transparent", outlineColor: "#000000", outlineWidth: 4, shadowBlur: 0,
                          })}
                          className="px-1 py-2 bg-gray-800 rounded text-[10px] text-white hover:bg-gray-700"
                        >
                          縁取り
                        </button>
                        <button
                          onClick={() => updateTextOverlay(overlay.id, {
                            color: "#ffff00", bgColor: "transparent", outlineColor: "#000000", outlineWidth: 3, shadowBlur: 8, shadowColor: "#000000",
                          })}
                          className="px-1 py-2 bg-gray-800 rounded text-[10px] text-yellow-300 hover:bg-gray-700"
                        >
                          YouTube風
                        </button>
                        <button
                          onClick={() => updateTextOverlay(overlay.id, {
                            color: "#ff3366", bgColor: "transparent", outlineColor: "#ffffff", outlineWidth: 3, shadowBlur: 12, shadowColor: "#ff336680",
                          })}
                          className="px-1 py-2 bg-gray-800 rounded text-[10px] text-pink-400 hover:bg-gray-700"
                        >
                          ネオン
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {editingTextId !== overlay.id && (
                  <p className="text-xs text-gray-400 truncate">
                    &quot;{overlay.text}&quot; ({formatTime(overlay.startTime)} - {formatTime(overlay.endTime)})
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Subtitle Tool */}
        {activeTool === "subtitle" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-200">音声字幕生成</h3>
            <p className="text-xs text-gray-500">
              動画を再生しながら音声を認識し、自動で字幕を生成します
            </p>

            <button
              onClick={isListening ? stopVoiceRecognition : startVoiceRecognition}
              className={`w-full py-3 rounded-xl text-sm font-bold transition-colors ${
                isListening
                  ? "bg-red-600 text-white hover:bg-red-500 animate-pulse"
                  : "bg-indigo-600 text-white hover:bg-indigo-500"
              }`}
            >
              {isListening ? "⏹ 認識を停止" : "🎙 音声認識を開始"}
            </button>

            {isListening && (
              <p className="text-xs text-red-400 text-center animate-pulse">
                認識中... 動画を再生して音声を拾っています
              </p>
            )}

            {subtitles.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-indigo-400 font-medium">
                    字幕 {subtitles.length}件
                  </p>
                  <button
                    onClick={() => setSubtitles([])}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    全削除
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {subtitles.map((sub) => (
                    <div key={sub.id} className="bg-gray-800 rounded-lg px-3 py-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-gray-500 font-mono">
                          {formatTime(sub.startTime)} → {formatTime(sub.endTime)}
                        </span>
                        <button
                          onClick={() => setSubtitles((prev) => prev.filter((s) => s.id !== sub.id))}
                          className="text-[10px] text-red-400"
                        >
                          削除
                        </button>
                      </div>
                      <input
                        type="text"
                        value={sub.text}
                        onChange={(e) =>
                          setSubtitles((prev) =>
                            prev.map((s) => (s.id === sub.id ? { ...s, text: e.target.value } : s))
                          )
                        }
                        className="w-full px-2 py-1 bg-gray-900 border border-gray-700 rounded text-xs text-white"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* BGM Tool */}
        {activeTool === "bgm" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-200">BGM追加</h3>
            <p className="text-xs text-gray-500">動画にBGMをミックスします</p>

            <button
              onClick={() => bgmInputRef.current?.click()}
              className="w-full p-4 border-2 border-dashed border-gray-700 rounded-xl text-center hover:border-indigo-500 transition-colors"
            >
              <span className="text-2xl block mb-1">🎵</span>
              <span className="text-xs text-gray-400">
                {bgmFile ? bgmFile.name : "BGMファイルを選択（MP3, WAV）"}
              </span>
            </button>
            <input
              ref={bgmInputRef}
              type="file"
              accept="audio/*"
              onChange={handleBgmUpload}
              className="hidden"
            />

            {bgmFile && (
              <>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">
                    BGM音量（{Math.round(bgmVolume * 100)}%）
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={bgmVolume}
                    onChange={(e) => setBgmVolume(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
                <button
                  onClick={handleAddBgm}
                  disabled={processing}
                  className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                >
                  {processing ? "ミックス中..." : "BGMをミックス"}
                </button>
              </>
            )}
          </div>
        )}

        {/* Speed Tool */}
        {activeTool === "speed" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-200">速度変更</h3>
            <p className="text-xs text-gray-500">動画の再生速度を変更します。プレビューでリアルタイムに確認できます。</p>

            <div>
              <label className="text-xs text-gray-400 block mb-2">速度プリセット</label>
              <div className="grid grid-cols-4 gap-2">
                {SPEED_PRESETS.map((speed) => (
                  <button
                    key={speed}
                    onClick={() => handleSpeedPreview(speed)}
                    className={`py-2.5 rounded-xl text-sm font-bold transition-all ${
                      playbackSpeed === speed
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl p-3 space-y-1">
              <p className="text-xs text-gray-400">現在の速度</p>
              <p className="text-2xl font-bold text-indigo-400">{playbackSpeed}x</p>
              <p className="text-[10px] text-gray-600">プレビューは動画要素の再生レートで確認できます</p>
            </div>

            {playbackSpeed !== 1 && (
              <button
                onClick={handleApplySpeed}
                disabled={processing}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-500 disabled:opacity-50 transition-colors"
              >
                {processing ? "処理中..." : `${playbackSpeed}x で書き出す`}
              </button>
            )}

            {playbackSpeed === 1 && (
              <p className="text-xs text-gray-600 text-center">上記のプリセットを選択してください</p>
            )}
          </div>
        )}

        {/* Split Tool */}
        {activeTool === "split" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-200">分割・並び替え</h3>
            <p className="text-xs text-gray-500">現在の再生位置で動画を分割し、クリップを並び替えられます</p>

            <div className="flex gap-2">
              <button
                onClick={handleSplitAtCurrent}
                disabled={processing || !duration}
                className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-500 disabled:opacity-50 transition-colors"
              >
                ✂ {formatTime(currentTime)} で分割
              </button>
              {clipMarkers.length > 0 && (
                <button
                  onClick={handleResetClips}
                  className="px-4 py-3 bg-gray-800 text-gray-300 rounded-xl text-xs hover:bg-gray-700 transition-colors"
                >
                  リセット
                </button>
              )}
            </div>

            {clipMarkers.length === 0 && (
              <p className="text-xs text-gray-500 text-center py-4">
                再生ヘッドを移動して「分割」ボタンを押してください
              </p>
            )}

            {clipMarkers.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-indigo-400 font-medium">{clipMarkers.length}個のクリップ</p>
                <div className="space-y-1 max-h-56 overflow-y-auto">
                  {clipMarkers.map((clip, i) => (
                    <div key={clip.id} className="flex items-center gap-2 bg-gray-800 rounded-xl px-3 py-2">
                      <span className="text-xs text-gray-500 w-4">{i + 1}</span>
                      <span className="flex-1 text-xs text-gray-300 font-mono">
                        {formatTime(clip.startTime)} → {formatTime(clip.endTime)}
                      </span>
                      <span className="text-[10px] text-gray-600">
                        {(clip.endTime - clip.startTime).toFixed(1)}秒
                      </span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleMoveClipUp(i)}
                          disabled={i === 0}
                          className="w-6 h-6 bg-gray-700 rounded text-gray-400 hover:bg-gray-600 disabled:opacity-30 text-xs"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => handleMoveClipDown(i)}
                          disabled={i === clipMarkers.length - 1}
                          className="w-6 h-6 bg-gray-700 rounded text-gray-400 hover:bg-gray-600 disabled:opacity-30 text-xs"
                        >
                          ↓
                        </button>
                        <button
                          onClick={() => handleDeleteClip(clip.id)}
                          className="w-6 h-6 bg-red-900/50 rounded text-red-400 hover:bg-red-800/50 text-xs"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleApplySplit}
                  disabled={processing || clipMarkers.length === 0}
                  className="w-full py-3 bg-green-700 text-white rounded-xl text-sm font-bold hover:bg-green-600 disabled:opacity-50 transition-colors"
                >
                  {processing ? "処理中..." : "この順番で書き出す"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Filter Tool */}
        {activeTool === "filter" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-200">フィルター・色補正</h3>
            <p className="text-xs text-gray-500">プレビューはリアルタイムで確認できます。書き出しで動画に反映します。</p>

            {/* Filter Presets */}
            <div>
              <label className="text-xs text-gray-400 block mb-2">プリセット</label>
              <div className="grid grid-cols-3 gap-1.5">
                {FILTER_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => setFilterSettings({ ...preset.settings })}
                    className={`py-2 px-1 rounded-xl text-xs font-medium transition-all ${
                      JSON.stringify(filterSettings) === JSON.stringify(preset.settings)
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Manual sliders */}
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">
                  明るさ ({filterSettings.brightness}%)
                </label>
                <input
                  type="range" min={0} max={200} value={filterSettings.brightness}
                  onChange={(e) => setFilterSettings((p) => ({ ...p, brightness: parseInt(e.target.value) }))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">
                  コントラスト ({filterSettings.contrast}%)
                </label>
                <input
                  type="range" min={0} max={200} value={filterSettings.contrast}
                  onChange={(e) => setFilterSettings((p) => ({ ...p, contrast: parseInt(e.target.value) }))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">
                  彩度 ({filterSettings.saturation}%)
                </label>
                <input
                  type="range" min={0} max={200} value={filterSettings.saturation}
                  onChange={(e) => setFilterSettings((p) => ({ ...p, saturation: parseInt(e.target.value) }))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">
                  色温度 ({filterSettings.temperature > 0 ? `+${filterSettings.temperature}` : filterSettings.temperature})
                  {filterSettings.temperature > 0 ? " 暖かい" : filterSettings.temperature < 0 ? " クール" : ""}
                </label>
                <input
                  type="range" min={-100} max={100} value={filterSettings.temperature}
                  onChange={(e) => setFilterSettings((p) => ({ ...p, temperature: parseInt(e.target.value) }))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">
                  ビネット ({filterSettings.vignette}%)
                </label>
                <input
                  type="range" min={0} max={100} value={filterSettings.vignette}
                  onChange={(e) => setFilterSettings((p) => ({ ...p, vignette: parseInt(e.target.value) }))}
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setFilterSettings({ ...DEFAULT_FILTERS })}
                className="flex-1 py-2.5 bg-gray-800 text-gray-300 rounded-xl text-sm hover:bg-gray-700 transition-colors"
              >
                リセット
              </button>
              <button
                onClick={handleApplyFiltersExport}
                disabled={processing}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-500 disabled:opacity-50 transition-colors"
              >
                {processing ? "処理中..." : "動画に適用"}
              </button>
            </div>
          </div>
        )}

        {/* Transition Tool */}
        {activeTool === "transition" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-200">トランジション</h3>
            <p className="text-xs text-gray-500">動画の開始・終了に場面切替エフェクトを追加します</p>

            {/* Transition In */}
            <div className="bg-gray-800 rounded-xl p-3 space-y-3">
              <p className="text-xs font-semibold text-indigo-300">動画の開始</p>
              <div className="grid grid-cols-3 gap-1.5">
                {TRANSITION_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTransitionIn((prev) => ({ ...prev, type: t.value }))}
                    className={`py-2 px-1 rounded-xl text-xs font-medium transition-all flex flex-col items-center gap-0.5 ${
                      transitionIn.type === t.value
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    }`}
                  >
                    <span className="text-base">{t.icon}</span>
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
              {transitionIn.type !== "none" && (
                <div>
                  <label className="text-[10px] text-gray-500 block mb-1">
                    デュレーション ({transitionIn.duration.toFixed(1)}秒)
                  </label>
                  <input
                    type="range"
                    min={0.3}
                    max={2.0}
                    step={0.1}
                    value={transitionIn.duration}
                    onChange={(e) => setTransitionIn((prev) => ({ ...prev, duration: parseFloat(e.target.value) }))}
                    className="w-full"
                  />
                </div>
              )}
            </div>

            {/* Transition Out */}
            <div className="bg-gray-800 rounded-xl p-3 space-y-3">
              <p className="text-xs font-semibold text-purple-300">動画の終了</p>
              <div className="grid grid-cols-3 gap-1.5">
                {TRANSITION_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTransitionOut((prev) => ({ ...prev, type: t.value }))}
                    className={`py-2 px-1 rounded-xl text-xs font-medium transition-all flex flex-col items-center gap-0.5 ${
                      transitionOut.type === t.value
                        ? "bg-purple-600 text-white"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    }`}
                  >
                    <span className="text-base">{t.icon}</span>
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
              {transitionOut.type !== "none" && (
                <div>
                  <label className="text-[10px] text-gray-500 block mb-1">
                    デュレーション ({transitionOut.duration.toFixed(1)}秒)
                  </label>
                  <input
                    type="range"
                    min={0.3}
                    max={2.0}
                    step={0.1}
                    value={transitionOut.duration}
                    onChange={(e) => setTransitionOut((prev) => ({ ...prev, duration: parseFloat(e.target.value) }))}
                    className="w-full"
                  />
                </div>
              )}
            </div>

            {/* Clip boundary transitions */}
            {clipMarkers.length >= 2 && (
              <div className="bg-gray-800 rounded-xl p-3 space-y-3">
                <p className="text-xs font-semibold text-yellow-300">クリップ間のトランジション</p>
                {clipTransitions.map((ct, i) => (
                  <div key={i} className="space-y-2">
                    <p className="text-[10px] text-gray-400">
                      クリップ {i + 1} → {i + 2}（{formatTime(clipMarkers[i + 1]?.startTime ?? 0)}）
                    </p>
                    <div className="grid grid-cols-3 gap-1">
                      {TRANSITION_TYPES.map((t) => (
                        <button
                          key={t.value}
                          onClick={() =>
                            setClipTransitions((prev) => {
                              const next = [...prev];
                              next[i] = { ...next[i], type: t.value };
                              return next;
                            })
                          }
                          className={`py-1.5 px-1 rounded-lg text-[10px] font-medium transition-all ${
                            ct.type === t.value
                              ? "bg-yellow-600 text-white"
                              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {(transitionIn.type !== "none" || transitionOut.type !== "none") && (
              <button
                onClick={handleApplyTransitions}
                disabled={processing}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-bold hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 transition-all"
              >
                {processing ? "適用中..." : "トランジションを適用"}
              </button>
            )}

            {transitionIn.type === "none" && transitionOut.type === "none" && (
              <p className="text-xs text-gray-500 text-center py-2">
                上から開始・終了のエフェクトを選択してください
              </p>
            )}
          </div>
        )}

        {/* Sticker Tool */}
        {activeTool === "sticker" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-200">スタンプ追加</h3>
            <p className="text-xs text-gray-500">絵文字スタンプを動画に配置できます</p>

            {/* Category tabs */}
            <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-1">
              {STICKER_CATEGORIES.map((cat, idx) => (
                <button
                  key={cat.label}
                  onClick={() => setActiveStickerCategory(idx)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeStickerCategory === idx
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Emoji grid */}
            <div className="grid grid-cols-5 gap-1.5">
              {STICKER_CATEGORIES[activeStickerCategory].emojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => addSticker(emoji)}
                  className="aspect-square flex items-center justify-center bg-gray-800 rounded-xl text-2xl hover:bg-gray-700 hover:scale-110 transition-all"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Sticker list */}
            {stickers.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-indigo-400 font-medium">配置済みスタンプ ({stickers.length})</p>
                <div className="space-y-2 max-h-[420px] overflow-y-auto">
                  {stickers.map((sticker) => (
                    <div
                      key={sticker.id}
                      className={`p-3 rounded-xl border transition-colors ${
                        editingStickerId === sticker.id
                          ? "border-indigo-500 bg-gray-800"
                          : "border-gray-700 bg-gray-800/50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{sticker.emoji}</span>
                          <button
                            onClick={() => setEditingStickerId(sticker.id === editingStickerId ? null : sticker.id)}
                            className="text-xs text-indigo-400"
                          >
                            {sticker.id === editingStickerId ? "閉じる" : "編集"}
                          </button>
                        </div>
                        <button
                          onClick={() => deleteSticker(sticker.id)}
                          className="text-xs text-red-400 hover:text-red-300"
                        >
                          削除
                        </button>
                      </div>

                      {editingStickerId !== sticker.id && (
                        <p className="text-[10px] text-gray-500">
                          {formatTime(sticker.startTime)} - {formatTime(sticker.endTime)} / 位置 ({sticker.x}%, {sticker.y}%)
                        </p>
                      )}

                      {editingStickerId === sticker.id && (
                        <div className="space-y-3">
                          {/* Size */}
                          <div>
                            <label className="text-[10px] text-gray-500 block mb-1">サイズ ({sticker.size}px)</label>
                            <input
                              type="range"
                              min={24}
                              max={200}
                              value={sticker.size}
                              onChange={(e) => updateSticker(sticker.id, { size: parseInt(e.target.value) })}
                              className="w-full"
                            />
                          </div>

                          {/* Rotation */}
                          <div>
                            <label className="text-[10px] text-gray-500 block mb-1">回転 ({sticker.rotation}°)</label>
                            <input
                              type="range"
                              min={0}
                              max={360}
                              value={sticker.rotation}
                              onChange={(e) => updateSticker(sticker.id, { rotation: parseInt(e.target.value) })}
                              className="w-full"
                            />
                          </div>

                          {/* Opacity */}
                          <div>
                            <label className="text-[10px] text-gray-500 block mb-1">
                              不透明度 ({Math.round(sticker.opacity * 100)}%)
                            </label>
                            <input
                              type="range"
                              min={0}
                              max={1}
                              step={0.05}
                              value={sticker.opacity}
                              onChange={(e) => updateSticker(sticker.id, { opacity: parseFloat(e.target.value) })}
                              className="w-full"
                            />
                          </div>

                          {/* Position sliders */}
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-gray-500 block mb-1">X位置 ({sticker.x}%)</label>
                              <input
                                type="range"
                                min={0}
                                max={100}
                                value={sticker.x}
                                onChange={(e) => updateSticker(sticker.id, { x: parseInt(e.target.value) })}
                                className="w-full"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-gray-500 block mb-1">Y位置 ({sticker.y}%)</label>
                              <input
                                type="range"
                                min={0}
                                max={100}
                                value={sticker.y}
                                onChange={(e) => updateSticker(sticker.id, { y: parseInt(e.target.value) })}
                                className="w-full"
                              />
                            </div>
                          </div>

                          {/* Position presets */}
                          <div>
                            <label className="text-[10px] text-gray-500 block mb-1">位置プリセット</label>
                            <div className="grid grid-cols-3 gap-1">
                              {[
                                { label: "左上", x: 10, y: 15 },
                                { label: "中央上", x: 50, y: 15 },
                                { label: "右上", x: 85, y: 15 },
                                { label: "左中", x: 10, y: 50 },
                                { label: "中央", x: 50, y: 50 },
                                { label: "右中", x: 85, y: 50 },
                                { label: "左下", x: 10, y: 85 },
                                { label: "中央下", x: 50, y: 85 },
                                { label: "右下", x: 85, y: 85 },
                              ].map((pos) => (
                                <button
                                  key={pos.label}
                                  onClick={() => updateSticker(sticker.id, { x: pos.x, y: pos.y })}
                                  className="px-1 py-1.5 bg-gray-700 rounded text-[10px] text-gray-400 hover:bg-gray-600 hover:text-gray-200 transition-colors"
                                >
                                  {pos.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Animation */}
                          <div>
                            <label className="text-[10px] text-gray-500 block mb-1">アニメーション</label>
                            <div className="grid grid-cols-3 gap-1">
                              {([
                                { value: "none", label: "なし" },
                                { value: "bounce", label: "バウンス" },
                                { value: "pulse", label: "パルス" },
                                { value: "spin", label: "スピン" },
                                { value: "float", label: "フロート" },
                              ] as const).map((anim) => (
                                <button
                                  key={anim.value}
                                  onClick={() => updateSticker(sticker.id, { animation: anim.value })}
                                  className={`py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                                    sticker.animation === anim.value
                                      ? "bg-indigo-600 text-white"
                                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                  }`}
                                >
                                  {anim.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Start/end time */}
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-gray-500 block mb-1">表示開始（秒）</label>
                              <input
                                type="number"
                                step={0.1}
                                value={sticker.startTime}
                                onChange={(e) => updateSticker(sticker.id, { startTime: parseFloat(e.target.value) })}
                                className="w-full px-2 py-1.5 bg-gray-900 border border-gray-700 rounded text-xs text-white"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-gray-500 block mb-1">表示終了（秒）</label>
                              <input
                                type="number"
                                step={0.1}
                                value={sticker.endTime}
                                onChange={(e) => updateSticker(sticker.id, { endTime: parseFloat(e.target.value) })}
                                className="w-full px-2 py-1.5 bg-gray-900 border border-gray-700 rounded text-xs text-white"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Collage Tool */}
        {activeTool === "collage" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-200">コラージュ動画</h3>
            <p className="text-xs text-gray-500">複数の動画を分割画面で同時再生します。メイン動画とは独立して新しい動画を作成します。</p>

            {/* Layout selector */}
            <div>
              <label className="text-xs text-gray-400 block mb-2">レイアウト</label>
              <div className="grid grid-cols-3 gap-2">
                {COLLAGE_LAYOUT_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => handleCollageLayoutChange(opt.key, opt.count)}
                    className={`py-2 px-1 rounded-xl text-xs font-medium transition-all ${
                      collageSettings.layout === opt.key
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Video slots */}
            <div>
              <label className="text-xs text-gray-400 block mb-2">動画スロット</label>
              <div className="grid grid-cols-2 gap-2">
                {collageSettings.items.map((item, index) => (
                  <div key={item.id} className="relative">
                    <button
                      onClick={() => collageFileRefs.current[index]?.click()}
                      className="w-full aspect-video bg-gray-800 border-2 border-dashed border-gray-600 rounded-xl flex flex-col items-center justify-center hover:border-indigo-500 transition-colors overflow-hidden"
                    >
                      {item.url ? (
                        <video src={item.url} className="w-full h-full object-cover" muted />
                      ) : (
                        <>
                          <span className="text-2xl">+</span>
                          <span className="text-[10px] text-gray-500 mt-1">動画 {index + 1}</span>
                        </>
                      )}
                    </button>
                    <input
                      type="file"
                      accept="video/*"
                      className="hidden"
                      ref={(el) => { collageFileRefs.current[index] = el; }}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleCollageFileSelect(index, f);
                        e.target.value = "";
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Border settings */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">ボーダー幅 ({collageSettings.borderWidth}px)</label>
                <input
                  type="range" min={0} max={10}
                  value={collageSettings.borderWidth}
                  onChange={(e) => setCollageSettings((p) => ({ ...p, borderWidth: parseInt(e.target.value) }))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">ボーダー色</label>
                <input
                  type="color"
                  value={collageSettings.borderColor}
                  onChange={(e) => setCollageSettings((p) => ({ ...p, borderColor: e.target.value }))}
                  className="w-full h-8 rounded border border-gray-700 cursor-pointer"
                />
              </div>
            </div>

            {/* Output duration */}
            <div>
              <label className="text-xs text-gray-400 block mb-1">出力時間 ({collageSettings.outputDuration}秒)</label>
              <input
                type="range" min={1} max={60}
                value={collageSettings.outputDuration}
                onChange={(e) => setCollageSettings((p) => ({ ...p, outputDuration: parseInt(e.target.value) }))}
                className="w-full"
              />
            </div>

            <button
              onClick={handleCreateCollage}
              disabled={processing}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-500 disabled:opacity-50 transition-colors"
            >
              {processing ? "作成中..." : "コラージュを作成"}
            </button>
          </div>
        )}

        {/* Slideshow Tool */}
        {activeTool === "slideshow" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-200">スライドショー</h3>
            <p className="text-xs text-gray-500">複数の画像から動画を作成します。メイン動画とは独立して新しい動画を作成します。</p>

            {/* Upload area */}
            <button
              onClick={() => slideshowFileInputRef.current?.click()}
              className="w-full p-4 border-2 border-dashed border-gray-700 rounded-xl text-center hover:border-indigo-500 transition-colors"
            >
              <span className="text-2xl block mb-1">🖼</span>
              <span className="text-xs text-gray-400">画像をアップロード（複数選択可）</span>
            </button>
            <input
              ref={slideshowFileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleSlideshowImagesUpload}
              className="hidden"
            />

            {/* Total duration display */}
            {slideshowSettings.images.length > 0 && (
              <p className="text-xs text-indigo-400">
                合計時間: {slideshowSettings.images.reduce((s, img) => s + img.duration, 0).toFixed(1)}秒 ({slideshowSettings.images.length}枚)
              </p>
            )}

            {/* Image list */}
            {slideshowSettings.images.length > 0 && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {slideshowSettings.images.map((img, index) => (
                  <div key={img.id} className="flex items-center gap-2 bg-gray-800 rounded-xl p-2">
                    <img src={img.url} className="w-12 h-9 object-cover rounded" alt="" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-gray-500 truncate">{img.file.name}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-[10px] text-gray-500 w-12">{img.duration}秒</span>
                        <input
                          type="range" min={0.5} max={10} step={0.5}
                          value={img.duration}
                          onChange={(e) => handleSlideshowImageDuration(img.id, parseFloat(e.target.value))}
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => handleSlideshowImageMove(index, "up")}
                        disabled={index === 0}
                        className="w-5 h-5 bg-gray-700 rounded text-gray-400 text-[10px] disabled:opacity-30 hover:bg-gray-600"
                      >↑</button>
                      <button
                        onClick={() => handleSlideshowImageMove(index, "down")}
                        disabled={index === slideshowSettings.images.length - 1}
                        className="w-5 h-5 bg-gray-700 rounded text-gray-400 text-[10px] disabled:opacity-30 hover:bg-gray-600"
                      >↓</button>
                    </div>
                    <button
                      onClick={() => handleSlideshowImageDelete(img.id)}
                      className="w-6 h-6 bg-red-900/50 rounded text-red-400 text-xs hover:bg-red-800/50"
                    >×</button>
                  </div>
                ))}
              </div>
            )}

            {/* Transition settings */}
            <div>
              <label className="text-xs text-gray-400 block mb-2">トランジション</label>
              <div className="grid grid-cols-3 gap-1.5">
                {([
                  { value: "none", label: "なし" },
                  { value: "fade", label: "フェード" },
                  { value: "crossfade", label: "クロスフェード" },
                ] as const).map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setSlideshowSettings((p) => ({ ...p, transition: t.value }))}
                    className={`py-2 rounded-xl text-xs font-medium transition-all ${
                      slideshowSettings.transition === t.value
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              {slideshowSettings.transition !== "none" && (
                <div className="mt-2">
                  <label className="text-[10px] text-gray-500 block mb-1">
                    トランジション時間 ({slideshowSettings.transitionDuration.toFixed(1)}秒)
                  </label>
                  <input
                    type="range" min={0.5} max={2} step={0.1}
                    value={slideshowSettings.transitionDuration}
                    onChange={(e) => setSlideshowSettings((p) => ({ ...p, transitionDuration: parseFloat(e.target.value) }))}
                    className="w-full"
                  />
                </div>
              )}
            </div>

            <button
              onClick={handleCreateSlideshow}
              disabled={processing || slideshowSettings.images.length === 0}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-500 disabled:opacity-50 transition-colors"
            >
              {processing ? "作成中..." : "スライドショーを作成"}
            </button>
          </div>
        )}

        {/* PiP Tool */}
        {activeTool === "pip" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-200">ワイプ (ピクチャーインピクチャー)</h3>
            <p className="text-xs text-gray-500">メイン動画の上に小さな動画を重ねます</p>

            {/* PiP video upload */}
            <button
              onClick={() => pipFileInputRef.current?.click()}
              className="w-full p-4 border-2 border-dashed border-gray-700 rounded-xl text-center hover:border-indigo-500 transition-colors"
            >
              <span className="text-2xl block mb-1">📺</span>
              <span className="text-xs text-gray-400">
                {pipSettings.file ? pipSettings.file.name : "ワイプ動画を選択"}
              </span>
            </button>
            <input
              ref={pipFileInputRef}
              type="file"
              accept="video/*"
              onChange={handlePipFileSelect}
              className="hidden"
            />

            {/* Position selector */}
            <div>
              <label className="text-xs text-gray-400 block mb-2">表示位置</label>
              <div className="grid grid-cols-2 gap-2 w-40 mx-auto">
                {([
                  { value: "top-left", label: "左上" },
                  { value: "top-right", label: "右上" },
                  { value: "bottom-left", label: "左下" },
                  { value: "bottom-right", label: "右下" },
                ] as const).map((pos) => (
                  <button
                    key={pos.value}
                    onClick={() => setPipSettings((p) => ({ ...p, position: pos.value }))}
                    className={`py-2 rounded-xl text-xs font-medium transition-all ${
                      pipSettings.position === pos.value
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                    }`}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Size slider */}
            <div>
              <label className="text-xs text-gray-400 block mb-1">サイズ ({pipSettings.size}%)</label>
              <input
                type="range" min={15} max={50}
                value={pipSettings.size}
                onChange={(e) => setPipSettings((p) => ({ ...p, size: parseInt(e.target.value) }))}
                className="w-full"
              />
            </div>

            {/* Border */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">ボーダー幅 ({pipSettings.borderWidth}px)</label>
                <input
                  type="range" min={0} max={10}
                  value={pipSettings.borderWidth}
                  onChange={(e) => setPipSettings((p) => ({ ...p, borderWidth: parseInt(e.target.value) }))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">ボーダー色</label>
                <input
                  type="color"
                  value={pipSettings.borderColor}
                  onChange={(e) => setPipSettings((p) => ({ ...p, borderColor: e.target.value }))}
                  className="w-full h-8 rounded border border-gray-700 cursor-pointer"
                />
              </div>
            </div>

            {/* Start/end time */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-400 block mb-1">開始時間（秒）</label>
                <input
                  type="number" step={0.1} min={0}
                  value={pipSettings.startTime}
                  onChange={(e) => setPipSettings((p) => ({ ...p, startTime: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-2 py-1.5 bg-gray-900 border border-gray-700 rounded text-xs text-white"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">終了時間（秒）</label>
                <input
                  type="number" step={0.1} min={0}
                  placeholder={`${duration.toFixed(1)}`}
                  value={pipSettings.endTime || ""}
                  onChange={(e) => setPipSettings((p) => ({ ...p, endTime: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-2 py-1.5 bg-gray-900 border border-gray-700 rounded text-xs text-white"
                />
              </div>
            </div>
            <p className="text-[10px] text-gray-600">終了時間が0の場合は動画の最後まで表示されます</p>

            <button
              onClick={handleApplyPip}
              disabled={processing || !videoFile || !pipSettings.file}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-500 disabled:opacity-50 transition-colors"
            >
              {processing ? "適用中..." : "ワイプを適用"}
            </button>
          </div>
        )}

        {/* Export Tool */}
        {activeTool === "export" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-200">SNS向け書き出し</h3>
            <p className="text-xs text-gray-500">プラットフォームに合わせたサイズで書き出します</p>

            <div className="grid grid-cols-2 gap-2">
              {ASPECT_PRESETS.map((preset, i) => (
                <button
                  key={preset.label}
                  onClick={() => setSelectedPresetIdx(i)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedPresetIdx === i
                      ? "border-indigo-500 bg-indigo-500/10"
                      : "border-gray-700 bg-gray-800/50 hover:border-gray-600"
                  }`}
                >
                  <p className="text-sm font-medium text-gray-200">{preset.label}</p>
                  <p className="text-[10px] text-gray-500">
                    {preset.width}x{preset.height} ({preset.ratio})
                  </p>
                </button>
              ))}
            </div>

            <button
              onClick={handleExport}
              disabled={processing}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-bold hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 transition-all"
            >
              {processing ? "エクスポート中..." : `${ASPECT_PRESETS[selectedPresetIdx].label}用にエクスポート`}
            </button>

            <button
              onClick={handleDownloadOriginal}
              className="w-full py-3 bg-gray-800 text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors"
            >
              オリジナルサイズでダウンロード
            </button>

            {/* GIF Export Section */}
            <div className="pt-2 border-t border-gray-800">
              <h4 className="text-sm font-bold text-gray-200 mb-1">GIF書き出し</h4>
              <p className="text-xs text-gray-500 mb-3">動画の一部をGIFアニメーションとして書き出します</p>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">開始時間（秒）</label>
                    <input
                      type="number" step={0.1} min={0}
                      value={gifStart}
                      onChange={(e) => setGifStart(parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 bg-gray-900 border border-gray-700 rounded text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">終了時間（秒）</label>
                    <input
                      type="number" step={0.1} min={0}
                      value={gifEnd}
                      onChange={(e) => setGifEnd(parseFloat(e.target.value) || 10)}
                      className="w-full px-2 py-1.5 bg-gray-900 border border-gray-700 rounded text-xs text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-400 block mb-1">FPS ({gifFps})</label>
                  <input
                    type="range" min={5} max={30}
                    value={gifFps}
                    onChange={(e) => setGifFps(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400 block mb-1">横幅 ({gifWidth}px)</label>
                  <input
                    type="range" min={240} max={720} step={10}
                    value={gifWidth}
                    onChange={(e) => setGifWidth(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>

                <button
                  onClick={handleExportGif}
                  disabled={processing}
                  className="w-full py-3 bg-green-700 text-white rounded-xl text-sm font-bold hover:bg-green-600 disabled:opacity-50 transition-colors"
                >
                  {processing ? "GIF作成中..." : "GIFで書き出す"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
