"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { TextOverlay, SubtitleEntry, EditorTool, ASPECT_PRESETS } from "@/lib/types";
import { detectSilence, removeSilence, trimVideo, addBgm, exportWithAspectRatio, SilentSegment } from "@/lib/ffmpeg-utils";

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
  }, []);

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
      setVideoFile(newFile);
      setVideoUrl(URL.createObjectURL(blob));
      setSilentSegments([]);
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
      setVideoFile(newFile);
      setVideoUrl(URL.createObjectURL(blob));
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
      fontSize: 24,
      fontFamily: "sans-serif",
      color: "#ffffff",
      bgColor: "rgba(0,0,0,0.7)",
      startTime: currentTime,
      endTime: Math.min(currentTime + 5, duration),
      bold: true,
      italic: false,
    };
    setTextOverlays((prev) => [...prev, newText]);
    setEditingTextId(newText.id);
  };

  const updateTextOverlay = (id: string, updates: Partial<TextOverlay>) => {
    setTextOverlays((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  };

  const deleteTextOverlay = (id: string) => {
    setTextOverlays((prev) => prev.filter((t) => t.id !== id));
    if (editingTextId === id) setEditingTextId(null);
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
      setVideoFile(newFile);
      setVideoUrl(URL.createObjectURL(blob));
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

  // Draw text overlays on canvas
  useEffect(() => {
    if (!canvasRef.current || !videoRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const drawFrame = () => {
      const video = videoRef.current!;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 360;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

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

          // Background
          if (overlay.bgColor) {
            ctx.fillStyle = overlay.bgColor;
            ctx.fillRect(px - 8, py - textHeight + 4, metrics.width + 16, textHeight + 8);
          }

          ctx.fillStyle = overlay.color;
          ctx.fillText(overlay.text, px, py);
        }
      }

      // Draw subtitles
      for (const sub of subtitles) {
        if (time >= sub.startTime && time <= sub.endTime) {
          const fontSize = Math.max(16, Math.floor(canvas.height / 20));
          ctx.font = `bold ${fontSize}px sans-serif`;
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
  }, [textOverlays, subtitles]);

  // Tool buttons
  const TOOLS: { key: EditorTool; label: string; icon: string }[] = [
    { key: "silence", label: "無音カット", icon: "✂️" },
    { key: "trim", label: "トリミング", icon: "🎬" },
    { key: "text", label: "テロップ", icon: "T" },
    { key: "subtitle", label: "字幕", icon: "💬" },
    { key: "bgm", label: "BGM", icon: "🎵" },
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
          style={{ display: textOverlays.length > 0 || subtitles.length > 0 ? "none" : "block" }}
          playsInline
        />
        <canvas
          ref={canvasRef}
          className="max-w-full max-h-[40vh]"
          style={{ display: textOverlays.length > 0 || subtitles.length > 0 ? "block" : "none" }}
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
        </div>
      </div>

      {/* Tool Bar */}
      <div className="flex gap-1 px-2 py-2 bg-gray-900 border-t border-gray-800 overflow-x-auto">
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
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={overlay.text}
                      onChange={(e) => updateTextOverlay(overlay.id, { text: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-gray-500">サイズ</label>
                        <input
                          type="range"
                          min={12}
                          max={72}
                          value={overlay.fontSize}
                          onChange={(e) => updateTextOverlay(overlay.id, { fontSize: parseInt(e.target.value) })}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500">文字色</label>
                        <input
                          type="color"
                          value={overlay.color}
                          onChange={(e) => updateTextOverlay(overlay.id, { color: e.target.value })}
                          className="w-full h-8 rounded cursor-pointer"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-gray-500">X位置 ({overlay.x}%)</label>
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
                        <label className="text-[10px] text-gray-500">Y位置 ({overlay.y}%)</label>
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
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-gray-500">表示開始</label>
                        <input
                          type="number"
                          step={0.1}
                          value={overlay.startTime}
                          onChange={(e) => updateTextOverlay(overlay.id, { startTime: parseFloat(e.target.value) })}
                          className="w-full px-2 py-1 bg-gray-900 border border-gray-700 rounded text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500">表示終了</label>
                        <input
                          type="number"
                          step={0.1}
                          value={overlay.endTime}
                          onChange={(e) => updateTextOverlay(overlay.id, { endTime: parseFloat(e.target.value) })}
                          className="w-full px-2 py-1 bg-gray-900 border border-gray-700 rounded text-xs text-white"
                        />
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
          </div>
        )}
      </div>
    </div>
  );
}
