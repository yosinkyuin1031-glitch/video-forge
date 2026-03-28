"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { TextOverlay, SubtitleEntry, EditorTool, ASPECT_PRESETS, FONT_OPTIONS, ClipMarker, FilterSettings, TransitionSetting, TransitionType, StickerOverlay, CollageLayout, CollageItem, CollageSettings, SlideshowImage, SlideshowSettings, PipSettings, MosaicArea, ChromaKeySettings, TextAnimation, VideoTemplate, Keyframe, KeyframeProperties, LogoSettings, LogoPosition, ClinicProfile } from "@/lib/types";
import { detectSilence, removeSilence, trimVideo, addBgm, exportWithAspectRatio, SilentSegment, changeSpeed, splitAndReorder, applyFilters, applyTransitions, createCollage, createSlideshow, applyPip, exportGif, applyMosaicAreas, applyChromaKey, extractAudio, applyLogo } from "@/lib/ffmpeg-utils";
import ClinicProfileSetup from "./ClinicProfileSetup";
import ViralTemplateGallery from "./ViralTemplateGallery";
import { VIRAL_TEMPLATES } from "@/lib/viral-templates";

// ===== BGM LIBRARY =====
type BgmItemKey =
  | "upbeat" | "chill" | "cinematic" | "happy" | "epic" | "jazz"
  | "techno" | "acoustic" | "horror" | "tropical" | "piano" | "rock"
  | "clap" | "drumroll" | "chime" | "buzzer" | "pop" | "swoosh"
  | "click" | "bell" | "correct" | "wrong" | "countdown" | "fanfare"
  | "dramatic" | "sparkle" | "laugh" | "heartbeat";

const BGM_CATEGORIES: { name: string; items: { name: string; desc: string; duration: string; key: BgmItemKey }[] }[] = [
  {
    name: "BGM",
    items: [
      { name: "アップビート", desc: "明るいポップ・高速アルペジオ", duration: "8秒", key: "upbeat" },
      { name: "チル/LoFi", desc: "ゆったりジャジーな雰囲気", duration: "8秒", key: "chill" },
      { name: "シネマティック", desc: "映画風・低ドローン", duration: "8秒", key: "cinematic" },
      { name: "ハッピー", desc: "楽しいウクレレ風", duration: "8秒", key: "happy" },
      { name: "エピック", desc: "壮大オーケストラ・ティンパニ", duration: "8秒", key: "epic" },
      { name: "ジャズ", desc: "ウォーキングベース・スウィング", duration: "8秒", key: "jazz" },
      { name: "テクノ/EDM", desc: "4つ打ちキック・シンセ", duration: "8秒", key: "techno" },
      { name: "アコースティック", desc: "優しいフィンガーピッキング", duration: "8秒", key: "acoustic" },
      { name: "ホラー", desc: "不協和音・緊張感", duration: "8秒", key: "horror" },
      { name: "トロピカル", desc: "スチールドラム・レゲエ", duration: "8秒", key: "tropical" },
      { name: "ピアノバラード", desc: "優しいピアノアルペジオ", duration: "8秒", key: "piano" },
      { name: "ロック", desc: "パワーコード・ドラム", duration: "8秒", key: "rock" },
    ]
  },
  {
    name: "効果音",
    items: [
      { name: "拍手", desc: "パチパチ", duration: "1.5秒", key: "clap" },
      { name: "ドラムロール", desc: "ダダダダ", duration: "2秒", key: "drumroll" },
      { name: "チャイム", desc: "キラーン", duration: "2秒", key: "chime" },
      { name: "ブザー", desc: "ブブー", duration: "0.8秒", key: "buzzer" },
      { name: "ポップ", desc: "ポンッ", duration: "0.5秒", key: "pop" },
      { name: "スウッシュ", desc: "シュッ", duration: "0.8秒", key: "swoosh" },
      { name: "クリック", desc: "カチッ", duration: "0.2秒", key: "click" },
      { name: "ベル", desc: "チーン", duration: "2秒", key: "bell" },
      { name: "正解", desc: "ピンポン↑", duration: "0.6秒", key: "correct" },
      { name: "不正解", desc: "ブー↓", duration: "0.6秒", key: "wrong" },
      { name: "カウントダウン", desc: "3・2・1・ドン", duration: "3秒", key: "countdown" },
      { name: "ファンファーレ", desc: "昇順コード", duration: "1.5秒", key: "fanfare" },
      { name: "ドラマティック", desc: "ドーン！大きなインパクト", duration: "1.5秒", key: "dramatic" },
      { name: "キラキラ", desc: "高音キラキラカスケード", duration: "1秒", key: "sparkle" },
      { name: "笑い声風", desc: "リズミカルな変調音", duration: "1.5秒", key: "laugh" },
      { name: "心臓の鼓動", desc: "低いドクドク", duration: "2秒", key: "heartbeat" },
    ]
  }
];

// ===== VIDEO TEMPLATES =====
const VIDEO_TEMPLATES: VideoTemplate[] = [
  // ===== YOUTUBE TEMPLATES =====
  {
    id: "yt-op",
    name: "YouTube OP（オープニング）",
    platform: "youtube",
    category: "YouTube",
    description: "大きなタイトルとサブタイトルで動画の掴みを演出",
    aspectRatio: 0,
    textOverlays: [
      { text: "チャンネル名", fontSize: 48, bold: true, color: "#ffffff", bgColor: "transparent", outlineColor: "#000000", outlineWidth: 4, shadowColor: "rgba(0,0,0,0.8)", shadowBlur: 0, shadowOffsetX: 2, shadowOffsetY: 2, italic: false, x: 50, y: 45, fontFamily: "sans-serif", animation: "zoom-in" },
      { text: "エピソード名をここに", fontSize: 24, bold: false, color: "#ffffff", bgColor: "rgba(0,0,0,0.5)", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 60, fontFamily: "sans-serif", animation: "fade-in" },
    ],
    stickers: [
      { emoji: "▶️", x: 85, y: 85, size: 60, rotation: 0, opacity: 1, animation: "pulse" },
    ],
  },
  {
    id: "yt-ed",
    name: "YouTube ED（エンディング）",
    platform: "youtube",
    category: "YouTube",
    description: "感謝メッセージ＋チャンネル登録・高評価の促進",
    aspectRatio: 0,
    textOverlays: [
      { text: "ご視聴ありがとうございました!", fontSize: 36, bold: true, color: "#ffffff", bgColor: "transparent", outlineColor: "#000000", outlineWidth: 3, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 30, fontFamily: "sans-serif", animation: "fade-in" },
      { text: "チャンネル登録お願いします!", fontSize: 28, bold: true, color: "#ff0000", bgColor: "#ffffff", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 50, fontFamily: "sans-serif", animation: "bounce-in" },
      { text: "高評価もお忘れなく👍", fontSize: 22, bold: false, color: "#ffffff", bgColor: "transparent", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 65, fontFamily: "sans-serif", animation: "slide-up" },
    ],
    stickers: [
      { emoji: "🔔", x: 85, y: 10, size: 80, rotation: 0, opacity: 1, animation: "bounce" },
      { emoji: "👍", x: 15, y: 85, size: 60, rotation: 0, opacity: 1, animation: "bounce" },
    ],
  },
  {
    id: "yt-subscribe",
    name: "チャンネル登録促進",
    platform: "youtube",
    category: "YouTube",
    description: "画面端に登録を促すバナーを表示",
    aspectRatio: 0,
    textOverlays: [
      { text: "チャンネル登録", fontSize: 32, bold: true, color: "#ffffff", bgColor: "#ff0000", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 80, y: 85, fontFamily: "sans-serif", animation: "bounce-in" },
      { text: "🔔通知をONに!", fontSize: 20, bold: false, color: "#ffffff", bgColor: "transparent", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 80, y: 92, fontFamily: "sans-serif", animation: "fade-in" },
    ],
    stickers: [
      { emoji: "👆", x: 80, y: 78, size: 50, rotation: 0, opacity: 1, animation: "bounce" },
    ],
  },
  {
    id: "yt-commentary",
    name: "YouTube解説風",
    platform: "youtube",
    category: "YouTube",
    description: "ポイント番号＋説明テキストの解説スタイル",
    aspectRatio: 0,
    textOverlays: [
      { text: "ポイント①", fontSize: 36, bold: true, color: "#ffff00", bgColor: "transparent", outlineColor: "#000000", outlineWidth: 3, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 15, y: 15, fontFamily: "sans-serif", animation: "slide-right" },
      { text: "ここに説明テキスト", fontSize: 24, bold: false, color: "#ffffff", bgColor: "rgba(0,0,0,0.8)", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 85, fontFamily: "sans-serif", animation: "fade-in" },
    ],
    stickers: [
      { emoji: "💡", x: 5, y: 10, size: 50, rotation: 0, opacity: 1, animation: "pulse" },
    ],
  },
  {
    id: "yt-impact",
    name: "YouTubeサムネ風テロップ",
    platform: "youtube",
    category: "YouTube",
    description: "衝撃的な大型テロップで視聴者の目を引く",
    aspectRatio: 0,
    textOverlays: [
      { text: "衝撃の結果...", fontSize: 52, bold: true, color: "#ffffff", bgColor: "transparent", outlineColor: "#ff0000", outlineWidth: 5, shadowColor: "#ff0000", shadowBlur: 10, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 50, fontFamily: "'Arial Black', 'Impact', sans-serif", animation: "shake" },
      { text: "※マジです", fontSize: 28, bold: true, color: "#ffff00", bgColor: "transparent", outlineColor: "#000000", outlineWidth: 3, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 75, y: 75, fontFamily: "sans-serif", animation: "bounce-in" },
    ],
    stickers: [],
  },
  {
    id: "yt-ranking",
    name: "比較・ランキング",
    platform: "youtube",
    category: "YouTube",
    description: "ランキング形式のテロップ構成",
    aspectRatio: 0,
    textOverlays: [
      { text: "第1位", fontSize: 48, bold: true, color: "#ffd700", bgColor: "transparent", outlineColor: "#000000", outlineWidth: 4, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 15, fontFamily: "sans-serif", animation: "scale-up" },
      { text: "タイトルをここに", fontSize: 28, bold: false, color: "#ffffff", bgColor: "rgba(0,0,0,0.7)", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 50, fontFamily: "sans-serif", animation: "fade-in" },
    ],
    stickers: [
      { emoji: "🏆", x: 35, y: 10, size: 60, rotation: 0, opacity: 1, animation: "bounce" },
      { emoji: "⭐", x: 65, y: 10, size: 40, rotation: 0, opacity: 1, animation: "pulse" },
    ],
  },
  {
    id: "yt-vlog",
    name: "Vlog風",
    platform: "youtube",
    category: "YouTube",
    description: "旅・日常vlog向けのシンプルなテロップ",
    aspectRatio: 0,
    textOverlays: [
      { text: "Day 1", fontSize: 42, bold: true, color: "#ffffff", bgColor: "transparent", outlineColor: "#000000", outlineWidth: 0, shadowColor: "rgba(0,0,0,0.8)", shadowBlur: 8, shadowOffsetX: 2, shadowOffsetY: 2, italic: false, x: 10, y: 15, fontFamily: "'Georgia', 'Times New Roman', serif", animation: "typewriter" },
      { text: "場所名をここに", fontSize: 22, bold: false, color: "#ffffff", bgColor: "transparent", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 10, y: 90, fontFamily: "sans-serif", animation: "fade-in" },
    ],
    stickers: [
      { emoji: "📍", x: 5, y: 87, size: 30, rotation: 0, opacity: 1, animation: "float" },
    ],
  },
  {
    id: "yt-gaming",
    name: "ゲーム実況",
    platform: "youtube",
    category: "YouTube",
    description: "ゲーム実況向けのド派手な演出",
    aspectRatio: 0,
    textOverlays: [
      { text: "GAME START!", fontSize: 44, bold: true, color: "#00ff00", bgColor: "transparent", outlineColor: "#000000", outlineWidth: 4, shadowColor: "#00ff00", shadowBlur: 12, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 40, fontFamily: "'Arial Black', 'Impact', sans-serif", animation: "zoom-in" },
      { text: "プレイヤー名", fontSize: 22, bold: false, color: "#ffffff", bgColor: "rgba(0,0,0,0.6)", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 10, y: 8, fontFamily: "sans-serif", animation: "slide-right" },
    ],
    stickers: [
      { emoji: "🎮", x: 3, y: 5, size: 40, rotation: 0, opacity: 1, animation: "none" },
      { emoji: "🔴", x: 92, y: 5, size: 25, rotation: 0, opacity: 1, animation: "pulse" },
    ],
  },
  // ===== REELS TEMPLATES =====
  {
    id: "reels-trend",
    name: "Reelsトレンド風",
    platform: "reels",
    category: "Reels",
    description: "インパクトあるキャッチコピーとハッシュタグ",
    aspectRatio: 1,
    textOverlays: [
      { text: "キャッチコピーここ", fontSize: 38, bold: true, color: "#ffffff", bgColor: "transparent", outlineColor: "#000000", outlineWidth: 3, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 40, fontFamily: "sans-serif", animation: "bounce-in" },
      { text: "#ハッシュタグ #リール", fontSize: 18, bold: false, color: "#ffffff", bgColor: "transparent", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 92, fontFamily: "sans-serif", animation: "fade-in" },
    ],
    stickers: [
      { emoji: "✨", x: 20, y: 35, size: 40, rotation: 0, opacity: 1, animation: "pulse" },
      { emoji: "✨", x: 80, y: 35, size: 40, rotation: 0, opacity: 1, animation: "pulse" },
    ],
  },
  {
    id: "reels-product",
    name: "Reels商品紹介",
    platform: "reels",
    category: "Reels",
    description: "商品名・価格・プロフィールリンク誘導のセット",
    aspectRatio: 1,
    textOverlays: [
      { text: "商品名", fontSize: 34, bold: true, color: "#ffffff", bgColor: "rgba(0,0,0,0.6)", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 35, fontFamily: "sans-serif", animation: "scale-up" },
      { text: "¥0,000", fontSize: 28, bold: true, color: "#ffff00", bgColor: "transparent", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 45, fontFamily: "sans-serif", animation: "fade-in" },
      { text: "詳しくはプロフィールのリンクから", fontSize: 16, bold: false, color: "#ffffff", bgColor: "transparent", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 90, fontFamily: "sans-serif", animation: "slide-up" },
    ],
    stickers: [
      { emoji: "🔥", x: 15, y: 30, size: 50, rotation: 0, opacity: 1, animation: "float" },
      { emoji: "👇", x: 50, y: 95, size: 40, rotation: 0, opacity: 1, animation: "bounce" },
    ],
  },
  {
    id: "reels-beforeafter",
    name: "Reelsビフォーアフター",
    platform: "reels",
    category: "Reels",
    description: "ビフォー・アフターを対比させる構成",
    aspectRatio: 1,
    textOverlays: [
      { text: "Before", fontSize: 36, bold: true, color: "#ffffff", bgColor: "transparent", outlineColor: "#ff0000", outlineWidth: 3, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 25, y: 15, fontFamily: "sans-serif", animation: "fade-in" },
      { text: "After", fontSize: 36, bold: true, color: "#ffffff", bgColor: "transparent", outlineColor: "#00ff00", outlineWidth: 3, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 75, y: 15, fontFamily: "sans-serif", animation: "fade-in" },
    ],
    stickers: [
      { emoji: "➡️", x: 50, y: 15, size: 40, rotation: 0, opacity: 1, animation: "pulse" },
    ],
  },
  {
    id: "reels-recipe",
    name: "Reelsレシピ・料理",
    platform: "reels",
    category: "Reels",
    description: "料理・レシピ動画向けのテロップ構成",
    aspectRatio: 1,
    textOverlays: [
      { text: "レシピ名", fontSize: 32, bold: true, color: "#ffffff", bgColor: "rgba(0,0,0,0.5)", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 10, fontFamily: "sans-serif", animation: "slide-down" },
      { text: "材料: ここに記入", fontSize: 20, bold: false, color: "#ffffff", bgColor: "rgba(0,0,0,0.6)", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 80, fontFamily: "sans-serif", animation: "fade-in" },
    ],
    stickers: [
      { emoji: "🍳", x: 85, y: 8, size: 40, rotation: 0, opacity: 1, animation: "none" },
    ],
  },
  {
    id: "reels-motivation",
    name: "Reelsモチベーション",
    platform: "reels",
    category: "Reels",
    description: "名言・モチベーション動画向けのエレガントな構成",
    aspectRatio: 1,
    textOverlays: [
      { text: "名言をここに", fontSize: 34, bold: true, color: "#ffffff", bgColor: "transparent", outlineColor: "#000000", outlineWidth: 0, shadowColor: "rgba(0,0,0,0.8)", shadowBlur: 6, shadowOffsetX: 2, shadowOffsetY: 2, italic: false, x: 50, y: 45, fontFamily: "'Georgia', 'Times New Roman', serif", animation: "typewriter" },
      { text: "— 著者名", fontSize: 20, bold: false, color: "#ffffff", bgColor: "transparent", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: true, x: 50, y: 58, fontFamily: "sans-serif", animation: "fade-in" },
    ],
    stickers: [
      { emoji: "💫", x: 15, y: 40, size: 30, rotation: 0, opacity: 1, animation: "float" },
    ],
  },
  {
    id: "reels-exercise",
    name: "Reelsダンス・エクササイズ",
    platform: "reels",
    category: "Reels",
    description: "フィットネス・ダンス動画向けの元気なテロップ",
    aspectRatio: 1,
    textOverlays: [
      { text: "エクササイズ名", fontSize: 30, bold: true, color: "#ffffff", bgColor: "transparent", outlineColor: "#000000", outlineWidth: 3, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 8, fontFamily: "sans-serif", animation: "slide-down" },
      { text: "30秒 × 3セット", fontSize: 22, bold: false, color: "#ffff00", bgColor: "rgba(0,0,0,0.6)", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 88, fontFamily: "sans-serif", animation: "fade-in" },
    ],
    stickers: [
      { emoji: "💪", x: 90, y: 5, size: 45, rotation: 0, opacity: 1, animation: "pulse" },
      { emoji: "🔥", x: 10, y: 5, size: 45, rotation: 0, opacity: 1, animation: "float" },
    ],
  },
  {
    id: "reels-qa",
    name: "Reels Q&A",
    platform: "reels",
    category: "Reels",
    description: "質問と回答をわかりやすく表示するQ&A形式",
    aspectRatio: 1,
    textOverlays: [
      { text: "Q. 質問をここに？", fontSize: 30, bold: true, color: "#ffffff", bgColor: "#6366f1", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 30, fontFamily: "sans-serif", animation: "slide-right" },
      { text: "A. 回答をここに", fontSize: 26, bold: false, color: "#ffffff", bgColor: "rgba(0,0,0,0.7)", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 55, fontFamily: "sans-serif", animation: "fade-in" },
    ],
    stickers: [
      { emoji: "❓", x: 15, y: 25, size: 50, rotation: 0, opacity: 1, animation: "bounce" },
    ],
  },
  {
    id: "reels-sale",
    name: "Reelsセール・告知",
    platform: "reels",
    category: "Reels",
    description: "セール・キャンペーン告知向けの派手な構成",
    aspectRatio: 1,
    textOverlays: [
      { text: "SALE", fontSize: 56, bold: true, color: "#ff0000", bgColor: "transparent", outlineColor: "#ffffff", outlineWidth: 4, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 30, fontFamily: "'Arial Black', 'Impact', sans-serif", animation: "shake" },
      { text: "最大50%OFF", fontSize: 32, bold: true, color: "#ffff00", bgColor: "transparent", outlineColor: "#000000", outlineWidth: 3, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 45, fontFamily: "sans-serif", animation: "bounce-in" },
      { text: "期間限定 〇/〇まで", fontSize: 20, bold: false, color: "#ffffff", bgColor: "transparent", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 60, fontFamily: "sans-serif", animation: "flicker" },
    ],
    stickers: [
      { emoji: "🏷️", x: 15, y: 25, size: 50, rotation: 0, opacity: 1, animation: "float" },
      { emoji: "🎉", x: 85, y: 25, size: 50, rotation: 0, opacity: 1, animation: "bounce" },
    ],
  },
  // ===== 治療家専用テンプレート =====
  // --- 症状解説 ---
  { id: "th-symptom-01", name: "腰痛改善ストレッチ", platform: "therapist", category: "症状解説", description: "腰痛改善ストレッチ3選の紹介テロップ", textOverlays: [{ text: "腰痛改善ストレッチ3選", fontSize: 40, bold: true, color: "#ffffff", bgColor: "transparent", outlineColor: "#1e40af", outlineWidth: 4, shadowColor: "rgba(0,0,0,0.8)", shadowBlur: 6, shadowOffsetX: 2, shadowOffsetY: 2, italic: false, x: 50, y: 40, fontFamily: "sans-serif", animation: "slide-right" }, { text: "自宅でできる簡単ケア", fontSize: 24, bold: false, color: "#ffffff", bgColor: "rgba(30,64,175,0.7)", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 58, fontFamily: "sans-serif", animation: "fade-in" }], stickers: [{ emoji: "💪", x: 85, y: 35, size: 60, rotation: 0, opacity: 1, animation: "pulse" }] },
  { id: "th-symptom-02", name: "肩こり解消法", platform: "therapist", category: "症状解説", description: "肩こりがラクになる方法の紹介テロップ", textOverlays: [{ text: "肩こりがラクになる方法", fontSize: 38, bold: true, color: "#ffffff", bgColor: "transparent", outlineColor: "#0e7490", outlineWidth: 4, shadowColor: "rgba(0,0,0,0.8)", shadowBlur: 6, shadowOffsetX: 2, shadowOffsetY: 2, italic: false, x: 50, y: 40, fontFamily: "sans-serif", animation: "slide-right" }, { text: "〇〇整体院", fontSize: 22, bold: false, color: "#ffffff", bgColor: "rgba(14,116,144,0.7)", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 58, fontFamily: "sans-serif", animation: "fade-in" }], stickers: [{ emoji: "🙆", x: 85, y: 35, size: 60, rotation: 0, opacity: 1, animation: "float" }] },
  { id: "th-symptom-03", name: "頭痛の原因と対策", platform: "therapist", category: "症状解説", description: "その頭痛、首が原因かも？の解説テロップ", textOverlays: [{ text: "その頭痛、首が原因かも？", fontSize: 36, bold: true, color: "#ffffff", bgColor: "transparent", outlineColor: "#6d28d9", outlineWidth: 4, shadowColor: "rgba(0,0,0,0.8)", shadowBlur: 6, shadowOffsetX: 2, shadowOffsetY: 2, italic: false, x: 50, y: 40, fontFamily: "sans-serif", animation: "slide-right" }, { text: "専門家が解説", fontSize: 22, bold: false, color: "#ffffff", bgColor: "rgba(109,40,217,0.7)", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 58, fontFamily: "sans-serif", animation: "fade-in" }], stickers: [{ emoji: "🧠", x: 85, y: 35, size: 60, rotation: 0, opacity: 1, animation: "pulse" }] },
  { id: "th-symptom-04", name: "膝痛予防体操", platform: "therapist", category: "症状解説", description: "膝が痛い方向けの毎日3分体操テロップ", textOverlays: [{ text: "膝が痛い方必見", fontSize: 42, bold: true, color: "#ffffff", bgColor: "transparent", outlineColor: "#1e40af", outlineWidth: 4, shadowColor: "rgba(0,0,0,0.8)", shadowBlur: 6, shadowOffsetX: 2, shadowOffsetY: 2, italic: false, x: 50, y: 40, fontFamily: "sans-serif", animation: "slide-right" }, { text: "毎日3分でOK", fontSize: 24, bold: false, color: "#ffffff", bgColor: "rgba(30,64,175,0.7)", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 58, fontFamily: "sans-serif", animation: "fade-in" }], stickers: [{ emoji: "🦵", x: 85, y: 35, size: 60, rotation: 0, opacity: 1, animation: "bounce" }] },
  { id: "th-symptom-05", name: "坐骨神経痛", platform: "therapist", category: "症状解説", description: "坐骨神経痛の正体と原因解説テロップ", textOverlays: [{ text: "坐骨神経痛の正体", fontSize: 40, bold: true, color: "#ffffff", bgColor: "transparent", outlineColor: "#b91c1c", outlineWidth: 4, shadowColor: "rgba(0,0,0,0.8)", shadowBlur: 6, shadowOffsetX: 2, shadowOffsetY: 2, italic: false, x: 50, y: 40, fontFamily: "sans-serif", animation: "slide-right" }, { text: "なぜ痛みが出るのか", fontSize: 22, bold: false, color: "#ffffff", bgColor: "rgba(185,28,28,0.7)", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 58, fontFamily: "sans-serif", animation: "fade-in" }], stickers: [{ emoji: "⚡", x: 85, y: 35, size: 60, rotation: 0, opacity: 1, animation: "pulse" }] },
  { id: "th-symptom-06", name: "猫背改善", platform: "therapist", category: "症状解説", description: "猫背を治す姿勢リセットテロップ", textOverlays: [{ text: "猫背を治す姿勢リセット", fontSize: 36, bold: true, color: "#ffffff", bgColor: "transparent", outlineColor: "#0e7490", outlineWidth: 4, shadowColor: "rgba(0,0,0,0.8)", shadowBlur: 6, shadowOffsetX: 2, shadowOffsetY: 2, italic: false, x: 50, y: 40, fontFamily: "sans-serif", animation: "slide-right" }, { text: "デスクワークの方へ", fontSize: 22, bold: false, color: "#ffffff", bgColor: "rgba(14,116,144,0.7)", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 58, fontFamily: "sans-serif", animation: "fade-in" }], stickers: [{ emoji: "🧘", x: 85, y: 35, size: 60, rotation: 0, opacity: 1, animation: "float" }] },
  { id: "th-symptom-07", name: "自律神経", platform: "therapist", category: "症状解説", description: "自律神経を整える3つの習慣テロップ", textOverlays: [{ text: "自律神経を整える3つの習慣", fontSize: 34, bold: true, color: "#ffffff", bgColor: "transparent", outlineColor: "#065f46", outlineWidth: 4, shadowColor: "rgba(0,0,0,0.8)", shadowBlur: 6, shadowOffsetX: 2, shadowOffsetY: 2, italic: false, x: 50, y: 40, fontFamily: "sans-serif", animation: "slide-right" }, { text: "不調の根本原因", fontSize: 22, bold: false, color: "#ffffff", bgColor: "rgba(6,95,70,0.7)", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 58, fontFamily: "sans-serif", animation: "fade-in" }], stickers: [{ emoji: "🌿", x: 85, y: 35, size: 60, rotation: 0, opacity: 1, animation: "float" }] },
  { id: "th-symptom-08", name: "五十肩", platform: "therapist", category: "症状解説", description: "五十肩のセルフケアテロップ", textOverlays: [{ text: "五十肩のセルフケア", fontSize: 40, bold: true, color: "#ffffff", bgColor: "transparent", outlineColor: "#1e40af", outlineWidth: 4, shadowColor: "rgba(0,0,0,0.8)", shadowBlur: 6, shadowOffsetX: 2, shadowOffsetY: 2, italic: false, x: 50, y: 40, fontFamily: "sans-serif", animation: "slide-right" }, { text: "動かし方がポイント", fontSize: 22, bold: false, color: "#ffffff", bgColor: "rgba(30,64,175,0.7)", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 58, fontFamily: "sans-serif", animation: "fade-in" }], stickers: [{ emoji: "💫", x: 85, y: 35, size: 60, rotation: 0, opacity: 1, animation: "pulse" }] },
  { id: "th-symptom-09", name: "ぎっくり腰", platform: "therapist", category: "症状解説", description: "ぎっくり腰のNG行動解説テロップ", textOverlays: [{ text: "ぎっくり腰になったら", fontSize: 38, bold: true, color: "#ffffff", bgColor: "transparent", outlineColor: "#b91c1c", outlineWidth: 4, shadowColor: "rgba(0,0,0,0.8)", shadowBlur: 6, shadowOffsetX: 2, shadowOffsetY: 2, italic: false, x: 50, y: 40, fontFamily: "sans-serif", animation: "slide-right" }, { text: "やってはいけないNG行動", fontSize: 22, bold: true, color: "#ffff00", bgColor: "rgba(185,28,28,0.8)", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 58, fontFamily: "sans-serif", animation: "bounce-in" }], stickers: [{ emoji: "⚠️", x: 85, y: 35, size: 60, rotation: 0, opacity: 1, animation: "pulse" }] },
  { id: "th-symptom-10", name: "不眠・睡眠", platform: "therapist", category: "症状解説", description: "眠れない夜のストレッチテロップ", textOverlays: [{ text: "眠れない夜にこのストレッチ", fontSize: 34, bold: true, color: "#ffffff", bgColor: "transparent", outlineColor: "#1e40af", outlineWidth: 4, shadowColor: "rgba(0,0,0,0.8)", shadowBlur: 6, shadowOffsetX: 2, shadowOffsetY: 2, italic: false, x: 50, y: 40, fontFamily: "sans-serif", animation: "fade-in" }, { text: "3分で深い眠りへ", fontSize: 22, bold: false, color: "#ffffff", bgColor: "rgba(30,64,175,0.7)", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 58, fontFamily: "sans-serif", animation: "fade-in" }], stickers: [{ emoji: "😴", x: 85, y: 35, size: 60, rotation: 0, opacity: 1, animation: "float" }] },
  // --- 施術紹介 ---
  { id: "th-treatment-01", name: "ビフォーアフター", platform: "therapist", category: "施術紹介", description: "施術前後の変化を対比表示", textOverlays: [{ text: "Before → After", fontSize: 44, bold: true, color: "#ffffff", bgColor: "transparent", outlineColor: "#000000", outlineWidth: 4, shadowColor: "rgba(0,0,0,0.8)", shadowBlur: 8, shadowOffsetX: 2, shadowOffsetY: 2, italic: false, x: 50, y: 35, fontFamily: "'Arial Black', 'Impact', sans-serif", animation: "scale-up" }, { text: "施術前後の変化", fontSize: 22, bold: false, color: "#ffffff", bgColor: "rgba(0,0,0,0.7)", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 55, fontFamily: "sans-serif", animation: "fade-in" }], stickers: [{ emoji: "✨", x: 85, y: 30, size: 60, rotation: 0, opacity: 1, animation: "pulse" }] },
  { id: "th-treatment-02", name: "施術風景", platform: "therapist", category: "施術紹介", description: "施術の様子を紹介するテロップ", textOverlays: [{ text: "施術の様子", fontSize: 40, bold: true, color: "#ffffff", bgColor: "transparent", outlineColor: "#0e7490", outlineWidth: 4, shadowColor: "rgba(0,0,0,0.8)", shadowBlur: 6, shadowOffsetX: 2, shadowOffsetY: 2, italic: false, x: 50, y: 40, fontFamily: "sans-serif", animation: "fade-in" }, { text: "〇〇整体院", fontSize: 22, bold: false, color: "#ffffff", bgColor: "rgba(14,116,144,0.7)", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 58, fontFamily: "sans-serif", animation: "fade-in" }], stickers: [{ emoji: "🏥", x: 85, y: 35, size: 60, rotation: 0, opacity: 1, animation: "none" }] },
  { id: "th-treatment-03", name: "施術メニュー紹介", platform: "therapist", category: "施術紹介", description: "当院のメニューとお悩み別施術の紹介", textOverlays: [{ text: "当院のメニュー", fontSize: 40, bold: true, color: "#ffffff", bgColor: "transparent", outlineColor: "#1e40af", outlineWidth: 4, shadowColor: "rgba(0,0,0,0.8)", shadowBlur: 6, shadowOffsetX: 2, shadowOffsetY: 2, italic: false, x: 50, y: 40, fontFamily: "sans-serif", animation: "slide-right" }, { text: "お悩みに合わせた施術", fontSize: 22, bold: false, color: "#ffffff", bgColor: "rgba(30,64,175,0.7)", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 58, fontFamily: "sans-serif", animation: "fade-in" }], stickers: [{ emoji: "📋", x: 85, y: 35, size: 60, rotation: 0, opacity: 1, animation: "none" }] },
  { id: "th-treatment-04", name: "新メニュー告知", platform: "therapist", category: "施術紹介", description: "新メニュー開始の告知テロップ", textOverlays: [{ text: "NEW MENU", fontSize: 48, bold: true, color: "#ffffff", bgColor: "#dc2626", outlineColor: "#ffffff", outlineWidth: 2, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 35, fontFamily: "'Arial Black', 'Impact', sans-serif", animation: "bounce-in" }, { text: "〇月スタート！", fontSize: 26, bold: true, color: "#ffff00", bgColor: "transparent", outlineColor: "#000000", outlineWidth: 3, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 58, fontFamily: "sans-serif", animation: "shake" }], stickers: [{ emoji: "🆕", x: 85, y: 30, size: 60, rotation: 0, opacity: 1, animation: "bounce" }] },
  { id: "th-treatment-05", name: "初回体験", platform: "therapist", category: "施術紹介", description: "初回限定価格の告知テロップ", textOverlays: [{ text: "初回限定 〇〇円", fontSize: 40, bold: true, color: "#ffff00", bgColor: "#dc2626", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 35, fontFamily: "sans-serif", animation: "bounce-in" }, { text: "まずはお試しください", fontSize: 22, bold: false, color: "#ffffff", bgColor: "rgba(0,0,0,0.7)", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 58, fontFamily: "sans-serif", animation: "fade-in" }], stickers: [{ emoji: "🎁", x: 85, y: 30, size: 60, rotation: 0, opacity: 1, animation: "bounce" }] },
  { id: "th-treatment-06", name: "技術紹介", platform: "therapist", category: "施術紹介", description: "独自療法の説明テロップ", textOverlays: [{ text: "〇〇療法とは？", fontSize: 40, bold: true, color: "#ffffff", bgColor: "transparent", outlineColor: "#0e7490", outlineWidth: 4, shadowColor: "rgba(0,0,0,0.8)", shadowBlur: 6, shadowOffsetX: 2, shadowOffsetY: 2, italic: false, x: 50, y: 40, fontFamily: "sans-serif", animation: "slide-right" }, { text: "当院独自のアプローチ", fontSize: 22, bold: false, color: "#ffffff", bgColor: "rgba(14,116,144,0.7)", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 58, fontFamily: "sans-serif", animation: "fade-in" }], stickers: [{ emoji: "🔬", x: 85, y: 35, size: 60, rotation: 0, opacity: 1, animation: "pulse" }] },
  { id: "th-treatment-07", name: "検査・カウンセリング", platform: "therapist", category: "施術紹介", description: "まず検査から始める大切さのテロップ", textOverlays: [{ text: "まず検査から", fontSize: 44, bold: true, color: "#ffffff", bgColor: "transparent", outlineColor: "#1e40af", outlineWidth: 4, shadowColor: "rgba(0,0,0,0.8)", shadowBlur: 6, shadowOffsetX: 2, shadowOffsetY: 2, italic: false, x: 50, y: 40, fontFamily: "sans-serif", animation: "slide-right" }, { text: "原因を見つけることが大切", fontSize: 20, bold: false, color: "#ffffff", bgColor: "rgba(30,64,175,0.7)", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 58, fontFamily: "sans-serif", animation: "fade-in" }], stickers: [{ emoji: "🔍", x: 85, y: 35, size: 60, rotation: 0, opacity: 1, animation: "pulse" }] },
  { id: "th-treatment-08", name: "通院の流れ", platform: "therapist", category: "施術紹介", description: "初めての方向け通院フロー説明テロップ", textOverlays: [{ text: "初めての方へ", fontSize: 40, bold: true, color: "#ffffff", bgColor: "transparent", outlineColor: "#0e7490", outlineWidth: 4, shadowColor: "rgba(0,0,0,0.8)", shadowBlur: 6, shadowOffsetX: 2, shadowOffsetY: 2, italic: false, x: 50, y: 40, fontFamily: "sans-serif", animation: "slide-right" }, { text: "ご予約〜施術の流れ", fontSize: 22, bold: false, color: "#ffffff", bgColor: "rgba(14,116,144,0.7)", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 58, fontFamily: "sans-serif", animation: "fade-in" }], stickers: [{ emoji: "📝", x: 85, y: 35, size: 60, rotation: 0, opacity: 1, animation: "none" }] },
  // --- 患者の声 ---
  { id: "th-voice-01", name: "患者の声（基本）", platform: "therapist", category: "患者の声", description: "患者様の声の基本テロップ", textOverlays: [{ text: "患者様の声", fontSize: 42, bold: true, color: "#ffffff", bgColor: "transparent", outlineColor: "#1e40af", outlineWidth: 4, shadowColor: "rgba(0,0,0,0.8)", shadowBlur: 6, shadowOffsetX: 2, shadowOffsetY: 2, italic: false, x: 50, y: 35, fontFamily: "sans-serif", animation: "typewriter" }, { text: "〇〇でお悩みだったA様", fontSize: 22, bold: false, color: "#ffffff", bgColor: "rgba(30,64,175,0.7)", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 58, fontFamily: "sans-serif", animation: "fade-in" }], stickers: [{ emoji: "💬", x: 85, y: 30, size: 60, rotation: 0, opacity: 1, animation: "pulse" }] },
  { id: "th-voice-02", name: "喜びの声", platform: "therapist", category: "患者の声", description: "嬉しいお言葉・改善事例テロップ", textOverlays: [{ text: "嬉しいお言葉いただきました", fontSize: 32, bold: true, color: "#ffffff", bgColor: "transparent", outlineColor: "#065f46", outlineWidth: 4, shadowColor: "rgba(0,0,0,0.8)", shadowBlur: 6, shadowOffsetX: 2, shadowOffsetY: 2, italic: false, x: 50, y: 35, fontFamily: "sans-serif", animation: "typewriter" }, { text: "改善事例", fontSize: 22, bold: false, color: "#ffffff", bgColor: "rgba(6,95,70,0.7)", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 58, fontFamily: "sans-serif", animation: "fade-in" }], stickers: [{ emoji: "😊", x: 85, y: 30, size: 60, rotation: 0, opacity: 1, animation: "bounce" }] },
  { id: "th-voice-03", name: "口コミ紹介", platform: "therapist", category: "患者の声", description: "Google口コミ5つ星の紹介テロップ", textOverlays: [{ text: "Google口コミ ★★★★★", fontSize: 32, bold: true, color: "#ffd700", bgColor: "transparent", outlineColor: "#000000", outlineWidth: 3, shadowColor: "rgba(0,0,0,0.8)", shadowBlur: 6, shadowOffsetX: 2, shadowOffsetY: 2, italic: false, x: 50, y: 35, fontFamily: "sans-serif", animation: "scale-up" }, { text: "ありがとうございます", fontSize: 22, bold: false, color: "#ffffff", bgColor: "rgba(0,0,0,0.7)", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 58, fontFamily: "sans-serif", animation: "fade-in" }], stickers: [{ emoji: "⭐", x: 85, y: 30, size: 60, rotation: 0, opacity: 1, animation: "pulse" }] },
  { id: "th-voice-04", name: "改善事例", platform: "therapist", category: "患者の声", description: "施術回数での改善事例テロップ", textOverlays: [{ text: "改善事例 #〇〇", fontSize: 40, bold: true, color: "#ffffff", bgColor: "transparent", outlineColor: "#1e40af", outlineWidth: 4, shadowColor: "rgba(0,0,0,0.8)", shadowBlur: 6, shadowOffsetX: 2, shadowOffsetY: 2, italic: false, x: 50, y: 35, fontFamily: "sans-serif", animation: "typewriter" }, { text: "〇回の施術で改善", fontSize: 24, bold: true, color: "#ffff00", bgColor: "rgba(30,64,175,0.8)", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 58, fontFamily: "sans-serif", animation: "bounce-in" }], stickers: [{ emoji: "📈", x: 85, y: 30, size: 60, rotation: 0, opacity: 1, animation: "float" }] },
  { id: "th-voice-05", name: "インタビュー風", platform: "therapist", category: "患者の声", description: "Q&A形式のインタビュー風テロップ", textOverlays: [{ text: "Q. どんな症状でしたか？", fontSize: 30, bold: true, color: "#ffffff", bgColor: "#1e40af", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 30, fontFamily: "sans-serif", animation: "slide-right" }, { text: "A. 〇〇が辛くて...", fontSize: 26, bold: false, color: "#ffffff", bgColor: "rgba(0,0,0,0.7)", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 55, fontFamily: "sans-serif", animation: "typewriter" }], stickers: [{ emoji: "🎤", x: 85, y: 30, size: 60, rotation: 0, opacity: 1, animation: "pulse" }] },
  { id: "th-voice-06", name: "数字で見る実績", platform: "therapist", category: "患者の声", description: "施術実績と開院年数の信頼テロップ", textOverlays: [{ text: "施術実績 〇〇〇〇人", fontSize: 36, bold: true, color: "#ffd700", bgColor: "transparent", outlineColor: "#000000", outlineWidth: 4, shadowColor: "rgba(0,0,0,0.8)", shadowBlur: 6, shadowOffsetX: 2, shadowOffsetY: 2, italic: false, x: 50, y: 35, fontFamily: "sans-serif", animation: "scale-up" }, { text: "開院〇年の信頼", fontSize: 22, bold: false, color: "#ffffff", bgColor: "rgba(0,0,0,0.7)", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 58, fontFamily: "sans-serif", animation: "fade-in" }], stickers: [{ emoji: "🏆", x: 85, y: 30, size: 60, rotation: 0, opacity: 1, animation: "bounce" }] },
  // --- 院紹介・ブランディング ---
  { id: "th-brand-01", name: "院紹介", platform: "therapist", category: "院紹介", description: "整体院の基本紹介テロップ", textOverlays: [{ text: "〇〇整体院", fontSize: 44, bold: true, color: "#ffffff", bgColor: "transparent", outlineColor: "#4338ca", outlineWidth: 4, shadowColor: "rgba(0,0,0,0.8)", shadowBlur: 8, shadowOffsetX: 2, shadowOffsetY: 2, italic: false, x: 50, y: 40, fontFamily: "sans-serif", animation: "fade-in" }, { text: "あなたの健康をサポート", fontSize: 22, bold: false, color: "#ffffff", bgColor: "rgba(67,56,202,0.7)", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 58, fontFamily: "sans-serif", animation: "fade-in" }], stickers: [{ emoji: "🏠", x: 85, y: 35, size: 60, rotation: 0, opacity: 1, animation: "none" }] },
  { id: "th-brand-02", name: "スタッフ紹介", platform: "therapist", category: "院紹介", description: "院長プロフィール・資格・経歴テロップ", textOverlays: [{ text: "院長プロフィール", fontSize: 40, bold: true, color: "#ffffff", bgColor: "transparent", outlineColor: "#4338ca", outlineWidth: 4, shadowColor: "rgba(0,0,0,0.8)", shadowBlur: 6, shadowOffsetX: 2, shadowOffsetY: 2, italic: false, x: 50, y: 40, fontFamily: "sans-serif", animation: "fade-in" }, { text: "資格・経歴", fontSize: 22, bold: false, color: "#ffffff", bgColor: "rgba(67,56,202,0.7)", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 58, fontFamily: "sans-serif", animation: "fade-in" }], stickers: [{ emoji: "👨‍⚕️", x: 85, y: 35, size: 60, rotation: 0, opacity: 1, animation: "none" }] },
  { id: "th-brand-03", name: "アクセス", platform: "therapist", category: "院紹介", description: "アクセス・駐車場情報テロップ", textOverlays: [{ text: "アクセス・駐車場", fontSize: 38, bold: true, color: "#ffffff", bgColor: "transparent", outlineColor: "#0e7490", outlineWidth: 4, shadowColor: "rgba(0,0,0,0.8)", shadowBlur: 6, shadowOffsetX: 2, shadowOffsetY: 2, italic: false, x: 50, y: 40, fontFamily: "sans-serif", animation: "slide-right" }, { text: "〇〇駅 徒歩〇分", fontSize: 22, bold: false, color: "#ffffff", bgColor: "rgba(14,116,144,0.7)", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 58, fontFamily: "sans-serif", animation: "fade-in" }], stickers: [{ emoji: "📍", x: 85, y: 35, size: 60, rotation: 0, opacity: 1, animation: "bounce" }] },
  { id: "th-brand-04", name: "院内ツアー", platform: "therapist", category: "院紹介", description: "清潔で落ち着いた院内紹介テロップ", textOverlays: [{ text: "院内をご紹介", fontSize: 40, bold: true, color: "#ffffff", bgColor: "transparent", outlineColor: "#4338ca", outlineWidth: 4, shadowColor: "rgba(0,0,0,0.8)", shadowBlur: 6, shadowOffsetX: 2, shadowOffsetY: 2, italic: false, x: 50, y: 40, fontFamily: "sans-serif", animation: "fade-in" }, { text: "清潔で落ち着いた空間", fontSize: 22, bold: false, color: "#ffffff", bgColor: "rgba(67,56,202,0.7)", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 58, fontFamily: "sans-serif", animation: "fade-in" }], stickers: [{ emoji: "🏥", x: 85, y: 35, size: 60, rotation: 0, opacity: 1, animation: "none" }] },
  { id: "th-brand-05", name: "理念・想い", platform: "therapist", category: "院紹介", description: "痛みのない生活への想いテロップ", textOverlays: [{ text: "当院の想い", fontSize: 42, bold: true, color: "#ffffff", bgColor: "transparent", outlineColor: "#be185d", outlineWidth: 4, shadowColor: "rgba(0,0,0,0.8)", shadowBlur: 6, shadowOffsetX: 2, shadowOffsetY: 2, italic: false, x: 50, y: 40, fontFamily: "sans-serif", animation: "fade-in" }, { text: "痛みのない生活を", fontSize: 24, bold: false, color: "#ffffff", bgColor: "rgba(190,24,93,0.7)", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 58, fontFamily: "sans-serif", animation: "typewriter" }], stickers: [{ emoji: "❤️", x: 85, y: 35, size: 60, rotation: 0, opacity: 1, animation: "pulse" }] },
  { id: "th-brand-06", name: "休診日のお知らせ", platform: "therapist", category: "院紹介", description: "休診日告知テロップ", textOverlays: [{ text: "お知らせ", fontSize: 42, bold: true, color: "#ffffff", bgColor: "#dc2626", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 35, fontFamily: "sans-serif", animation: "bounce-in" }, { text: "〇月〇日は休診です", fontSize: 26, bold: true, color: "#ffffff", bgColor: "rgba(0,0,0,0.8)", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 58, fontFamily: "sans-serif", animation: "fade-in" }], stickers: [{ emoji: "📅", x: 85, y: 30, size: 60, rotation: 0, opacity: 1, animation: "none" }] },
  { id: "th-brand-07", name: "年末年始", platform: "therapist", category: "院紹介", description: "年末年始の営業案内テロップ", textOverlays: [{ text: "年末年始の営業案内", fontSize: 34, bold: true, color: "#ffffff", bgColor: "transparent", outlineColor: "#4338ca", outlineWidth: 4, shadowColor: "rgba(0,0,0,0.8)", shadowBlur: 6, shadowOffsetX: 2, shadowOffsetY: 2, italic: false, x: 50, y: 35, fontFamily: "sans-serif", animation: "fade-in" }, { text: "〇/〇〜〇/〇", fontSize: 32, bold: true, color: "#ffd700", bgColor: "rgba(67,56,202,0.8)", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 58, fontFamily: "sans-serif", animation: "scale-up" }], stickers: [{ emoji: "🎍", x: 85, y: 30, size: 60, rotation: 0, opacity: 1, animation: "none" }] },
  { id: "th-brand-08", name: "開院記念", platform: "therapist", category: "院紹介", description: "周年記念と感謝キャンペーンテロップ", textOverlays: [{ text: "おかげさまで〇周年", fontSize: 36, bold: true, color: "#ffd700", bgColor: "transparent", outlineColor: "#000000", outlineWidth: 4, shadowColor: "rgba(0,0,0,0.8)", shadowBlur: 6, shadowOffsetX: 2, shadowOffsetY: 2, italic: false, x: 50, y: 35, fontFamily: "sans-serif", animation: "scale-up" }, { text: "感謝キャンペーン実施中", fontSize: 22, bold: true, color: "#ffffff", bgColor: "rgba(220,38,38,0.8)", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 58, fontFamily: "sans-serif", animation: "bounce-in" }], stickers: [{ emoji: "🎊", x: 85, y: 30, size: 60, rotation: 0, opacity: 1, animation: "bounce" }] },
  // --- 集客・キャンペーン ---
  { id: "th-campaign-01", name: "キャンペーン", platform: "therapist", category: "集客", description: "期間限定キャンペーン告知テロップ", textOverlays: [{ text: "期間限定キャンペーン", fontSize: 36, bold: true, color: "#ffff00", bgColor: "#dc2626", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 35, fontFamily: "sans-serif", animation: "shake" }, { text: "〇月〇日まで", fontSize: 26, bold: true, color: "#ffffff", bgColor: "transparent", outlineColor: "#000000", outlineWidth: 3, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 58, fontFamily: "sans-serif", animation: "flicker" }], stickers: [{ emoji: "🏷️", x: 85, y: 30, size: 60, rotation: 0, opacity: 1, animation: "bounce" }] },
  { id: "th-campaign-02", name: "紹介割引", platform: "therapist", category: "集客", description: "友達紹介キャンペーンテロップ", textOverlays: [{ text: "お友達紹介キャンペーン", fontSize: 34, bold: true, color: "#ffffff", bgColor: "transparent", outlineColor: "#dc2626", outlineWidth: 4, shadowColor: "rgba(0,0,0,0.8)", shadowBlur: 6, shadowOffsetX: 2, shadowOffsetY: 2, italic: false, x: 50, y: 35, fontFamily: "sans-serif", animation: "bounce-in" }, { text: "ご紹介で〇〇円OFF", fontSize: 28, bold: true, color: "#ffff00", bgColor: "rgba(220,38,38,0.8)", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 58, fontFamily: "sans-serif", animation: "shake" }], stickers: [{ emoji: "🤝", x: 85, y: 30, size: 60, rotation: 0, opacity: 1, animation: "bounce" }] },
  { id: "th-campaign-03", name: "LINE登録", platform: "therapist", category: "集客", description: "LINE登録特典の告知テロップ", textOverlays: [{ text: "LINE登録で特典GET", fontSize: 36, bold: true, color: "#ffffff", bgColor: "#16a34a", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 35, fontFamily: "sans-serif", animation: "bounce-in" }, { text: "@〇〇〇で検索", fontSize: 24, bold: false, color: "#ffffff", bgColor: "rgba(0,0,0,0.7)", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 58, fontFamily: "sans-serif", animation: "fade-in" }], stickers: [{ emoji: "📱", x: 85, y: 30, size: 60, rotation: 0, opacity: 1, animation: "bounce" }] },
  { id: "th-campaign-04", name: "予約促進", platform: "therapist", category: "集客", description: "早めのご予約を促すテロップ", textOverlays: [{ text: "ご予約はお早めに", fontSize: 38, bold: true, color: "#ffffff", bgColor: "transparent", outlineColor: "#dc2626", outlineWidth: 4, shadowColor: "rgba(0,0,0,0.8)", shadowBlur: 6, shadowOffsetX: 2, shadowOffsetY: 2, italic: false, x: 50, y: 40, fontFamily: "sans-serif", animation: "shake" }, { text: "空き状況はLINEで確認", fontSize: 22, bold: false, color: "#ffffff", bgColor: "rgba(0,0,0,0.7)", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 58, fontFamily: "sans-serif", animation: "fade-in" }], stickers: [{ emoji: "📞", x: 85, y: 35, size: 60, rotation: 0, opacity: 1, animation: "pulse" }] },
  { id: "th-campaign-05", name: "回数券", platform: "therapist", category: "集客", description: "お得な回数券の告知テロップ", textOverlays: [{ text: "お得な回数券", fontSize: 40, bold: true, color: "#ffd700", bgColor: "transparent", outlineColor: "#000000", outlineWidth: 4, shadowColor: "rgba(0,0,0,0.8)", shadowBlur: 6, shadowOffsetX: 2, shadowOffsetY: 2, italic: false, x: 50, y: 35, fontFamily: "sans-serif", animation: "scale-up" }, { text: "〇回分で〇〇円", fontSize: 28, bold: true, color: "#ffffff", bgColor: "rgba(220,38,38,0.8)", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 58, fontFamily: "sans-serif", animation: "bounce-in" }], stickers: [{ emoji: "💰", x: 85, y: 30, size: 60, rotation: 0, opacity: 1, animation: "bounce" }] },
  { id: "th-campaign-06", name: "季節キャンペーン", platform: "therapist", category: "集客", description: "春の不調に向けた季節キャンペーンテロップ", textOverlays: [{ text: "春の不調に", fontSize: 42, bold: true, color: "#ffffff", bgColor: "transparent", outlineColor: "#be185d", outlineWidth: 4, shadowColor: "rgba(0,0,0,0.8)", shadowBlur: 6, shadowOffsetX: 2, shadowOffsetY: 2, italic: false, x: 50, y: 35, fontFamily: "sans-serif", animation: "bounce-in" }, { text: "今だけ特別価格", fontSize: 28, bold: true, color: "#ffff00", bgColor: "rgba(220,38,38,0.8)", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 58, fontFamily: "sans-serif", animation: "shake" }], stickers: [{ emoji: "🌸", x: 85, y: 30, size: 60, rotation: 0, opacity: 1, animation: "float" }] },
  { id: "th-campaign-07", name: "新規限定", platform: "therapist", category: "集客", description: "初めての方限定割引テロップ", textOverlays: [{ text: "初めての方限定", fontSize: 38, bold: true, color: "#ffffff", bgColor: "#dc2626", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 35, fontFamily: "sans-serif", animation: "bounce-in" }, { text: "〇〇%OFF", fontSize: 44, bold: true, color: "#ffff00", bgColor: "transparent", outlineColor: "#000000", outlineWidth: 4, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 60, fontFamily: "'Arial Black', 'Impact', sans-serif", animation: "shake" }], stickers: [{ emoji: "✅", x: 85, y: 30, size: 60, rotation: 0, opacity: 1, animation: "bounce" }] },
  { id: "th-campaign-08", name: "SNSフォロー促進", platform: "therapist", category: "集客", description: "SNSフォローを促す健康情報配信テロップ", textOverlays: [{ text: "フォローお願いします！", fontSize: 34, bold: true, color: "#ffffff", bgColor: "#1d4ed8", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 35, fontFamily: "sans-serif", animation: "bounce-in" }, { text: "健康情報を毎日配信", fontSize: 22, bold: false, color: "#ffffff", bgColor: "rgba(0,0,0,0.7)", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 58, fontFamily: "sans-serif", animation: "fade-in" }], stickers: [{ emoji: "👍", x: 85, y: 30, size: 60, rotation: 0, opacity: 1, animation: "bounce" }] },
  // --- 健康情報・教育 ---
  { id: "th-health-01", name: "豆知識", platform: "therapist", category: "健康情報", description: "意外な健康豆知識テロップ", textOverlays: [{ text: "知ってましたか？", fontSize: 40, bold: true, color: "#ffffff", bgColor: "transparent", outlineColor: "#0e7490", outlineWidth: 4, shadowColor: "rgba(0,0,0,0.8)", shadowBlur: 6, shadowOffsetX: 2, shadowOffsetY: 2, italic: false, x: 50, y: 35, fontFamily: "sans-serif", animation: "bounce-in" }, { text: "〇〇の意外な事実", fontSize: 24, bold: false, color: "#ffffff", bgColor: "rgba(14,116,144,0.7)", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 58, fontFamily: "sans-serif", animation: "fade-in" }], stickers: [{ emoji: "💡", x: 85, y: 30, size: 60, rotation: 0, opacity: 1, animation: "pulse" }] },
  { id: "th-health-02", name: "やってはいけない", platform: "therapist", category: "健康情報", description: "知らないと悪化するNG行動テロップ", textOverlays: [{ text: "やってはいけない〇〇", fontSize: 36, bold: true, color: "#ffffff", bgColor: "#dc2626", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 35, fontFamily: "sans-serif", animation: "shake" }, { text: "知らないと悪化します", fontSize: 22, bold: true, color: "#ffff00", bgColor: "rgba(0,0,0,0.8)", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 58, fontFamily: "sans-serif", animation: "bounce-in" }], stickers: [{ emoji: "🚫", x: 85, y: 30, size: 60, rotation: 0, opacity: 1, animation: "pulse" }] },
  { id: "th-health-03", name: "正しいvs間違い", platform: "therapist", category: "健康情報", description: "正しい方法と間違いを比較するテロップ", textOverlays: [{ text: "正しい〇〇 vs 間違った〇〇", fontSize: 30, bold: true, color: "#ffffff", bgColor: "transparent", outlineColor: "#0e7490", outlineWidth: 3, shadowColor: "rgba(0,0,0,0.8)", shadowBlur: 6, shadowOffsetX: 2, shadowOffsetY: 2, italic: false, x: 50, y: 35, fontFamily: "sans-serif", animation: "slide-right" }, { text: "あなたはどっち？", fontSize: 26, bold: true, color: "#ffff00", bgColor: "rgba(14,116,144,0.8)", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 58, fontFamily: "sans-serif", animation: "bounce-in" }], stickers: [{ emoji: "⭕", x: 85, y: 30, size: 60, rotation: 0, opacity: 1, animation: "pulse" }] },
  { id: "th-health-04", name: "ランキング", platform: "therapist", category: "健康情報", description: "治療家が教えるランキングテロップ", textOverlays: [{ text: "〇〇ランキング TOP3", fontSize: 34, bold: true, color: "#ffd700", bgColor: "transparent", outlineColor: "#000000", outlineWidth: 4, shadowColor: "rgba(0,0,0,0.8)", shadowBlur: 6, shadowOffsetX: 2, shadowOffsetY: 2, italic: false, x: 50, y: 35, fontFamily: "sans-serif", animation: "scale-up" }, { text: "治療家が教える", fontSize: 22, bold: false, color: "#ffffff", bgColor: "rgba(0,0,0,0.7)", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 58, fontFamily: "sans-serif", animation: "fade-in" }], stickers: [{ emoji: "🥇", x: 85, y: 30, size: 60, rotation: 0, opacity: 1, animation: "bounce" }] },
  { id: "th-health-05", name: "食事・栄養", platform: "therapist", category: "健康情報", description: "内側からケアする食べ物テロップ", textOverlays: [{ text: "〇〇に良い食べ物", fontSize: 38, bold: true, color: "#ffffff", bgColor: "transparent", outlineColor: "#065f46", outlineWidth: 4, shadowColor: "rgba(0,0,0,0.8)", shadowBlur: 6, shadowOffsetX: 2, shadowOffsetY: 2, italic: false, x: 50, y: 35, fontFamily: "sans-serif", animation: "slide-right" }, { text: "内側からケア", fontSize: 24, bold: false, color: "#ffffff", bgColor: "rgba(6,95,70,0.7)", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 58, fontFamily: "sans-serif", animation: "fade-in" }], stickers: [{ emoji: "🥗", x: 85, y: 30, size: 60, rotation: 0, opacity: 1, animation: "float" }] },
  { id: "th-health-06", name: "季節の健康法", platform: "therapist", category: "健康情報", description: "季節ごとの体調管理テロップ", textOverlays: [{ text: "〇月の体調管理", fontSize: 38, bold: true, color: "#ffffff", bgColor: "transparent", outlineColor: "#0e7490", outlineWidth: 4, shadowColor: "rgba(0,0,0,0.8)", shadowBlur: 6, shadowOffsetX: 2, shadowOffsetY: 2, italic: false, x: 50, y: 35, fontFamily: "sans-serif", animation: "slide-right" }, { text: "この時期に注意すること", fontSize: 22, bold: false, color: "#ffffff", bgColor: "rgba(14,116,144,0.7)", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 58, fontFamily: "sans-serif", animation: "fade-in" }], stickers: [{ emoji: "📆", x: 85, y: 30, size: 60, rotation: 0, opacity: 1, animation: "none" }] },
  // --- SNSリール専用 ---
  { id: "th-reel-01", name: "リール症状チェック", platform: "therapist", category: "リール", description: "縦型リール用の症状チェックテロップ", aspectRatio: 1, textOverlays: [{ text: "こんな症状ありませんか？", fontSize: 36, bold: true, color: "#ffffff", bgColor: "transparent", outlineColor: "#1e40af", outlineWidth: 4, shadowColor: "rgba(0,0,0,0.8)", shadowBlur: 6, shadowOffsetX: 2, shadowOffsetY: 2, italic: false, x: 50, y: 30, fontFamily: "sans-serif", animation: "slide-right" }, { text: "チェックしてみて！", fontSize: 24, bold: true, color: "#ffff00", bgColor: "rgba(30,64,175,0.8)", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 50, fontFamily: "sans-serif", animation: "bounce-in" }], stickers: [{ emoji: "☑️", x: 85, y: 28, size: 60, rotation: 0, opacity: 1, animation: "pulse" }] },
  { id: "th-reel-02", name: "リールビフォーアフター", platform: "therapist", category: "リール", description: "縦型リール用の施術ビフォーアフター", aspectRatio: 1, textOverlays: [{ text: "施術〇分で変化", fontSize: 38, bold: true, color: "#ffffff", bgColor: "transparent", outlineColor: "#000000", outlineWidth: 4, shadowColor: "rgba(0,0,0,0.8)", shadowBlur: 6, shadowOffsetX: 2, shadowOffsetY: 2, italic: false, x: 50, y: 30, fontFamily: "'Arial Black', 'Impact', sans-serif", animation: "scale-up" }, { text: "※個人の感想です", fontSize: 16, bold: false, color: "#cccccc", bgColor: "rgba(0,0,0,0.6)", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 90, fontFamily: "sans-serif", animation: "fade-in" }], stickers: [{ emoji: "🔄", x: 85, y: 28, size: 60, rotation: 0, opacity: 1, animation: "spin" }] },
  { id: "th-reel-03", name: "リール1分ストレッチ", platform: "therapist", category: "リール", description: "縦型リール用の1分ストレッチ保存促進", aspectRatio: 1, textOverlays: [{ text: "1分でできるストレッチ", fontSize: 34, bold: true, color: "#ffffff", bgColor: "transparent", outlineColor: "#065f46", outlineWidth: 4, shadowColor: "rgba(0,0,0,0.8)", shadowBlur: 6, shadowOffsetX: 2, shadowOffsetY: 2, italic: false, x: 50, y: 25, fontFamily: "sans-serif", animation: "slide-right" }, { text: "保存して毎日やろう", fontSize: 22, bold: true, color: "#ffff00", bgColor: "rgba(6,95,70,0.8)", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 88, fontFamily: "sans-serif", animation: "bounce-in" }], stickers: [{ emoji: "⏱️", x: 85, y: 22, size: 60, rotation: 0, opacity: 1, animation: "pulse" }] },
  { id: "th-reel-04", name: "リールQ&A", platform: "therapist", category: "リール", description: "縦型リール用のQ&A回答テロップ", aspectRatio: 1, textOverlays: [{ text: "よくある質問", fontSize: 36, bold: true, color: "#ffffff", bgColor: "#1e40af", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 20, fontFamily: "sans-serif", animation: "slide-right" }, { text: "〇〇について", fontSize: 26, bold: false, color: "#ffffff", bgColor: "rgba(0,0,0,0.7)", outlineColor: "#000000", outlineWidth: 0, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, italic: false, x: 50, y: 45, fontFamily: "sans-serif", animation: "typewriter" }], stickers: [{ emoji: "❓", x: 85, y: 18, size: 60, rotation: 0, opacity: 1, animation: "bounce" }] },
];

async function generateAudioBlob(key: BgmItemKey): Promise<Blob> {
  const sampleRate = 44100;

  // Helper to create oscillator node
  function makeOsc(ctx: OfflineAudioContext, freq: number, type: OscillatorType, start: number, stop: number, gainVal: number, gainEnvelope?: { t: number; v: number }[]): void {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    g.gain.setValueAtTime(gainVal, start);
    if (gainEnvelope) {
      for (const pt of gainEnvelope) g.gain.linearRampToValueAtTime(pt.v, start + pt.t);
    } else {
      g.gain.linearRampToValueAtTime(0, stop);
    }
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(start);
    osc.stop(stop);
  }

  function makeNote(ctx: OfflineAudioContext, freq: number, type: OscillatorType, start: number, dur: number, vol: number = 0.2): void {
    makeOsc(ctx, freq, type, start, start + dur, vol, [{ t: dur * 0.8, v: vol }, { t: dur, v: 0 }]);
  }

  // BGMs: 8 seconds
  if (key === "upbeat") {
    const dur = 8;
    const ctx = new OfflineAudioContext(1, sampleRate * dur, sampleRate);
    // Major pentatonic arpeggio in C: C4 E4 G4 A4 C5
    const notes = [261.63, 329.63, 392.00, 440.00, 523.25, 440.00, 392.00, 329.63];
    const noteLen = 0.2;
    let t = 0;
    while (t < dur - noteLen) {
      const note = notes[Math.floor(t / noteLen) % notes.length];
      makeNote(ctx, note, "square", t, noteLen, 0.18);
      makeNote(ctx, note * 0.5, "triangle", t, noteLen, 0.08);
      t += noteLen;
    }
    const rendered = await ctx.startRendering();
    return new Blob([encodeWav(rendered.getChannelData(0), sampleRate)], { type: "audio/wav" });
  }

  if (key === "chill") {
    const dur = 8;
    const ctx = new OfflineAudioContext(1, sampleRate * dur, sampleRate);
    // Slow jazzy chords: Cmaj7 → Am7 → Fmaj7 → G7
    const chords = [
      [261.63, 329.63, 392.00, 493.88],
      [220.00, 261.63, 329.63, 392.00],
      [174.61, 220.00, 261.63, 349.23],
      [196.00, 246.94, 293.66, 392.00],
    ];
    for (let ci = 0; ci < 4; ci++) {
      const start = ci * 2;
      for (const f of chords[ci]) {
        makeNote(ctx, f, "sine", start, 1.8, 0.1);
        makeNote(ctx, f * 0.5, "triangle", start, 1.8, 0.06);
      }
    }
    const rendered = await ctx.startRendering();
    return new Blob([encodeWav(rendered.getChannelData(0), sampleRate)], { type: "audio/wav" });
  }

  if (key === "cinematic") {
    const dur = 8;
    const ctx = new OfflineAudioContext(1, sampleRate * dur, sampleRate);
    // Low drone + slow sweep
    makeOsc(ctx, 55, "sine", 0, dur, 0.25, [{ t: 2, v: 0.3 }, { t: 6, v: 0.3 }, { t: 8, v: 0 }]);
    makeOsc(ctx, 82.5, "sine", 0, dur, 0.1, [{ t: 3, v: 0.15 }, { t: 7, v: 0.1 }, { t: 8, v: 0 }]);
    // Sweeping strings feel with sawtooth
    const osc2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    osc2.type = "sawtooth";
    osc2.frequency.setValueAtTime(110, 0);
    osc2.frequency.linearRampToValueAtTime(165, 4);
    osc2.frequency.linearRampToValueAtTime(110, 8);
    g2.gain.setValueAtTime(0, 0);
    g2.gain.linearRampToValueAtTime(0.08, 2);
    g2.gain.linearRampToValueAtTime(0.12, 5);
    g2.gain.linearRampToValueAtTime(0, 8);
    osc2.connect(g2); g2.connect(ctx.destination);
    osc2.start(0); osc2.stop(dur);
    const rendered = await ctx.startRendering();
    return new Blob([encodeWav(rendered.getChannelData(0), sampleRate)], { type: "audio/wav" });
  }

  if (key === "happy") {
    const dur = 8;
    const ctx = new OfflineAudioContext(1, sampleRate * dur, sampleRate);
    // Ukulele-style: C major strumming pattern
    const strum = [261.63, 329.63, 392.00, 523.25];
    const beatLen = 0.4;
    let t = 0;
    while (t < dur - beatLen) {
      // Strum up
      for (let i = 0; i < strum.length; i++) {
        makeNote(ctx, strum[i], "triangle", t + i * 0.02, 0.35, 0.15);
      }
      t += beatLen;
    }
    const rendered = await ctx.startRendering();
    return new Blob([encodeWav(rendered.getChannelData(0), sampleRate)], { type: "audio/wav" });
  }

  if (key === "epic") {
    const dur = 8;
    const ctx = new OfflineAudioContext(1, sampleRate * dur, sampleRate);
    // Building orchestral with timpani-like drums
    makeOsc(ctx, 65.41, "sine", 0, dur, 0.0, [{ t: 1, v: 0.2 }, { t: 4, v: 0.3 }, { t: 7, v: 0.35 }, { t: 8, v: 0.1 }]);
    makeOsc(ctx, 130.81, "sawtooth", 0, dur, 0.0, [{ t: 2, v: 0.06 }, { t: 5, v: 0.12 }, { t: 7, v: 0.15 }, { t: 8, v: 0 }]);
    // Timpani-like hits
    for (let beat = 0; beat < 8; beat++) {
      const t = beat;
      const pitch = beat < 4 ? 65.41 : 87.31;
      makeOsc(ctx, pitch, "sine", t, t + 0.3, 0.4 * (beat / 8 + 0.3), [{ t: 0.05, v: 0.5 * (beat / 8 + 0.3) }, { t: 0.3, v: 0 }]);
    }
    const rendered = await ctx.startRendering();
    return new Blob([encodeWav(rendered.getChannelData(0), sampleRate)], { type: "audio/wav" });
  }

  if (key === "jazz") {
    const dur = 8;
    const ctx = new OfflineAudioContext(1, sampleRate * dur, sampleRate);
    // Walking bass: E2 G#2 B2 E3 ...
    const bassLine = [82.41, 103.83, 123.47, 164.81, 138.59, 123.47, 103.83, 82.41];
    const noteLen = 0.5;
    for (let i = 0; i < Math.floor(dur / noteLen); i++) {
      makeNote(ctx, bassLine[i % bassLine.length], "triangle", i * noteLen, noteLen * 0.9, 0.2);
    }
    // Swing chords on beats 2 and 4
    const chordNotes = [207.65, 261.63, 311.13];
    for (let beat = 1; beat < 8; beat += 2) {
      const start = beat * 0.5;
      for (const f of chordNotes) {
        makeNote(ctx, f, "sine", start, 0.3, 0.1);
      }
    }
    const rendered = await ctx.startRendering();
    return new Blob([encodeWav(rendered.getChannelData(0), sampleRate)], { type: "audio/wav" });
  }

  if (key === "techno") {
    const dur = 8;
    const ctx = new OfflineAudioContext(1, sampleRate * dur, sampleRate);
    // Four-on-floor kick simulation
    for (let beat = 0; beat < 8; beat++) {
      const t = beat * 0.5;
      makeOsc(ctx, 80, "sine", t, t + 0.15, 0.5, [{ t: 0.02, v: 0.6 }, { t: 0.1, v: 0.1 }, { t: 0.15, v: 0 }]);
      // Frequency sweep for kick
      const kickOsc = ctx.createOscillator();
      const kickGain = ctx.createGain();
      kickOsc.type = "sine";
      kickOsc.frequency.setValueAtTime(150, t);
      kickOsc.frequency.exponentialRampToValueAtTime(40, t + 0.15);
      kickGain.gain.setValueAtTime(0.4, t);
      kickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      kickOsc.connect(kickGain); kickGain.connect(ctx.destination);
      kickOsc.start(t); kickOsc.stop(t + 0.15);
    }
    // Synth stabs on offbeats
    const synthNotes = [440, 493.88, 523.25, 440];
    for (let beat = 1; beat < 16; beat += 2) {
      const t = beat * 0.25;
      makeNote(ctx, synthNotes[Math.floor(beat / 2) % synthNotes.length], "square", t, 0.15, 0.15);
    }
    const rendered = await ctx.startRendering();
    return new Blob([encodeWav(rendered.getChannelData(0), sampleRate)], { type: "audio/wav" });
  }

  if (key === "acoustic") {
    const dur = 8;
    const ctx = new OfflineAudioContext(1, sampleRate * dur, sampleRate);
    // Fingerpicking: G major pattern
    const pattern = [196.00, 392.00, 493.88, 392.00, 246.94, 392.00, 493.88, 392.00];
    const noteLen = 0.25;
    for (let i = 0; i < Math.floor(dur / noteLen); i++) {
      makeNote(ctx, pattern[i % pattern.length], "triangle", i * noteLen, noteLen * 0.9, 0.18);
    }
    const rendered = await ctx.startRendering();
    return new Blob([encodeWav(rendered.getChannelData(0), sampleRate)], { type: "audio/wav" });
  }

  if (key === "horror") {
    const dur = 8;
    const ctx = new OfflineAudioContext(1, sampleRate * dur, sampleRate);
    // Dissonant low tones with tritone
    makeOsc(ctx, 55, "sine", 0, dur, 0.2, [{ t: 2, v: 0.25 }, { t: 5, v: 0.2 }, { t: 8, v: 0.05 }]);
    makeOsc(ctx, 77.78, "sine", 0, dur, 0.1, [{ t: 3, v: 0.15 }, { t: 8, v: 0.05 }]); // tritone
    makeOsc(ctx, 41.20, "sawtooth", 0, dur, 0.05, [{ t: 4, v: 0.08 }, { t: 8, v: 0 }]);
    // Random tremolo effect via frequency modulation
    const tremOsc = ctx.createOscillator();
    const tremGain = ctx.createGain();
    tremOsc.type = "sine";
    tremOsc.frequency.setValueAtTime(110, 0);
    tremOsc.frequency.linearRampToValueAtTime(116.54, 4);
    tremOsc.frequency.linearRampToValueAtTime(103.83, 8);
    tremGain.gain.setValueAtTime(0, 0);
    tremGain.gain.linearRampToValueAtTime(0.06, 1);
    tremGain.gain.linearRampToValueAtTime(0.1, 6);
    tremGain.gain.linearRampToValueAtTime(0, 8);
    tremOsc.connect(tremGain); tremGain.connect(ctx.destination);
    tremOsc.start(0); tremOsc.stop(dur);
    const rendered = await ctx.startRendering();
    return new Blob([encodeWav(rendered.getChannelData(0), sampleRate)], { type: "audio/wav" });
  }

  if (key === "tropical") {
    const dur = 8;
    const ctx = new OfflineAudioContext(1, sampleRate * dur, sampleRate);
    // Steel drum style: high triangle waves
    const melody = [523.25, 659.25, 783.99, 659.25, 523.25, 587.33, 659.25, 523.25];
    const noteLen = 0.3;
    let t = 0;
    while (t < dur - noteLen) {
      const note = melody[Math.floor(t / noteLen) % melody.length];
      makeNote(ctx, note, "triangle", t, noteLen * 0.7, 0.22);
      t += noteLen;
    }
    // Bass reggae pattern (offbeat)
    const bassNotes = [130.81, 130.81, 174.61, 130.81];
    for (let i = 0; i < 8; i++) {
      const bt = i * 0.5 + 0.25;
      makeNote(ctx, bassNotes[i % bassNotes.length], "sine", bt, 0.2, 0.15);
    }
    const rendered = await ctx.startRendering();
    return new Blob([encodeWav(rendered.getChannelData(0), sampleRate)], { type: "audio/wav" });
  }

  if (key === "piano") {
    const dur = 8;
    const ctx = new OfflineAudioContext(1, sampleRate * dur, sampleRate);
    // Gentle piano arpeggios: C major
    const arp = [261.63, 329.63, 392.00, 523.25, 392.00, 329.63];
    const noteLen = 0.33;
    for (let i = 0; i < Math.floor(dur / noteLen); i++) {
      const f = arp[i % arp.length];
      const t = i * noteLen;
      makeNote(ctx, f, "sine", t, noteLen * 1.2, 0.2);
      makeNote(ctx, f * 2, "sine", t, noteLen * 0.5, 0.05); // harmonic
    }
    const rendered = await ctx.startRendering();
    return new Blob([encodeWav(rendered.getChannelData(0), sampleRate)], { type: "audio/wav" });
  }

  if (key === "rock") {
    const dur = 8;
    const ctx = new OfflineAudioContext(1, sampleRate * dur, sampleRate);
    // Power chord progression: E5 A5 D5 A5
    const chords = [[165, 220], [220, 293.66], [293.66, 392], [220, 293.66]];
    for (let ci = 0; ci < 4; ci++) {
      const start = ci * 2;
      for (const f of chords[ci]) {
        makeNote(ctx, f, "sawtooth", start, 1.8, 0.12);
      }
      // Drum hit at each chord change
      makeOsc(ctx, 80, "sine", start, start + 0.12, 0.35, [{ t: 0.02, v: 0.4 }, { t: 0.12, v: 0 }]);
    }
    // Snare on beats 2 and 4
    for (let beat = 1; beat < 8; beat += 2) {
      const t = beat * 0.5;
      makeOsc(ctx, 200, "sawtooth", t, t + 0.08, 0.2, [{ t: 0.01, v: 0.25 }, { t: 0.08, v: 0 }]);
    }
    const rendered = await ctx.startRendering();
    return new Blob([encodeWav(rendered.getChannelData(0), sampleRate)], { type: "audio/wav" });
  }

  // ===== SOUND EFFECTS =====
  if (key === "clap") {
    const dur = 1.5;
    const ctx = new OfflineAudioContext(1, sampleRate * dur, sampleRate);
    // Multiple clap pulses
    for (let i = 0; i < 5; i++) {
      const t = i * 0.12;
      makeOsc(ctx, 800 + i * 100, "square", t, t + 0.08, 0.3, [{ t: 0.005, v: 0.4 }, { t: 0.08, v: 0 }]);
      makeOsc(ctx, 1200 + i * 150, "square", t, t + 0.06, 0.15, [{ t: 0.003, v: 0.2 }, { t: 0.06, v: 0 }]);
    }
    const rendered = await ctx.startRendering();
    return new Blob([encodeWav(rendered.getChannelData(0), sampleRate)], { type: "audio/wav" });
  }

  if (key === "drumroll") {
    const dur = 2;
    const ctx = new OfflineAudioContext(1, sampleRate * dur, sampleRate);
    let t = 0;
    let interval = 0.12;
    while (t < dur) {
      makeOsc(ctx, 120, "sawtooth", t, t + interval * 0.6, 0.3 * (t / dur + 0.3), [{ t: 0.01, v: 0.4 * (t / dur + 0.3) }, { t: interval * 0.6, v: 0 }]);
      t += interval;
      interval = Math.max(0.03, interval * 0.96); // accelerate
    }
    const rendered = await ctx.startRendering();
    return new Blob([encodeWav(rendered.getChannelData(0), sampleRate)], { type: "audio/wav" });
  }

  if (key === "chime") {
    const dur = 2;
    const ctx = new OfflineAudioContext(1, sampleRate * dur, sampleRate);
    // Bell-like: fundamental + harmonics with long decay
    const harmonics = [1046.50, 2093.00, 3139.50, 4186.01];
    const decays = [1.8, 1.2, 0.8, 0.5];
    for (let i = 0; i < harmonics.length; i++) {
      makeOsc(ctx, harmonics[i], "sine", 0, dur, 0.25 / (i + 1), [{ t: 0.01, v: 0.3 / (i + 1) }, { t: decays[i], v: 0 }]);
    }
    const rendered = await ctx.startRendering();
    return new Blob([encodeWav(rendered.getChannelData(0), sampleRate)], { type: "audio/wav" });
  }

  if (key === "buzzer") {
    const dur = 0.8;
    const ctx = new OfflineAudioContext(1, sampleRate * dur, sampleRate);
    makeOsc(ctx, 160, "sawtooth", 0, dur, 0.4, [{ t: 0.02, v: 0.5 }, { t: 0.6, v: 0.4 }, { t: 0.8, v: 0 }]);
    makeOsc(ctx, 120, "square", 0, dur, 0.2, [{ t: 0.6, v: 0.2 }, { t: 0.8, v: 0 }]);
    const rendered = await ctx.startRendering();
    return new Blob([encodeWav(rendered.getChannelData(0), sampleRate)], { type: "audio/wav" });
  }

  if (key === "pop") {
    const dur = 0.5;
    const ctx = new OfflineAudioContext(1, sampleRate * dur, sampleRate);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(800, 0);
    osc.frequency.exponentialRampToValueAtTime(200, 0.1);
    g.gain.setValueAtTime(0.6, 0);
    g.gain.exponentialRampToValueAtTime(0.001, 0.3);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(0); osc.stop(dur);
    const rendered = await ctx.startRendering();
    return new Blob([encodeWav(rendered.getChannelData(0), sampleRate)], { type: "audio/wav" });
  }

  if (key === "swoosh") {
    const dur = 0.8;
    const ctx = new OfflineAudioContext(1, sampleRate * dur, sampleRate);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(2000, 0);
    osc.frequency.exponentialRampToValueAtTime(300, dur);
    g.gain.setValueAtTime(0, 0);
    g.gain.linearRampToValueAtTime(0.35, 0.1);
    g.gain.linearRampToValueAtTime(0, dur);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(0); osc.stop(dur);
    const rendered = await ctx.startRendering();
    return new Blob([encodeWav(rendered.getChannelData(0), sampleRate)], { type: "audio/wav" });
  }

  if (key === "click") {
    const dur = 0.2;
    const ctx = new OfflineAudioContext(1, sampleRate * dur, sampleRate);
    makeOsc(ctx, 1000, "square", 0, dur, 0.5, [{ t: 0.005, v: 0.6 }, { t: 0.05, v: 0.1 }, { t: 0.2, v: 0 }]);
    const rendered = await ctx.startRendering();
    return new Blob([encodeWav(rendered.getChannelData(0), sampleRate)], { type: "audio/wav" });
  }

  if (key === "bell") {
    const dur = 2;
    const ctx = new OfflineAudioContext(1, sampleRate * dur, sampleRate);
    makeOsc(ctx, 880, "sine", 0, dur, 0.4, [{ t: 0.01, v: 0.5 }, { t: 1.5, v: 0.05 }, { t: 2, v: 0 }]);
    makeOsc(ctx, 1760, "sine", 0, dur, 0.12, [{ t: 0.01, v: 0.15 }, { t: 0.8, v: 0 }]);
    makeOsc(ctx, 2640, "sine", 0, dur, 0.05, [{ t: 0.01, v: 0.06 }, { t: 0.4, v: 0 }]);
    const rendered = await ctx.startRendering();
    return new Blob([encodeWav(rendered.getChannelData(0), sampleRate)], { type: "audio/wav" });
  }

  if (key === "correct") {
    const dur = 0.6;
    const ctx = new OfflineAudioContext(1, sampleRate * dur, sampleRate);
    makeNote(ctx, 523.25, "sine", 0, 0.2, 0.35);
    makeNote(ctx, 659.25, "sine", 0.2, 0.4, 0.4);
    const rendered = await ctx.startRendering();
    return new Blob([encodeWav(rendered.getChannelData(0), sampleRate)], { type: "audio/wav" });
  }

  if (key === "wrong") {
    const dur = 0.6;
    const ctx = new OfflineAudioContext(1, sampleRate * dur, sampleRate);
    makeNote(ctx, 311.13, "sawtooth", 0, 0.2, 0.3);
    makeNote(ctx, 233.08, "sawtooth", 0.2, 0.4, 0.3);
    const rendered = await ctx.startRendering();
    return new Blob([encodeWav(rendered.getChannelData(0), sampleRate)], { type: "audio/wav" });
  }

  if (key === "countdown") {
    const dur = 3;
    const ctx = new OfflineAudioContext(1, sampleRate * dur, sampleRate);
    // Three beeps
    for (let i = 0; i < 3; i++) {
      makeNote(ctx, 800, "sine", i * 0.8, 0.2, 0.35);
    }
    // Final ding (higher)
    makeOsc(ctx, 1200, "sine", 2.5, 3, 0.4, [{ t: 0.01, v: 0.45 }, { t: 0.5, v: 0 }]);
    const rendered = await ctx.startRendering();
    return new Blob([encodeWav(rendered.getChannelData(0), sampleRate)], { type: "audio/wav" });
  }

  if (key === "fanfare") {
    const dur = 1.5;
    const ctx = new OfflineAudioContext(1, sampleRate * dur, sampleRate);
    const notes = [392.00, 493.88, 587.33, 783.99];
    for (let i = 0; i < notes.length; i++) {
      makeNote(ctx, notes[i], "triangle", i * 0.25, 0.4, 0.3);
      makeNote(ctx, notes[i] * 0.5, "sine", i * 0.25, 0.4, 0.1);
    }
    const rendered = await ctx.startRendering();
    return new Blob([encodeWav(rendered.getChannelData(0), sampleRate)], { type: "audio/wav" });
  }

  if (key === "dramatic") {
    const dur = 1.5;
    const ctx = new OfflineAudioContext(1, sampleRate * dur, sampleRate);
    // Big reverb impact
    const freqs = [55, 82.41, 110, 164.81];
    for (const f of freqs) {
      makeOsc(ctx, f, "sawtooth", 0, dur, 0.15, [{ t: 0.03, v: 0.25 }, { t: 0.5, v: 0.1 }, { t: 1.5, v: 0 }]);
    }
    makeOsc(ctx, 41.20, "sine", 0, dur, 0.5, [{ t: 0.02, v: 0.6 }, { t: 0.3, v: 0.2 }, { t: 1.5, v: 0 }]);
    const rendered = await ctx.startRendering();
    return new Blob([encodeWav(rendered.getChannelData(0), sampleRate)], { type: "audio/wav" });
  }

  if (key === "sparkle") {
    const dur = 1;
    const ctx = new OfflineAudioContext(1, sampleRate * dur, sampleRate);
    // Rapid high frequency cascade
    const sparkFreqs = [2093, 2349, 2637, 2960, 3136, 3520, 3951, 4186];
    for (let i = 0; i < sparkFreqs.length; i++) {
      const t = i * 0.08;
      makeOsc(ctx, sparkFreqs[i], "sine", t, t + 0.3, 0.15, [{ t: 0.01, v: 0.2 }, { t: 0.3, v: 0 }]);
    }
    const rendered = await ctx.startRendering();
    return new Blob([encodeWav(rendered.getChannelData(0), sampleRate)], { type: "audio/wav" });
  }

  if (key === "laugh") {
    const dur = 1.5;
    const ctx = new OfflineAudioContext(1, sampleRate * dur, sampleRate);
    // Rhythmic modulated tone
    for (let i = 0; i < 6; i++) {
      const t = i * 0.18;
      const freq = 300 + (i % 3) * 50;
      makeOsc(ctx, freq, "sine", t, t + 0.12, 0.25, [{ t: 0.02, v: 0.3 }, { t: 0.12, v: 0 }]);
    }
    const rendered = await ctx.startRendering();
    return new Blob([encodeWav(rendered.getChannelData(0), sampleRate)], { type: "audio/wav" });
  }

  if (key === "heartbeat") {
    const dur = 2;
    const ctx = new OfflineAudioContext(1, sampleRate * dur, sampleRate);
    // Two thumps then pause
    const beats = [0, 0.2, 1.0, 1.2];
    for (const t of beats) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(80, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.18);
      g.gain.setValueAtTime(0.55, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(t); osc.stop(t + 0.28);
    }
    const rendered = await ctx.startRendering();
    return new Blob([encodeWav(rendered.getChannelData(0), sampleRate)], { type: "audio/wav" });
  }

  // Fallback
  const dur = 1;
  const ctx = new OfflineAudioContext(1, sampleRate * dur, sampleRate);
  makeNote(ctx, 440, "sine", 0, 0.5, 0.3);
  const rendered = await ctx.startRendering();
  return new Blob([encodeWav(rendered.getChannelData(0), sampleRate)], { type: "audio/wav" });
}

function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const len = samples.length;
  const buf = new ArrayBuffer(44 + len * 2);
  const view = new DataView(buf);
  const writeStr = (off: number, str: string) => { for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i)); };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + len * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, len * 2, true);
  let off = 44;
  for (let i = 0; i < len; i++, off += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buf;
}

// ===== KEYFRAME INTERPOLATION =====
function interpolateKeyframes(keyframes: Keyframe[], currentTime: number): KeyframeProperties {
  if (keyframes.length === 0) return {};

  const sorted = [...keyframes].sort((a, b) => a.time - b.time);

  let prev = sorted[0];
  let next = sorted[sorted.length - 1];

  for (let i = 0; i < sorted.length - 1; i++) {
    if (currentTime >= sorted[i].time && currentTime <= sorted[i + 1].time) {
      prev = sorted[i];
      next = sorted[i + 1];
      break;
    }
  }

  if (currentTime <= prev.time) return prev.properties;
  if (currentTime >= next.time) return next.properties;

  const t = (currentTime - prev.time) / (next.time - prev.time);
  const result: KeyframeProperties = {};

  for (const key of ['x', 'y', 'fontSize', 'opacity', 'rotation', 'scale'] as const) {
    const prevVal = prev.properties[key];
    const nextVal = next.properties[key];
    if (prevVal !== undefined && nextVal !== undefined) {
      result[key] = prevVal + (nextVal - prevVal) * t;
    } else if (prevVal !== undefined) {
      result[key] = prevVal;
    } else if (nextVal !== undefined) {
      result[key] = nextVal;
    }
  }

  return result;
}

// ===== AUTOSAVE =====
const AUTOSAVE_KEY = "videoforge_autosave";

// ===== UNDO/REDO HISTORY =====
interface HistoryState {
  textOverlays: TextOverlay[];
  subtitles: SubtitleEntry[];
  silentSegments: SilentSegment[];
  videoUrl: string;
  stickers: StickerOverlay[];
  filterSettings: FilterSettings;
  transitionIn: TransitionSetting;
  transitionOut: TransitionSetting;
}

// Default filter values - defined outside component to prevent reference instability
const DEFAULT_FILTERS: FilterSettings = { brightness: 100, contrast: 100, saturation: 100, temperature: 0, vignette: 0 };

// Helper: build clinic context string for AI prompts
function buildClinicContext(p: ClinicProfile | null): string {
  if (!p) return "治療院・整体院";
  const parts: string[] = [];
  if (p.clinicName) parts.push(`院名: ${p.clinicName}`);
  if (p.area) parts.push(`地域: ${p.area}`);
  if (p.specialties.length > 0) parts.push(`得意症状: ${p.specialties.join("、")}`);
  if (p.treatmentStyle) parts.push(`治療スタイル: ${p.treatmentStyle}`);
  if (p.target) parts.push(`ターゲット: ${p.target}`);
  if (p.strengths) parts.push(`強み: ${p.strengths}`);
  if (p.achievements) parts.push(`実績: ${p.achievements}`);
  const toneMap = { professional: "専門的で信頼感のある", friendly: "親しみやすくカジュアルな", warm: "温かく寄り添うような", energetic: "明るく元気な" };
  parts.push(`トーン: ${toneMap[p.tone]}口調`);
  return parts.join("\n");
}

export default function VideoEditor() {
  // Clinic profile
  const [clinicProfile, setClinicProfile] = useState<ClinicProfile | null>(() => {
    try {
      const saved = localStorage.getItem("videoforge_clinic_profile");
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  // Video state
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Tool state
  const [activeTool, setActiveToolRaw] = useState<EditorTool>("select");
  const [activeToolCategory, setActiveToolCategory] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");

  // Top screen guided flow
  const [topStep, setTopStep] = useState<"home" | "symptom" | "template" | "upload" | "clinic-setup">("home");
  const [selectedSymptom, setSelectedSymptom] = useState<string | null>(null);
  const [selectedViralTemplate, setSelectedViralTemplate] = useState<string | null>(null);

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
  const [subtitleMode, setSubtitleMode] = useState<"browser" | "whisper">("browser");
  const [whisperApiKey, setWhisperApiKey] = useState<string>(() => {
    try { return sessionStorage.getItem("videoforge_whisper_key") || ""; } catch { return ""; }
  });
  const [whisperKeyInput, setWhisperKeyInput] = useState<string>("");
  const [showWhisperKey, setShowWhisperKey] = useState(false);
  const [whisperKeySaved, setWhisperKeySaved] = useState<boolean>(() => {
    try { return !!sessionStorage.getItem("videoforge_whisper_key"); } catch { return false; }
  });

  // Whisper settings
  const [whisperLang, setWhisperLang] = useState<string>("ja");
  const [whisperPrompt, setWhisperPrompt] = useState<string>("");
  const [whisperTemperature, setWhisperTemperature] = useState<number>(0);

  // ===== AI SCRIPT =====
  const [scriptTopic, setScriptTopic] = useState("");
  const [scriptDuration, setScriptDuration] = useState<"short" | "medium" | "long">("medium");
  const [scriptPlatform, setScriptPlatform] = useState<"youtube" | "reels">("youtube");
  const [generatedScript, setGeneratedScript] = useState<{ text: string; duration: number }[]>([]);
  const [scriptGenerating, setScriptGenerating] = useState(false);

  // ===== THUMBNAIL =====
  const [thumbnailFrames, setThumbnailFrames] = useState<string[]>([]);
  const [selectedThumbnailFrame, setSelectedThumbnailFrame] = useState(0);
  const [thumbnailText, setThumbnailText] = useState("");
  const [thumbnailTemplate, setThumbnailTemplate] = useState(0);
  const [thumbnailGenerating, setThumbnailGenerating] = useState(false);
  const [thumbnailSubText, setThumbnailSubText] = useState("");
  const [thumbnailColorScheme, setThumbnailColorScheme] = useState({ label: "赤×白", main: "#ff0000", sub: "#ffffff", bg: "rgba(0,0,0,0.7)" });
  const [thumbnailBeforeImg, setThumbnailBeforeImg] = useState<string | null>(null);
  const [thumbnailAfterImg, setThumbnailAfterImg] = useState<string | null>(null);
  const [thumbnailOverlayImg, setThumbnailOverlayImg] = useState<string | null>(null);
  const [thumbnailMarks, setThumbnailMarks] = useState<string[]>([]);
  const [patientConsentChecked, setPatientConsentChecked] = useState(false);
  const thumbnailBeforeRef = useRef<HTMLInputElement>(null);
  const thumbnailAfterRef = useRef<HTMLInputElement>(null);
  const thumbnailOverlayRef = useRef<HTMLInputElement>(null);

  // ===== SNS CAPTION =====
  const [captionPlatform, setCaptionPlatform] = useState<"Instagram" | "YouTube" | "TikTok">("YouTube");
  const [captionTopic, setCaptionTopic] = useState("");
  const [generatedCaption, setGeneratedCaption] = useState("");
  const [generatedTitle, setGeneratedTitle] = useState("");
  const [generatedHashtags, setGeneratedHashtags] = useState<string[]>([]);
  const [captionGenerating, setCaptionGenerating] = useState(false);

  // ===== ENDCARD =====
  const ENDCARD_TEMPLATES = [
    {
      id: "youtube-subscribe",
      name: "チャンネル登録促進",
      desc: "登録ボタン＋高評価＋ベル通知",
      texts: [
        { text: "チャンネル登録お願いします!", fontSize: 36, bold: true, color: "#ffffff", bgColor: "#ff0000", y: 30, animation: "bounce-in" as TextAnimation },
        { text: "高評価もよろしくお願いします", fontSize: 22, bold: false, color: "#ffffff", bgColor: "rgba(0,0,0,0.6)", y: 50, animation: "fade-in" as TextAnimation },
        { text: "ベルマークを押すと通知が届きます", fontSize: 18, bold: false, color: "#ffdd00", bgColor: "transparent", y: 65, animation: "slide-up" as TextAnimation },
      ],
      stickers: [{ emoji: "🔔", x: 85, y: 15, size: 80, animation: "bounce" as StickerOverlay["animation"] }, { emoji: "👍", x: 15, y: 85, size: 60, animation: "pulse" as StickerOverlay["animation"] }],
    },
    {
      id: "line-cta",
      name: "LINE登録誘導",
      desc: "LINE友だち追加＋特典案内",
      texts: [
        { text: "LINE友だち追加で特典GET!", fontSize: 32, bold: true, color: "#ffffff", bgColor: "#06C755", y: 30, animation: "bounce-in" as TextAnimation },
        { text: "プロフィールのリンクから追加できます", fontSize: 20, bold: false, color: "#ffffff", bgColor: "rgba(0,0,0,0.6)", y: 50, animation: "fade-in" as TextAnimation },
        { text: "初回限定クーポン配布中", fontSize: 22, bold: true, color: "#ffdd00", bgColor: "rgba(0,0,0,0.7)", y: 68, animation: "scale-up" as TextAnimation },
      ],
      stickers: [{ emoji: "🎁", x: 85, y: 25, size: 70, animation: "bounce" as StickerOverlay["animation"] }],
    },
    {
      id: "reservation-cta",
      name: "予約誘導",
      desc: "今すぐ予約＋電話・Web",
      texts: [
        { text: "ご予約はお気軽にどうぞ", fontSize: 32, bold: true, color: "#ffffff", bgColor: "rgba(79,70,229,0.9)", y: 28, animation: "fade-in" as TextAnimation },
        { text: "お電話またはWebから予約できます", fontSize: 20, bold: false, color: "#ffffff", bgColor: "rgba(0,0,0,0.6)", y: 48, animation: "fade-in" as TextAnimation },
        { text: "初回限定の特別価格あり!", fontSize: 24, bold: true, color: "#ffdd00", bgColor: "rgba(0,0,0,0.7)", y: 65, animation: "bounce-in" as TextAnimation },
      ],
      stickers: [{ emoji: "📞", x: 15, y: 80, size: 50, animation: "pulse" as StickerOverlay["animation"] }, { emoji: "💻", x: 85, y: 80, size: 50, animation: "pulse" as StickerOverlay["animation"] }],
    },
    {
      id: "next-video",
      name: "次の動画へ誘導",
      desc: "関連動画への誘導カード",
      texts: [
        { text: "こちらの動画もおすすめです", fontSize: 28, bold: true, color: "#ffffff", bgColor: "rgba(0,0,0,0.7)", y: 25, animation: "fade-in" as TextAnimation },
        { text: "最後までご視聴ありがとうございました", fontSize: 20, bold: false, color: "#e0e0e0", bgColor: "transparent", y: 45, animation: "fade-in" as TextAnimation },
      ],
      stickers: [{ emoji: "▶️", x: 50, y: 70, size: 80, animation: "pulse" as StickerOverlay["animation"] }],
    },
    {
      id: "thankyou",
      name: "感謝メッセージ",
      desc: "ご視聴感謝＋フォロー促進",
      texts: [
        { text: "ご視聴ありがとうございました!", fontSize: 34, bold: true, color: "#ffffff", bgColor: "transparent", outlineColor: "#000000", outlineWidth: 3, y: 30, animation: "fade-in" as TextAnimation },
        { text: "フォロー＆いいねお願いします", fontSize: 22, bold: true, color: "#ff6b9d", bgColor: "rgba(0,0,0,0.5)", y: 55, animation: "slide-up" as TextAnimation },
      ],
      stickers: [{ emoji: "❤️", x: 50, y: 78, size: 70, animation: "pulse" as StickerOverlay["animation"] }],
    },
    {
      id: "clinic-info",
      name: "院情報カード",
      desc: "院名・住所・連絡先を表示",
      texts: [
        { text: clinicProfile?.clinicName || "院名をここに", fontSize: 30, bold: true, color: "#ffffff", bgColor: "rgba(79,70,229,0.9)", y: 25, animation: "fade-in" as TextAnimation },
        { text: clinicProfile?.area || "住所をここに", fontSize: 18, bold: false, color: "#e0e0e0", bgColor: "rgba(0,0,0,0.6)", y: 45, animation: "fade-in" as TextAnimation },
        { text: "詳しくはプロフィールをご覧ください", fontSize: 20, bold: false, color: "#ffdd00", bgColor: "rgba(0,0,0,0.5)", y: 62, animation: "slide-up" as TextAnimation },
      ],
      stickers: [{ emoji: "🏥", x: 85, y: 20, size: 60, animation: "bounce" as StickerOverlay["animation"] }],
    },
  ];

  const handleApplyEndcard = (templateIdx: number) => {
    const tmpl = ENDCARD_TEMPLATES[templateIdx];
    if (!tmpl) return;
    const endStart = Math.max(0, duration - 8);
    const endEnd = duration;

    const newTexts: TextOverlay[] = tmpl.texts.map((t, i) => ({
      id: `endcard-text-${Date.now()}-${i}`,
      text: t.text,
      x: 50, y: t.y,
      fontSize: t.fontSize, fontFamily: "sans-serif",
      color: t.color, bgColor: t.bgColor,
      bold: t.bold, italic: false,
      outlineColor: ("outlineColor" in t ? (t as any).outlineColor : "#000000"),
      outlineWidth: ("outlineWidth" in t ? (t as any).outlineWidth : 0),
      shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0,
      startTime: endStart, endTime: endEnd,
      animation: t.animation,
      keyframes: [],
    }));

    const newStickers: StickerOverlay[] = tmpl.stickers.map((s, i) => ({
      id: `endcard-sticker-${Date.now()}-${i}`,
      emoji: s.emoji, x: s.x, y: s.y, size: s.size,
      rotation: 0, startTime: endStart, endTime: endEnd,
      opacity: 1, animation: s.animation, keyframes: [],
    }));

    const updatedOverlays = [...textOverlays, ...newTexts];
    const updatedStickers = [...stickers, ...newStickers];
    setTextOverlays(updatedOverlays);
    setStickers(updatedStickers);
    pushHistory({ textOverlays: updatedOverlays, subtitles, silentSegments, videoUrl, stickers: updatedStickers, filterSettings, transitionIn, transitionOut });
    setProgressMsg(`エンドカード「${tmpl.name}」を適用しました（動画の最後${(endEnd - endStart).toFixed(0)}秒間）`);
  };

  // ===== AUTO SUBTITLE =====
  const [autoSubtitleEnabled, setAutoSubtitleEnabled] = useState<boolean>(() => {
    try { return localStorage.getItem("videoforge_auto_subtitle") === "true"; } catch { return false; }
  });
  const [interimText, setInterimText] = useState("");

  // BGM
  const [bgmFile, setBgmFile] = useState<File | null>(null);
  const [bgmVolume, setBgmVolume] = useState(0.3);
  const [bgmLibraryAudio, setBgmLibraryAudio] = useState<HTMLAudioElement | null>(null);
  const [previewingBgmIdx, setPreviewingBgmIdx] = useState<string | null>(null);
  const [generatingBgm, setGeneratingBgm] = useState<string | null>(null);
  const [activeBgmCategory, setActiveBgmCategory] = useState(0);

  // Export
  const [selectedPresetIdx, setSelectedPresetIdx] = useState(0);
  const [exportQuality, setExportQuality] = useState<"high" | "medium" | "low">("high");
  const EXPORT_QUALITY_MAP = { high: { label: "高画質", bitrate: "8M", desc: "YouTube推奨" }, medium: { label: "標準", bitrate: "4M", desc: "SNS向け（軽量）" }, low: { label: "軽量", bitrate: "2M", desc: "容量を抑えたい時" } };

  // FFmpeg loading
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);
  const [ffmpegLoading, setFfmpegLoading] = useState(false);

  // ===== UNDO/REDO =====
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isApplyingHistory = useRef(false);
  // Ref mirrors historyIndex to avoid stale closures inside setHistory updater
  const historyIndexRef = useRef(-1);

  const pushHistory = useCallback((state: HistoryState) => {
    if (isApplyingHistory.current) return;
    setHistory((prev) => {
      const currentIndex = historyIndexRef.current;
      const newHistory = prev.slice(0, currentIndex + 1);
      newHistory.push(state);
      if (newHistory.length > 50) newHistory.shift();
      return newHistory;
    });
    setHistoryIndex((prev) => {
      const next = Math.min(prev + 1, 49);
      historyIndexRef.current = next;
      return next;
    });
  }, []);

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
    setStickers(state.stickers);
    setFilterSettings(state.filterSettings);
    setTransitionIn(state.transitionIn);
    setTransitionOut(state.transitionOut);
    setHistoryIndex(newIndex);
    historyIndexRef.current = newIndex;
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
    setStickers(state.stickers);
    setFilterSettings(state.filterSettings);
    setTransitionIn(state.transitionIn);
    setTransitionOut(state.transitionOut);
    setHistoryIndex(newIndex);
    historyIndexRef.current = newIndex;
    isApplyingHistory.current = false;
  }, [history, historyIndex, videoUrl]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when typing in input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        if (e.shiftKey) { e.preventDefault(); handleRedo(); }
        else { e.preventDefault(); handleUndo(); }
      }
      // Space: play/pause
      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        if (videoRef.current) {
          if (videoRef.current.paused) { videoRef.current.play(); setIsPlaying(true); }
          else { videoRef.current.pause(); setIsPlaying(false); }
        }
      }
      // Arrow keys: seek
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        const step = e.shiftKey ? 1 : 5;
        if (videoRef.current) { videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - step); setCurrentTime(videoRef.current.currentTime); }
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        const step = e.shiftKey ? 1 : 5;
        if (videoRef.current) { videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + step); setCurrentTime(videoRef.current.currentTime); }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo, duration]);

  // ===== SPEED =====
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const SPEED_PRESETS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];

  const handleSpeedPreview = useCallback((speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) videoRef.current.playbackRate = speed;
  }, []);

  const handleApplySpeed = async () => {
    if (!videoFile || playbackSpeed === 1 || processing) return;
    setProcessing(true);
    try {
      if (!await ensureFFmpeg()) return;
      const blob = await changeSpeed(videoFile, playbackSpeed, setProgressMsg);
      const newFile = new File([blob], "speed.mp4", { type: "video/mp4" });
      const newUrl = URL.createObjectURL(blob);
      setVideoUrl((prev) => { if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev); return newUrl; });
      setVideoFile(newFile); setPlaybackSpeed(1);
      pushHistory({ textOverlays, subtitles, silentSegments, videoUrl: newUrl, stickers, filterSettings, transitionIn, transitionOut });
      setProgressMsg("速度変更完了!");
    } catch (e) { setProgressMsg(`速度変更に失敗: ${e instanceof Error ? e.message : "不明なエラー"}`); console.error("速度変更 error:", e); } finally { setProcessing(false); }
  };

  // ===== SPLIT & REORDER =====
  const [clipMarkers, setClipMarkers] = useState<ClipMarker[]>([]);

  const handleSplitAtCurrent = useCallback(() => {
    if (!duration) return;
    const time = currentTime;
    if (clipMarkers.length === 0) {
      setClipMarkers([
        { id: `clip-${Date.now()}-1`, startTime: 0, endTime: time },
        { id: `clip-${Date.now()}-2`, startTime: time, endTime: duration },
      ]);
    } else {
      setClipMarkers((prev) => {
        const newClips: ClipMarker[] = [];
        for (const clip of prev) {
          if (time > clip.startTime && time < clip.endTime) {
            newClips.push({ id: `clip-${Date.now()}-a`, startTime: clip.startTime, endTime: time });
            newClips.push({ id: `clip-${Date.now()}-b`, startTime: time, endTime: clip.endTime });
          } else { newClips.push(clip); }
        }
        return newClips;
      });
    }
  }, [currentTime, duration, clipMarkers.length]);

  const handleDeleteClip = (id: string) => setClipMarkers((prev) => prev.filter((c) => c.id !== id));
  const handleMoveClipUp = (i: number) => { if (i === 0) return; setClipMarkers((prev) => { const a = [...prev]; [a[i-1],a[i]]=[a[i],a[i-1]]; return a; }); };
  const handleMoveClipDown = (i: number) => { setClipMarkers((prev) => { if (i >= prev.length-1) return prev; const a=[...prev]; [a[i],a[i+1]]=[a[i+1],a[i]]; return a; }); };
  const handleResetClips = () => setClipMarkers([]);

  const handleApplySplit = async () => {
    if (!videoFile || clipMarkers.length === 0 || processing) return;
    setProcessing(true);
    try {
      if (!await ensureFFmpeg()) return;
      const blob = await splitAndReorder(videoFile, clipMarkers, setProgressMsg);
      const newFile = new File([blob], "split.mp4", { type: "video/mp4" });
      const newUrl = URL.createObjectURL(blob);
      setVideoUrl((prev) => { if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev); return newUrl; });
      setVideoFile(newFile); setClipMarkers([]);
      pushHistory({ textOverlays, subtitles, silentSegments, videoUrl: newUrl, stickers, filterSettings, transitionIn, transitionOut });
      setProgressMsg("分割・並び替え完了!");
    } catch (e) { setProgressMsg(`分割処理に失敗: ${e instanceof Error ? e.message : "不明なエラー"}`); console.error("分割処理 error:", e); } finally { setProcessing(false); }
  };

  // ===== FILTERS =====
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
    if (!videoFile || processing) return;
    setProcessing(true);
    try {
      if (!await ensureFFmpeg()) return;
      const blob = await applyFilters(videoFile, filterSettings, setProgressMsg);
      const newFile = new File([blob], "filtered.mp4", { type: "video/mp4" });
      const newUrl = URL.createObjectURL(blob);
      setVideoUrl((prev) => { if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev); return newUrl; });
      setVideoFile(newFile);
      pushHistory({ textOverlays, subtitles, silentSegments, videoUrl: newUrl, stickers, filterSettings, transitionIn, transitionOut });
      setProgressMsg("フィルター適用完了!");
    } catch (e) { setProgressMsg(`フィルター適用に失敗: ${e instanceof Error ? e.message : "不明なエラー"}`); console.error("フィルター適用 error:", e); } finally { setProcessing(false); }
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
    if (!videoFile || processing) return;
    setProcessing(true);
    try {
      if (!await ensureFFmpeg()) return;
      const blob = await applyTransitions(videoFile, { transitionInType: transitionIn.type, transitionInDuration: transitionIn.duration, transitionOutType: transitionOut.type, transitionOutDuration: transitionOut.duration, videoDuration: duration }, setProgressMsg);
      const newFile = new File([blob], "transition.mp4", { type: "video/mp4" });
      const newUrl = URL.createObjectURL(blob);
      setVideoUrl((prev) => { if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev); return newUrl; });
      setVideoFile(newFile);
      pushHistory({ textOverlays, subtitles, silentSegments, videoUrl: newUrl, stickers, filterSettings, transitionIn, transitionOut });
      setProgressMsg("トランジション適用完了!");
    } catch (e) { setProgressMsg(`トランジション適用に失敗: ${e instanceof Error ? e.message : "不明なエラー"}`); console.error("トランジション適用 error:", e); } finally { setProcessing(false); }
  };

  useEffect(() => {
    if (clipMarkers.length < 2) { setClipTransitions([]); return; }
    const boundaryCount = clipMarkers.length - 1;
    setClipTransitions((prev) => {
      if (prev.length === boundaryCount) return prev;
      const next: TransitionSetting[] = [];
      for (let i = 0; i < boundaryCount; i++) next.push(prev[i] ?? { type: "none", duration: 0.5 });
      return next;
    });
  }, [clipMarkers.length]);

  // ===== STICKERS =====
  const STICKER_CATEGORIES = [
    { label: "リアクション", emojis: ["😀","😂","🤣","😍","🥰","😎","🤩","😱","😡","🥺","👍","👏","🙌","💪","🔥","❤️","💯","⭐","🎉","🎊"] },
    { label: "矢印・記号", emojis: ["➡️","⬅️","⬆️","⬇️","❗","❓","⭕","❌","✅","⚠️","💡","🔔","📌","🏷️","💬","🗯️","💭","📢","🎯","🔍"] },
    { label: "装飾", emojis: ["✨","💫","⚡","🌟","💥","💢","💦","🌈","🎵","🎶","🌸","🍀","🦋","🎀","👑","💎","🏆","🎁","🎈","🎗️"] },
    { label: "SNS", emojis: ["📱","💻","🖥️","📷","🎬","🎥","🎤","🎧","📺","📡","▶️","⏸️","⏹️","🔴","🟢","🔵","🟡","⚪","⚫","🟣"] },
  ];
  const [stickers, setStickers] = useState<StickerOverlay[]>([]);
  const [editingStickerId, setEditingStickerId] = useState<string | null>(null);
  const [activeStickerCategory, setActiveStickerCategory] = useState(0);

  // ===== KEYFRAMES =====
  const [selectedKeyframeTarget, setSelectedKeyframeTarget] = useState<string | null>(null);
  const [selectedKeyframeId, setSelectedKeyframeId] = useState<string | null>(null);

  const addSticker = (emoji: string) => {
    const newSticker: StickerOverlay = { id: `sticker-${Date.now()}`, emoji, x: 50, y: 50, size: 64, rotation: 0, startTime: currentTime, endTime: Math.min(currentTime + 5, duration || currentTime + 5), opacity: 1, animation: "none", keyframes: [] };
    const newStickers = [...stickers, newSticker];
    setStickers(newStickers);
    setEditingStickerId(newSticker.id);
    pushHistory({ textOverlays, subtitles, silentSegments, videoUrl, stickers: newStickers, filterSettings, transitionIn, transitionOut });
  };
  const updateSticker = (id: string, updates: Partial<StickerOverlay>) => {
    const newStickers = stickers.map((s) => s.id === id ? { ...s, ...updates } : s);
    setStickers(newStickers);
    pushHistory({ textOverlays, subtitles, silentSegments, videoUrl, stickers: newStickers, filterSettings, transitionIn, transitionOut });
  };
  const deleteSticker = (id: string) => {
    const newStickers = stickers.filter((s) => s.id !== id);
    setStickers(newStickers);
    if (editingStickerId === id) setEditingStickerId(null);
    pushHistory({ textOverlays, subtitles, silentSegments, videoUrl, stickers: newStickers, filterSettings, transitionIn, transitionOut });
  };

  // Helper: push current state to history (used by filter/transition UI)
  const pushCurrentHistory = useCallback(() => {
    pushHistory({ textOverlays, subtitles, silentSegments, videoUrl, stickers, filterSettings, transitionIn, transitionOut });
  }, [pushHistory, textOverlays, subtitles, silentSegments, videoUrl, stickers, filterSettings, transitionIn, transitionOut]);

  // ===== COLLAGE =====
  const COLLAGE_LAYOUT_OPTIONS: { key: CollageLayout; label: string; count: number; icon: string }[] = [
    { key: "2h", label: "2分割(横)", count: 2, icon: "⬛⬛" },
    { key: "2v", label: "2分割(縦)", count: 2, icon: "⬛\n⬛" },
    { key: "3h", label: "3分割", count: 3, icon: "⬛⬛⬛" },
    { key: "4grid", label: "4分割(2x2)", count: 4, icon: "⬛⬛\n⬛⬛" },
    { key: "6grid", label: "6分割(2x3)", count: 6, icon: "⬛⬛⬛\n⬛⬛⬛" },
    { key: "9grid", label: "9分割(3x3)", count: 9, icon: "⬛⬛⬛\n⬛⬛⬛\n⬛⬛⬛" },
  ];
  const makeCollageItems = (count: number): CollageItem[] => Array.from({ length: count }, (_, i) => ({ id: `ci-${Date.now()}-${i}`, file: null, url: "" }));
  const [collageSettings, setCollageSettings] = useState<CollageSettings>({ layout: "2h", items: makeCollageItems(2), borderWidth: 2, borderColor: "#000000", outputDuration: 10 });
  const collageFileRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleCollageLayoutChange = (layout: CollageLayout, count: number) => {
    setCollageSettings((prev) => {
      // Revoke URLs for slots that are being removed
      for (let i = count; i < prev.items.length; i++) {
        if (prev.items[i].url && prev.items[i].url.startsWith("blob:")) {
          URL.revokeObjectURL(prev.items[i].url);
        }
      }
      return { ...prev, layout, items: Array.from({ length: count }, (_, i) => prev.items[i] ?? { id: `ci-${Date.now()}-${i}`, file: null, url: "" }) };
    });
  };
  const handleCollageFileSelect = (index: number, file: File) => {
    const url = URL.createObjectURL(file);
    setCollageSettings((prev) => { const newItems = [...prev.items]; if (newItems[index].url && newItems[index].url.startsWith("blob:")) URL.revokeObjectURL(newItems[index].url); newItems[index] = { ...newItems[index], file, url }; return { ...prev, items: newItems }; });
  };
  const handleCreateCollage = async () => {
    const { items, layout, borderWidth, borderColor, outputDuration } = collageSettings;
    const readyFiles = items.filter((item) => item.file !== null).map((item) => item.file as File);
    const layoutOption = COLLAGE_LAYOUT_OPTIONS.find((o) => o.key === layout);
    if (!layoutOption || readyFiles.length < layoutOption.count) { setProgressMsg(`すべてのスロット(${layoutOption?.count}個)に動画をアップロードしてください`); return; }
    if (processing) return;
    setProcessing(true);
    try {
      if (!await ensureFFmpeg()) return;
      const blob = await createCollage({ files: readyFiles, layout, borderWidth, borderColor, outputDuration }, setProgressMsg);
      const newFile = new File([blob], "collage.mp4", { type: "video/mp4" });
      const newUrl = URL.createObjectURL(blob);
      setVideoUrl((prev) => { if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev); return newUrl; });
      setVideoFile(newFile);
      pushHistory({ textOverlays, subtitles, silentSegments, videoUrl: newUrl, stickers, filterSettings, transitionIn, transitionOut });
      setProgressMsg("コラージュ作成完了!");
    } catch (e) { setProgressMsg(`コラージュ作成に失敗: ${e instanceof Error ? e.message : "不明なエラー"}`); console.error("コラージュ作成 error:", e); } finally { setProcessing(false); }
  };

  // ===== SLIDESHOW =====
  const [slideshowSettings, setSlideshowSettings] = useState<SlideshowSettings>({ images: [], transition: "none", transitionDuration: 0.5 });
  const slideshowFileInputRef = useRef<HTMLInputElement>(null);

  const handleSlideshowImagesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const newImages: SlideshowImage[] = files.map((file) => ({ id: `si-${Date.now()}-${Math.random()}`, file, url: URL.createObjectURL(file), duration: 3 }));
    setSlideshowSettings((prev) => ({ ...prev, images: [...prev.images, ...newImages] }));
    e.target.value = "";
  };
  const handleSlideshowImageMove = (index: number, dir: "up" | "down") => {
    setSlideshowSettings((prev) => { const arr = [...prev.images]; const swapIdx = dir === "up" ? index - 1 : index + 1; if (swapIdx < 0 || swapIdx >= arr.length) return prev; [arr[index], arr[swapIdx]] = [arr[swapIdx], arr[index]]; return { ...prev, images: arr }; });
  };
  const handleSlideshowImageDelete = (id: string) => setSlideshowSettings((prev) => {
    const img = prev.images.find((i) => i.id === id);
    if (img && img.url.startsWith("blob:")) URL.revokeObjectURL(img.url);
    return { ...prev, images: prev.images.filter((i) => i.id !== id) };
  });
  const handleSlideshowImageDuration = (id: string, dur: number) => setSlideshowSettings((prev) => ({ ...prev, images: prev.images.map((img) => img.id === id ? { ...img, duration: dur } : img) }));
  const handleCreateSlideshow = async () => {
    if (slideshowSettings.images.length < 1) { setProgressMsg("1枚以上の画像をアップロードしてください"); return; }
    if (processing) return;
    setProcessing(true);
    try {
      if (!await ensureFFmpeg()) return;
      const blob = await createSlideshow({ images: slideshowSettings.images.map((img) => ({ file: img.file, duration: img.duration })), transition: slideshowSettings.transition, transitionDuration: slideshowSettings.transitionDuration }, setProgressMsg);
      const newFile = new File([blob], "slideshow.mp4", { type: "video/mp4" });
      const newUrl = URL.createObjectURL(blob);
      setVideoUrl((prev) => { if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev); return newUrl; });
      setVideoFile(newFile);
      pushHistory({ textOverlays, subtitles, silentSegments, videoUrl: newUrl, stickers, filterSettings, transitionIn, transitionOut });
      setProgressMsg("スライドショー作成完了!");
    } catch (e) { setProgressMsg(`スライドショー作成に失敗: ${e instanceof Error ? e.message : "不明なエラー"}`); console.error("スライドショー作成 error:", e); } finally { setProcessing(false); }
  };

  // ===== PIP =====
  const [pipSettings, setPipSettings] = useState<PipSettings>({ file: null, url: "", position: "bottom-right", size: 25, borderRadius: 0, borderWidth: 2, borderColor: "#ffffff", startTime: 0, endTime: 0 });
  const pipFileInputRef = useRef<HTMLInputElement>(null);
  const handlePipFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file) return; setPipSettings((prev) => { if (prev.url && prev.url.startsWith("blob:")) URL.revokeObjectURL(prev.url); return { ...prev, file, url: URL.createObjectURL(file) }; }); };
  const handleApplyPip = async () => {
    if (!videoFile || !pipSettings.file) { setProgressMsg("メイン動画とワイプ動画が必要です"); return; }
    if (processing) return;
    setProcessing(true);
    try {
      if (!await ensureFFmpeg()) return;
      const pipEnd = pipSettings.endTime > pipSettings.startTime ? pipSettings.endTime : duration;
      const blob = await applyPip({ mainFile: videoFile, pipFile: pipSettings.file, position: pipSettings.position, size: pipSettings.size, borderWidth: pipSettings.borderWidth, borderColor: pipSettings.borderColor, startTime: pipSettings.startTime, endTime: pipEnd }, setProgressMsg);
      const newFile = new File([blob], "pip.mp4", { type: "video/mp4" });
      const newUrl = URL.createObjectURL(blob);
      setVideoUrl((prev) => { if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev); return newUrl; });
      setVideoFile(newFile);
      pushHistory({ textOverlays, subtitles, silentSegments, videoUrl: newUrl, stickers, filterSettings, transitionIn, transitionOut });
      setProgressMsg("ワイプ適用完了!");
    } catch (e) { setProgressMsg(`ワイプ適用に失敗: ${e instanceof Error ? e.message : "不明なエラー"}`); console.error("ワイプ適用 error:", e); } finally { setProcessing(false); }
  };

  // ===== GIF EXPORT =====
  const [gifStart, setGifStart] = useState(0);
  const [gifEnd, setGifEnd] = useState(10);
  const [gifFps, setGifFps] = useState(15);
  const [gifWidth, setGifWidth] = useState(480);
  const handleExportGif = async () => {
    if (!videoFile || processing) return;
    setProcessing(true);
    try {
      if (!await ensureFFmpeg()) return;
      const blob = await exportGif({ file: videoFile, startTime: gifStart, endTime: Math.min(gifEnd, duration), fps: gifFps, width: gifWidth }, setProgressMsg);
      const url = URL.createObjectURL(blob);
      try {
        const a = document.createElement("a"); a.href = url; a.download = `videoforge_${Date.now()}.gif`; a.click();
        setProgressMsg("GIF書き出し完了!");
      } finally { URL.revokeObjectURL(url); }
    } catch (e) { setProgressMsg(`GIF書き出しに失敗: ${e instanceof Error ? e.message : "不明なエラー"}`); console.error("GIF書き出し error:", e); } finally { setProcessing(false); }
  };

  // ===== MOSAIC =====
  const [mosaicAreas, setMosaicAreas] = useState<MosaicArea[]>([]);
  const [editingMosaicId, setEditingMosaicId] = useState<string | null>(null);

  const addMosaicArea = () => {
    const newArea: MosaicArea = { id: `mosaic-${Date.now()}`, x: 30, y: 30, width: 20, height: 15, type: "mosaic", intensity: 8, startTime: currentTime, endTime: Math.min(currentTime + 5, duration || currentTime + 5) };
    setMosaicAreas((prev) => [...prev, newArea]);
    setEditingMosaicId(newArea.id);
  };
  const updateMosaicArea = (id: string, updates: Partial<MosaicArea>) => setMosaicAreas((prev) => prev.map((m) => m.id === id ? { ...m, ...updates } : m));
  const deleteMosaicArea = (id: string) => { setMosaicAreas((prev) => prev.filter((m) => m.id !== id)); if (editingMosaicId === id) setEditingMosaicId(null); };

  const handleApplyMosaic = async () => {
    if (!videoFile || mosaicAreas.length === 0 || processing) return;
    setProcessing(true);
    try {
      if (!await ensureFFmpeg()) return;
      const vw = videoRef.current?.videoWidth || 1280;
      const vh = videoRef.current?.videoHeight || 720;
      const blob = await applyMosaicAreas(videoFile, mosaicAreas, vw, vh, setProgressMsg);
      const newFile = new File([blob], "mosaic.mp4", { type: "video/mp4" });
      const newUrl = URL.createObjectURL(blob);
      setVideoUrl((prev) => { if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev); return newUrl; });
      setVideoFile(newFile);
      pushHistory({ textOverlays, subtitles, silentSegments, videoUrl: newUrl, stickers, filterSettings, transitionIn, transitionOut });
      setProgressMsg("モザイク適用完了!");
    } catch (e) { setProgressMsg(`モザイク適用に失敗: ${e instanceof Error ? e.message : "不明なエラー"}`); console.error("モザイク適用 error:", e); } finally { setProcessing(false); }
  };

  // ===== CHROMA KEY =====
  const [chromaKey, setChromaKey] = useState<ChromaKeySettings>({ enabled: false, bgFile: null, bgUrl: "", keyColor: "#00ff00", similarity: 0.3, blend: 0.1 });
  const chromaBgInputRef = useRef<HTMLInputElement>(null);

  const handleChromaBgSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setChromaKey((prev) => { if (prev.bgUrl && prev.bgUrl.startsWith("blob:")) URL.revokeObjectURL(prev.bgUrl); return { ...prev, bgFile: file, bgUrl: URL.createObjectURL(file) }; });
  };

  const handleApplyChromaKey = async () => {
    if (!videoFile || !chromaKey.bgFile) { setProgressMsg("メイン動画と背景ファイルが必要です"); return; }
    if (processing) return;
    setProcessing(true);
    try {
      if (!await ensureFFmpeg()) return;
      const isImage = chromaKey.bgFile.type.startsWith("image/");
      const blob = await applyChromaKey({ videoFile, bgFile: chromaKey.bgFile, bgIsImage: isImage, keyColor: chromaKey.keyColor, similarity: chromaKey.similarity, blend: chromaKey.blend }, setProgressMsg);
      const newFile = new File([blob], "chromakey.mp4", { type: "video/mp4" });
      const newUrl = URL.createObjectURL(blob);
      setVideoUrl((prev) => { if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev); return newUrl; });
      setVideoFile(newFile);
      pushHistory({ textOverlays, subtitles, silentSegments, videoUrl: newUrl, stickers, filterSettings, transitionIn, transitionOut });
      setProgressMsg("クロマキー適用完了!");
    } catch (e) { setProgressMsg(`クロマキー適用に失敗: ${e instanceof Error ? e.message : "不明なエラー"}`); console.error("クロマキー適用 error:", e); } finally { setProcessing(false); }
  };

  // ===== LOGO =====
  const [logoSettings, setLogoSettings] = useState<LogoSettings>({ file: null, url: "", position: "bottom-right", size: 15, opacity: 70, margin: 20 });
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const logoImgRef = useRef<HTMLImageElement | null>(null);

  const handleLogoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoSettings((prev) => { if (prev.url && prev.url.startsWith("blob:")) URL.revokeObjectURL(prev.url); return prev; });
    const url = URL.createObjectURL(file);
    setLogoSettings((prev) => ({ ...prev, file, url }));
    const img = new Image();
    img.src = url;
    logoImgRef.current = img;
  };

  const handleApplyLogoExport = async () => {
    if (!videoFile || !logoSettings.file) { setProgressMsg("動画とロゴ画像が必要です"); return; }
    if (processing) return;
    setProcessing(true);
    try {
      if (!await ensureFFmpeg()) return;
      const blob = await applyLogo({ videoFile, logoFile: logoSettings.file, position: logoSettings.position, size: logoSettings.size, opacity: logoSettings.opacity, margin: logoSettings.margin }, setProgressMsg);
      const newFile = new File([blob], "logo.mp4", { type: "video/mp4" });
      const newUrl = URL.createObjectURL(blob);
      setVideoUrl((prev) => { if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev); return newUrl; });
      setVideoFile(newFile);
      pushHistory({ textOverlays, subtitles, silentSegments, videoUrl: newUrl, stickers, filterSettings, transitionIn, transitionOut });
      setProgressMsg("ロゴ合成完了!");
    } catch (e) { setProgressMsg(`ロゴ合成に失敗: ${e instanceof Error ? e.message : "不明なエラー"}`); console.error("ロゴ合成 error:", e); } finally { setProcessing(false); }
  };

  // ===== TEMPLATE =====
  const [activeTemplatePlatform, setActiveTemplatePlatform] = useState<"youtube" | "reels" | "therapist">("youtube");
  const [activeTherapistCategory, setActiveTherapistCategory] = useState("症状解説");
  const THERAPIST_CATEGORIES = ["症状解説", "施術紹介", "患者の声", "院紹介", "集客", "健康情報", "リール"];
  const [templateSuccessMsg, setTemplateSuccessMsg] = useState<string | null>(null);

  const handleApplyTemplate = (template: VideoTemplate) => {
    const startT = currentTime;
    const endT = Math.min(currentTime + 5, duration || currentTime + 5);

    // Build full TextOverlay objects
    const newTexts: TextOverlay[] = template.textOverlays.map((partial, i) => ({
      id: `text-tmpl-${Date.now()}-${i}`,
      text: partial.text ?? "テキスト",
      x: partial.x ?? 50,
      y: partial.y ?? 50,
      fontSize: partial.fontSize ?? 32,
      fontFamily: partial.fontFamily ?? "sans-serif",
      color: partial.color ?? "#ffffff",
      bgColor: partial.bgColor ?? "transparent",
      startTime: startT,
      endTime: endT,
      bold: partial.bold ?? false,
      italic: partial.italic ?? false,
      outlineColor: partial.outlineColor ?? "#000000",
      outlineWidth: partial.outlineWidth ?? 0,
      shadowColor: partial.shadowColor ?? "transparent",
      shadowBlur: partial.shadowBlur ?? 0,
      shadowOffsetX: partial.shadowOffsetX ?? 0,
      shadowOffsetY: partial.shadowOffsetY ?? 0,
      animation: (partial.animation ?? "none") as TextAnimation,
      keyframes: [],
    }));

    // Build full StickerOverlay objects
    const newStickers: StickerOverlay[] = template.stickers.map((partial, i) => ({
      id: `sticker-tmpl-${Date.now()}-${i}`,
      emoji: partial.emoji ?? "✨",
      x: partial.x ?? 50,
      y: partial.y ?? 50,
      size: partial.size ?? 60,
      rotation: partial.rotation ?? 0,
      startTime: startT,
      endTime: endT,
      opacity: partial.opacity ?? 1,
      animation: (partial.animation ?? "none") as StickerOverlay["animation"],
      keyframes: [],
    }));

    const updatedOverlays = [...textOverlays, ...newTexts];
    const updatedStickers = [...stickers, ...newStickers];
    setTextOverlays(updatedOverlays);
    setStickers(updatedStickers);
    pushHistory({ textOverlays: updatedOverlays, subtitles, silentSegments, videoUrl, stickers: updatedStickers, filterSettings, transitionIn, transitionOut });

    if (template.aspectRatio !== undefined) {
      setSelectedPresetIdx(template.aspectRatio);
    }

    // Show success, switch to text tool
    setTemplateSuccessMsg(`テンプレート「${template.name}」を適用しました`);
    setTimeout(() => setTemplateSuccessMsg(null), 3000);
    setActiveTool("text");
    if (newTexts.length > 0) setEditingTextId(newTexts[0].id);
  };

  // ===== AI SCRIPT GENERATION =====
  const handleGenerateScript = async () => {
    const apiKey = whisperApiKey;
    if (!apiKey || !scriptTopic || scriptGenerating) return;
    setScriptGenerating(true);
    try {
      const durationMap = { short: "1分（約200文字）", medium: "3分（約600文字）", long: "5分（約1000文字）" };
      const platformStyle = scriptPlatform === "reels"
        ? "Instagram Reelsの縦型動画用。テンポよく、キャッチーに。最初の3秒でフックを。"
        : "YouTube動画用。丁寧に解説。導入→本題→まとめの構成で。";
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{
            role: "system",
            content: `あなたは治療院・整体院のYouTube/SNS動画の台本ライターです。患者さんにわかりやすく、専門的すぎない言葉で健康情報を伝える台本を作成してください。${platformStyle}台本は必ずJSON配列形式で返してください。各要素は {"text": "セリフ", "duration": 秒数} です。合計が${durationMap[scriptDuration]}になるようにしてください。\n\n【院の情報】\n${buildClinicContext(clinicProfile)}`
          }, {
            role: "user",
            content: `テーマ: ${scriptTopic}\n台本をJSON配列で生成してください。`
          }],
          temperature: 0.7,
        }),
      });
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const segments = JSON.parse(jsonMatch[0]);
        setGeneratedScript(segments);
      } else {
        setProgressMsg("台本の解析に失敗しました");
      }
    } catch {
      setProgressMsg("台本生成に失敗しました");
    }
    setScriptGenerating(false);
  };

  const handleApplyScriptAsSubtitles = () => {
    if (generatedScript.length === 0) return;
    let cumulative = 0;
    const newSubtitles: SubtitleEntry[] = generatedScript.map((seg, i) => {
      const start = cumulative;
      const end = cumulative + seg.duration;
      cumulative = end;
      return { id: `script-sub-${Date.now()}-${i}`, text: seg.text, startTime: start, endTime: end };
    });
    setSubtitles((prev) => [...prev, ...newSubtitles]);
    setProgressMsg(`${newSubtitles.length}件の字幕として適用しました`);
    setActiveTool("subtitle");
  };

  // ===== AUTO FACE DETECT =====
  const handleAutoFaceDetect = async () => {
    if (!videoRef.current) return;
    if (!('FaceDetector' in window)) {
      setProgressMsg("このブラウザは顔検出に対応していません。Chrome最新版をお使いください。");
      return;
    }
    setProcessing(true);
    setProgressMsg("顔を検出中...");
    try {
      const detector = new (window as any).FaceDetector({ fastMode: true });
      const video = videoRef.current;
      const vw = video.videoWidth || 1;
      const vh = video.videoHeight || 1;
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        setProgressMsg("動画の読み込みが完了していません。少し待ってから再試行してください。");
        setProcessing(false);
        return;
      }
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = vw;
      tempCanvas.height = vh;
      const tempCtx = tempCanvas.getContext('2d')!;
      tempCtx.drawImage(video, 0, 0);
      const faces = await detector.detect(tempCanvas);
      if (faces.length === 0) {
        setProgressMsg("顔が検出されませんでした。別のシーンで試してください。");
      } else {
        const newAreas = faces.map((face: any, i: number) => ({
          id: `face-${Date.now()}-${i}`,
          x: (face.boundingBox.x / vw) * 100,
          y: (face.boundingBox.y / vh) * 100,
          width: (face.boundingBox.width / vw) * 100,
          height: (face.boundingBox.height / vh) * 100,
          type: "mosaic" as const,
          intensity: 15,
          startTime: 0,
          endTime: duration,
        }));
        setMosaicAreas((prev) => [...prev, ...newAreas]);
        setProgressMsg(`${faces.length}人の顔を検出しました`);
      }
    } catch {
      setProgressMsg("顔検出に失敗しました。Chrome最新版でお試しください。");
    }
    setProcessing(false);
  };

  const handleFullScanFaces = async () => {
    if (!videoRef.current) return;
    if (!('FaceDetector' in window)) {
      setProgressMsg("このブラウザは顔検出に対応していません。Chrome最新版をお使いください。");
      return;
    }
    setProcessing(true);
    const video = videoRef.current;
    const vw = video.videoWidth || 1;
    const vh = video.videoHeight || 1;
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      setProgressMsg("動画の読み込みが完了していません。少し待ってから再試行してください。");
      setProcessing(false);
      return;
    }
    const savedTime = video.currentTime;
    const detector = new (window as any).FaceDetector({ fastMode: true });
    const allAreas: MosaicArea[] = [];
    const scanTimes: number[] = [];
    for (let t = 0; t < duration; t += 2) scanTimes.push(t);
    try {
      for (let idx = 0; idx < scanTimes.length; idx++) {
        const t = scanTimes[idx];
        setProgressMsg(`スキャン中... ${idx + 1}/${scanTimes.length}フレーム`);
        video.currentTime = t;
        await new Promise<void>((resolve) => video.addEventListener('seeked', () => resolve(), { once: true }));
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = vw;
        tempCanvas.height = vh;
        const tempCtx = tempCanvas.getContext('2d')!;
        tempCtx.drawImage(video, 0, 0);
        const faces = await detector.detect(tempCanvas);
        for (let i = 0; i < faces.length; i++) {
          const face = faces[i];
          allAreas.push({
            id: `face-scan-${Date.now()}-${idx}-${i}`,
            x: (face.boundingBox.x / vw) * 100,
            y: (face.boundingBox.y / vh) * 100,
            width: (face.boundingBox.width / vw) * 100,
            height: (face.boundingBox.height / vh) * 100,
            type: "mosaic" as const,
            intensity: 15,
            startTime: Math.max(0, t - 1),
            endTime: Math.min(duration, t + 3),
          });
        }
      }
      video.currentTime = savedTime;
      if (allAreas.length === 0) {
        setProgressMsg("顔が検出されませんでした。");
      } else {
        setMosaicAreas((prev) => [...prev, ...allAreas]);
        setProgressMsg(`動画全体で${allAreas.length}箇所の顔を検出しました`);
      }
    } catch {
      setProgressMsg("全フレームスキャンに失敗しました。");
      video.currentTime = savedTime;
    }
    setProcessing(false);
  };

  // ===== THUMBNAIL GENERATION =====
  const extractThumbnailFrames = async () => {
    if (!videoRef.current || duration === 0) return;
    setThumbnailGenerating(true);
    const video = videoRef.current;
    const savedTime = video.currentTime;
    // 7フレーム: 冒頭/10%/25%/50%/75%/90%/現在位置
    const times = [
      Math.max(0.5, duration * 0.02),
      duration * 0.1,
      duration * 0.25,
      duration * 0.5,
      duration * 0.75,
      duration * 0.9,
      savedTime,
    ].filter((t, i, arr) => arr.indexOf(t) === i); // 重複除去
    const frames: string[] = [];
    for (const time of times) {
      video.currentTime = time;
      await new Promise<void>((resolve) => video.addEventListener('seeked', () => resolve(), { once: true }));
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 180;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(video, 0, 0, 320, 180);
      frames.push(canvas.toDataURL('image/jpeg', 0.8));
    }
    video.currentTime = savedTime;
    setThumbnailFrames(frames);
    setThumbnailGenerating(false);
  };

  const handleGenerateThumbnail = async () => {
    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = 1280;
    thumbCanvas.height = 720;
    const ctx = thumbCanvas.getContext('2d')!;

    const loadImg = (src: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

    // ビフォーアフターテンプレ(2)で画像がある場合 → 画像合成
    if (thumbnailTemplate === 2 && thumbnailBeforeImg && thumbnailAfterImg) {
      try {
        const [before, after] = await Promise.all([loadImg(thumbnailBeforeImg), loadImg(thumbnailAfterImg)]);
        ctx.drawImage(before, 0, 0, 635, 720);
        ctx.drawImage(after, 645, 0, 635, 720);
      } catch { ctx.fillStyle = "#1a1a2e"; ctx.fillRect(0, 0, 1280, 720); }
      applyThumbnailOverlays(ctx, thumbCanvas);
      return;
    }

    // オーバーレイ画像がある場合 → 背景として使用
    if (thumbnailOverlayImg) {
      try {
        const overlayImg = await loadImg(thumbnailOverlayImg);
        ctx.drawImage(overlayImg, 0, 0, 1280, 720);
      } catch { ctx.fillStyle = "#1a1a2e"; ctx.fillRect(0, 0, 1280, 720); }
      applyThumbnailOverlays(ctx, thumbCanvas);
      return;
    }

    // 動画フレームから
    if (thumbnailFrames.length > selectedThumbnailFrame) {
      try {
        const img = await loadImg(thumbnailFrames[selectedThumbnailFrame]);
        ctx.drawImage(img, 0, 0, 1280, 720);
      } catch { ctx.fillStyle = "#1a1a2e"; ctx.fillRect(0, 0, 1280, 720); }
    } else if (videoRef.current) {
      ctx.drawImage(videoRef.current, 0, 0, 1280, 720);
    } else {
      ctx.fillStyle = "#1a1a2e"; ctx.fillRect(0, 0, 1280, 720);
    }
    applyThumbnailOverlays(ctx, thumbCanvas);
  };

  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string | null>(null);

  const applyThumbnailOverlays = (ctx: CanvasRenderingContext2D, thumbCanvas: HTMLCanvasElement) => {
    // テキスト描画
    applyThumbnailText(ctx, thumbCanvas, false);
    // マーク描画
    drawThumbnailMarks(ctx);
    // プレビュー用URL生成（ダウンロードはボタンで別途）
    const dataUrl = thumbCanvas.toDataURL('image/png');
    if (thumbnailPreviewUrl) URL.revokeObjectURL(thumbnailPreviewUrl);
    setThumbnailPreviewUrl(dataUrl);
  };

  const handleDownloadThumbnail = () => {
    if (!thumbnailPreviewUrl) return;
    const link = document.createElement('a');
    link.download = `thumbnail_${Date.now()}.png`;
    link.href = thumbnailPreviewUrl;
    link.click();
  };

  const drawThumbnailMarks = (ctx: CanvasRenderingContext2D) => {
    thumbnailMarks.forEach((mark) => {
      ctx.save();
      if (mark === "arrow-right") {
        ctx.strokeStyle = "#ff0000";
        ctx.lineWidth = 12;
        ctx.beginPath();
        ctx.moveTo(350, 360);
        ctx.lineTo(550, 360);
        ctx.lineTo(510, 310);
        ctx.moveTo(550, 360);
        ctx.lineTo(510, 410);
        ctx.stroke();
      } else if (mark === "arrow-down") {
        ctx.strokeStyle = "#ff0000";
        ctx.lineWidth = 12;
        ctx.beginPath();
        ctx.moveTo(640, 200);
        ctx.lineTo(640, 400);
        ctx.lineTo(590, 360);
        ctx.moveTo(640, 400);
        ctx.lineTo(690, 360);
        ctx.stroke();
      } else if (mark === "circle") {
        ctx.strokeStyle = "#ff0000";
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.arc(640, 360, 120, 0, Math.PI * 2);
        ctx.stroke();
      } else if (mark === "cross") {
        ctx.strokeStyle = "#ff0000";
        ctx.lineWidth = 16;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(480, 200);
        ctx.lineTo(800, 520);
        ctx.moveTo(800, 200);
        ctx.lineTo(480, 520);
        ctx.stroke();
      } else if (mark === "check") {
        ctx.strokeStyle = "#00cc00";
        ctx.lineWidth = 14;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(520, 380);
        ctx.lineTo(620, 480);
        ctx.lineTo(780, 260);
        ctx.stroke();
      } else if (mark === "star") {
        ctx.fillStyle = "#ffd700";
        ctx.font = "120px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("★", 640, 200);
      }
      ctx.restore();
    });
  };

  const applyThumbnailText = (ctx: CanvasRenderingContext2D, thumbCanvas: HTMLCanvasElement, doDownload: boolean = true) => {
    const mainColor = thumbnailColorScheme.main;
    const subColor = thumbnailColorScheme.sub;
    const bgColor = thumbnailColorScheme.bg;
    const mainText = thumbnailText;
    const subText = thumbnailSubText;
    const clinicName = clinicProfile?.clinicName || "";

    if (mainText || subText) {
      ctx.save();

      if (thumbnailTemplate === 0) {
        // YouTube風: 大文字中央 + 赤縁取り
        ctx.font = "bold 88px 'Arial Black', Impact, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.strokeStyle = mainColor;
        ctx.lineWidth = 8;
        if (mainText) {
          ctx.strokeText(mainText, 640, 340);
          ctx.fillStyle = "#ffffff";
          ctx.fillText(mainText, 640, 340);
        }
        if (subText) {
          ctx.font = "bold 36px sans-serif";
          ctx.fillStyle = subColor;
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 4;
          ctx.strokeText(subText, 640, 440);
          ctx.fillText(subText, 640, 440);
        }
      } else if (thumbnailTemplate === 1) {
        // 下部グラデーション
        const grad = ctx.createLinearGradient(0, 480, 0, 720);
        grad.addColorStop(0, "rgba(0,0,0,0)");
        grad.addColorStop(1, "rgba(0,0,0,0.9)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 480, 1280, 240);
        ctx.font = "bold 64px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillStyle = "#ffffff";
        if (mainText) ctx.fillText(mainText, 640, 680);
        if (subText) {
          ctx.font = "28px sans-serif";
          ctx.fillStyle = "rgba(255,255,255,0.8)";
          ctx.fillText(subText, 640, 710);
        }
      } else if (thumbnailTemplate === 2) {
        // ビフォーアフター左右分割
        ctx.fillStyle = "rgba(255,255,255,0.95)";
        ctx.fillRect(635, 0, 10, 720);
        // Before badge
        ctx.fillStyle = "#ff0000";
        ctx.beginPath();
        ctx.roundRect(40, 30, 200, 50, 8);
        ctx.fill();
        ctx.font = "bold 28px sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = "#ffffff";
        ctx.fillText("Before", 140, 62);
        // After badge
        ctx.fillStyle = "#00cc00";
        ctx.beginPath();
        ctx.roundRect(1040, 30, 200, 50, 8);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.fillText("After", 1140, 62);
        // Main text at bottom
        if (mainText) {
          ctx.font = "bold 48px sans-serif";
          ctx.textAlign = "center";
          ctx.fillStyle = mainColor;
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 5;
          ctx.strokeText(mainText, 640, 680);
          ctx.fillText(mainText, 640, 680);
        }
      } else if (thumbnailTemplate === 3) {
        // 警告・NG系: 赤バナー
        ctx.fillStyle = "rgba(220,0,0,0.9)";
        ctx.fillRect(0, 0, 1280, 100);
        ctx.font = "bold 52px 'Arial Black', Impact, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#ffffff";
        ctx.fillText("\u26A0\uFE0F やってはいけない", 640, 50);
        if (mainText) {
          ctx.font = "bold 80px sans-serif";
          ctx.strokeStyle = "#ff0000";
          ctx.lineWidth = 6;
          ctx.strokeText(mainText, 640, 400);
          ctx.fillStyle = "#ffffff";
          ctx.fillText(mainText, 640, 400);
        }
        // Big X mark
        ctx.strokeStyle = "rgba(255,0,0,0.5)";
        ctx.lineWidth = 30;
        ctx.beginPath();
        ctx.moveTo(200, 200);
        ctx.lineTo(1080, 600);
        ctx.moveTo(1080, 200);
        ctx.lineTo(200, 600);
        ctx.stroke();
      } else if (thumbnailTemplate === 4) {
        // ランキング: 数字大きく
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(0, 0, 1280, 720);
        ctx.font = "bold 200px 'Arial Black', Impact, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = mainColor;
        ctx.globalAlpha = 0.3;
        ctx.fillText("TOP5", 640, 300);
        ctx.globalAlpha = 1;
        if (mainText) {
          ctx.font = "bold 64px sans-serif";
          ctx.fillStyle = "#ffffff";
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 5;
          ctx.strokeText(mainText, 640, 520);
          ctx.fillText(mainText, 640, 520);
        }
        if (subText) {
          ctx.font = "32px sans-serif";
          ctx.fillStyle = "rgba(255,255,255,0.8)";
          ctx.fillText(subText, 640, 600);
        }
      } else if (thumbnailTemplate === 5) {
        // セルフケア: 手順表示
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 550, 1280, 170);
        ctx.font = "bold 56px sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = mainColor;
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 5;
        if (mainText) {
          ctx.strokeText(mainText, 640, 620);
          ctx.fillText(mainText, 640, 620);
        }
        if (subText) {
          ctx.font = "28px sans-serif";
          ctx.fillStyle = subColor;
          ctx.strokeText(subText, 640, 680);
          ctx.fillText(subText, 640, 680);
        }
        // Step badge
        ctx.fillStyle = mainColor;
        ctx.beginPath();
        ctx.arc(100, 100, 50, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = "bold 40px sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.textBaseline = "middle";
        ctx.fillText("\u270B", 100, 100);
      } else if (thumbnailTemplate === 6) {
        // 患者の声: 星評価付き
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(0, 0, 1280, 720);
        // Stars
        ctx.font = "60px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("\u2B50\u2B50\u2B50\u2B50\u2B50", 640, 200);
        // Quote
        if (mainText) {
          ctx.font = "bold 56px sans-serif";
          ctx.fillStyle = "#ffffff";
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 4;
          ctx.strokeText(`\u300C${mainText}\u300D`, 640, 380);
          ctx.fillText(`\u300C${mainText}\u300D`, 640, 380);
        }
        if (subText) {
          ctx.font = "32px sans-serif";
          ctx.fillStyle = "rgba(255,255,255,0.8)";
          ctx.fillText(subText, 640, 480);
        }
        // Patient voice badge
        ctx.fillStyle = "#fbbf24";
        ctx.beginPath();
        ctx.roundRect(440, 540, 400, 60, 12);
        ctx.fill();
        ctx.font = "bold 28px sans-serif";
        ctx.fillStyle = "#000000";
        ctx.fillText("\u60A3\u8005\u69D8\u306E\u58F0", 640, 578);
      } else if (thumbnailTemplate === 7) {
        // 院紹介: シンプル
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.fillRect(0, 0, 1280, 720);
        if (clinicName) {
          ctx.font = "bold 72px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = "#ffffff";
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 5;
          ctx.strokeText(clinicName, 640, 300);
          ctx.fillText(clinicName, 640, 300);
        }
        if (mainText) {
          ctx.font = "bold 48px sans-serif";
          ctx.fillStyle = mainColor;
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 4;
          ctx.strokeText(mainText, 640, 420);
          ctx.fillText(mainText, 640, 420);
        }
        if (subText) {
          ctx.font = "28px sans-serif";
          ctx.fillStyle = "rgba(255,255,255,0.7)";
          ctx.fillText(subText, 640, 500);
        }
      } else if (thumbnailTemplate === 8) {
        // 衝撃系: 黄×黒
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(0, 0, 1280, 720);
        // Yellow diagonal stripe
        ctx.save();
        ctx.fillStyle = "rgba(255,255,0,0.15)";
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(500, 0);
        ctx.lineTo(0, 500);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        if (mainText) {
          ctx.font = "bold 96px 'Arial Black', Impact, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = "#ffff00";
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 8;
          ctx.strokeText(mainText, 640, 340);
          ctx.fillText(mainText, 640, 340);
        }
        if (subText) {
          ctx.font = "bold 40px sans-serif";
          ctx.fillStyle = "#ffffff";
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 4;
          ctx.strokeText(subText, 640, 460);
          ctx.fillText(subText, 640, 460);
        }
      } else if (thumbnailTemplate === 9) {
        // CTA: 予約誘導
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(0, 0, 1280, 720);
        // Top badge
        if (clinicName) {
          ctx.font = "28px sans-serif";
          ctx.textAlign = "center";
          ctx.fillStyle = "rgba(255,255,255,0.7)";
          ctx.fillText(clinicName, 640, 60);
        }
        if (mainText) {
          ctx.font = "bold 72px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = "#ffffff";
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 5;
          ctx.strokeText(mainText, 640, 320);
          ctx.fillText(mainText, 640, 320);
        }
        // CTA button
        ctx.fillStyle = "#6366f1";
        ctx.beginPath();
        ctx.roundRect(340, 500, 600, 80, 16);
        ctx.fill();
        ctx.font = "bold 36px sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.textBaseline = "middle";
        ctx.fillText(subText || "\u4ECA\u3059\u3050\u4E88\u7D04\u3059\u308B", 640, 540);
      }
      ctx.restore();
    }

    if (doDownload) {
      const link = document.createElement('a');
      link.download = `thumbnail_${Date.now()}.png`;
      link.href = thumbCanvas.toDataURL('image/png');
      link.click();
    }
  };

  // ===== SNS CAPTION GENERATION =====
  const handleGenerateCaption = async () => {
    const apiKey = whisperApiKey;
    if (!apiKey) {
      setProgressMsg("APIキーを字幕ツールで設定してください");
      return;
    }
    setCaptionGenerating(true);
    try {
      const context = subtitles.length > 0
        ? subtitles.map((s) => s.text).join(" ")
        : captionTopic;
      if (!context) {
        setProgressMsg("字幕か話題テキストを入力してください");
        setCaptionGenerating(false);
        return;
      }
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{
            role: "system",
            content: `あなたは治療院・整体院のSNS投稿の専門コピーライターです。${captionPlatform}投稿用のタイトル・説明文・ハッシュタグを一括生成してください。
必ず以下のJSON形式で返してください:
{
  "title": "動画タイトル（${captionPlatform === "YouTube" ? "60文字以内、SEOを意識" : "30文字以内、キャッチーに"}）",
  "caption": "投稿説明文（${captionPlatform === "YouTube" ? "300〜500文字、概要欄向け。改行・絵文字を適度に使い見やすく" : "150〜300文字、改行で読みやすく"}）",
  "hashtags": ["#タグ1", "#タグ2", ...（${captionPlatform === "Instagram" ? "15〜20個" : captionPlatform === "TikTok" ? "5〜8個" : "5〜10個"}）]
}

【院の情報】
${buildClinicContext(clinicProfile)}`
          }, {
            role: "user",
            content: `動画の内容（書き起こし）:\n${context}\n\nプラットフォーム: ${captionPlatform}`
          }],
          temperature: 0.7,
        }),
      });
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setGeneratedTitle(parsed.title || "");
        setGeneratedCaption(parsed.caption || "");
        setGeneratedHashtags(parsed.hashtags || []);
      } else {
        setProgressMsg("キャプション解析に失敗しました");
      }
    } catch {
      setProgressMsg("キャプション生成に失敗しました");
    }
    setCaptionGenerating(false);
  };

  // ===== AUTOSAVE =====
  const [autoSaved, setAutoSaved] = useState(false);
  const [showRestorePrompt, setShowRestorePrompt] = useState(false);

  useEffect(() => {
    // Check for saved state on mount
    try {
      const saved = localStorage.getItem(AUTOSAVE_KEY);
      if (saved) setShowRestorePrompt(true);
    } catch {}
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!videoUrl) return;
      try {
        const state = {
          textOverlays,
          subtitles,
          clipMarkers,
          filterSettings,
          stickers,
          mosaicAreas,
          trimStart,
          trimEnd,
          bgmVolume,
          savedAt: new Date().toISOString(),
        };
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(state));
        setAutoSaved(true);
        setTimeout(() => setAutoSaved(false), 2000);
      } catch {}
    }, 30000);
    return () => clearInterval(interval);
  }, [videoUrl, textOverlays, subtitles, clipMarkers, filterSettings, stickers, mosaicAreas, trimStart, trimEnd, bgmVolume]);

  const handleRestoreProject = () => {
    try {
      const saved = localStorage.getItem(AUTOSAVE_KEY);
      if (!saved) return;
      const state = JSON.parse(saved);
      if (state.textOverlays) setTextOverlays(state.textOverlays);
      if (state.subtitles) setSubtitles(state.subtitles);
      if (state.clipMarkers) setClipMarkers(state.clipMarkers);
      if (state.filterSettings) setFilterSettings(state.filterSettings);
      if (state.stickers) setStickers(state.stickers);
      if (state.mosaicAreas) setMosaicAreas(state.mosaicAreas);
      if (state.trimStart !== undefined) setTrimStart(state.trimStart);
      if (state.trimEnd !== undefined) setTrimEnd(state.trimEnd);
      if (state.bgmVolume !== undefined) setBgmVolume(state.bgmVolume);
      setProgressMsg("プロジェクトを復元しました");
    } catch {}
    setShowRestorePrompt(false);
  };

  const handleResetProject = () => {
    try { localStorage.removeItem(AUTOSAVE_KEY); } catch {}
    setTextOverlays([]); setSubtitles([]); setClipMarkers([]); setFilterSettings({ ...DEFAULT_FILTERS });
    setStickers([]); setMosaicAreas([]); setTrimStart(0); setTrimEnd(duration);
    setTransitionIn({ ...DEFAULT_TRANSITION }); setTransitionOut({ ...DEFAULT_TRANSITION });
    pushHistory({ textOverlays: [], subtitles: [], silentSegments: [], videoUrl, stickers: [], filterSettings: { ...DEFAULT_FILTERS }, transitionIn: { ...DEFAULT_TRANSITION }, transitionOut: { ...DEFAULT_TRANSITION } });
    setProgressMsg("プロジェクトをリセットしました");
  };

  // プロジェクトファイル保存（JSON）
  const handleExportProject = () => {
    const projectData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      textOverlays, subtitles, clipMarkers, filterSettings, stickers,
      mosaicAreas, trimStart, trimEnd, bgmVolume,
      transitionIn, transitionOut,
    };
    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.download = `videoforge_project_${new Date().toISOString().slice(0, 10)}.json`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
    setProgressMsg("プロジェクトをエクスポートしました");
  };

  const projectImportRef = useRef<HTMLInputElement>(null);
  const handleImportProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        if (data.textOverlays) setTextOverlays(data.textOverlays);
        if (data.subtitles) setSubtitles(data.subtitles);
        if (data.clipMarkers) setClipMarkers(data.clipMarkers);
        if (data.filterSettings) setFilterSettings(data.filterSettings);
        if (data.stickers) setStickers(data.stickers);
        if (data.mosaicAreas) setMosaicAreas(data.mosaicAreas);
        if (data.trimStart !== undefined) setTrimStart(data.trimStart);
        if (data.trimEnd !== undefined) setTrimEnd(data.trimEnd);
        if (data.bgmVolume !== undefined) setBgmVolume(data.bgmVolume);
        if (data.transitionIn) setTransitionIn(data.transitionIn);
        if (data.transitionOut) setTransitionOut(data.transitionOut);
        setProgressMsg("プロジェクトを読み込みました");
      } catch { setProgressMsg("プロジェクトファイルの読み込みに失敗しました"); }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // ===== DRAG TO ADJUST =====
  const draggingRef = useRef<{ id: string; type: "text" | "sticker"; startX: number; startY: number; origX: number; origY: number } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const getCanvasPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { px: 0, py: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    let clientX = 0, clientY = 0;
    if ("touches" in e) {
      clientX = e.touches[0]?.clientX ?? 0;
      clientY = e.touches[0]?.clientY ?? 0;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    const canvasX = (clientX - rect.left) * scaleX;
    const canvasY = (clientY - rect.top) * scaleY;
    return { px: (canvasX / canvas.width) * 100, py: (canvasY / canvas.height) * 100 };
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const { px, py } = getCanvasPos(e);
    const time = currentTime;

    // Check stickers first (on top)
    for (const sticker of [...stickers].reverse()) {
      if (time < sticker.startTime || time > sticker.endTime) continue;
      const halfSize = (sticker.size / canvas.width) * 50;
      if (Math.abs(px - sticker.x) < halfSize && Math.abs(py - sticker.y) < halfSize) {
        draggingRef.current = { id: sticker.id, type: "sticker", startX: px, startY: py, origX: sticker.x, origY: sticker.y };
        setDraggingId(sticker.id);
        e.preventDefault();
        return;
      }
    }

    // Check text overlays
    for (const overlay of [...textOverlays].reverse()) {
      if (time < overlay.startTime || time > overlay.endTime) continue;
      ctx.font = `${overlay.bold ? "bold" : ""} ${overlay.italic ? "italic" : ""} ${overlay.fontSize}px ${overlay.fontFamily}`.trim();
      const metrics = ctx.measureText(overlay.text);
      const textW = (metrics.width / canvas.width) * 100;
      const textH = (overlay.fontSize * 1.5 / canvas.height) * 100;
      if (px >= overlay.x - 1 && px <= overlay.x + textW + 1 && py >= overlay.y - textH && py <= overlay.y + 2) {
        draggingRef.current = { id: overlay.id, type: "text", startX: px, startY: py, origX: overlay.x, origY: overlay.y };
        setDraggingId(overlay.id);
        e.preventDefault();
        return;
      }
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!draggingRef.current) return;
    const { px, py } = getCanvasPos(e);
    const drag = draggingRef.current;
    const dx = px - drag.startX;
    const dy = py - drag.startY;
    const newX = Math.max(0, Math.min(100, drag.origX + dx));
    const newY = Math.max(0, Math.min(100, drag.origY + dy));
    if (drag.type === "text") updateTextOverlay(drag.id, { x: newX, y: newY });
    else updateSticker(drag.id, { x: newX, y: newY });
  };

  const handleCanvasMouseUp = () => {
    draggingRef.current = null;
    setDraggingId(null);
  };

  const handleCanvasTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const { px, py } = getCanvasPos(e);
    const time = currentTime;
    for (const sticker of [...stickers].reverse()) {
      if (time < sticker.startTime || time > sticker.endTime) continue;
      const halfSize = (sticker.size / canvas.width) * 50;
      if (Math.abs(px - sticker.x) < halfSize && Math.abs(py - sticker.y) < halfSize) {
        draggingRef.current = { id: sticker.id, type: "sticker", startX: px, startY: py, origX: sticker.x, origY: sticker.y };
        setDraggingId(sticker.id); return;
      }
    }
    for (const overlay of [...textOverlays].reverse()) {
      if (time < overlay.startTime || time > overlay.endTime) continue;
      ctx.font = `${overlay.bold ? "bold" : ""} ${overlay.italic ? "italic" : ""} ${overlay.fontSize}px ${overlay.fontFamily}`.trim();
      const metrics = ctx.measureText(overlay.text);
      const textW = (metrics.width / canvas.width) * 100;
      const textH = (overlay.fontSize * 1.5 / canvas.height) * 100;
      if (px >= overlay.x - 1 && px <= overlay.x + textW + 1 && py >= overlay.y - textH && py <= overlay.y + 2) {
        draggingRef.current = { id: overlay.id, type: "text", startX: px, startY: py, origX: overlay.x, origY: overlay.y };
        setDraggingId(overlay.id); return;
      }
    }
  };

  const handleCanvasTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!draggingRef.current) return;
    e.preventDefault();
    const { px, py } = getCanvasPos(e);
    const drag = draggingRef.current;
    const dx = px - drag.startX;
    const dy = py - drag.startY;
    const newX = Math.max(0, Math.min(100, drag.origX + dx));
    const newY = Math.max(0, Math.min(100, drag.origY + dy));
    if (drag.type === "text") updateTextOverlay(drag.id, { x: newX, y: newY });
    else updateSticker(drag.id, { x: newX, y: newY });
  };

  const handleCanvasTouchEnd = () => { draggingRef.current = null; setDraggingId(null); };

  // ===== AUTO EDIT STATE =====
  const [autoTitle, setAutoTitle] = useState("");
  const [autoGenre, setAutoGenre] = useState<"symptoms" | "treatment" | "patient" | "health" | "clinic" | "other">("symptoms");
  const [autoPlatform, setAutoPlatform] = useState<"youtube" | "reels">("youtube");
  const [autoSettings, setAutoSettings] = useState({
    silenceCut: true,
    subtitles: true,
    bgm: true,
    titleOverlay: true,
    logo: true,
    bgmVolume: 0.2,
  });
  const [autoStep, setAutoStep] = useState(0);
  const [autoTotalSteps, setAutoTotalSteps] = useState(6);
  const [autoRunning, setAutoRunning] = useState(false);
  const [autoDetailOpen, setAutoDetailOpen] = useState(false);
  const [autoStepLog, setAutoStepLog] = useState<string[]>([]);
  const [autoComplete, setAutoComplete] = useState(false);
  const [autoFinalUrl, setAutoFinalUrl] = useState("");
  const [autoThumbnailUrl, setAutoThumbnailUrl] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mosaicCanvasRef = useRef<HTMLCanvasElement | null>(null); // cached for performance
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgmInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const ensureFFmpeg = useCallback(async (): Promise<boolean> => {
    if (ffmpegLoaded) return true;
    setFfmpegLoading(true);
    const sabStatus = typeof SharedArrayBuffer !== "undefined" ? "有効" : "無効";
    const coiStatus = typeof window !== "undefined" && window.crossOriginIsolated ? "有効" : "無効";
    setProgressMsg(`FFmpegを読み込み中... (SAB:${sabStatus}, COI:${coiStatus})`);
    try {
      const { getFFmpeg } = await import("@/lib/ffmpeg-utils");
      await getFFmpeg(); setFfmpegLoaded(true);
      return true;
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      setProgressMsg(`FFmpeg読込失敗 (SAB:${sabStatus}, COI:${coiStatus}): ${errMsg}`);
      return false;
    } finally { setFfmpegLoading(false); }
  }, [ffmpegLoaded]);

  const MAX_FILE_SIZE_MB = 500;
  const SUPPORTED_FORMATS = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo", "video/x-matroska"];

  const loadVideoFile = useCallback((file: File) => {
    // ファイルサイズ検証
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > MAX_FILE_SIZE_MB) {
      setProgressMsg(`ファイルサイズが大きすぎます（${sizeMB.toFixed(0)}MB）。${MAX_FILE_SIZE_MB}MB以下の動画を使用してください。`);
      return;
    }
    // フォーマット検証
    if (file.type && !SUPPORTED_FORMATS.includes(file.type)) {
      setProgressMsg(`非対応のファイル形式です（${file.type}）。MP4・WebM・MOV形式をお使いください。`);
      return;
    }
    // 100MB以上は警告表示
    if (sizeMB > 100) {
      setProgressMsg(`大きなファイル（${sizeMB.toFixed(0)}MB）を読み込みます。処理に時間がかかる場合があります。`);
    }
    // Revoke old blob URL to prevent memory leak
    setVideoUrl((prevUrl) => {
      if (prevUrl && prevUrl.startsWith("blob:")) {
        URL.revokeObjectURL(prevUrl);
      }
      return prevUrl;
    });
    setVideoFile(file);
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setSilentSegments([]); setTextOverlays([]); setSubtitles([]); setClipMarkers([]);
    setFilterSettings({ brightness: 100, contrast: 100, saturation: 100, temperature: 0, vignette: 0 }); setMosaicAreas([]);
    setStickers([]);
    setHistory([{ textOverlays: [], subtitles: [], silentSegments: [], videoUrl: url, stickers: [], filterSettings: { ...DEFAULT_FILTERS }, transitionIn: { ...DEFAULT_TRANSITION }, transitionOut: { ...DEFAULT_TRANSITION } }]);
    setHistoryIndex(0);
    historyIndexRef.current = 0;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleVideoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (selectedViralTemplate) {
      pendingViralTemplateRef.current = selectedViralTemplate;
    }
    loadVideoFile(file);
  }, [loadVideoFile, selectedViralTemplate]);

  const [isDragging, setIsDragging] = useState(false);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("video/")) {
      if (selectedViralTemplate) {
        pendingViralTemplateRef.current = selectedViralTemplate;
      }
      loadVideoFile(file);
    }
  }, [loadVideoFile, selectedViralTemplate]);
  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);

  // Auto-apply viral template after video loads (guided flow)
  const pendingViralTemplateRef = useRef<string | null>(null);
  useEffect(() => {
    if (videoUrl && pendingViralTemplateRef.current) {
      const templateId = pendingViralTemplateRef.current;
      pendingViralTemplateRef.current = null;
      // Apply template after small delay to let duration load
      const timer = setTimeout(() => {
        try {
          const tmpl = VIRAL_TEMPLATES.find((t) => t.id === templateId);
          if (tmpl && tmpl.textOverlayPresets) {
            const newTexts: TextOverlay[] = tmpl.textOverlayPresets.map((p: any, i: number) => ({
              id: `viral-${Date.now()}-${i}`,
              text: (p.text || "").replace("{院名}", clinicProfile?.clinicName || "当院").replace("{地域}", clinicProfile?.area || "").replace("{電話番号}", clinicProfile?.phone || "").replace("{予約URL}", clinicProfile?.bookingUrl || "").replace("{LINE}", clinicProfile?.lineUrl || ""),
              x: p.x ?? 50, y: p.y ?? (20 + i * 15),
              fontSize: p.fontSize ?? 28, fontFamily: p.fontFamily ?? "sans-serif",
              color: p.color ?? "#ffffff", bgColor: p.bgColor ?? "rgba(0,0,0,0.6)",
              bold: p.bold ?? true, italic: false,
              outlineColor: p.outlineColor ?? "#000000", outlineWidth: p.outlineWidth ?? 0,
              shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0,
              startTime: 0, endTime: duration || 30,
              animation: (p.animation ?? "fade-in") as TextAnimation,
              keyframes: [],
            }));
            if (newTexts.length > 0) {
              setTextOverlays(newTexts);
              setEditingTextId(newTexts[0].id);
            }
            // Switch to template tool to show applied result
            setActiveTool("text");
            setProgressMsg(`テンプレート「${tmpl.name}」を自動適用しました。テロップを編集してください。`);
          } else {
            // Template has script structure but no overlays - show the template tool
            setActiveTool("template");
            setProgressMsg(`「${tmpl?.name || "テンプレート"}」を選択中。テンプレートツールから構成を確認できます。`);
          }
        } catch {}
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [videoUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-subtitle: trigger Whisper when video loads and auto mode is on
  const autoSubtitleTriggered = useRef(false);
  // Auto-subtitle trigger: ref guard (autoSubtitleTriggered) ensures this runs at most once per video load.
  // handleWhisperSubtitles is intentionally omitted from deps (not memoized) — ref guard prevents re-execution.
  useEffect(() => {
    if (autoSubtitleEnabled && videoFile && whisperApiKey && !processing && !autoSubtitleTriggered.current && subtitles.length === 0) {
      autoSubtitleTriggered.current = true;
      const timer = setTimeout(() => {
        handleWhisperSubtitles();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [videoFile, autoSubtitleEnabled, whisperApiKey, processing, subtitles.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset auto-subtitle trigger when new video is uploaded
  useEffect(() => {
    if (!videoFile) autoSubtitleTriggered.current = false;
  }, [videoFile]);

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) { setDuration(videoRef.current.duration); setTrimEnd(videoRef.current.duration); }
  }, []);

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
  }, []);

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (draggingRef.current) return; // Don't toggle if dragging
    if (videoRef.current.paused) { videoRef.current.play(); setIsPlaying(true); }
    else { videoRef.current.pause(); setIsPlaying(false); }
  }, []);

  const handleSeek = useCallback((time: number) => {
    if (videoRef.current) { videoRef.current.currentTime = time; setCurrentTime(time); }
  }, []);

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds) || isNaN(seconds) || seconds < 0) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handleDetectSilence = async () => {
    if (!videoFile || processing) return;
    setProcessing(true);
    try {
      if (!await ensureFFmpeg()) return;
      const segments = await detectSilence(videoFile, silenceThreshold, silenceMinDuration, setProgressMsg);
      setSilentSegments(segments);
      setProgressMsg(`${segments.length}箇所の無音区間を検出しました`);
    } catch (e) { setProgressMsg(`無音検出に失敗: ${e instanceof Error ? e.message : String(e)}`); } finally { setProcessing(false); }
  };

  const handleRemoveSilence = async () => {
    if (!videoFile || silentSegments.length === 0 || processing) return;
    setProcessing(true);
    try {
      if (!await ensureFFmpeg()) return;
      const blob = await removeSilence(videoFile, silentSegments, 0.1, setProgressMsg);
      const newFile = new File([blob], "edited.mp4", { type: "video/mp4" });
      const newUrl = URL.createObjectURL(blob);
      setVideoUrl((prev) => { if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev); return newUrl; });
      setVideoFile(newFile); setSilentSegments([]);
      pushHistory({ textOverlays, subtitles, silentSegments: [], videoUrl: newUrl, stickers, filterSettings, transitionIn, transitionOut });
      setProgressMsg("無音カット完了!");
    } catch (e) { setProgressMsg(`無音カットに失敗: ${e instanceof Error ? e.message : String(e)}`); } finally { setProcessing(false); }
  };

  const handleTrim = async () => {
    if (!videoFile || processing) return;
    setProcessing(true);
    try {
      if (!await ensureFFmpeg()) return;
      const blob = await trimVideo(videoFile, trimStart, trimEnd, setProgressMsg);
      const newFile = new File([blob], "trimmed.mp4", { type: "video/mp4" });
      const newUrl = URL.createObjectURL(blob);
      setVideoUrl((prev) => { if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev); return newUrl; });
      setVideoFile(newFile);
      pushHistory({ textOverlays, subtitles, silentSegments, videoUrl: newUrl, stickers, filterSettings, transitionIn, transitionOut });
      setProgressMsg("トリミング完了!");
    } catch (e) { setProgressMsg(`トリミングに失敗: ${e instanceof Error ? e.message : "不明なエラー"}`); console.error("トリミング error:", e); } finally { setProcessing(false); }
  };

  const addTextOverlay = () => {
    const newText: TextOverlay = {
      id: `text-${Date.now()}`, text: "テキストを入力", x: 50, y: 50, fontSize: 32, fontFamily: "sans-serif",
      color: "#ffffff", bgColor: "rgba(0,0,0,0.7)", startTime: currentTime,
      // If duration is 0 (video not yet loaded), use currentTime + 5 as fallback
      endTime: duration > 0 ? Math.min(currentTime + 5, duration) : currentTime + 5,
      bold: true, italic: false, outlineColor: "#000000", outlineWidth: 0,
      shadowColor: "rgba(0,0,0,0.8)", shadowBlur: 0, shadowOffsetX: 2, shadowOffsetY: 2, animation: "none",
      keyframes: [],
    };
    const newOverlays = [...textOverlays, newText];
    setTextOverlays(newOverlays); setEditingTextId(newText.id);
    pushHistory({ textOverlays: newOverlays, subtitles, silentSegments, videoUrl, stickers, filterSettings, transitionIn, transitionOut });
  };

  const textHistoryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const updateTextOverlay = (id: string, updates: Partial<TextOverlay>) => {
    setTextOverlays((prev) => {
      const next = prev.map((t) => t.id === id ? { ...t, ...updates } : t);
      // Debounced history push (300ms) so rapid edits don't flood undo stack
      if (textHistoryTimerRef.current) clearTimeout(textHistoryTimerRef.current);
      textHistoryTimerRef.current = setTimeout(() => {
        pushHistory({ textOverlays: next, subtitles, silentSegments, videoUrl, stickers, filterSettings, transitionIn, transitionOut });
      }, 300);
      return next;
    });
  };

  const deleteTextOverlay = (id: string) => {
    const newOverlays = textOverlays.filter((t) => t.id !== id);
    setTextOverlays(newOverlays);
    if (editingTextId === id) setEditingTextId(null);
    pushHistory({ textOverlays: newOverlays, subtitles, silentSegments, videoUrl, stickers, filterSettings, transitionIn, transitionOut });
  };

  const duplicateTextOverlay = (id: string) => {
    const source = textOverlays.find((t) => t.id === id);
    if (!source) return;
    const newId = `text-dup-${Date.now()}`;
    const duplicate: TextOverlay = { ...source, id: newId, y: Math.min(100, source.y + 5) };
    const newOverlays = [...textOverlays, duplicate];
    setTextOverlays(newOverlays);
    setEditingTextId(newId);
    pushHistory({ textOverlays: newOverlays, subtitles, silentSegments, videoUrl, stickers, filterSettings, transitionIn, transitionOut });
  };

  const startVoiceRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { setProgressMsg("このブラウザは音声認識に対応していません。Chromeをお使いください。"); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = "ja-JP"; recognition.continuous = true; recognition.interimResults = true;
    let lastFinalTime = currentTime;
    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          const text = event.results[i][0].transcript;
          const now = videoRef.current?.currentTime || 0;
          setSubtitles((prev) => [...prev, { id: `sub-${Date.now()}-${i}`, text, startTime: lastFinalTime, endTime: now }]);
          lastFinalTime = now;
          setInterimText("");
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      if (interim) setInterimText(interim);
    };
    recognition.onerror = () => { setIsListening(false); setInterimText(""); };
    recognition.onend = () => { setIsListening(false); setInterimText(""); };
    recognitionRef.current = recognition;
    recognition.start(); setIsListening(true);
    if (videoRef.current?.paused) { videoRef.current.play(); setIsPlaying(true); }
  };

  const stopVoiceRecognition = () => {
    recognitionRef.current?.stop(); setIsListening(false);
    if (videoRef.current) { videoRef.current.pause(); setIsPlaying(false); }
  };

  const handleSaveWhisperKey = () => {
    const key = whisperKeyInput.trim();
    if (!key) return;
    try { sessionStorage.setItem("videoforge_whisper_key", key); } catch {}
    setWhisperApiKey(key);
    setWhisperKeySaved(true);
    setWhisperKeyInput("");
    setProgressMsg("APIキーを保存しました");
  };

  const handleChangeWhisperKey = () => {
    setWhisperKeySaved(false);
    setWhisperKeyInput(whisperApiKey);
  };

  const handleWhisperSubtitles = async () => {
    if (!videoFile || !whisperApiKey || processing) return;
    await ensureFFmpeg();
    setProcessing(true);
    try {
      setProgressMsg("音声を抽出中...");
      const audioBlob = await extractAudio(videoFile, setProgressMsg);

      setProgressMsg("AIが字幕を生成中...");
      const formData = new FormData();
      formData.append("file", audioBlob, "audio.wav");
      formData.append("model", "whisper-1");
      formData.append("language", whisperLang);
      formData.append("response_format", "verbose_json");
      formData.append("timestamp_granularities[]", "segment");
      if (whisperPrompt) formData.append("prompt", whisperPrompt);
      if (whisperTemperature > 0) formData.append("temperature", String(whisperTemperature));

      const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${whisperApiKey}` },
        body: formData,
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        throw new Error(`${response.status}${errText ? ": " + errText.slice(0, 120) : ""}`);
      }

      const data = await response.json();
      const newSubtitles: SubtitleEntry[] = (data.segments || []).map((seg: any, i: number) => ({
        id: `whisper-${Date.now()}-${i}`,
        text: seg.text.trim(),
        startTime: seg.start,
        endTime: seg.end,
      }));

      setSubtitles((prev) => [...prev, ...newSubtitles]);
      setProgressMsg(`完了！${newSubtitles.length}件の字幕を生成しました`);
    } catch (e: any) {
      const msg = e.message || "";
      if (msg.includes("401")) {
        setProgressMsg("APIキーが無効です。正しいキーを入力してください。");
      } else {
        setProgressMsg(`字幕生成に失敗しました: ${msg}`);
      }
    }
    setProcessing(false);
  };

  const handleBgmUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setBgmFile(file);
  };

  const handleAddBgm = async () => {
    if (!videoFile || !bgmFile || processing) return;
    setProcessing(true);
    try {
      if (!await ensureFFmpeg()) return;
      const blob = await addBgm(videoFile, bgmFile, bgmVolume, setProgressMsg);
      const newFile = new File([blob], "with-bgm.mp4", { type: "video/mp4" });
      const newUrl = URL.createObjectURL(blob);
      setVideoUrl((prev) => { if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev); return newUrl; });
      setVideoFile(newFile);
      pushHistory({ textOverlays, subtitles, silentSegments, videoUrl: newUrl, stickers, filterSettings, transitionIn, transitionOut });
      setProgressMsg("BGM追加完了!");
    } catch (e) { setProgressMsg(`BGM追加に失敗: ${e instanceof Error ? e.message : "不明なエラー"}`); console.error("BGM追加 error:", e); } finally { setProcessing(false); }
  };

  const bgmLibraryUrlRef = useRef<string | null>(null);

  const handlePreviewBgmLibrary = async (catIdx: number, itemIdx: number) => {
    const key = `${catIdx}-${itemIdx}`;
    if (bgmLibraryAudio) {
      bgmLibraryAudio.pause();
      bgmLibraryAudio.src = "";
      // Revoke the previous blob URL to prevent memory leak
      if (bgmLibraryUrlRef.current) {
        URL.revokeObjectURL(bgmLibraryUrlRef.current);
        bgmLibraryUrlRef.current = null;
      }
    }
    if (previewingBgmIdx === key) { setPreviewingBgmIdx(null); setBgmLibraryAudio(null); return; }
    setGeneratingBgm(key);
    try {
      const item = BGM_CATEGORIES[catIdx].items[itemIdx];
      const isBgm = catIdx === 0;
      const blob = await generateAudioBlob(item.key);
      const url = URL.createObjectURL(blob);
      bgmLibraryUrlRef.current = url;
      const audio = new Audio(url);
      audio.loop = isBgm;
      audio.play();
      setBgmLibraryAudio(audio);
      setPreviewingBgmIdx(key);
      audio.onended = () => {
        setPreviewingBgmIdx(null);
        if (bgmLibraryUrlRef.current) {
          URL.revokeObjectURL(bgmLibraryUrlRef.current);
          bgmLibraryUrlRef.current = null;
        }
      };
    } catch {}
    setGeneratingBgm(null);
  };

  const handleUseBgmLibrary = async (catIdx: number, itemIdx: number) => {
    if (bgmLibraryAudio) { bgmLibraryAudio.pause(); bgmLibraryAudio.src = ""; setPreviewingBgmIdx(null); setBgmLibraryAudio(null); }
    setGeneratingBgm(`use-${catIdx}-${itemIdx}`);
    try {
      const item = BGM_CATEGORIES[catIdx].items[itemIdx];
      const blob = await generateAudioBlob(item.key);
      const file = new File([blob], `${item.name}.wav`, { type: "audio/wav" });
      setBgmFile(file);
      setProgressMsg(`「${item.name}」をBGMに設定しました`);
    } catch {}
    setGeneratingBgm(null);
  };

  const handleExport = async () => {
    if (!videoFile || processing) return;
    const preset = ASPECT_PRESETS[selectedPresetIdx];
    setProcessing(true);
    try {
      if (!await ensureFFmpeg()) return;
      const blob = await exportWithAspectRatio(videoFile, preset.width, preset.height, setProgressMsg, EXPORT_QUALITY_MAP[exportQuality].bitrate);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `videoforge_${preset.platform}_${Date.now()}.mp4`; a.click();
      URL.revokeObjectURL(url);
      setProgressMsg("エクスポート完了!");
    } catch (e) { setProgressMsg(`エクスポートに失敗: ${e instanceof Error ? e.message : "不明なエラー"}`); console.error("エクスポート error:", e); } finally { setProcessing(false); }
  };

  const handleDownloadOriginal = () => {
    if (!videoUrl) return;
    const a = document.createElement("a"); a.href = videoUrl; a.download = `videoforge_${Date.now()}.mp4`; a.click();
  };

  const getCanvasFilter = useCallback(() => {
    const { brightness, contrast, saturation } = filterSettings;
    return `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
  }, [filterSettings]);

  // ===== CANVAS DRAW WITH ANIMATIONS =====
  useEffect(() => {
    if (!canvasRef.current || !videoRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const drawFrame = () => {
      const video = videoRef.current;
      if (!video) return;
      // Guard: only draw if video has valid dimensions and metadata is loaded
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (vw > 0 && vh > 0) {
        // Only resize canvas if dimensions changed (avoids clearing canvas unnecessarily)
        if (canvas.width !== vw || canvas.height !== vh) {
          canvas.width = vw;
          canvas.height = vh;
        }

        ctx.filter = getCanvasFilter();
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.filter = "none";

      if (filterSettings.temperature !== 0) {
        const tempNorm = filterSettings.temperature / 100;
        ctx.fillStyle = tempNorm > 0 ? `rgba(255,140,0,${tempNorm*0.15})` : `rgba(0,100,255,${Math.abs(tempNorm)*0.15})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      if (filterSettings.vignette > 0) {
        const vigStrength = filterSettings.vignette / 100;
        const gradient = ctx.createRadialGradient(canvas.width/2, canvas.height/2, canvas.width*0.3, canvas.width/2, canvas.height/2, canvas.width*0.8);
        gradient.addColorStop(0, "rgba(0,0,0,0)");
        gradient.addColorStop(1, `rgba(0,0,0,${vigStrength*0.8})`);
        ctx.fillStyle = gradient; ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Draw mosaic areas preview on canvas
      const time = video.currentTime;
      for (const area of mosaicAreas) {
        if (time < area.startTime || time > area.endTime) continue;
        const ax = (area.x / 100) * canvas.width;
        const ay = (area.y / 100) * canvas.height;
        const aw = (area.width / 100) * canvas.width;
        const ah = (area.height / 100) * canvas.height;
        ctx.save();
        if (area.type === "black") {
          ctx.fillStyle = "rgba(0,0,0,1)";
          ctx.fillRect(ax, ay, aw, ah);
        } else if (area.type === "blur") {
          try {
            if (!mosaicCanvasRef.current) mosaicCanvasRef.current = document.createElement("canvas");
            const tc = mosaicCanvasRef.current;
            const imageData = ctx.getImageData(ax, ay, aw, ah);
            const blurAmount = area.intensity;
            tc.width = aw; tc.height = ah;
            const tCtx = tc.getContext("2d")!;
            tCtx.filter = `blur(${blurAmount}px)`;
            tCtx.putImageData(imageData, 0, 0);
            tCtx.drawImage(tc, 0, 0);
            ctx.drawImage(tc, ax, ay);
          } catch {
            ctx.fillStyle = `rgba(128,128,128,0.7)`;
            ctx.fillRect(ax, ay, aw, ah);
          }
        } else {
          // mosaic: pixelate
          const blockSize = Math.max(2, area.intensity);
          try {
            if (!mosaicCanvasRef.current) mosaicCanvasRef.current = document.createElement("canvas");
            const tc = mosaicCanvasRef.current;
            const scaledW = Math.max(1, Math.round(aw / blockSize));
            const scaledH = Math.max(1, Math.round(ah / blockSize));
            tc.width = scaledW; tc.height = scaledH;
            const tCtx = tc.getContext("2d")!;
            tCtx.imageSmoothingEnabled = false;
            tCtx.drawImage(canvas, ax, ay, aw, ah, 0, 0, scaledW, scaledH);
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(tc, 0, 0, scaledW, scaledH, ax, ay, aw, ah);
            ctx.imageSmoothingEnabled = true;
          } catch {
            ctx.fillStyle = "rgba(0,0,0,0.5)";
            ctx.fillRect(ax, ay, aw, ah);
          }
        }
        // Draw bounding box indicator
        ctx.strokeStyle = area.id === editingMosaicId ? "#00aaff" : "rgba(0,170,255,0.5)";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 3]);
        ctx.strokeRect(ax, ay, aw, ah);
        ctx.setLineDash([]);
        ctx.restore();
      }

      // Draw text overlays with animations
      for (const overlay of textOverlays) {
        if (time < overlay.startTime || time > overlay.endTime) continue;
        const progress = overlay.endTime > overlay.startTime ? (time - overlay.startTime) / (overlay.endTime - overlay.startTime) : 0;
        const elapsed = time - overlay.startTime;
        const remaining = overlay.endTime - time;
        const animDur = 0.5;
        ctx.save();

        // Keyframe interpolation
        const kfProps = interpolateKeyframes(overlay.keyframes || [], time);
        const kfX = kfProps.x !== undefined ? kfProps.x : overlay.x;
        const kfY = kfProps.y !== undefined ? kfProps.y : overlay.y;
        const kfFontSize = kfProps.scale !== undefined ? overlay.fontSize * (kfProps.scale / 100) : (kfProps.fontSize !== undefined ? kfProps.fontSize : overlay.fontSize);
        const kfOpacityBase = kfProps.opacity !== undefined ? kfProps.opacity / 100 : 1;
        const kfRotation = kfProps.rotation !== undefined ? (kfProps.rotation * Math.PI) / 180 : 0;

        let opacity = kfOpacityBase;
        let offsetX = 0;
        let offsetY = 0;
        let scale = 1;
        let rotation = kfRotation;

        switch (overlay.animation) {
          case "fade-in":
            opacity = kfOpacityBase * Math.min(1, elapsed / animDur);
            break;
          case "fade-out":
            opacity = kfOpacityBase * Math.min(1, remaining / animDur);
            break;
          case "fade-in-out":
            opacity = kfOpacityBase * Math.min(Math.min(1, elapsed / animDur), Math.min(1, remaining / animDur));
            break;
          case "slide-left":
            offsetX = elapsed < animDur ? (1 - elapsed / animDur) * 100 : 0;
            break;
          case "slide-right":
            offsetX = elapsed < animDur ? -(1 - elapsed / animDur) * 100 : 0;
            break;
          case "slide-up":
            offsetY = elapsed < animDur ? (1 - elapsed / animDur) * 50 : 0;
            break;
          case "slide-down":
            offsetY = elapsed < animDur ? -(1 - elapsed / animDur) * 50 : 0;
            break;
          case "scale-up":
            scale = elapsed < animDur ? elapsed / animDur : 1;
            break;
          case "scale-down":
            scale = elapsed < animDur ? 1.5 - (elapsed / animDur) * 0.5 : 1;
            break;
          case "zoom-in":
            scale = elapsed < animDur ? 0.5 + (elapsed / animDur) * 0.5 : 1;
            break;
          case "bounce-in": {
            const t = Math.min(1, elapsed / animDur);
            const elastic = t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2;
            scale = elastic;
            break;
          }
          case "rotate-in":
            rotation = kfRotation + (elapsed < animDur ? (1 - elapsed / animDur) * (-Math.PI / 2) : 0);
            break;
          case "blur-in":
            opacity = kfOpacityBase * Math.min(1, elapsed / animDur);
            break;
          case "shake":
            offsetX = Math.sin(time * 30) * 4;
            offsetY = Math.cos(time * 25) * 3;
            break;
          case "glow": {
            const glowPulse = (Math.sin(time * 4) + 1) / 2;
            ctx.shadowColor = overlay.color;
            ctx.shadowBlur = 10 + glowPulse * 20;
            break;
          }
          case "flicker":
            opacity = kfOpacityBase * (Math.random() > 0.1 ? 1 : 0.3);
            break;
          default:
            break;
        }

        ctx.globalAlpha = opacity;

        const fontStyle = `${overlay.bold ? "bold" : ""} ${overlay.italic ? "italic" : ""} ${Math.round(kfFontSize)}px ${overlay.fontFamily}`.trim();
        ctx.font = fontStyle;
        const metrics = ctx.measureText(overlay.text);
        const textHeight = kfFontSize * 1.3;
        const px = (kfX / 100) * canvas.width + offsetX;
        const py = (kfY / 100) * canvas.height + offsetY;

        if (overlay.animation === "wave" || overlay.animation === "rainbow" || overlay.animation === "typewriter") {
          // Character-by-character rendering
          let displayText = overlay.text;
          if (overlay.animation === "typewriter") {
            const charCount = Math.floor(progress * overlay.text.length);
            displayText = overlay.text.slice(0, charCount);
          }

          let charX = px;
          for (let ci = 0; ci < displayText.length; ci++) {
            const ch = displayText[ci];
            const charMetrics = ctx.measureText(ch);

            ctx.save();
            if (overlay.animation === "wave") {
              const waveY = Math.sin(time * 5 + ci * 0.5) * 6;
              ctx.translate(charX, py + waveY);
            } else {
              ctx.translate(charX, py);
            }

            if (overlay.animation === "rainbow") {
              const hue = ((time * 60 + ci * 30) % 360);
              ctx.fillStyle = `hsl(${hue},100%,60%)`;
            } else {
              if (overlay.shadowBlur > 0) { ctx.shadowColor = overlay.shadowColor; ctx.shadowBlur = overlay.shadowBlur; ctx.shadowOffsetX = overlay.shadowOffsetX; ctx.shadowOffsetY = overlay.shadowOffsetY; }
              if (overlay.outlineWidth > 0) { ctx.strokeStyle = overlay.outlineColor; ctx.lineWidth = overlay.outlineWidth; ctx.lineJoin = "round"; ctx.strokeText(ch, 0, 0); }
              ctx.fillStyle = overlay.color;
            }
            ctx.fillText(ch, 0, 0);
            ctx.restore();
            charX += charMetrics.width;
          }
        } else {
          // Normal rendering with transforms
          ctx.translate(px, py);
          if (rotation !== 0) ctx.rotate(rotation);
          if (scale !== 1) ctx.scale(scale, scale);

          if (overlay.shadowBlur > 0) {
            ctx.shadowColor = overlay.shadowColor; ctx.shadowBlur = overlay.shadowBlur;
            ctx.shadowOffsetX = overlay.shadowOffsetX; ctx.shadowOffsetY = overlay.shadowOffsetY;
          }
          if (overlay.bgColor && overlay.bgColor !== "transparent") {
            ctx.fillStyle = overlay.bgColor;
            ctx.fillRect(-8, -textHeight + 4, metrics.width + 16, textHeight + 8);
          }
          ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
          if (overlay.shadowBlur > 0) { ctx.shadowColor = overlay.shadowColor; ctx.shadowBlur = overlay.shadowBlur; ctx.shadowOffsetX = overlay.shadowOffsetX; ctx.shadowOffsetY = overlay.shadowOffsetY; }
          if (overlay.outlineWidth > 0) { ctx.strokeStyle = overlay.outlineColor; ctx.lineWidth = overlay.outlineWidth; ctx.lineJoin = "round"; ctx.strokeText(overlay.text, 0, 0); }
          ctx.fillStyle = overlay.color;
          ctx.fillText(overlay.text, 0, 0);
          ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
        }

        // Drag highlight
        if (draggingId === overlay.id) {
          ctx.setTransform(1,0,0,1,0,0);
          ctx.strokeStyle = "#3b82f6"; ctx.lineWidth = 2; ctx.setLineDash([4,2]);
          const rpx = (kfX / 100) * canvas.width;
          const rpy = (kfY / 100) * canvas.height;
          ctx.strokeRect(rpx - 8, rpy - kfFontSize * 1.3, metrics.width + 16, kfFontSize * 1.5 + 8);
          ctx.setLineDash([]);
        }
        ctx.restore();
      }

      // Draw stickers
      for (const sticker of stickers) {
        if (time < sticker.startTime || time > sticker.endTime) continue;
        ctx.save();

        // Keyframe interpolation for sticker
        const skfProps = interpolateKeyframes(sticker.keyframes || [], time);
        const skfX = skfProps.x !== undefined ? skfProps.x : sticker.x;
        const skfY = skfProps.y !== undefined ? skfProps.y : sticker.y;
        const skfOpacity = skfProps.opacity !== undefined ? skfProps.opacity / 100 : sticker.opacity;
        const skfRotation = skfProps.rotation !== undefined ? skfProps.rotation : sticker.rotation;
        const skfScale = skfProps.scale !== undefined ? skfProps.scale / 100 : 1;

        const baseX = (skfX / 100) * canvas.width;
        const baseY = (skfY / 100) * canvas.height;
        let offX = 0, offY = 0, sc = skfScale, extraRot = 0;
        const t = time;
        switch (sticker.animation) {
          case "bounce": offY = -Math.abs(Math.sin(t*3))*12; break;
          case "pulse": sc = skfScale * (1 + Math.sin(t*4)*0.15); break;
          case "spin": extraRot = (t*90)%360; break;
          case "float": offX = Math.sin(t*2)*6; offY = Math.cos(t*2)*4; break;
        }
        ctx.globalAlpha = skfOpacity;
        ctx.translate(baseX + offX, baseY + offY);
        ctx.rotate(((skfRotation + extraRot) * Math.PI) / 180);
        ctx.scale(sc, sc);
        ctx.font = `${sticker.size}px sans-serif`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(sticker.emoji, 0, 0);
        if (draggingId === sticker.id) {
          ctx.strokeStyle = "#3b82f6"; ctx.lineWidth = 2; ctx.setLineDash([4,2]);
          ctx.strokeRect(-sticker.size/2, -sticker.size/2, sticker.size, sticker.size);
          ctx.setLineDash([]);
        }
        ctx.restore();
      }

      // Draw subtitles
      for (const sub of subtitles) {
        if (time < sub.startTime || time > sub.endTime) continue;
        const fontSize = Math.max(16, Math.floor(canvas.height / 20));
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
        const metrics = ctx.measureText(sub.text);
        const x = (canvas.width - metrics.width) / 2;
        const y = canvas.height - 40;
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(x-10, y-fontSize-4, metrics.width+20, fontSize+16);
        ctx.fillStyle = "#ffffff";
        ctx.fillText(sub.text, x, y);
      }

      // Draw logo watermark preview
      if (logoSettings.url && logoImgRef.current && logoImgRef.current.complete) {
        const logoImg = logoImgRef.current;
        const logoW = canvas.width * (logoSettings.size / 100);
        const aspectRatio = logoImg.naturalHeight > 0 ? logoImg.naturalWidth / logoImg.naturalHeight : 1;
        const logoH = logoW / aspectRatio;
        const m = logoSettings.margin;
        let lx = 0, ly = 0;
        switch (logoSettings.position) {
          case "top-left": lx = m; ly = m; break;
          case "top-right": lx = canvas.width - logoW - m; ly = m; break;
          case "bottom-left": lx = m; ly = canvas.height - logoH - m; break;
          case "center": lx = (canvas.width - logoW) / 2; ly = (canvas.height - logoH) / 2; break;
          case "bottom-right": default: lx = canvas.width - logoW - m; ly = canvas.height - logoH - m; break;
        }
        ctx.save();
        ctx.globalAlpha = logoSettings.opacity / 100;
        ctx.drawImage(logoImg, lx, ly, logoW, logoH);
        ctx.restore();
      }

      } // end if (vw > 0 && vh > 0)

      requestAnimationFrame(drawFrame);
    };

    const animId = requestAnimationFrame(drawFrame);
    return () => cancelAnimationFrame(animId);
  }, [textOverlays, subtitles, filterSettings, getCanvasFilter, stickers, mosaicAreas, editingMosaicId, draggingId, logoSettings, videoUrl]);

  const showCanvas =
    textOverlays.length > 0 || subtitles.length > 0 || stickers.length > 0 ||
    mosaicAreas.length > 0 || !!logoSettings.url ||
    filterSettings.brightness !== 100 || filterSettings.contrast !== 100 ||
    filterSettings.saturation !== 100 || filterSettings.temperature !== 0 || filterSettings.vignette !== 0;

  // ===== AUTO EDIT =====
  const generateAutoThumbnail = useCallback((title: string): string => {
    try {
      const c = document.createElement("canvas");
      c.width = 1280; c.height = 720;
      const ctx = c.getContext("2d");
      if (!ctx) return "";
      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, 1280, 720);
      grad.addColorStop(0, "#1e1b4b");
      grad.addColorStop(1, "#312e81");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1280, 720);
      // Draw video frame if available
      if (videoRef.current && videoRef.current.readyState >= 2) {
        ctx.globalAlpha = 0.4;
        ctx.drawImage(videoRef.current, 0, 0, 1280, 720);
        ctx.globalAlpha = 1;
      }
      // Dark overlay
      const overlay = ctx.createLinearGradient(0, 400, 0, 720);
      overlay.addColorStop(0, "rgba(0,0,0,0)");
      overlay.addColorStop(1, "rgba(0,0,0,0.85)");
      ctx.fillStyle = overlay;
      ctx.fillRect(0, 0, 1280, 720);
      // Title text
      if (title) {
        ctx.font = "bold 72px sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.shadowColor = "rgba(0,0,0,0.9)";
        ctx.shadowBlur = 12;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 3;
        // Wrap text
        const words = title.split("");
        const maxWidth = 1100;
        const lineHeight = 90;
        let line = "";
        const lines: string[] = [];
        for (const ch of words) {
          const test = line + ch;
          if (ctx.measureText(test).width > maxWidth && line.length > 0) {
            lines.push(line); line = ch;
          } else { line = test; }
        }
        if (line) lines.push(line);
        const startY = 720 / 2 - ((lines.length - 1) * lineHeight) / 2;
        lines.forEach((l, i) => ctx.fillText(l, 640, startY + i * lineHeight));
      }
      return c.toDataURL("image/jpeg", 0.9);
    } catch { return ""; }
  }, [videoRef]);

  const handleAutoEdit = async () => {
    if (!videoFile || autoRunning) return;
    setAutoRunning(true);
    setProcessing(true);
    setAutoComplete(false);
    setAutoFinalUrl("");
    setAutoThumbnailUrl("");
    setAutoStepLog([]);

    let currentFile = videoFile;
    const steps: string[] = [];
    let stepNum = 0;
    const totalSteps = [
      autoSettings.silenceCut,
      autoSettings.subtitles,
      autoSettings.titleOverlay && !!autoTitle,
      autoSettings.bgm,
      true, // export always
      true, // thumbnail always
    ].filter(Boolean).length;
    setAutoTotalSteps(totalSteps);
    setAutoStep(0);

    const logStep = (msg: string) => setAutoStepLog((prev) => [...prev, msg]);

    try {
      if (!await ensureFFmpeg()) return;

      // Step 1: Silence Cut
      if (autoSettings.silenceCut) {
        stepNum++;
        setAutoStep(stepNum);
        setProgressMsg(`Step ${stepNum}/${totalSteps}: 無音区間を検出中...`);
        const { detectSilence: ds, removeSilence: rs } = await import("@/lib/ffmpeg-utils");
        const segments = await ds(currentFile, -35, 0.5, setProgressMsg);
        if (segments.length > 0) {
          setProgressMsg(`Step ${stepNum}/${totalSteps}: ${segments.length}箇所の無音をカット中...`);
          const blob = await rs(currentFile, segments, 0.1, setProgressMsg);
          currentFile = new File([blob], "auto_edited.mp4", { type: "video/mp4" });
        }
        steps.push(`無音カット: ${segments.length}箇所削除`);
        logStep(`無音カット: ${segments.length}箇所削除`);
      }

      // Step 2: Subtitles
      if (autoSettings.subtitles) {
        stepNum++;
        setAutoStep(stepNum);
        setProgressMsg(`Step ${stepNum}/${totalSteps}: 字幕を生成中...`);
        const apiKey = (() => { try { return sessionStorage.getItem("videoforge_whisper_key") || ""; } catch { return ""; } })();
        if (apiKey) {
          try {
            const { extractAudio: ea } = await import("@/lib/ffmpeg-utils");
            const audioBlob = await ea(currentFile, setProgressMsg);
            const formData = new FormData();
            formData.append("file", audioBlob, "audio.wav");
            formData.append("model", "whisper-1");
            formData.append("language", "ja");
            formData.append("response_format", "verbose_json");
            formData.append("timestamp_granularities[]", "segment");
            const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
              method: "POST",
              headers: { "Authorization": `Bearer ${apiKey}` },
              body: formData,
            });
            if (response.ok) {
              const data = await response.json();
              const newSubs = (data.segments || []).map((seg: { text: string; start: number; end: number }, i: number) => ({
                id: `auto-sub-${Date.now()}-${i}`,
                text: seg.text.trim(),
                startTime: seg.start,
                endTime: seg.end,
              }));
              setSubtitles(newSubs);
              steps.push(`字幕生成(AI): ${newSubs.length}件`);
              logStep(`字幕生成(AI): ${newSubs.length}件`);
            } else {
              steps.push("字幕生成: APIエラー");
              logStep("字幕生成: APIエラー");
            }
          } catch {
            steps.push("字幕生成: エラー");
            logStep("字幕生成: エラー");
          }
        } else {
          steps.push("字幕生成: APIキー未設定のためスキップ");
          logStep("字幕生成: APIキー未設定のためスキップ");
        }
      }

      // Step 3: Title Overlay
      if (autoSettings.titleOverlay && autoTitle) {
        stepNum++;
        setAutoStep(stepNum);
        setProgressMsg(`Step ${stepNum}/${totalSteps}: テロップを配置中...`);
        const isReels = autoPlatform === "reels";
        const titleOverlay: TextOverlay = {
          id: `auto-title-${Date.now()}`,
          text: autoTitle,
          x: 50,
          y: isReels ? 35 : 15,
          fontSize: isReels ? 34 : 42,
          fontFamily: "sans-serif",
          color: "#ffffff",
          bgColor: "transparent",
          startTime: 0,
          endTime: 5,
          bold: true,
          italic: false,
          outlineColor: "#000000",
          outlineWidth: 4,
          shadowColor: "rgba(0,0,0,0.8)",
          shadowBlur: 8,
          shadowOffsetX: 2,
          shadowOffsetY: 2,
          animation: "zoom-in",
          keyframes: [],
        };
        setTextOverlays((prev) => [titleOverlay, ...prev]);
        steps.push(`テロップ配置: "${autoTitle}"`);
        logStep(`テロップ配置: "${autoTitle}"`);
      }

      // Step 4: BGM
      if (autoSettings.bgm) {
        stepNum++;
        setAutoStep(stepNum);
        setProgressMsg(`Step ${stepNum}/${totalSteps}: BGMを追加中...`);
        try {
          const sampleRate = 44100;
          const bgmDuration = 10;
          const offlineCtx = new OfflineAudioContext(2, sampleRate * bgmDuration, sampleRate);
          const chords = [
            [261.63, 329.63, 392.00],
            [293.66, 349.23, 440.00],
            [349.23, 440.00, 523.25],
            [392.00, 493.88, 587.33],
          ];
          const masterGain = offlineCtx.createGain();
          masterGain.gain.value = 0.08;
          masterGain.connect(offlineCtx.destination);
          chords.forEach((chord, ci) => {
            chord.forEach((freq) => {
              const osc = offlineCtx.createOscillator();
              osc.type = "sine";
              osc.frequency.value = freq;
              const gain = offlineCtx.createGain();
              const startTime = ci * (bgmDuration / chords.length);
              const endTime = (ci + 1) * (bgmDuration / chords.length);
              gain.gain.setValueAtTime(0, startTime);
              gain.gain.linearRampToValueAtTime(0.3, startTime + 0.1);
              gain.gain.linearRampToValueAtTime(0, endTime);
              osc.connect(gain);
              gain.connect(masterGain);
              osc.start(startTime);
              osc.stop(endTime);
            });
          });
          const buffer = await offlineCtx.startRendering();
          const numChannels = buffer.numberOfChannels;
          const length = buffer.length * numChannels * 2;
          const arrayBuffer = new ArrayBuffer(44 + length);
          const view = new DataView(arrayBuffer);
          const writeString = (offset: number, str: string) => {
            for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
          };
          writeString(0, "RIFF");
          view.setUint32(4, 36 + length, true);
          writeString(8, "WAVE");
          writeString(12, "fmt ");
          view.setUint32(16, 16, true);
          view.setUint16(20, 1, true);
          view.setUint16(22, numChannels, true);
          view.setUint32(24, sampleRate, true);
          view.setUint32(28, sampleRate * numChannels * 2, true);
          view.setUint16(32, numChannels * 2, true);
          view.setUint16(34, 16, true);
          writeString(36, "data");
          view.setUint32(40, length, true);
          let offset = 44;
          for (let i = 0; i < buffer.length; i++) {
            for (let ch = 0; ch < numChannels; ch++) {
              const sample = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
              view.setInt16(offset, sample * 0x7fff, true);
              offset += 2;
            }
          }
          const bgmBlob = new Blob([arrayBuffer], { type: "audio/wav" });
          const bgmFileObj = new File([bgmBlob], "auto_bgm.wav", { type: "audio/wav" });
          const { addBgm: ab } = await import("@/lib/ffmpeg-utils");
          const withBgm = await ab(currentFile, bgmFileObj, autoSettings.bgmVolume, setProgressMsg);
          currentFile = new File([withBgm], "auto_bgm.mp4", { type: "video/mp4" });
          steps.push("BGM追加: 完了");
          logStep("BGM追加: 完了");
        } catch {
          steps.push("BGM追加: スキップ（エラー）");
          logStep("BGM追加: スキップ（エラー）");
        }
      }

      // Step 5: Export
      stepNum++;
      setAutoStep(stepNum);
      setProgressMsg(`Step ${stepNum}/${totalSteps}: 書き出し中...`);
      if (autoPlatform === "reels") {
        const { exportWithAspectRatio: ear } = await import("@/lib/ffmpeg-utils");
        const exported = await ear(currentFile, 1080, 1920, setProgressMsg);
        currentFile = new File([exported], "auto_final.mp4", { type: "video/mp4" });
      }
      const finalUrl = URL.createObjectURL(currentFile);
      setVideoFile(currentFile);
      setVideoUrl(finalUrl);
      setAutoFinalUrl(finalUrl);
      steps.push("書き出し: 完了");
      logStep("書き出し: 完了");

      // Step 6: Thumbnail
      stepNum++;
      setAutoStep(stepNum);
      setProgressMsg(`Step ${stepNum}/${totalSteps}: サムネイルを生成中...`);
      // Wait a tick for video to load then generate thumbnail
      await new Promise((r) => setTimeout(r, 500));
      const thumbUrl = generateAutoThumbnail(autoTitle);
      setAutoThumbnailUrl(thumbUrl);
      steps.push("サムネイル: 生成完了");
      logStep("サムネイル: 生成完了");

      setProgressMsg(`全自動編集完了！ ${steps.join(" / ")}`);
      setAutoStep(totalSteps + 1);
      setAutoComplete(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "処理に失敗しました";
      setProgressMsg(`エラー: ${msg}`);
    } finally {
      setAutoRunning(false);
      setProcessing(false);
    }
  };

  const TOOL_CATEGORIES: { name: string; color: string; tools: { key: EditorTool; label: string; icon: string }[] }[] = [
    {
      name: "基本編集",
      color: "text-blue-400",
      tools: [
        { key: "auto", label: "全自動", icon: "🚀" },
        { key: "silence", label: "無音カット", icon: "✂️" },
        { key: "trim", label: "トリミング", icon: "🎬" },
        { key: "speed", label: "速度変更", icon: "⚡" },
        { key: "split", label: "分割", icon: "✂" },
      ],
    },
    {
      name: "テロップ・字幕",
      color: "text-yellow-400",
      tools: [
        { key: "text", label: "テロップ", icon: "T" },
        { key: "subtitle", label: "字幕", icon: "💬" },
        { key: "sticker", label: "スタンプ", icon: "😀" },
        { key: "keyframe", label: "キーフレーム", icon: "◆" },
      ],
    },
    {
      name: "エフェクト・素材",
      color: "text-purple-400",
      tools: [
        { key: "bgm", label: "BGM", icon: "🎵" },
        { key: "transition", label: "トランジション", icon: "✨" },
        { key: "filter", label: "フィルター", icon: "🎨" },
        { key: "mosaic", label: "モザイク", icon: "🔲" },
        { key: "chromakey", label: "クロマキー", icon: "🟩" },
        { key: "logo", label: "ロゴ", icon: "🏷" },
        { key: "pip", label: "ワイプ", icon: "📺" },
      ],
    },
    {
      name: "治療家専用",
      color: "text-green-400",
      tools: [
        { key: "template", label: "テンプレート", icon: "📋" },
        { key: "script", label: "AI台本", icon: "📝" },
        { key: "endcard", label: "エンドカード", icon: "🔚" },
        { key: "clinic-profile", label: "院プロフィール", icon: "🏥" },
        { key: "collage", label: "コラージュ", icon: "🖼" },
        { key: "slideshow", label: "スライドショー", icon: "🎞" },
        { key: "export", label: "書き出し", icon: "📤" },
      ],
    },
  ];

  // Tool category-aware setter: auto-switch category tab when tool is set
  const TOOL_TO_CATEGORY: Record<string, number> = {};
  TOOL_CATEGORIES.forEach((cat, i) => cat.tools.forEach((t) => { TOOL_TO_CATEGORY[t.key] = i; }));
  const setActiveTool = useCallback((tool: EditorTool) => {
    setActiveToolRaw(tool);
    const catIdx = TOOL_TO_CATEGORY[tool];
    if (catIdx !== undefined) setActiveToolCategory(catIdx);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const TOP_SYMPTOMS = [
    { label: "腰痛", icon: "🦴" }, { label: "肩こり", icon: "💪" }, { label: "頭痛", icon: "🤕" },
    { label: "膝痛", icon: "🦵" }, { label: "坐骨神経痛", icon: "⚡" }, { label: "自律神経", icon: "🧠" },
    { label: "姿勢改善", icon: "🧍" }, { label: "首こり", icon: "🫠" }, { label: "五十肩", icon: "🙋" },
    { label: "産後", icon: "🤱" }, { label: "小顔・美容", icon: "✨" }, { label: "ダイエット", icon: "📏" },
    { label: "その他", icon: "📋" },
  ];

  if (!videoUrl) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-950"
        onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}>

        {/* Clinic Setup Modal */}
        {topStep === "clinic-setup" && (
          <div className="min-h-screen flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full">
              <button onClick={() => setTopStep("home")} className="text-xs text-gray-500 hover:text-gray-300 mb-4">← 戻る</button>
              <ClinicProfileSetup
                profile={clinicProfile}
                onSave={(p) => {
                  setClinicProfile(p);
                  setTopStep("home");
                }}
              />
            </div>
          </div>
        )}

        {/* Home */}
        {topStep === "home" && (
          <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6">
            <div className="max-w-lg w-full text-center">
              {/* Branding */}
              <div className="mb-2">
                <span className="text-xs font-bold text-indigo-400 tracking-widest">VIDEOFORGE</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white mb-2 leading-tight">
                治療院の集客動画を<br /><span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">3分で作る</span>
              </h1>
              <p className="text-sm text-gray-400 mb-6">症状を選ぶ → テンプレを選ぶ → 動画を入れる → 完成</p>

              {/* Clinic Profile Badge */}
              {clinicProfile ? (
                <button onClick={() => setTopStep("clinic-setup")} className="mb-6 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600/20 border border-indigo-500/30 rounded-full hover:bg-indigo-600/30 transition-colors">
                  <span className="text-sm">🏥</span>
                  <span className="text-xs text-indigo-300 font-medium">{clinicProfile.clinicName}</span>
                  <span className="text-[10px] text-gray-500">変更</span>
                </button>
              ) : (
                <button onClick={() => setTopStep("clinic-setup")} className="mb-6 inline-flex items-center gap-2 px-4 py-2.5 bg-yellow-600/20 border border-yellow-500/30 rounded-xl hover:bg-yellow-600/30 transition-colors">
                  <span className="text-sm">🏥</span>
                  <span className="text-xs text-yellow-300 font-medium">まず院のプロフィールを設定</span>
                  <span className="text-[10px] text-yellow-500">→ AI生成が院に特化します</span>
                </button>
              )}

              {/* Main CTA: Guided Flow */}
              <button onClick={() => setTopStep("symptom")}
                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl text-base font-bold hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg shadow-indigo-500/25 mb-3">
                症状を選んで動画を作る
              </button>

              {/* Sub CTA: Free mode */}
              <button onClick={() => { fileInputRef.current?.click(); }}
                className="w-full py-3 bg-gray-800 text-gray-300 rounded-2xl text-sm font-medium hover:bg-gray-700 transition-colors mb-6">
                自由に編集する（動画をアップロード）
              </button>
              <input ref={fileInputRef} type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" />

              {/* Features */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {[
                  { icon: "📋", label: "37種の\nバズテンプレ" },
                  { icon: "⚖️", label: "法的注意\n自動挿入" },
                  { icon: "💬", label: "AI字幕\n自動生成" },
                  { icon: "📱", label: "SNS最適\n書き出し" },
                  { icon: "🔚", label: "CTA/LINE\n誘導カード" },
                  { icon: "🖼", label: "サムネイル\n自動生成" },
                ].map((f) => (
                  <div key={f.label} className="bg-gray-800/50 rounded-xl p-2.5 sm:p-3 text-center">
                    <div className="text-lg sm:text-xl mb-1">{f.icon}</div>
                    <p className="text-[10px] sm:text-[11px] text-gray-400 whitespace-pre-line leading-tight">{f.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Symptom Selection */}
        {topStep === "symptom" && (
          <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6">
            <div className="max-w-lg w-full">
              <button onClick={() => setTopStep("home")} className="text-xs text-gray-500 hover:text-gray-300 mb-4">← 戻る</button>
              <div className="text-center mb-6">
                <p className="text-xs text-indigo-400 font-bold mb-1">STEP 1 / 3</p>
                <h2 className="text-xl sm:text-2xl font-bold text-white">どの症状の動画を作りますか？</h2>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {TOP_SYMPTOMS.map((s) => (
                  <button key={s.label} onClick={() => { setSelectedSymptom(s.label); setTopStep("template"); }}
                    className="flex flex-col items-center gap-1.5 p-3 bg-gray-800 rounded-xl hover:bg-gray-700 hover:border-indigo-500 border border-gray-700 transition-all">
                    <span className="text-2xl">{s.icon}</span>
                    <span className="text-xs text-gray-300 font-medium">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Template Selection */}
        {topStep === "template" && (
          <div className="flex-1 flex flex-col p-4 sm:p-6 overflow-y-auto">
            <div className="max-w-lg w-full mx-auto">
              <button onClick={() => setTopStep("symptom")} className="text-xs text-gray-500 hover:text-gray-300 mb-4">← 症状を選び直す</button>
              <div className="text-center mb-4">
                <p className="text-xs text-indigo-400 font-bold mb-1">STEP 2 / 3</p>
                <h2 className="text-xl sm:text-2xl font-bold text-white">
                  <span className="text-indigo-400">{selectedSymptom}</span>のテンプレートを選択
                </h2>
              </div>
              <div className="space-y-2 mb-4">
                {(() => {
                  const filtered = VIRAL_TEMPLATES.filter((t) =>
                    selectedSymptom === "その他" || t.symptom === selectedSymptom
                  );
                  if (filtered.length === 0) return <p className="text-sm text-gray-500 text-center py-8">この症状のテンプレートは準備中です。「自由に編集」をお使いください。</p>;
                  return filtered.map((t) => (
                    <button key={t.id} onClick={() => { setSelectedViralTemplate(t.id); setTopStep("upload"); }}
                      className={`w-full text-left p-4 rounded-xl border transition-all ${selectedViralTemplate === t.id ? "border-indigo-500 bg-indigo-900/30" : "border-gray-700 bg-gray-800 hover:border-indigo-500/50 hover:bg-gray-750"}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-bold text-white mb-1">{t.name}</p>
                          <p className="text-xs text-gray-400 mb-2">{t.description}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] px-2 py-0.5 bg-gray-700 rounded-full text-gray-300">{t.platform}</span>
                            <span className="text-[10px] px-2 py-0.5 bg-gray-700 rounded-full text-gray-300">{t.format}</span>
                            <span className="text-[10px] text-yellow-400">{"★".repeat(t.buzzScore)}{"☆".repeat(5 - t.buzzScore)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 bg-gray-900/50 rounded-lg px-3 py-2">
                        <p className="text-[10px] text-gray-500 mb-0.5">冒頭の掴み:</p>
                        <p className="text-xs text-indigo-300 font-medium">{t.hookLine}</p>
                      </div>
                    </button>
                  ));
                })()}
              </div>
              <button onClick={() => { setTopStep("upload"); setSelectedViralTemplate(null); }}
                className="w-full py-2.5 bg-gray-800 text-gray-400 rounded-xl text-xs hover:bg-gray-700 transition-colors">
                テンプレなしで自由に編集
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Upload */}
        {topStep === "upload" && (
          <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6">
            <div className="max-w-md w-full text-center">
              <button onClick={() => setTopStep("template")} className="text-xs text-gray-500 hover:text-gray-300 mb-4 block text-left">← テンプレートを選び直す</button>
              <p className="text-xs text-indigo-400 font-bold mb-1">STEP 3 / 3</p>
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">動画をアップロード</h2>
              {selectedViralTemplate && (
                <p className="text-xs text-gray-400 mb-4">テンプレートが自動適用されます</p>
              )}
              <button onClick={() => fileInputRef.current?.click()}
                className={`w-full p-8 border-2 border-dashed rounded-2xl transition-all group ${isDragging ? "border-indigo-400 bg-indigo-500/10 scale-105" : "border-gray-600 hover:border-indigo-500 hover:bg-indigo-500/5"}`}>
                <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">{isDragging ? "📂" : "🎥"}</div>
                <p className="text-lg font-medium text-gray-300 mb-1">{isDragging ? "ここにドロップ" : "動画をアップロード"}</p>
                <p className="text-sm text-gray-500">{isDragging ? "動画ファイルを離してください" : "クリック or ドラッグ&ドロップ（MP4, MOV, WebM）"}</p>
              </button>
              <input ref={fileInputRef} type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" />
            </div>
          </div>
        )}
      </div>
    );
  }

  const editingText = textOverlays.find((t) => t.id === editingTextId);

  const TEXT_ANIMATION_GROUPS = [
    { label: "基本", anims: [{ value: "none", label: "なし" }, { value: "fade-in", label: "フェードイン" }, { value: "fade-out", label: "フェードアウト" }, { value: "fade-in-out", label: "フェード両端" }] },
    { label: "登場", anims: [{ value: "typewriter", label: "タイプ" }, { value: "slide-left", label: "左から" }, { value: "slide-right", label: "右から" }, { value: "slide-up", label: "下から" }, { value: "slide-down", label: "上から" }, { value: "bounce-in", label: "バウンス" }, { value: "scale-up", label: "拡大" }, { value: "zoom-in", label: "ズーム" }, { value: "rotate-in", label: "回転" }, { value: "blur-in", label: "ぼかし" }] },
    { label: "演出", anims: [{ value: "shake", label: "シェイク" }, { value: "wave", label: "ウェーブ" }, { value: "rainbow", label: "虹色" }, { value: "glow", label: "グロー" }, { value: "flicker", label: "ちらつき" }, { value: "scale-down", label: "縮小" }] },
  ];

  return (
    <div className="min-h-screen flex flex-col" role="application" aria-label="VideoForge動画エディタ">
      {/* Header */}
      <header className="flex items-center justify-between px-2 sm:px-4 py-2 bg-gray-900/80 border-b border-gray-800" role="toolbar" aria-label="メインツールバー">
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
          <span className="text-lg font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent flex-shrink-0" aria-label="VideoForge">VF</span>
          <button onClick={() => fileInputRef.current?.click()} aria-label="別の動画を選択" className="text-[10px] sm:text-xs px-2 sm:px-3 py-1.5 bg-gray-800 rounded-lg text-gray-300 hover:bg-gray-700 flex-shrink-0">別の動画</button>
          <input ref={fileInputRef} type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" aria-label="動画ファイルを選択" />
          <button onClick={handleUndo} disabled={historyIndex <= 0} title="元に戻す (Ctrl+Z)" aria-label="元に戻す" className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-1.5 bg-gray-800 rounded-lg text-gray-300 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0">↩<span className="hidden sm:inline"> 戻す</span></button>
          <button onClick={handleRedo} disabled={historyIndex >= history.length - 1} title="やり直す (Ctrl+Shift+Z)" aria-label="やり直す" className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-1.5 bg-gray-800 rounded-lg text-gray-300 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0">↪<span className="hidden sm:inline"> やり直す</span></button>
          <button onClick={handleExportProject} aria-label="プロジェクトを保存" title="編集内容をJSONファイルに保存" className="hidden sm:block text-[10px] sm:text-xs px-1.5 sm:px-2 py-1.5 bg-gray-800 rounded-lg text-gray-300 hover:bg-gray-700 flex-shrink-0">💾 保存</button>
          <input ref={projectImportRef} type="file" accept=".json" onChange={handleImportProject} className="hidden" />
          <button onClick={() => projectImportRef.current?.click()} aria-label="プロジェクトを読み込み" title="保存したプロジェクトを読み込む" className="hidden sm:block text-[10px] sm:text-xs px-1.5 sm:px-2 py-1.5 bg-gray-800 rounded-lg text-gray-300 hover:bg-gray-700 flex-shrink-0">📂 読込</button>
          <button onClick={handleResetProject} aria-label="プロジェクトをリセット" className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-1.5 bg-gray-800 rounded-lg text-red-400 hover:bg-gray-700 flex-shrink-0"><span className="sm:hidden">×</span><span className="hidden sm:inline">リセット</span></button>
          {autoSaved && <span className="text-[10px] text-green-400 animate-pulse flex-shrink-0" role="status">💾</span>}
        </div>
        <button onClick={handleDownloadOriginal} aria-label="動画を保存" className="text-[10px] sm:text-xs px-2 sm:px-3 py-1.5 bg-indigo-600 rounded-lg text-white hover:bg-indigo-500 flex-shrink-0">保存</button>
      </header>

      {/* Restore prompt */}
      {showRestorePrompt && (
        <div className="bg-indigo-900/80 border border-indigo-600 px-4 py-3 flex items-center justify-between">
          <span className="text-xs text-indigo-200">前回の編集データがあります。復元しますか？</span>
          <div className="flex gap-2">
            <button onClick={handleRestoreProject} className="text-xs px-3 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500">復元する</button>
            <button onClick={() => setShowRestorePrompt(false)} className="text-xs px-3 py-1 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600">無視</button>
          </div>
        </div>
      )}

      {/* Main Content: Vertical on mobile, Horizontal on desktop */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">

      {/* Left Side: Video Preview + Timeline */}
      <div className="lg:flex-1 flex flex-col">
      {/* Video Preview */}
      <div className="relative bg-black flex items-center justify-center flex-1" style={{ minHeight: "30vh" }}>
        <video ref={videoRef} src={videoUrl} onLoadedMetadata={handleLoadedMetadata} onTimeUpdate={handleTimeUpdate} onEnded={() => setIsPlaying(false)} className="max-w-full max-h-[30vh] sm:max-h-[40vh] lg:max-h-[65vh]" style={{ display: showCanvas ? "none" : "block" }} playsInline aria-label="動画プレビュー" />
        <canvas
          ref={canvasRef}
          className="max-w-full max-h-[30vh] sm:max-h-[40vh] lg:max-h-[65vh]"
          style={{ display: showCanvas ? "block" : "none", cursor: draggingId ? "grabbing" : "default" }}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
          onTouchStart={handleCanvasTouchStart}
          onTouchMove={handleCanvasTouchMove}
          onTouchEnd={handleCanvasTouchEnd}
        />
        <button onClick={togglePlay} className="absolute inset-0 flex items-center justify-center bg-transparent hover:bg-black/20 transition-colors">
          {!isPlaying && (
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
            </div>
          )}
        </button>
        {playbackSpeed !== 1 && (
          <div className="absolute top-2 right-2 bg-indigo-600/90 backdrop-blur-sm rounded px-2 py-0.5 text-xs text-white font-bold">{playbackSpeed}x</div>
        )}
        {progressMsg && (
          <div className="absolute bottom-2 left-2 right-2 bg-black/80 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-center" role="status" aria-live="polite">
            {processing && <span className="inline-block w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mr-2 align-middle" aria-hidden="true" />}
            {progressMsg}
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="px-4 py-3 bg-gray-900 border-t border-gray-800">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={togglePlay} className="text-white text-sm">{isPlaying ? "⏸" : "▶"}</button>
          <span className="text-xs text-gray-400 font-mono">{formatTime(currentTime)} / {formatTime(duration)}</span>
          <span className="hidden lg:inline text-[9px] text-gray-600 ml-auto" title="Space:再生/停止  ←→:5秒送り  Shift+←→:1秒送り  Ctrl+Z:戻す  Ctrl+Shift+Z:やり直す">⌨ Space/←→/Ctrl+Z</span>
        </div>
        <div className="relative">
          <input type="range" min={0} max={duration} step={0.01} value={currentTime} onChange={(e) => handleSeek(parseFloat(e.target.value))} className="w-full" />
          {silentSegments.map((seg, i) => (
            <div key={i} className="absolute top-0 h-1 bg-red-500/60 rounded" style={{ left: `${(seg.start/duration)*100}%`, width: `${((seg.end-seg.start)/duration)*100}%` }} />
          ))}
          {clipMarkers.map((clip) => (
            <div key={clip.id} className="absolute top-3 w-0.5 h-3 bg-yellow-400" style={{ left: `${(clip.startTime/duration)*100}%` }} />
          ))}
        </div>
      </div>
      </div>{/* End Left Side */}

      {/* Right Side: Tools */}
      <div className="lg:w-[420px] lg:border-l lg:border-gray-800 flex flex-col bg-gray-950">
      {/* Tool Bar - Category Tabs */}
      <nav className="bg-gray-900 border-t lg:border-t-0 border-gray-800 flex-shrink-0" aria-label="編集ツール">
        <div className="flex gap-0 px-1 sm:px-2 pt-1.5 overflow-x-auto" role="tablist" aria-label="ツールカテゴリ">
          {TOOL_CATEGORIES.map((cat, i) => (
            <button key={cat.name} onClick={() => setActiveToolCategory(i)} role="tab" aria-selected={activeToolCategory === i} aria-controls={`toolpanel-${i}`}
              className={`px-2 sm:px-3 py-1.5 text-[10px] sm:text-[11px] font-bold rounded-t-lg transition-all flex-shrink-0 ${activeToolCategory === i ? "bg-gray-800 text-white border-b-2 border-indigo-500" : "text-gray-500 hover:text-gray-300"}`}>
              <span className={activeToolCategory === i ? cat.color : ""}>{cat.name}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-1 px-1 sm:px-2 py-1.5 sm:py-2 overflow-x-auto scrollbar-hide" role="tabpanel" id={`toolpanel-${activeToolCategory}`}>
          {TOOL_CATEGORIES[activeToolCategory].tools.map((tool) => (
            <button key={tool.key} onClick={() => setActiveTool(tool.key)} disabled={processing} aria-label={tool.label} aria-pressed={activeTool === tool.key}
              className={`flex flex-col items-center gap-0.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl text-[10px] sm:text-xs font-medium transition-all flex-shrink-0 ${activeTool === tool.key ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200"} ${processing ? "opacity-50 cursor-not-allowed" : ""}`}>
              <span className="text-sm sm:text-base" aria-hidden="true">{tool.icon}</span>
              <span>{tool.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Tool Panel */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-4 bg-gray-950" role="region" aria-label="ツール設定パネル">
        {/* Auto Edit */}
        {activeTool === "auto" && (
          <div className="space-y-4">
            {/* Header */}
            <div className="text-center pb-2 border-b border-gray-800">
              <div className="text-3xl mb-1">🚀</div>
              <h3 className="text-base font-bold text-white">ワンクリック全自動編集</h3>
              <p className="text-xs text-gray-400 mt-1">動画をアップロードするだけ。あとはAIが自動で編集します。</p>
            </div>

            {/* Title Input */}
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">動画のタイトル</label>
              <input
                type="text"
                value={autoTitle}
                onChange={(e) => setAutoTitle(e.target.value)}
                placeholder="例: 腰痛改善ストレッチ3選"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
                disabled={autoRunning}
              />
            </div>

            {/* Genre Selection */}
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-2">ジャンル</label>
              <div className="grid grid-cols-3 gap-1.5">
                {([
                  { value: "symptoms", label: "症状解説" },
                  { value: "treatment", label: "施術紹介" },
                  { value: "patient", label: "患者の声" },
                  { value: "health", label: "健康情報" },
                  { value: "clinic", label: "院紹介" },
                  { value: "other", label: "その他" },
                ] as { value: "symptoms" | "treatment" | "patient" | "health" | "clinic" | "other"; label: string }[]).map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setAutoGenre(value)}
                    disabled={autoRunning}
                    className={`py-2 rounded-lg text-xs font-medium transition-all ${autoGenre === value ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"} disabled:opacity-50`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Platform */}
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-2">プラットフォーム</label>
              <div className="flex gap-2">
                {([
                  { value: "youtube", label: "🎬 YouTube" },
                  { value: "reels", label: "📱 Reels" },
                ] as { value: "youtube" | "reels"; label: string }[]).map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setAutoPlatform(value)}
                    disabled={autoRunning}
                    className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${autoPlatform === value ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"} disabled:opacity-50`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Detail Settings (collapsible) */}
            <div className="border border-gray-700 rounded-xl overflow-hidden">
              <button
                onClick={() => setAutoDetailOpen((v) => !v)}
                className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-800 text-xs text-gray-300 hover:bg-gray-700 transition-colors"
              >
                <span className="font-medium">🔧 詳細設定</span>
                <span className="text-gray-500">{autoDetailOpen ? "▲" : "▼"}</span>
              </button>
              {autoDetailOpen && (
                <div className="px-3 py-3 space-y-3 bg-gray-900">
                  {([
                    { key: "silenceCut", label: "無音カット" },
                    { key: "subtitles", label: "自動字幕" },
                    { key: "bgm", label: "BGM追加" },
                    { key: "titleOverlay", label: "テロップ" },
                    { key: "logo", label: "ロゴ挿入" },
                  ] as { key: keyof typeof autoSettings; label: string }[]).filter((item) => item.key !== "bgmVolume").map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-xs text-gray-300">{label}</span>
                      <button
                        onClick={() => setAutoSettings((prev) => ({ ...prev, [key]: !(prev[key] as boolean) }))}
                        className={`relative w-10 h-5 rounded-full transition-colors ${(autoSettings[key] as boolean) ? "bg-indigo-600" : "bg-gray-600"}`}
                      >
                        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${(autoSettings[key] as boolean) ? "translate-x-5" : "translate-x-0.5"}`} />
                      </button>
                    </div>
                  ))}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-300">BGM音量</span>
                      <span className="text-xs text-gray-400">{Math.round(autoSettings.bgmVolume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={autoSettings.bgmVolume}
                      onChange={(e) => setAutoSettings((prev) => ({ ...prev, bgmVolume: parseFloat(e.target.value) }))}
                      className="w-full"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Start Button */}
            <button
              onClick={handleAutoEdit}
              disabled={!videoFile || autoRunning || processing}
              className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl text-base font-bold hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-900/30"
            >
              {autoRunning ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  処理中...
                </span>
              ) : (
                "🚀 全自動編集スタート"
              )}
            </button>

            {/* Progress */}
            {(autoRunning || autoComplete) && (
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-2">
                <p className="text-xs font-bold text-gray-200 mb-3">進捗</p>
                {(() => {
                  const stepNames: string[] = [];
                  if (autoSettings.silenceCut) stepNames.push("無音カット");
                  if (autoSettings.subtitles) stepNames.push("字幕生成");
                  if (autoSettings.titleOverlay && autoTitle) stepNames.push("テロップ配置");
                  if (autoSettings.bgm) stepNames.push("BGM追加");
                  stepNames.push("書き出し");
                  stepNames.push("サムネイル");

                  return stepNames.map((name, i) => {
                    const stepIdx = i + 1;
                    const isDone = autoComplete ? true : autoStep > stepIdx;
                    const isCurrent = !autoComplete && autoStep === stepIdx;
                    const isPending = !isDone && !isCurrent;
                    return (
                      <div key={name} className="flex items-center gap-2">
                        <span className="text-base w-6 text-center flex-shrink-0">
                          {isDone ? "✅" : isCurrent ? (
                            <span className="inline-block w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin align-middle" />
                          ) : "⬜"}
                        </span>
                        <span className={`text-xs ${isDone ? "text-green-400" : isCurrent ? "text-indigo-300 font-medium" : "text-gray-500"}`}>
                          Step {stepIdx}/{autoTotalSteps}: {name}
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>
            )}

            {/* Completion Summary */}
            {autoComplete && autoStepLog.length > 0 && (
              <div className="bg-green-900/30 border border-green-700 rounded-xl p-3 space-y-1">
                <p className="text-xs font-bold text-green-400 mb-2">全自動編集完了！</p>
                {autoStepLog.map((log, i) => (
                  <p key={i} className="text-xs text-green-300">✅ {log}</p>
                ))}
              </div>
            )}

            {/* Download Buttons */}
            {autoComplete && (
              <div className="space-y-2">
                {autoFinalUrl && (
                  <a
                    href={autoFinalUrl}
                    download={`auto_edited_${autoTitle || "video"}.mp4`}
                    className="block w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold text-center hover:bg-indigo-500 transition-colors"
                  >
                    💾 動画をダウンロード
                  </a>
                )}
                {autoThumbnailUrl && (
                  <a
                    href={autoThumbnailUrl}
                    download={`thumbnail_${autoTitle || "thumb"}.jpg`}
                    className="block w-full py-3 bg-gray-700 text-white rounded-xl text-sm font-bold text-center hover:bg-gray-600 transition-colors"
                  >
                    🖼 サムネイルをダウンロード
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        {/* Template */}
        {activeTool === "template" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-gray-200 mb-1">テンプレート</h3>
              <p className="text-xs text-gray-500">ワンタップでテロップ・スタンプを自動配置。適用後にテキストを編集できます。</p>
            </div>
            {templateSuccessMsg && (
              <div className="bg-green-900/70 border border-green-600 rounded-xl px-3 py-2 text-xs text-green-300 font-medium">
                ✅ {templateSuccessMsg}
              </div>
            )}
            {/* Platform Tabs */}
            <div className="flex gap-1">
              {([
                { key: "youtube", label: "🎬 YouTube" },
                { key: "reels", label: "📱 Reels" },
                { key: "therapist", label: "🏥 治療家" },
              ] as { key: "youtube" | "reels" | "therapist"; label: string }[]).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveTemplatePlatform(key)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${activeTemplatePlatform === key ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {/* Therapist Sub-Category Tabs */}
            {activeTemplatePlatform === "therapist" && (
              <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-1">
                {THERAPIST_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveTherapistCategory(cat)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${activeTherapistCategory === cat ? "bg-teal-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
            {/* Template Cards */}
            <div className="space-y-3">
              {VIDEO_TEMPLATES.filter((t) =>
                t.platform === activeTemplatePlatform &&
                (activeTemplatePlatform !== "therapist" || t.category === activeTherapistCategory)
              ).map((template) => (
                <div key={template.id} className="bg-gray-800 border border-gray-700 rounded-xl p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-200">{template.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{template.description}</p>
                    </div>
                    <button
                      onClick={() => handleApplyTemplate(template)}
                      className="flex-shrink-0 px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-500 transition-colors"
                    >
                      適用
                    </button>
                  </div>
                  {/* Preview of elements */}
                  <div className="flex flex-wrap gap-1">
                    {template.textOverlays.map((t, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-700 rounded text-[10px] text-gray-300">
                        <span className="text-indigo-400">T</span> {(t.text ?? "テキスト").slice(0, 12)}{(t.text ?? "").length > 12 ? "…" : ""}
                      </span>
                    ))}
                    {template.stickers.map((s, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-700 rounded text-[10px] text-gray-300">
                        {s.emoji}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {/* バズ動画テンプレート */}
            <div className="border-t border-gray-700 pt-4 mt-4">
              <ViralTemplateGallery
                clinicProfile={clinicProfile}
                onUseTemplate={(template) => {
                  // テンプレートのスクリプト構成をテロップとして適用
                  const startT = currentTime;
                  let accTime = startT;
                  const newTexts: TextOverlay[] = template.scriptStructure.map((seg, i) => ({
                    id: `viral-${Date.now()}-${i}`,
                    text: seg.text.replace(/\{院名\}/g, clinicProfile?.clinicName || "{院名}").replace(/\{先生名\}/g, clinicProfile?.clinicName?.replace(/整体院|治療院|鍼灸院|接骨院|整骨院/g, "").trim() || "{先生名}").replace(/\{症状\}/g, clinicProfile?.specialties?.[0] || "{症状}").replace(/\{地域\}/g, clinicProfile?.area || "{地域}").replace(/\{電話番号\}/g, clinicProfile?.phone || "{電話番号}").replace(/\{予約URL\}/g, clinicProfile?.bookingUrl || "{予約URL}").replace(/\{LINE\}/g, clinicProfile?.lineUrl || "{LINE}"),
                    x: 50,
                    y: seg.type === "hook" ? 50 : seg.type === "cta" ? 85 : 80,
                    fontSize: seg.type === "hook" ? 36 : seg.type === "cta" ? 28 : 24,
                    fontFamily: "sans-serif",
                    color: seg.type === "hook" ? "#ffff00" : seg.type === "cta" ? "#00ff00" : "#ffffff",
                    bgColor: seg.type === "hook" ? "transparent" : "rgba(0,0,0,0.7)",
                    startTime: accTime,
                    endTime: (accTime += seg.duration),
                    bold: seg.type === "hook" || seg.type === "cta",
                    italic: false,
                    outlineColor: "#000000",
                    outlineWidth: seg.type === "hook" ? 4 : 2,
                    shadowColor: seg.type === "hook" ? "rgba(0,0,0,0.8)" : "transparent",
                    shadowBlur: seg.type === "hook" ? 8 : 0,
                    shadowOffsetX: 0,
                    shadowOffsetY: 0,
                    animation: (seg.type === "hook" ? "bounce-in" : seg.type === "cta" ? "slide-up" : "fade-in") as TextAnimation,
                    keyframes: [],
                  }));
                  setTextOverlays((prev) => [...prev, ...newTexts]);
                  // Set aspect ratio
                  if (template.aspectRatio === "9:16") setSelectedPresetIdx(1);
                  else setSelectedPresetIdx(0);
                  setTemplateSuccessMsg(`バズテンプレ「${template.name}」を適用（${newTexts.length}個のテロップ）`);
                  setTimeout(() => setTemplateSuccessMsg(null), 3000);
                  setActiveTool("text");
                  if (newTexts.length > 0) setEditingTextId(newTexts[0].id);
                }}
                onGenerateScript={(template) => {
                  // AI台本生成タブに切り替えてテーマを自動設定
                  setScriptTopic(template.name);
                  setScriptPlatform(template.platform === "youtube" ? "youtube" : "reels");
                  setActiveTool("script");
                }}
              />
            </div>
          </div>
        )}

        {/* AI Script */}
        {activeTool === "script" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-gray-200 mb-1">AI台本生成</h3>
              <p className="text-xs text-gray-500">テーマを入力するとAIが治療院向けの動画台本を生成します。字幕として直接適用できます。</p>
            </div>
            {/* API Key status */}
            <div>
              {whisperApiKey ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-green-900/40 border border-green-700 rounded-xl">
                  <span className="text-xs text-green-400">✅ OpenAI APIキー設定済み</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 bg-yellow-900/40 border border-yellow-700 rounded-xl">
                  <span className="text-xs text-yellow-400">⚠️ 字幕ツールでAPIキーを設定してください</span>
                </div>
              )}
            </div>
            {/* Topic input */}
            <div>
              <label className="text-xs text-gray-400 block mb-1">テーマ・症状</label>
              <input
                type="text"
                value={scriptTopic}
                onChange={(e) => setScriptTopic(e.target.value)}
                placeholder="例: 腰痛の原因と改善法"
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
            {/* Duration */}
            <div>
              <label className="text-xs text-gray-400 block mb-1">動画の長さ</label>
              <div className="grid grid-cols-3 gap-1">
                {([{key:"short",label:"ショート\n1分"},{key:"medium",label:"通常\n3分"},{key:"long",label:"ロング\n5分"}] as const).map((d) => (
                  <button key={d.key} onClick={() => setScriptDuration(d.key)} className={`py-2 rounded-lg text-xs font-medium transition-all whitespace-pre-line ${scriptDuration===d.key?"bg-indigo-600 text-white":"bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>{d.label}</button>
                ))}
              </div>
            </div>
            {/* Platform */}
            <div>
              <label className="text-xs text-gray-400 block mb-1">プラットフォーム</label>
              <div className="grid grid-cols-2 gap-1">
                {([{key:"youtube",label:"🎬 YouTube"},{key:"reels",label:"📱 Reels"}] as const).map((p) => (
                  <button key={p.key} onClick={() => setScriptPlatform(p.key)} className={`py-2 rounded-lg text-xs font-medium transition-all ${scriptPlatform===p.key?"bg-indigo-600 text-white":"bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>{p.label}</button>
                ))}
              </div>
            </div>
            {/* Generate button */}
            <button
              onClick={handleGenerateScript}
              disabled={scriptGenerating || !whisperApiKey || !scriptTopic}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-bold hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 transition-all"
            >
              {scriptGenerating ? "台本を生成中..." : "🤖 台本を生成"}
            </button>
            {/* Generated script */}
            {generatedScript.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-indigo-400 font-medium">{generatedScript.length}セグメント生成済み</p>
                  <button onClick={() => setGeneratedScript([])} className="text-xs text-red-400 hover:text-red-300">クリア</button>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-2 bg-gray-900 rounded-xl p-3">
                  {generatedScript.map((seg, i) => (
                    <div key={i} className="border border-gray-700 rounded-lg p-2">
                      <p className="text-xs text-gray-300">{seg.text}</p>
                      <p className="text-[10px] text-gray-600 mt-1">{seg.duration}秒</p>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleApplyScriptAsSubtitles}
                  className="w-full py-2.5 bg-green-700 text-white rounded-xl text-sm font-bold hover:bg-green-600 transition-colors"
                >
                  字幕として適用
                </button>
              </div>
            )}
            {/* 公開カレンダー提案 */}
            <div className="pt-3 border-t border-gray-800">
              <p className="text-xs font-bold text-gray-200 mb-2">📅 今月のおすすめ投稿テーマ</p>
              <p className="text-[9px] text-gray-500 mb-2">症状×季節に合わせた投稿で視聴数を最大化</p>
              {(() => {
                const month = new Date().getMonth() + 1;
                const calendarData: Record<number, { themes: string[]; reason: string }> = {
                  1: { themes: ["正月太り解消", "冷え性対策", "ぎっくり腰予防", "年始の体メンテナンス"], reason: "年末年始の体の不調・ダイエット需要" },
                  2: { themes: ["花粉症と自律神経", "肩こり改善", "受験疲れ解消", "バレンタイン小顔"], reason: "花粉シーズン開始・受験終了期" },
                  3: { themes: ["春の自律神経ケア", "新生活前のメンテ", "花粉症対策", "卒業式前の姿勢改善"], reason: "季節の変わり目・新生活準備" },
                  4: { themes: ["五月病予防", "新生活の腰痛", "ストレス性頭痛", "デスクワーク姿勢"], reason: "環境変化によるストレス増加" },
                  5: { themes: ["五月病の自律神経", "GW疲れリセット", "梅雨前の関節ケア", "産後骨盤矯正"], reason: "GW疲れ・梅雨前対策" },
                  6: { themes: ["梅雨だるさ解消", "低気圧頭痛", "むくみ解消", "睡眠改善"], reason: "梅雨の気象病・湿度対策" },
                  7: { themes: ["夏バテ予防", "冷房による首こり", "水分と筋肉", "夏のぎっくり腰"], reason: "冷房+暑さによる体調不良" },
                  8: { themes: ["お盆疲れケア", "熱中症と自律神経", "夏の睡眠改善", "冷え対策（意外と夏も）"], reason: "夏の冷え・お盆休み明け" },
                  9: { themes: ["秋バテ対策", "台風と頭痛", "スポーツの秋ケガ予防", "夏疲れリセット"], reason: "季節の変わり目・台風シーズン" },
                  10: { themes: ["秋の腰痛", "紅葉ウォーキングと膝", "冷え始めの対策", "ハロウィン姿勢"], reason: "気温低下開始・行楽シーズン" },
                  11: { themes: ["冬前の冷え対策", "年末に向けた体ケア", "乾燥と肌・美容鍼", "七五三疲れ（産後ママ）"], reason: "本格冬前の予防ケア需要" },
                  12: { themes: ["年末大掃除の腰痛", "忘年会疲れ", "冬の肩こり", "1年の体メンテナンス"], reason: "年末の体への負担・まとめ系コンテンツ" },
                };
                const data = calendarData[month] || calendarData[1];
                return (
                  <div className="space-y-1.5">
                    <p className="text-[10px] text-indigo-400">{month}月の需要: {data.reason}</p>
                    {data.themes.map((theme, i) => (
                      <button key={i} onClick={() => setScriptTopic(theme)}
                        className="w-full text-left py-1.5 px-2.5 bg-gray-800 rounded-lg text-[11px] text-gray-300 hover:bg-gray-700 hover:text-indigo-300 transition-colors">
                        {i + 1}. {theme}
                      </button>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Silence */}
        {activeTool === "silence" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-200">自動無音カット</h3>
            <p className="text-xs text-gray-500">動画内の無音部分を検出して自動カットします（Vrew風）</p>
            <div>
              <label className="text-xs text-gray-400 block mb-1">検出感度（{silenceThreshold}dB）</label>
              <input type="range" min={-60} max={-10} value={silenceThreshold} onChange={(e) => setSilenceThreshold(parseInt(e.target.value))} className="w-full" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">最短無音時間（{silenceMinDuration}秒）</label>
              <input type="range" min={0.1} max={3} step={0.1} value={silenceMinDuration} onChange={(e) => setSilenceMinDuration(parseFloat(e.target.value))} className="w-full" />
            </div>
            <button onClick={handleDetectSilence} disabled={processing} className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-500 disabled:opacity-50 transition-colors">
              {processing ? "検出中..." : "無音区間を検出"}
            </button>
            {silentSegments.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-indigo-400 font-medium">{silentSegments.length}箇所の無音区間を検出</p>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {silentSegments.map((seg, i) => (
                    <div key={i} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-1.5 text-xs">
                      <span className="text-gray-400">#{i+1}</span>
                      <span className="text-red-400 font-mono">{formatTime(seg.start)} → {formatTime(seg.end)}</span>
                      <span className="text-gray-500">{(seg.end-seg.start).toFixed(1)}秒</span>
                    </div>
                  ))}
                </div>
                <button onClick={handleRemoveSilence} disabled={processing} className="w-full py-3 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-500 disabled:opacity-50 transition-colors">
                  {processing ? "カット中..." : "無音部分をすべてカット"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Trim */}
        {activeTool === "trim" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-200">トリミング</h3>
            <div>
              <label className="text-xs text-gray-400 block mb-1">開始: {formatTime(trimStart)}</label>
              <input type="range" min={0} max={duration} step={0.1} value={trimStart} onChange={(e) => { const v=parseFloat(e.target.value); setTrimStart(v); handleSeek(v); }} className="w-full" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">終了: {formatTime(trimEnd)}</label>
              <input type="range" min={0} max={duration} step={0.1} value={trimEnd} onChange={(e) => { const v=parseFloat(e.target.value); setTrimEnd(v); handleSeek(v); }} className="w-full" />
            </div>
            <p className="text-xs text-gray-500 text-center">トリミング後の長さ: {formatTime(Math.max(0, trimEnd-trimStart))}</p>
            <button onClick={handleTrim} disabled={processing || trimStart >= trimEnd} className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-500 disabled:opacity-50 transition-colors">
              {processing ? "トリミング中..." : "トリミング実行"}
            </button>
          </div>
        )}

        {/* Text Tool */}
        {activeTool === "text" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-200">テロップ追加</h3>
              <button onClick={addTextOverlay} className="text-xs px-3 py-1.5 bg-indigo-600 rounded-lg text-white hover:bg-indigo-500">+ 追加</button>
            </div>
            {/* === 法的注意事項（医療広告ガイドライン対応）=== */}
            <div className="space-y-2 p-3 bg-red-950/30 border border-red-900/50 rounded-xl">
              <p className="text-[11px] text-red-400 font-bold flex items-center gap-1">⚠️ 法的注意事項（ワンクリック挿入）</p>
              <p className="text-[9px] text-red-400/70">医療広告ガイドライン準拠。ビフォーアフター動画には表示が法的に必要です</p>
              <div className="grid grid-cols-1 gap-1.5">
                {([
                  { label: "📋 ビフォーアフター用（必須4項目）", text: `【施術内容】${clinicProfile?.specialties?.[0] || "整体施術"}\n【費用】初回 ○○円（税込）/ 2回目以降 ○○円\n【リスク・副作用】施術後に一時的なだるさ・\n痛みが生じる場合があります\n【注意】効果には個人差があります`, style: { fontSize: 13, color: "#ffffff", bgColor: "rgba(0,0,0,0.85)", x: 50, y: 92, bold: false, outlineWidth: 0 } },
                  { label: "📋 施術動画用（簡易版）", text: "※施術効果には個人差があります\n※症状により施術内容・費用は異なります", style: { fontSize: 14, color: "#ffffff", bgColor: "rgba(0,0,0,0.8)", x: 50, y: 95, bold: false, outlineWidth: 0 } },
                  { label: "📋 患者の声・体験談用", text: `※個人の感想であり効果を保証するものではありません\n【施術内容】${clinicProfile?.specialties?.[0] || "整体施術"}｜【費用】詳細は概要欄\n【リスク】施術後の一時的な反応（だるさ等）の可能性`, style: { fontSize: 12, color: "#ffffff", bgColor: "rgba(0,0,0,0.85)", x: 50, y: 90, bold: false, outlineWidth: 0 } },
                  { label: "📋 セルフケア動画用", text: "※痛みが出る場合は中止してください\n※持病のある方は医師にご相談ください\n※効果には個人差があります", style: { fontSize: 14, color: "#ffffff", bgColor: "rgba(0,0,0,0.75)", x: 50, y: 93, bold: false, outlineWidth: 0 } },
                  { label: "📋 美容系・ダイエット用", text: `※効果には個人差があります\n※${clinicProfile?.specialties?.find(s => s.includes("美容")) || "美容施術"}の結果を保証するものではありません\n【施術内容・費用・リスク】概要欄をご確認ください`, style: { fontSize: 13, color: "#ffffff", bgColor: "rgba(0,0,0,0.85)", x: 50, y: 92, bold: false, outlineWidth: 0 } },
                ] as { label: string; text: string; style: Partial<TextOverlay> }[]).map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => {
                      const id = `legal-${Date.now()}`;
                      const newOverlay: TextOverlay = {
                        id, text: preset.text,
                        x: preset.style.x ?? 50, y: preset.style.y ?? 92,
                        fontSize: preset.style.fontSize ?? 14, fontFamily: "sans-serif",
                        color: preset.style.color ?? "#ffffff", bgColor: preset.style.bgColor ?? "rgba(0,0,0,0.8)",
                        startTime: Math.max(0, (duration || 10) - 8), endTime: duration || 10,
                        bold: false, italic: false,
                        outlineColor: "#000000", outlineWidth: 0,
                        shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0,
                        animation: "fade-in" as TextAnimation, keyframes: [],
                      };
                      setTextOverlays((prev) => [...prev, newOverlay]);
                      setEditingTextId(id);
                      pushCurrentHistory();
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-red-950/50 border border-red-900/40 rounded-lg text-[11px] text-red-300 hover:bg-red-900/40 hover:border-red-800 transition-all text-left"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* === CTA（予約誘導）プリセット === */}
            <div className="space-y-2 p-3 bg-indigo-950/30 border border-indigo-900/50 rounded-xl">
              <p className="text-[11px] text-indigo-400 font-bold flex items-center gap-1">📣 CTA（予約・集客誘導）</p>
              <p className="text-[9px] text-indigo-400/70">動画の最後に配置して来院・登録に繋げる</p>
              <div className="grid grid-cols-2 gap-1.5">
                {([
                  { label: "📞 予約誘導", text: clinicProfile?.clinicName ? `${clinicProfile.clinicName}\nご予約はプロフィールのリンクから` : "ご予約はプロフィールのリンクから", style: { fontSize: 24, color: "#ffffff", bgColor: "rgba(99,102,241,0.9)", bold: true, x: 50, y: 80 } },
                  { label: "💬 LINE登録", text: "LINE友だち追加で\n初回限定クーポンプレゼント!", style: { fontSize: 22, color: "#ffffff", bgColor: "rgba(6,199,85,0.9)", bold: true, x: 50, y: 80 } },
                  { label: "🔔 チャンネル登録", text: "チャンネル登録お願いします!\n通知ONで新着を見逃さない", style: { fontSize: 24, color: "#ffffff", bgColor: "rgba(255,0,0,0.9)", bold: true, x: 50, y: 50 } },
                  { label: "🌐 WEB予約", text: "24時間WEB予約受付中\n概要欄のリンクからどうぞ", style: { fontSize: 22, color: "#ffffff", bgColor: "rgba(37,99,235,0.9)", bold: true, x: 50, y: 80 } },
                  { label: "🎁 初回限定", text: "初回限定 50%OFF!\nご予約は概要欄のリンクから", style: { fontSize: 26, color: "#ffffff", bgColor: "rgba(220,38,38,0.9)", bold: true, x: 50, y: 75 } },
                  { label: "💰 無料相談", text: "初回カウンセリング無料\nお気軽にご相談ください", style: { fontSize: 24, color: "#ffffff", bgColor: "rgba(16,185,129,0.9)", bold: true, x: 50, y: 80 } },
                  { label: "📱 電話予約", text: clinicProfile?.phone ? `${clinicProfile.clinicName || "当院"}\nTEL: ${clinicProfile.phone}` : "お電話でのご予約も受付中\nTEL: 000-0000-0000", style: { fontSize: 22, color: "#ffffff", bgColor: "rgba(0,0,0,0.85)", bold: true, x: 50, y: 80 } },
                  { label: "📷 Instagram", text: "Instagramフォローで\n最新の健康情報をお届け!", style: { fontSize: 22, color: "#ffffff", bgColor: "rgba(225,48,108,0.9)", bold: true, x: 50, y: 80 } },
                  { label: "▶️ 続きは次回", text: "続きは次の動画で!\nフォローして見逃さないでね", style: { fontSize: 24, color: "#ffffff", bgColor: "rgba(99,102,241,0.85)", bold: true, x: 50, y: 50 } },
                  { label: "⏰ 期間限定", text: "今月末まで限定!\n初回施術 ○○円引き", style: { fontSize: 26, color: "#ffff00", bgColor: "rgba(220,38,38,0.9)", bold: true, x: 50, y: 75 } },
                ] as { label: string; text: string; style: Partial<TextOverlay> }[]).map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => {
                      const id = `cta-${Date.now()}`;
                      const newOverlay: TextOverlay = {
                        id, text: preset.text,
                        x: preset.style.x ?? 50, y: preset.style.y ?? 80,
                        fontSize: preset.style.fontSize ?? 24, fontFamily: "sans-serif",
                        color: preset.style.color ?? "#ffffff", bgColor: preset.style.bgColor ?? "rgba(99,102,241,0.9)",
                        startTime: Math.max(0, (duration || 10) - 6), endTime: duration || 10,
                        bold: preset.style.bold ?? true, italic: false,
                        outlineColor: "#000000", outlineWidth: 0,
                        shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0,
                        animation: "fade-in" as TextAnimation, keyframes: [],
                      };
                      setTextOverlays((prev) => [...prev, newOverlay]);
                      setEditingTextId(id);
                      pushCurrentHistory();
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-2 bg-indigo-950/50 border border-indigo-900/40 rounded-lg text-[10px] text-indigo-300 hover:bg-indigo-900/40 hover:border-indigo-800 transition-all text-left"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* === 情報表示プリセット === */}
            <div className="space-y-2">
              <p className="text-[10px] text-gray-500 font-medium">院情報・その他</p>
              <div className="grid grid-cols-3 gap-1.5">
                {([
                  { label: "🏥 院名", text: clinicProfile?.clinicName || "{院名}", style: { fontSize: 20, color: "#ffffff", bgColor: "rgba(0,0,0,0.6)", bold: false, x: 10, y: 95, outlineWidth: 0 } },
                  { label: "📍 地域", text: clinicProfile?.area ? `📍 ${clinicProfile.area}` : "📍 {地域}", style: { fontSize: 18, color: "#ffffff", bgColor: "rgba(0,0,0,0.5)", bold: false, x: 10, y: 10, outlineWidth: 0 } },
                  { label: "👨‍⚕️ 肩書き", text: clinicProfile?.clinicName ? `${clinicProfile.clinicName} 院長` : "{院名} 院長", style: { fontSize: 18, color: "#ffffff", bgColor: "rgba(0,0,0,0.6)", bold: false, x: 85, y: 95, outlineWidth: 0 } },
                ] as { label: string; text: string; style: Partial<TextOverlay> }[]).map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => {
                      const id = `info-${Date.now()}`;
                      const newOverlay: TextOverlay = {
                        id, text: preset.text,
                        x: preset.style.x ?? 50, y: preset.style.y ?? 50,
                        fontSize: preset.style.fontSize ?? 20, fontFamily: "sans-serif",
                        color: preset.style.color ?? "#ffffff", bgColor: preset.style.bgColor ?? "rgba(0,0,0,0.6)",
                        startTime: 0, endTime: duration || 10,
                        bold: preset.style.bold ?? false, italic: false,
                        outlineColor: "#000000", outlineWidth: preset.style.outlineWidth ?? 0,
                        shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0,
                        animation: "none" as TextAnimation, keyframes: [],
                      };
                      setTextOverlays((prev) => [...prev, newOverlay]);
                      setEditingTextId(id);
                      pushCurrentHistory();
                    }}
                    className="flex items-center gap-1 px-2 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-[10px] text-gray-300 hover:bg-gray-700 transition-all text-left"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
            {textOverlays.length === 0 && <p className="text-xs text-gray-500 text-center py-6">「+ 追加」でテロップを配置できます<br/><span className="text-indigo-400">キャンバス上でドラッグ移動も可能です</span></p>}
            {textOverlays.map((overlay) => (
              <div key={overlay.id} className={`p-3 rounded-xl border transition-colors ${editingTextId === overlay.id ? "border-indigo-500 bg-gray-800" : "border-gray-700 bg-gray-800/50"}`}>
                <div className="flex items-center justify-between mb-2">
                  <button onClick={() => setEditingTextId(overlay.id === editingTextId ? null : overlay.id)} className="text-xs text-indigo-400">
                    {overlay.id === editingTextId ? "閉じる" : "編集"}
                  </button>
                  <div className="flex items-center gap-2">
                    <button onClick={() => duplicateTextOverlay(overlay.id)} className="text-xs text-gray-400 hover:text-gray-200">複製</button>
                    <button onClick={() => deleteTextOverlay(overlay.id)} className="text-xs text-red-400 hover:text-red-300">削除</button>
                  </div>
                </div>
                {editingTextId === overlay.id && (
                  <div className="space-y-3">
                    <input type="text" value={overlay.text} onChange={(e) => updateTextOverlay(overlay.id, { text: e.target.value })} className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white" placeholder="テキストを入力..." />
                    <div>
                      <label className="text-[10px] text-gray-500 block mb-1">フォント</label>
                      <select value={overlay.fontFamily} onChange={(e) => updateTextOverlay(overlay.id, { fontFamily: e.target.value })} className="w-full px-2 py-2 bg-gray-900 border border-gray-700 rounded-lg text-xs text-white">
                        {FONT_OPTIONS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                      </select>
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <label className="text-[10px] text-gray-500 block mb-1">サイズ ({overlay.fontSize}px)</label>
                        <input type="range" min={12} max={120} value={overlay.fontSize} onChange={(e) => updateTextOverlay(overlay.id, { fontSize: parseInt(e.target.value) })} className="w-full" />
                      </div>
                      <button onClick={() => updateTextOverlay(overlay.id, { bold: !overlay.bold })} className={`w-9 h-9 rounded-lg text-sm font-bold flex items-center justify-center transition-colors ${overlay.bold ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>B</button>
                      <button onClick={() => updateTextOverlay(overlay.id, { italic: !overlay.italic })} className={`w-9 h-9 rounded-lg text-sm italic font-serif flex items-center justify-center transition-colors ${overlay.italic ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>I</button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-gray-500 block mb-1">文字色</label>
                        <div className="flex gap-1">
                          <input type="color" value={overlay.color} onChange={(e) => updateTextOverlay(overlay.id, { color: e.target.value })} className="w-10 h-8 rounded cursor-pointer border border-gray-700" />
                          {["#ffffff","#000000","#ff0000","#ffff00","#00ff00","#00bfff"].map((c) => (
                            <button key={c} onClick={() => updateTextOverlay(overlay.id, { color: c })} className={`w-6 h-8 rounded border ${overlay.color===c?"border-indigo-400 ring-1 ring-indigo-400":"border-gray-600"}`} style={{backgroundColor:c}} />
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 block mb-1">背景色</label>
                        <div className="flex gap-1">
                          <input type="color" value={overlay.bgColor.startsWith("rgba")?"#000000":overlay.bgColor} onChange={(e) => updateTextOverlay(overlay.id, { bgColor: e.target.value+"cc" })} className="w-10 h-8 rounded cursor-pointer border border-gray-700" />
                          <button onClick={() => updateTextOverlay(overlay.id, { bgColor: "transparent" })} className={`px-2 h-8 rounded border text-[10px] ${overlay.bgColor==="transparent"?"border-indigo-400 text-indigo-400":"border-gray-600 text-gray-400"}`}>なし</button>
                          <button onClick={() => updateTextOverlay(overlay.id, { bgColor: "rgba(0,0,0,0.7)" })} className="px-2 h-8 rounded border border-gray-600 text-[10px] text-gray-400 bg-black/70">黒</button>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 block mb-1">縁取り（{overlay.outlineWidth}px）</label>
                      <div className="flex items-center gap-2">
                        <input type="range" min={0} max={10} value={overlay.outlineWidth} onChange={(e) => updateTextOverlay(overlay.id, { outlineWidth: parseInt(e.target.value) })} className="flex-1" />
                        <input type="color" value={overlay.outlineColor} onChange={(e) => updateTextOverlay(overlay.id, { outlineColor: e.target.value })} className="w-8 h-8 rounded cursor-pointer border border-gray-700" />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 block mb-1">影（ぼかし: {overlay.shadowBlur}px）</label>
                      <div className="flex items-center gap-2">
                        <input type="range" min={0} max={20} value={overlay.shadowBlur} onChange={(e) => updateTextOverlay(overlay.id, { shadowBlur: parseInt(e.target.value) })} className="flex-1" />
                        <input type="color" value={overlay.shadowColor.startsWith("rgba")?"#000000":overlay.shadowColor} onChange={(e) => updateTextOverlay(overlay.id, { shadowColor: e.target.value })} className="w-8 h-8 rounded cursor-pointer border border-gray-700" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-gray-500 block mb-1">X位置 ({overlay.x}%)</label>
                        <input type="range" min={0} max={100} value={overlay.x} onChange={(e) => updateTextOverlay(overlay.id, { x: parseInt(e.target.value) })} className="w-full" />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 block mb-1">Y位置 ({overlay.y}%)</label>
                        <input type="range" min={0} max={100} value={overlay.y} onChange={(e) => updateTextOverlay(overlay.id, { y: parseInt(e.target.value) })} className="w-full" />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 block mb-1">位置プリセット</label>
                      <div className="grid grid-cols-3 gap-1">
                        {[{label:"左上",x:5,y:15},{label:"中央上",x:50,y:15},{label:"右上",x:85,y:15},{label:"左中",x:5,y:50},{label:"中央",x:50,y:50},{label:"右中",x:85,y:50},{label:"左下",x:5,y:85},{label:"中央下",x:50,y:85},{label:"右下",x:85,y:85}].map((pos) => (
                          <button key={pos.label} onClick={() => updateTextOverlay(overlay.id, { x: pos.x, y: pos.y })} className="px-1 py-1.5 bg-gray-800 rounded text-[10px] text-gray-400 hover:bg-gray-700 hover:text-gray-200 transition-colors">{pos.label}</button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-gray-500 block mb-1">表示開始（秒）</label>
                        <input type="number" step={0.1} value={overlay.startTime} onChange={(e) => updateTextOverlay(overlay.id, { startTime: parseFloat(e.target.value) })} className="w-full px-2 py-1.5 bg-gray-900 border border-gray-700 rounded text-xs text-white" />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 block mb-1">表示終了（秒）</label>
                        <input type="number" step={0.1} value={overlay.endTime} onChange={(e) => updateTextOverlay(overlay.id, { endTime: parseFloat(e.target.value) })} className="w-full px-2 py-1.5 bg-gray-900 border border-gray-700 rounded text-xs text-white" />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 block mb-1">スタイルプリセット</label>
                      <div className="grid grid-cols-4 gap-1">
                        <button onClick={() => updateTextOverlay(overlay.id, { color:"#ffffff",bgColor:"rgba(0,0,0,0.7)",outlineWidth:0,shadowBlur:0,shadowColor:"transparent" })} className="px-1 py-2 bg-gray-800 rounded text-[10px] text-white hover:bg-gray-700">シンプル</button>
                        <button onClick={() => updateTextOverlay(overlay.id, { color:"#ffffff",bgColor:"transparent",outlineColor:"#000000",outlineWidth:4,shadowBlur:0,shadowColor:"transparent" })} className="px-1 py-2 bg-gray-800 rounded text-[10px] text-white hover:bg-gray-700">白＋黒縁</button>
                        <button onClick={() => updateTextOverlay(overlay.id, { color:"#ffff00",bgColor:"transparent",outlineColor:"#000000",outlineWidth:4,shadowBlur:8,shadowColor:"#000000" })} className="px-1 py-2 bg-gray-800 rounded text-[10px] text-yellow-300 hover:bg-gray-700">黄＋黒縁</button>
                        <button onClick={() => updateTextOverlay(overlay.id, { color:"#ffffff",bgColor:"rgba(255,0,0,0.85)",outlineWidth:0,shadowBlur:0,shadowColor:"transparent" })} className="px-1 py-2 bg-red-600 rounded text-[10px] text-white hover:bg-red-500">警告赤</button>
                        <button onClick={() => updateTextOverlay(overlay.id, { color:"#000000",bgColor:"rgba(255,255,0,0.9)",outlineWidth:0,shadowBlur:0,shadowColor:"transparent" })} className="px-1 py-2 bg-yellow-400 rounded text-[10px] text-black hover:bg-yellow-300">注目黄</button>
                        <button onClick={() => updateTextOverlay(overlay.id, { color:"#ffffff",bgColor:"rgba(99,102,241,0.85)",outlineWidth:0,shadowBlur:0,shadowColor:"transparent" })} className="px-1 py-2 bg-indigo-500 rounded text-[10px] text-white hover:bg-indigo-400">CTA紫</button>
                        <button onClick={() => updateTextOverlay(overlay.id, { color:"#ff3366",bgColor:"transparent",outlineColor:"#ffffff",outlineWidth:3,shadowBlur:12,shadowColor:"#ff336680" })} className="px-1 py-2 bg-gray-800 rounded text-[10px] text-pink-400 hover:bg-gray-700">ネオン</button>
                        <button onClick={() => updateTextOverlay(overlay.id, { color:"#ffffff",bgColor:"rgba(6,199,85,0.9)",outlineWidth:0,shadowBlur:0,shadowColor:"transparent" })} className="px-1 py-2 bg-emerald-600 rounded text-[10px] text-white hover:bg-emerald-500">LINE緑</button>
                      </div>
                      <p className="text-[9px] text-gray-600 mt-1">治療院定番スタイル</p>
                      <div className="grid grid-cols-4 gap-1 mt-1">
                        <button onClick={() => updateTextOverlay(overlay.id, { color:"#ffffff",bgColor:"transparent",outlineColor:"#000000",outlineWidth:5,shadowBlur:4,shadowColor:"#00000080",fontFamily:"'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif",bold:true })} className="px-1 py-2 bg-gray-800 rounded text-[10px] text-white hover:bg-gray-700" style={{fontFamily:"sans-serif"}}>定番テロップ</button>
                        <button onClick={() => updateTextOverlay(overlay.id, { color:"#4a3728",bgColor:"rgba(255,248,230,0.9)",outlineWidth:0,shadowBlur:0,shadowColor:"transparent",fontFamily:"'Hiragino Mincho ProN', 'Noto Serif JP', serif",bold:false })} className="px-1 py-2 bg-amber-50 rounded text-[10px] text-amber-900 hover:bg-amber-100">やさしい明朝</button>
                        <button onClick={() => updateTextOverlay(overlay.id, { color:"#ffffff",bgColor:"rgba(45,55,72,0.9)",outlineWidth:0,shadowBlur:0,shadowColor:"transparent",fontFamily:"'Georgia', 'Times New Roman', serif",bold:false })} className="px-1 py-2 bg-gray-700 rounded text-[10px] text-white hover:bg-gray-600">高級感</button>
                        <button onClick={() => updateTextOverlay(overlay.id, { color:"#ff6b35",bgColor:"rgba(255,255,255,0.95)",outlineWidth:0,shadowBlur:0,shadowColor:"transparent",fontFamily:"'Comic Sans MS', 'Chalkboard SE', cursive",bold:true })} className="px-1 py-2 bg-white rounded text-[10px] text-orange-500 hover:bg-gray-100">POP親しみ</button>
                        <button onClick={() => updateTextOverlay(overlay.id, { color:"#ffffff",bgColor:"transparent",outlineColor:"#dc2626",outlineWidth:5,shadowBlur:0,shadowColor:"transparent",bold:true })} className="px-1 py-2 bg-gray-800 rounded text-[10px] text-white hover:bg-gray-700" style={{WebkitTextStroke:"1px red"}}>赤縁インパクト</button>
                        <button onClick={() => updateTextOverlay(overlay.id, { color:"#1e3a5f",bgColor:"rgba(219,234,254,0.9)",outlineWidth:0,shadowBlur:0,shadowColor:"transparent",fontFamily:"sans-serif",bold:true })} className="px-1 py-2 bg-blue-100 rounded text-[10px] text-blue-900 hover:bg-blue-200">清潔感ブルー</button>
                        <button onClick={() => updateTextOverlay(overlay.id, { color:"#ffffff",bgColor:"rgba(0,0,0,0.5)",outlineWidth:0,shadowBlur:20,shadowColor:"#ffffff60",fontFamily:"sans-serif",bold:false })} className="px-1 py-2 bg-gray-800 rounded text-[10px] text-white hover:bg-gray-700">ソフトグロー</button>
                        <button onClick={() => updateTextOverlay(overlay.id, { color:"#333333",bgColor:"rgba(200,230,201,0.9)",outlineWidth:0,shadowBlur:0,shadowColor:"transparent",fontFamily:"sans-serif",bold:false })} className="px-1 py-2 bg-green-100 rounded text-[10px] text-green-900 hover:bg-green-200">ナチュラル</button>
                      </div>
                    </div>
                    {/* Animation Section */}
                    <div>
                      <label className="text-[10px] text-gray-500 block mb-2">アニメーション</label>
                      {TEXT_ANIMATION_GROUPS.map((group) => (
                        <div key={group.label} className="mb-2">
                          <p className="text-[10px] text-indigo-400 font-medium mb-1">{group.label}</p>
                          <div className="grid grid-cols-3 gap-1">
                            {group.anims.map((anim) => (
                              <button key={anim.value} onClick={() => updateTextOverlay(overlay.id, { animation: anim.value as TextAnimation })}
                                className={`py-1.5 rounded-lg text-[10px] font-medium transition-all ${overlay.animation === anim.value ? "bg-indigo-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}>
                                {anim.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {editingTextId !== overlay.id && (
                  <p className="text-xs text-gray-400 truncate">&quot;{overlay.text}&quot; ({formatTime(overlay.startTime)} - {formatTime(overlay.endTime)}){overlay.animation !== "none" && <span className="text-indigo-400 ml-1">[{overlay.animation}]</span>}</p>
                )}
              </div>
            ))}
          </div>
        )}
        {/* Subtitle */}
        {activeTool === "subtitle" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-gray-200 mb-1">音声字幕生成</h3>
              <p className="text-xs text-gray-500">字幕生成方式を選択:</p>
            </div>
            {/* Mode selector */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSubtitleMode("browser")}
                className={`p-3 rounded-xl border-2 text-left transition-all ${subtitleMode === "browser" ? "border-indigo-500 bg-indigo-900/30" : "border-gray-700 bg-gray-800 hover:border-gray-600"}`}
              >
                <div className="text-lg mb-1">🌐</div>
                <div className="text-xs font-bold text-gray-200">ブラウザ音声認識</div>
                <div className="text-[10px] text-gray-500 mt-0.5">無料・リアルタイム</div>
                <div className="text-[10px] text-yellow-400 mt-0.5">精度: ★★★☆☆</div>
              </button>
              <button
                onClick={() => setSubtitleMode("whisper")}
                className={`p-3 rounded-xl border-2 text-left transition-all ${subtitleMode === "whisper" ? "border-purple-500 bg-purple-900/30" : "border-gray-700 bg-gray-800 hover:border-gray-600"}`}
              >
                <div className="text-lg mb-1">🤖</div>
                <div className="text-xs font-bold text-gray-200">AI高精度(Whisper)</div>
                <div className="text-[10px] text-gray-500 mt-0.5">高精度・自動タイムスタンプ</div>
                <div className="text-[10px] text-green-400 mt-0.5">精度: ★★★★★</div>
              </button>
            </div>

            {/* Browser mode */}
            {subtitleMode === "browser" && (
              <div className="space-y-3">
                <button onClick={isListening ? stopVoiceRecognition : startVoiceRecognition} className={`w-full py-3 rounded-xl text-sm font-bold transition-colors ${isListening ? "bg-red-600 text-white hover:bg-red-500 animate-pulse" : "bg-indigo-600 text-white hover:bg-indigo-500"}`}>
                  {isListening ? "⏹ 認識を停止" : "🎙 音声認識を開始"}
                </button>
                {isListening && (
                  <div className="space-y-1">
                    <p className="text-xs text-red-400 text-center animate-pulse">認識中... 動画を再生して音声を拾っています</p>
                    {interimText && (
                      <div className="bg-gray-800 rounded-lg px-3 py-2 border border-indigo-500/30">
                        <p className="text-xs text-indigo-300 opacity-70">{interimText}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Whisper mode */}
            {subtitleMode === "whisper" && (
              <div className="space-y-3">
                <div className="bg-gray-800 rounded-xl p-3 space-y-2">
                  <label className="text-xs font-medium text-gray-300">OpenAI APIキー</label>
                  <p className="text-[10px] text-gray-500">sk-で始まるキーを入力（ブラウザを閉じると消去されます）</p>
                  {whisperKeySaved ? (
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-xs text-green-400">✅ APIキー設定済み</span>
                      </div>
                      <button onClick={handleChangeWhisperKey} className="text-xs px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors">変更</button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <input
                            type={showWhisperKey ? "text" : "password"}
                            value={whisperKeyInput}
                            onChange={(e) => setWhisperKeyInput(e.target.value)}
                            placeholder="sk-..."
                            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-xs text-white pr-8"
                          />
                          <button
                            onClick={() => setShowWhisperKey((v) => !v)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs"
                          >{showWhisperKey ? "🙈" : "👁"}</button>
                        </div>
                      </div>
                      <button
                        onClick={handleSaveWhisperKey}
                        disabled={!whisperKeyInput.trim()}
                        className="w-full py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                      >
                        保存する
                      </button>
                    </div>
                  )}
                </div>
                {/* Whisper詳細設定 */}
                <div className="bg-gray-800 rounded-xl p-3 space-y-2">
                  <p className="text-xs font-medium text-gray-300">認識設定</p>
                  <div>
                    <label className="text-[10px] text-gray-500 block mb-1">言語</label>
                    <select value={whisperLang} onChange={(e) => setWhisperLang(e.target.value)} className="w-full px-2 py-1.5 bg-gray-900 border border-gray-700 rounded text-xs text-white">
                      <option value="ja">日本語</option>
                      <option value="en">英語</option>
                      <option value="zh">中国語</option>
                      <option value="ko">韓国語</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 block mb-1">医療用語ヒント（任意）</label>
                    <input type="text" value={whisperPrompt} onChange={(e) => setWhisperPrompt(e.target.value)}
                      placeholder="例: 脊柱管狭窄症、坐骨神経痛、頸椎ヘルニア"
                      className="w-full px-2 py-1.5 bg-gray-900 border border-gray-700 rounded text-xs text-white placeholder-gray-600" />
                    <p className="text-[9px] text-gray-600 mt-0.5">専門用語を入力すると認識精度が向上します</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {[
                        { label: "整形外科系", terms: "脊柱管狭窄症、坐骨神経痛、頸椎ヘルニア、腰椎すべり症、変形性膝関節症、椎間板、脊髄、馬尾神経、神経根、筋膜" },
                        { label: "自律神経系", terms: "自律神経失調症、交感神経、副交感神経、迷走神経、不定愁訴、起立性調節障害、過敏性腸症候群、パニック障害" },
                        { label: "施術用語", terms: "トリガーポイント、筋膜リリース、仙腸関節、胸鎖乳突筋、僧帽筋、大腰筋、梨状筋、骨盤矯正、頭蓋仙骨療法" },
                        { label: "美容系", terms: "美容鍼、リフトアップ、小顔矯正、ほうれい線、むくみ、ターンオーバー、コラーゲン、エラスチン" },
                      ].map((dict) => (
                        <button key={dict.label} onClick={() => setWhisperPrompt((prev) => prev ? `${prev}、${dict.terms}` : dict.terms)}
                          className="px-2 py-0.5 bg-purple-900/40 border border-purple-700/50 rounded text-[9px] text-purple-300 hover:bg-purple-800/50 transition-colors">
                          + {dict.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 block mb-1">精度 (temperature: {whisperTemperature})</label>
                    <input type="range" min={0} max={1} step={0.1} value={whisperTemperature} onChange={(e) => setWhisperTemperature(parseFloat(e.target.value))} className="w-full" />
                    <p className="text-[9px] text-gray-600">0=最も正確 / 1=多様な候補を探索</p>
                  </div>
                </div>
                <button
                  onClick={handleWhisperSubtitles}
                  disabled={processing || !whisperApiKey || !videoFile}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-sm font-bold hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 transition-all"
                >
                  {processing ? "処理中..." : "🤖 AI字幕を自動生成"}
                </button>
                {/* Auto-subtitle toggle */}
                <label className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2.5 cursor-pointer">
                  <div>
                    <span className="text-xs font-medium text-gray-200">動画読み込み時に自動生成</span>
                    <p className="text-[10px] text-gray-500 mt-0.5">動画をアップロードすると即座に字幕生成</p>
                  </div>
                  <button
                    onClick={() => {
                      const next = !autoSubtitleEnabled;
                      setAutoSubtitleEnabled(next);
                      try { localStorage.setItem("videoforge_auto_subtitle", String(next)); } catch {}
                    }}
                    className={`relative w-10 h-5 rounded-full transition-colors ${autoSubtitleEnabled ? "bg-purple-600" : "bg-gray-600"}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${autoSubtitleEnabled ? "left-5.5 translate-x-0" : "left-0.5"}`} style={autoSubtitleEnabled ? { left: '22px' } : { left: '2px' }} />
                  </button>
                </label>
                {!videoFile && <p className="text-[10px] text-yellow-500 text-center">先に動画をアップロードしてください</p>}
                {!whisperApiKey && videoFile && <p className="text-[10px] text-yellow-500 text-center">APIキーを設定してください</p>}
              </div>
            )}

            {subtitles.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-indigo-400 font-medium">字幕 {subtitles.length}件</p>
                  <button onClick={() => setSubtitles([])} className="text-xs text-red-400 hover:text-red-300">全削除</button>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {subtitles.map((sub) => (
                    <div key={sub.id} className="bg-gray-800 rounded-lg px-3 py-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-gray-500 font-mono">{formatTime(sub.startTime)} → {formatTime(sub.endTime)}</span>
                        <button onClick={() => setSubtitles((prev) => prev.filter((s) => s.id !== sub.id))} className="text-[10px] text-red-400">削除</button>
                      </div>
                      <input type="text" value={sub.text} onChange={(e) => setSubtitles((prev) => prev.map((s) => s.id === sub.id ? { ...s, text: e.target.value } : s))} className="w-full px-2 py-1 bg-gray-900 border border-gray-700 rounded text-xs text-white" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* BGM */}
        {activeTool === "bgm" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-200">BGM追加</h3>
            {/* Category tabs */}
            <div className="flex gap-1">
              {BGM_CATEGORIES.map((cat, catIdx) => (
                <button key={cat.name} onClick={() => setActiveBgmCategory(catIdx)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${activeBgmCategory === catIdx ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
                  {catIdx === 0 ? "🎵 BGM" : "🔊 効果音"}
                </button>
              ))}
            </div>
            {/* Library section */}
            <div>
              <div className="space-y-1.5">
                {BGM_CATEGORIES[activeBgmCategory].items.map((item, itemIdx) => {
                  const key = `${activeBgmCategory}-${itemIdx}`;
                  const isPreviewing = previewingBgmIdx === key;
                  const isGenerating = generatingBgm === key || generatingBgm === `use-${activeBgmCategory}-${itemIdx}`;
                  return (
                    <div key={item.name} className="bg-gray-800 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-200 truncate">{item.name}</p>
                        <p className="text-[9px] text-gray-500 truncate">{item.desc}</p>
                        <p className="text-[9px] text-indigo-400">{item.duration}</p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => handlePreviewBgmLibrary(activeBgmCategory, itemIdx)} disabled={!!isGenerating}
                          className={`w-8 h-8 rounded-lg text-xs flex items-center justify-center transition-colors ${isPreviewing ? "bg-indigo-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"} ${isGenerating ? "opacity-50" : ""}`}>
                          {isGenerating ? "…" : isPreviewing ? "⏹" : "▶"}
                        </button>
                        <button onClick={() => handleUseBgmLibrary(activeBgmCategory, itemIdx)} disabled={!!isGenerating}
                          className="px-2 h-8 bg-green-800 text-green-300 rounded-lg text-[10px] font-medium flex items-center justify-center hover:bg-green-700 disabled:opacity-50 transition-colors">
                          使用
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="border-t border-gray-800 pt-3">
              <label className="text-xs text-gray-400 block mb-2">または自分のファイルを選択</label>
              <button onClick={() => bgmInputRef.current?.click()} className="w-full p-4 border-2 border-dashed border-gray-700 rounded-xl text-center hover:border-indigo-500 transition-colors">
                <span className="text-2xl block mb-1">🎵</span>
                <span className="text-xs text-gray-400">{bgmFile ? bgmFile.name : "BGMファイルを選択（MP3, WAV）"}</span>
              </button>
              <input ref={bgmInputRef} type="file" accept="audio/*" onChange={handleBgmUpload} className="hidden" />
            </div>
            {bgmFile && (
              <>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">BGM音量（{Math.round(bgmVolume*100)}%）</label>
                  <input type="range" min={0} max={1} step={0.05} value={bgmVolume} onChange={(e) => setBgmVolume(parseFloat(e.target.value))} className="w-full" />
                </div>
                <button onClick={handleAddBgm} disabled={processing} className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-500 disabled:opacity-50 transition-colors">
                  {processing ? "ミックス中..." : "BGMをミックス"}
                </button>
              </>
            )}
          </div>
        )}

        {/* Speed */}
        {activeTool === "speed" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-200">速度変更</h3>
            <div>
              <label className="text-xs text-gray-400 block mb-2">速度プリセット</label>
              <div className="grid grid-cols-4 gap-2">
                {SPEED_PRESETS.map((speed) => (
                  <button key={speed} onClick={() => handleSpeedPreview(speed)} className={`py-2.5 rounded-xl text-sm font-bold transition-all ${playbackSpeed===speed?"bg-indigo-600 text-white":"bg-gray-800 text-gray-300 hover:bg-gray-700"}`}>{speed}x</button>
                ))}
              </div>
            </div>
            <div className="bg-gray-800 rounded-xl p-3">
              <p className="text-xs text-gray-400">現在の速度</p>
              <p className="text-2xl font-bold text-indigo-400">{playbackSpeed}x</p>
            </div>
            {playbackSpeed !== 1 && (
              <button onClick={handleApplySpeed} disabled={processing} className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-500 disabled:opacity-50 transition-colors">
                {processing ? "処理中..." : `${playbackSpeed}x で書き出す`}
              </button>
            )}
          </div>
        )}

        {/* Split */}
        {activeTool === "split" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-200">分割・並び替え</h3>
            <div className="flex gap-2">
              <button onClick={handleSplitAtCurrent} disabled={processing || !duration} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-500 disabled:opacity-50 transition-colors">✂ {formatTime(currentTime)} で分割</button>
              {clipMarkers.length > 0 && <button onClick={handleResetClips} className="px-4 py-3 bg-gray-800 text-gray-300 rounded-xl text-xs hover:bg-gray-700">リセット</button>}
            </div>
            {clipMarkers.length === 0 && <p className="text-xs text-gray-500 text-center py-4">再生ヘッドを移動して「分割」ボタンを押してください</p>}
            {clipMarkers.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-indigo-400 font-medium">{clipMarkers.length}個のクリップ</p>
                <div className="space-y-1 max-h-56 overflow-y-auto">
                  {clipMarkers.map((clip, i) => (
                    <div key={clip.id} className="flex items-center gap-2 bg-gray-800 rounded-xl px-3 py-2">
                      <span className="text-xs text-gray-500 w-4">{i+1}</span>
                      <span className="flex-1 text-xs text-gray-300 font-mono">{formatTime(clip.startTime)} → {formatTime(clip.endTime)}</span>
                      <span className="text-[10px] text-gray-600">{(clip.endTime-clip.startTime).toFixed(1)}秒</span>
                      <div className="flex gap-1">
                        <button onClick={() => handleMoveClipUp(i)} disabled={i===0} className="w-6 h-6 bg-gray-700 rounded text-gray-400 hover:bg-gray-600 disabled:opacity-30 text-xs">↑</button>
                        <button onClick={() => handleMoveClipDown(i)} disabled={i===clipMarkers.length-1} className="w-6 h-6 bg-gray-700 rounded text-gray-400 hover:bg-gray-600 disabled:opacity-30 text-xs">↓</button>
                        <button onClick={() => handleDeleteClip(clip.id)} className="w-6 h-6 bg-red-900/50 rounded text-red-400 hover:bg-red-800/50 text-xs">×</button>
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={handleApplySplit} disabled={processing || clipMarkers.length===0} className="w-full py-3 bg-green-700 text-white rounded-xl text-sm font-bold hover:bg-green-600 disabled:opacity-50 transition-colors">
                  {processing ? "処理中..." : "この順番で書き出す"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Filter */}
        {activeTool === "filter" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-200">フィルター・色補正</h3>
            <div>
              <label className="text-xs text-gray-400 block mb-2">プリセット</label>
              <div className="grid grid-cols-3 gap-1.5">
                {FILTER_PRESETS.map((preset) => (
                  <button key={preset.label} onClick={() => { setFilterSettings({ ...preset.settings }); pushHistory({ textOverlays, subtitles, silentSegments, videoUrl, stickers, filterSettings: { ...preset.settings }, transitionIn, transitionOut }); }} className={`py-2 px-1 rounded-xl text-xs font-medium transition-all ${JSON.stringify(filterSettings)===JSON.stringify(preset.settings)?"bg-indigo-600 text-white":"bg-gray-800 text-gray-300 hover:bg-gray-700"}`}>{preset.label}</button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              {[{key:"brightness",label:"明るさ",min:0,max:200},{key:"contrast",label:"コントラスト",min:0,max:200},{key:"saturation",label:"彩度",min:0,max:200}].map((s) => (
                <div key={s.key}>
                  <label className="text-xs text-gray-400 block mb-1">{s.label} ({(filterSettings as any)[s.key]}%)</label>
                  <input type="range" min={s.min} max={s.max} value={(filterSettings as any)[s.key]} onChange={(e) => setFilterSettings((p) => ({ ...p, [s.key]: parseInt(e.target.value) }))} onPointerUp={pushCurrentHistory} className="w-full" />
                </div>
              ))}
              <div>
                <label className="text-xs text-gray-400 block mb-1">色温度 ({filterSettings.temperature > 0 ? `+${filterSettings.temperature}` : filterSettings.temperature}){filterSettings.temperature>0?" 暖かい":filterSettings.temperature<0?" クール":""}</label>
                <input type="range" min={-100} max={100} value={filterSettings.temperature} onChange={(e) => setFilterSettings((p) => ({ ...p, temperature: parseInt(e.target.value) }))} onPointerUp={pushCurrentHistory} className="w-full" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">ビネット ({filterSettings.vignette}%)</label>
                <input type="range" min={0} max={100} value={filterSettings.vignette} onChange={(e) => setFilterSettings((p) => ({ ...p, vignette: parseInt(e.target.value) }))} onPointerUp={pushCurrentHistory} className="w-full" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setFilterSettings({ ...DEFAULT_FILTERS }); pushHistory({ textOverlays, subtitles, silentSegments, videoUrl, stickers, filterSettings: { ...DEFAULT_FILTERS }, transitionIn, transitionOut }); }} className="flex-1 py-2.5 bg-gray-800 text-gray-300 rounded-xl text-sm hover:bg-gray-700 transition-colors">リセット</button>
              <button onClick={handleApplyFiltersExport} disabled={processing} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-500 disabled:opacity-50 transition-colors">{processing ? "処理中..." : "動画に適用"}</button>
            </div>
          </div>
        )}
        {/* Transition */}
        {activeTool === "transition" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-200">トランジション</h3>
            <div className="bg-gray-800 rounded-xl p-3 space-y-3">
              <p className="text-xs font-semibold text-indigo-300">動画の開始</p>
              <div className="grid grid-cols-3 gap-1.5">
                {TRANSITION_TYPES.map((t) => (
                  <button key={t.value} onClick={() => { const newT = { ...transitionIn, type: t.value }; setTransitionIn(newT); pushHistory({ textOverlays, subtitles, silentSegments, videoUrl, stickers, filterSettings, transitionIn: newT, transitionOut }); }} className={`py-2 px-1 rounded-xl text-xs font-medium transition-all flex flex-col items-center gap-0.5 ${transitionIn.type===t.value?"bg-indigo-600 text-white":"bg-gray-700 text-gray-300 hover:bg-gray-600"}`}>
                    <span className="text-base">{t.icon}</span><span>{t.label}</span>
                  </button>
                ))}
              </div>
              {transitionIn.type !== "none" && (
                <div>
                  <label className="text-[10px] text-gray-500 block mb-1">デュレーション ({transitionIn.duration.toFixed(1)}秒)</label>
                  <input type="range" min={0.3} max={2.0} step={0.1} value={transitionIn.duration} onChange={(e) => setTransitionIn((prev) => ({ ...prev, duration: parseFloat(e.target.value) }))} onPointerUp={pushCurrentHistory} className="w-full" />
                </div>
              )}
            </div>
            <div className="bg-gray-800 rounded-xl p-3 space-y-3">
              <p className="text-xs font-semibold text-purple-300">動画の終了</p>
              <div className="grid grid-cols-3 gap-1.5">
                {TRANSITION_TYPES.map((t) => (
                  <button key={t.value} onClick={() => { const newT = { ...transitionOut, type: t.value }; setTransitionOut(newT); pushHistory({ textOverlays, subtitles, silentSegments, videoUrl, stickers, filterSettings, transitionIn, transitionOut: newT }); }} className={`py-2 px-1 rounded-xl text-xs font-medium transition-all flex flex-col items-center gap-0.5 ${transitionOut.type===t.value?"bg-purple-600 text-white":"bg-gray-700 text-gray-300 hover:bg-gray-600"}`}>
                    <span className="text-base">{t.icon}</span><span>{t.label}</span>
                  </button>
                ))}
              </div>
              {transitionOut.type !== "none" && (
                <div>
                  <label className="text-[10px] text-gray-500 block mb-1">デュレーション ({transitionOut.duration.toFixed(1)}秒)</label>
                  <input type="range" min={0.3} max={2.0} step={0.1} value={transitionOut.duration} onChange={(e) => setTransitionOut((prev) => ({ ...prev, duration: parseFloat(e.target.value) }))} onPointerUp={pushCurrentHistory} className="w-full" />
                </div>
              )}
            </div>
            {(transitionIn.type !== "none" || transitionOut.type !== "none") && (
              <button onClick={handleApplyTransitions} disabled={processing} className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-bold hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 transition-all">
                {processing ? "適用中..." : "トランジションを適用"}
              </button>
            )}
          </div>
        )}

        {/* Sticker */}
        {activeTool === "sticker" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-200">スタンプ追加</h3>
            <p className="text-xs text-gray-500">絵文字スタンプを配置。<span className="text-indigo-400">キャンバスでドラッグ移動も可能です</span></p>
            <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-1">
              {STICKER_CATEGORIES.map((cat, idx) => (
                <button key={cat.label} onClick={() => setActiveStickerCategory(idx)} className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeStickerCategory===idx?"bg-indigo-600 text-white":"bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>{cat.label}</button>
              ))}
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {STICKER_CATEGORIES[activeStickerCategory].emojis.map((emoji) => (
                <button key={emoji} onClick={() => addSticker(emoji)} className="aspect-square flex items-center justify-center bg-gray-800 rounded-xl text-2xl hover:bg-gray-700 hover:scale-110 transition-all">{emoji}</button>
              ))}
            </div>
            {stickers.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-indigo-400 font-medium">配置済みスタンプ ({stickers.length})</p>
                <div className="space-y-2 max-h-[420px] overflow-y-auto">
                  {stickers.map((sticker) => (
                    <div key={sticker.id} className={`p-3 rounded-xl border transition-colors ${editingStickerId===sticker.id?"border-indigo-500 bg-gray-800":"border-gray-700 bg-gray-800/50"}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{sticker.emoji}</span>
                          <button onClick={() => setEditingStickerId(sticker.id===editingStickerId?null:sticker.id)} className="text-xs text-indigo-400">{sticker.id===editingStickerId?"閉じる":"編集"}</button>
                        </div>
                        <button onClick={() => deleteSticker(sticker.id)} className="text-xs text-red-400 hover:text-red-300">削除</button>
                      </div>
                      {editingStickerId !== sticker.id && <p className="text-[10px] text-gray-500">{formatTime(sticker.startTime)} - {formatTime(sticker.endTime)} / 位置 ({sticker.x}%, {sticker.y}%)</p>}
                      {editingStickerId === sticker.id && (
                        <div className="space-y-3">
                          <div>
                            <label className="text-[10px] text-gray-500 block mb-1">サイズ ({sticker.size}px)</label>
                            <input type="range" min={24} max={200} value={sticker.size} onChange={(e) => updateSticker(sticker.id, { size: parseInt(e.target.value) })} className="w-full" />
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-500 block mb-1">回転 ({sticker.rotation}°)</label>
                            <input type="range" min={0} max={360} value={sticker.rotation} onChange={(e) => updateSticker(sticker.id, { rotation: parseInt(e.target.value) })} className="w-full" />
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-500 block mb-1">不透明度 ({Math.round(sticker.opacity*100)}%)</label>
                            <input type="range" min={0} max={1} step={0.05} value={sticker.opacity} onChange={(e) => updateSticker(sticker.id, { opacity: parseFloat(e.target.value) })} className="w-full" />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-gray-500 block mb-1">X位置 ({sticker.x}%)</label>
                              <input type="range" min={0} max={100} value={sticker.x} onChange={(e) => updateSticker(sticker.id, { x: parseInt(e.target.value) })} className="w-full" />
                            </div>
                            <div>
                              <label className="text-[10px] text-gray-500 block mb-1">Y位置 ({sticker.y}%)</label>
                              <input type="range" min={0} max={100} value={sticker.y} onChange={(e) => updateSticker(sticker.id, { y: parseInt(e.target.value) })} className="w-full" />
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-500 block mb-1">位置プリセット</label>
                            <div className="grid grid-cols-3 gap-1">
                              {[{label:"左上",x:10,y:15},{label:"中央上",x:50,y:15},{label:"右上",x:85,y:15},{label:"左中",x:10,y:50},{label:"中央",x:50,y:50},{label:"右中",x:85,y:50},{label:"左下",x:10,y:85},{label:"中央下",x:50,y:85},{label:"右下",x:85,y:85}].map((pos) => (
                                <button key={pos.label} onClick={() => updateSticker(sticker.id, { x: pos.x, y: pos.y })} className="px-1 py-1.5 bg-gray-700 rounded text-[10px] text-gray-400 hover:bg-gray-600 hover:text-gray-200 transition-colors">{pos.label}</button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-500 block mb-1">アニメーション</label>
                            <div className="grid grid-cols-3 gap-1">
                              {([{value:"none",label:"なし"},{value:"bounce",label:"バウンス"},{value:"pulse",label:"パルス"},{value:"spin",label:"スピン"},{value:"float",label:"フロート"}] as const).map((anim) => (
                                <button key={anim.value} onClick={() => updateSticker(sticker.id, { animation: anim.value })} className={`py-1.5 rounded-lg text-[10px] font-medium transition-all ${sticker.animation===anim.value?"bg-indigo-600 text-white":"bg-gray-700 text-gray-300 hover:bg-gray-600"}`}>{anim.label}</button>
                              ))}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-gray-500 block mb-1">表示開始（秒）</label>
                              <input type="number" step={0.1} value={sticker.startTime} onChange={(e) => updateSticker(sticker.id, { startTime: parseFloat(e.target.value) })} className="w-full px-2 py-1.5 bg-gray-900 border border-gray-700 rounded text-xs text-white" />
                            </div>
                            <div>
                              <label className="text-[10px] text-gray-500 block mb-1">表示終了（秒）</label>
                              <input type="number" step={0.1} value={sticker.endTime} onChange={(e) => updateSticker(sticker.id, { endTime: parseFloat(e.target.value) })} className="w-full px-2 py-1.5 bg-gray-900 border border-gray-700 rounded text-xs text-white" />
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
        {/* Keyframe */}
        {activeTool === "keyframe" && (() => {
          const allTargets: { id: string; label: string; type: "text" | "sticker" }[] = [
            ...textOverlays.map((o) => ({ id: o.id, label: `T: ${o.text.slice(0, 14)}${o.text.length > 14 ? "…" : ""}`, type: "text" as const })),
            ...stickers.map((s) => ({ id: s.id, label: `${s.emoji} スタンプ`, type: "sticker" as const })),
          ];

          const getTarget = (id: string | null) => {
            if (!id) return null;
            const txt = textOverlays.find((o) => o.id === id);
            if (txt) return { obj: txt, type: "text" as const };
            const stk = stickers.find((s) => s.id === id);
            if (stk) return { obj: stk, type: "sticker" as const };
            return null;
          };

          const target = getTarget(selectedKeyframeTarget);
          const targetKeyframes: Keyframe[] = target ? (target.obj.keyframes || []) : [];
          const selectedKf = targetKeyframes.find((k) => k.id === selectedKeyframeId) ?? null;

          const updateTargetKeyframes = (id: string, kfs: Keyframe[]) => {
            const txt = textOverlays.find((o) => o.id === id);
            if (txt) { updateTextOverlay(id, { keyframes: kfs }); return; }
            const stk = stickers.find((s) => s.id === id);
            if (stk) { updateSticker(id, { keyframes: kfs }); }
          };

          const addKeyframeAtCurrentTime = () => {
            if (!selectedKeyframeTarget || !target) return;
            const newKf: Keyframe = {
              id: `kf-${Date.now()}`,
              time: currentTime,
              properties: {
                x: target.obj.x,
                y: target.obj.y,
                opacity: target.type === "sticker" ? Math.round((target.obj as StickerOverlay).opacity * 100) : 100,
                scale: 100,
                rotation: target.type === "sticker" ? (target.obj as StickerOverlay).rotation : 0,
              },
            };
            const newKfs = [...targetKeyframes, newKf].sort((a, b) => a.time - b.time);
            updateTargetKeyframes(selectedKeyframeTarget, newKfs);
            setSelectedKeyframeId(newKf.id);
          };

          const deleteSelectedKeyframe = () => {
            if (!selectedKeyframeTarget || !selectedKeyframeId) return;
            const newKfs = targetKeyframes.filter((k) => k.id !== selectedKeyframeId);
            updateTargetKeyframes(selectedKeyframeTarget, newKfs);
            setSelectedKeyframeId(null);
          };

          const updateSelectedKfProp = (prop: keyof KeyframeProperties, value: number) => {
            if (!selectedKeyframeTarget || !selectedKeyframeId) return;
            const newKfs = targetKeyframes.map((k) => k.id === selectedKeyframeId ? { ...k, properties: { ...k.properties, [prop]: value } } : k);
            updateTargetKeyframes(selectedKeyframeTarget, newKfs);
          };

          const applyPreset = (preset: { name: string; keyframes: { offsetRatio: number; props: KeyframeProperties }[] }) => {
            if (!selectedKeyframeTarget || !target) return;
            const startT = target.obj.startTime;
            const endT = target.obj.endTime;
            const dur = endT - startT;
            const newKfs: Keyframe[] = preset.keyframes.map((kfDef, i) => ({
              id: `kf-preset-${Date.now()}-${i}`,
              time: startT + kfDef.offsetRatio * dur,
              properties: kfDef.props,
            }));
            updateTargetKeyframes(selectedKeyframeTarget, newKfs);
            setSelectedKeyframeId(null);
          };

          const PRESETS = [
            { name: "左→右に移動", keyframes: [{ offsetRatio: 0, props: { x: 0, y: 50 } }, { offsetRatio: 1, props: { x: 100, y: 50 } }] },
            { name: "右→左に移動", keyframes: [{ offsetRatio: 0, props: { x: 100, y: 50 } }, { offsetRatio: 1, props: { x: 0, y: 50 } }] },
            { name: "上→下に移動", keyframes: [{ offsetRatio: 0, props: { x: 50, y: 0 } }, { offsetRatio: 1, props: { x: 50, y: 100 } }] },
            { name: "ズームイン", keyframes: [{ offsetRatio: 0, props: { scale: 50 } }, { offsetRatio: 1, props: { scale: 100 } }] },
            { name: "ズームアウト", keyframes: [{ offsetRatio: 0, props: { scale: 100 } }, { offsetRatio: 1, props: { scale: 50 } }] },
            { name: "回転", keyframes: [{ offsetRatio: 0, props: { rotation: 0 } }, { offsetRatio: 1, props: { rotation: 360 } }] },
            { name: "フェードイン→アウト", keyframes: [{ offsetRatio: 0, props: { opacity: 0 } }, { offsetRatio: 0.5, props: { opacity: 100 } }, { offsetRatio: 1, props: { opacity: 0 } }] },
            { name: "バウンス移動", keyframes: [{ offsetRatio: 0, props: { y: 20 } }, { offsetRatio: 0.25, props: { y: 80 } }, { offsetRatio: 0.5, props: { y: 30 } }, { offsetRatio: 0.75, props: { y: 70 } }, { offsetRatio: 1, props: { y: 50 } }] },
          ];

          const startT = target?.obj.startTime ?? 0;
          const endT = target?.obj.endTime ?? duration;
          const segDur = Math.max(0.01, endT - startT);

          return (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-200">キーフレームアニメーション</h3>
              <p className="text-xs text-gray-500">テキストやスタンプの位置・スケール・透明度などを時間ごとに変化させます</p>

              {/* Target selector */}
              <div>
                <label className="text-[10px] text-gray-500 block mb-1">アニメーション対象</label>
                {allTargets.length === 0 ? (
                  <p className="text-xs text-gray-600 py-3 text-center">テロップかスタンプを先に追加してください</p>
                ) : (
                  <select
                    value={selectedKeyframeTarget ?? ""}
                    onChange={(e) => { setSelectedKeyframeTarget(e.target.value || null); setSelectedKeyframeId(null); }}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white"
                  >
                    <option value="">-- 対象を選択 --</option>
                    {allTargets.map((t) => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                )}
              </div>

              {selectedKeyframeTarget && target && (
                <>
                  {/* Timeline visualization */}
                  <div className="bg-gray-800 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-500">タイムライン ({formatTime(startT)} - {formatTime(endT)})</span>
                      <button
                        onClick={addKeyframeAtCurrentTime}
                        className="text-xs px-3 py-1 bg-indigo-600 rounded-lg text-white hover:bg-indigo-500 font-medium"
                      >
                        ◆ キーフレーム追加
                      </button>
                    </div>
                    {/* Timeline bar */}
                    <div className="relative h-6 bg-gray-700 rounded-lg overflow-visible">
                      {/* Current time indicator */}
                      {currentTime >= startT && currentTime <= endT && (
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-red-400 z-10"
                          style={{ left: `${Math.min(100, Math.max(0, ((currentTime - startT) / segDur) * 100))}%` }}
                        />
                      )}
                      {/* Keyframe diamonds */}
                      {targetKeyframes.map((kf) => {
                        const pct = Math.min(100, Math.max(0, ((kf.time - startT) / segDur) * 100));
                        const isSelected = kf.id === selectedKeyframeId;
                        return (
                          <button
                            key={kf.id}
                            onClick={() => setSelectedKeyframeId(kf.id === selectedKeyframeId ? null : kf.id)}
                            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 text-xs leading-none transition-all z-20"
                            style={{ left: `${pct}%`, color: isSelected ? "#fbbf24" : "#6366f1", fontSize: "14px" }}
                            title={`${formatTime(kf.time)}`}
                          >
                            ◆
                          </button>
                        );
                      })}
                    </div>
                    {targetKeyframes.length === 0 && (
                      <p className="text-[10px] text-gray-600 text-center">キーフレームがありません。「追加」ボタンで追加してください</p>
                    )}
                    {targetKeyframes.length > 0 && (
                      <p className="text-[10px] text-gray-500">{targetKeyframes.length}個のキーフレーム　◆をクリックで選択・編集</p>
                    )}
                  </div>

                  {/* Keyframe property editor */}
                  {selectedKf && (
                    <div className="bg-gray-800 border border-indigo-700 rounded-xl p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-indigo-300">◆ {formatTime(selectedKf.time)} のキーフレーム</span>
                        <button onClick={deleteSelectedKeyframe} className="text-xs text-red-400 hover:text-red-300">削除</button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-gray-500 block mb-1">X位置 ({selectedKf.properties.x ?? "—"}%)</label>
                          <input type="range" min={0} max={100}
                            value={selectedKf.properties.x ?? 50}
                            onChange={(e) => updateSelectedKfProp("x", parseInt(e.target.value))}
                            className="w-full" />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-500 block mb-1">Y位置 ({selectedKf.properties.y ?? "—"}%)</label>
                          <input type="range" min={0} max={100}
                            value={selectedKf.properties.y ?? 50}
                            onChange={(e) => updateSelectedKfProp("y", parseInt(e.target.value))}
                            className="w-full" />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 block mb-1">スケール ({selectedKf.properties.scale ?? "—"}%)</label>
                        <input type="range" min={10} max={300}
                          value={selectedKf.properties.scale ?? 100}
                          onChange={(e) => updateSelectedKfProp("scale", parseInt(e.target.value))}
                          className="w-full" />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 block mb-1">不透明度 ({selectedKf.properties.opacity ?? "—"}%)</label>
                        <input type="range" min={0} max={100}
                          value={selectedKf.properties.opacity ?? 100}
                          onChange={(e) => updateSelectedKfProp("opacity", parseInt(e.target.value))}
                          className="w-full" />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 block mb-1">回転 ({selectedKf.properties.rotation ?? "—"}°)</label>
                        <input type="range" min={0} max={360}
                          value={selectedKf.properties.rotation ?? 0}
                          onChange={(e) => updateSelectedKfProp("rotation", parseInt(e.target.value))}
                          className="w-full" />
                      </div>
                      {targetKeyframes.length > 0 && (
                        <button
                          onClick={() => { updateTargetKeyframes(selectedKeyframeTarget, []); setSelectedKeyframeId(null); }}
                          className="w-full py-2 bg-gray-700 text-gray-300 rounded-lg text-xs hover:bg-gray-600 transition-colors"
                        >
                          全キーフレームをクリア
                        </button>
                      )}
                    </div>
                  )}

                  {/* Preset animations */}
                  <div>
                    <label className="text-xs text-gray-400 block mb-2">プリセットアニメーション（ワンタップ適用）</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {PRESETS.map((preset) => (
                        <button
                          key={preset.name}
                          onClick={() => applyPreset(preset)}
                          className="py-2 px-2 bg-gray-800 border border-gray-700 rounded-xl text-[11px] text-gray-300 hover:bg-indigo-600/20 hover:border-indigo-500 hover:text-indigo-300 transition-all text-left"
                        >
                          {preset.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Clear all keyframes for this target */}
                  {targetKeyframes.length > 0 && !selectedKf && (
                    <button
                      onClick={() => { updateTargetKeyframes(selectedKeyframeTarget, []); setSelectedKeyframeId(null); }}
                      className="w-full py-2 bg-gray-800 text-gray-400 rounded-xl text-xs hover:bg-gray-700 transition-colors"
                    >
                      全キーフレームをクリア
                    </button>
                  )}
                </>
              )}
            </div>
          );
        })()}

        {/* Mosaic */}
        {activeTool === "mosaic" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-200">モザイク・ぼかし</h3>
              <button onClick={addMosaicArea} className="text-xs px-3 py-1.5 bg-indigo-600 rounded-lg text-white hover:bg-indigo-500">+ 追加</button>
            </div>
            {/* Auto face detect */}
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-3 space-y-2">
              <p className="text-xs font-bold text-gray-200">🤖 自動顔検出モザイク</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleAutoFaceDetect}
                  disabled={processing}
                  className="py-2 bg-indigo-700 text-white rounded-lg text-xs font-medium hover:bg-indigo-600 disabled:opacity-50 transition-colors"
                >
                  📸 現在のフレームで検出
                </button>
                <button
                  onClick={handleFullScanFaces}
                  disabled={processing}
                  className="py-2 bg-purple-700 text-white rounded-lg text-xs font-medium hover:bg-purple-600 disabled:opacity-50 transition-colors"
                >
                  🎬 動画全体をスキャン
                </button>
              </div>
              <p className="text-[10px] text-gray-600">※Chrome最新版で利用可能</p>
            </div>
            <p className="text-xs text-gray-500">プレビューでモザイク範囲を確認できます。「動画に適用」でFFmpegで書き出します。</p>
            {mosaicAreas.length === 0 && <p className="text-xs text-gray-500 text-center py-6">「+ 追加」でモザイクエリアを設定できます</p>}
            {mosaicAreas.map((area) => (
              <div key={area.id} className={`p-3 rounded-xl border transition-colors ${editingMosaicId===area.id?"border-indigo-500 bg-gray-800":"border-gray-700 bg-gray-800/50"}`}>
                <div className="flex items-center justify-between mb-2">
                  <button onClick={() => setEditingMosaicId(area.id===editingMosaicId?null:area.id)} className="text-xs text-indigo-400">{area.id===editingMosaicId?"閉じる":"編集"}</button>
                  <button onClick={() => deleteMosaicArea(area.id)} className="text-xs text-red-400 hover:text-red-300">削除</button>
                </div>
                {editingMosaicId !== area.id && (
                  <p className="text-[10px] text-gray-500">{area.type === "mosaic" ? "モザイク" : area.type === "blur" ? "ぼかし" : "黒塗り"} / 位置({area.x}%,{area.y}%) / サイズ({area.width}%×{area.height}%)</p>
                )}
                {editingMosaicId === area.id && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] text-gray-500 block mb-1">種類</label>
                      <div className="grid grid-cols-3 gap-1">
                        {([{value:"mosaic",label:"モザイク"},{value:"blur",label:"ぼかし"},{value:"black",label:"黒塗り"}] as const).map((t) => (
                          <button key={t.value} onClick={() => updateMosaicArea(area.id, { type: t.value })} className={`py-2 rounded-lg text-xs font-medium transition-all ${area.type===t.value?"bg-indigo-600 text-white":"bg-gray-700 text-gray-300 hover:bg-gray-600"}`}>{t.label}</button>
                        ))}
                      </div>
                    </div>
                    {area.type !== "black" && (
                      <div>
                        <label className="text-[10px] text-gray-500 block mb-1">強度 ({area.intensity})</label>
                        <input type="range" min={1} max={area.type==="blur"?30:20} value={area.intensity} onChange={(e) => updateMosaicArea(area.id, { intensity: parseInt(e.target.value) })} className="w-full" />
                      </div>
                    )}
                    <div>
                      <label className="text-[10px] text-gray-500 block mb-1">位置プリセット</label>
                      <div className="grid grid-cols-2 gap-1">
                        {[{label:"中央",x:35,y:35,w:30,h:30},{label:"顔エリア",x:35,y:10,w:30,h:30},{label:"上部バー",x:0,y:0,w:100,h:15},{label:"下部バー",x:0,y:85,w:100,h:15}].map((pos) => (
                          <button key={pos.label} onClick={() => updateMosaicArea(area.id, { x:pos.x, y:pos.y, width:pos.w, height:pos.h })} className="py-1.5 bg-gray-700 rounded text-[10px] text-gray-400 hover:bg-gray-600 transition-colors">{pos.label}</button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-gray-500 block mb-1">X位置 ({area.x}%)</label>
                        <input type="range" min={0} max={95} value={area.x} onChange={(e) => updateMosaicArea(area.id, { x: parseInt(e.target.value) })} className="w-full" />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 block mb-1">Y位置 ({area.y}%)</label>
                        <input type="range" min={0} max={95} value={area.y} onChange={(e) => updateMosaicArea(area.id, { y: parseInt(e.target.value) })} className="w-full" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-gray-500 block mb-1">幅 ({area.width}%)</label>
                        <input type="range" min={5} max={100} value={area.width} onChange={(e) => updateMosaicArea(area.id, { width: parseInt(e.target.value) })} className="w-full" />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 block mb-1">高さ ({area.height}%)</label>
                        <input type="range" min={5} max={100} value={area.height} onChange={(e) => updateMosaicArea(area.id, { height: parseInt(e.target.value) })} className="w-full" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-gray-500 block mb-1">開始時間（秒）</label>
                        <input type="number" step={0.1} value={area.startTime} onChange={(e) => updateMosaicArea(area.id, { startTime: parseFloat(e.target.value) })} className="w-full px-2 py-1.5 bg-gray-900 border border-gray-700 rounded text-xs text-white" />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 block mb-1">終了時間（秒）</label>
                        <input type="number" step={0.1} value={area.endTime} onChange={(e) => updateMosaicArea(area.id, { endTime: parseFloat(e.target.value) })} className="w-full px-2 py-1.5 bg-gray-900 border border-gray-700 rounded text-xs text-white" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {mosaicAreas.length > 0 && (
              <button onClick={handleApplyMosaic} disabled={processing} className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-500 disabled:opacity-50 transition-colors">
                {processing ? "適用中..." : "動画に適用"}
              </button>
            )}
          </div>
        )}

        {/* Chroma Key */}
        {activeTool === "chromakey" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-200">クロマキー合成</h3>
            <p className="text-xs text-gray-500">グリーンバック等の単色背景を透過して別の背景と合成します</p>
            <div>
              <label className="text-xs text-gray-400 block mb-2">キーカラー（除去する色）</label>
              <div className="flex gap-2 items-center">
                <input type="color" value={chromaKey.keyColor} onChange={(e) => setChromaKey((p) => ({ ...p, keyColor: e.target.value }))} className="w-12 h-10 rounded cursor-pointer border border-gray-700" />
                {[{label:"緑",color:"#00ff00"},{label:"青",color:"#0000ff"},{label:"白",color:"#ffffff"},{label:"黒",color:"#000000"}].map((c) => (
                  <button key={c.color} onClick={() => setChromaKey((p) => ({ ...p, keyColor: c.color }))} className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${chromaKey.keyColor===c.color?"border-indigo-400 bg-indigo-600/20 text-indigo-300":"border-gray-600 text-gray-400 hover:bg-gray-700"}`}>{c.label}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">許容範囲 ({chromaKey.similarity.toFixed(2)})</label>
              <input type="range" min={0.01} max={0.5} step={0.01} value={chromaKey.similarity} onChange={(e) => setChromaKey((p) => ({ ...p, similarity: parseFloat(e.target.value) }))} className="w-full" />
              <div className="flex justify-between text-[10px] text-gray-600"><span>狭い（精密）</span><span>広い（大まか）</span></div>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">エッジブレンド ({chromaKey.blend.toFixed(2)})</label>
              <input type="range" min={0} max={1} step={0.01} value={chromaKey.blend} onChange={(e) => setChromaKey((p) => ({ ...p, blend: parseFloat(e.target.value) }))} className="w-full" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-2">背景ファイル（画像または動画）</label>
              <button onClick={() => chromaBgInputRef.current?.click()} className="w-full p-4 border-2 border-dashed border-gray-700 rounded-xl text-center hover:border-indigo-500 transition-colors">
                <span className="text-2xl block mb-1">🖼</span>
                <span className="text-xs text-gray-400">{chromaKey.bgFile ? chromaKey.bgFile.name : "背景ファイルを選択（画像/動画）"}</span>
              </button>
              <input ref={chromaBgInputRef} type="file" accept="image/*,video/*" onChange={handleChromaBgSelect} className="hidden" />
              {chromaKey.bgUrl && (
                <div className="mt-2 rounded-xl overflow-hidden">
                  {chromaKey.bgFile?.type.startsWith("image/")
                    ? <img src={chromaKey.bgUrl} className="w-full h-24 object-cover" alt="背景プレビュー" />
                    : <video src={chromaKey.bgUrl} className="w-full h-24 object-cover" muted />
                  }
                </div>
              )}
            </div>
            <button onClick={handleApplyChromaKey} disabled={processing || !chromaKey.bgFile} className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-500 disabled:opacity-50 transition-colors">
              {processing ? "合成中..." : "クロマキーを適用"}
            </button>
          </div>
        )}
        {/* Logo */}
        {activeTool === "logo" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-200">ロゴ・透かし挿入</h3>
            <p className="text-xs text-gray-500">院のロゴや透かしを動画に合成します。書き出し時に焼き込まれます。</p>
            {/* Logo upload */}
            <div>
              <label className="text-xs text-gray-400 block mb-2">ロゴ画像</label>
              <button onClick={() => logoFileInputRef.current?.click()} className="w-full p-4 border-2 border-dashed border-gray-700 rounded-xl text-center hover:border-teal-500 transition-colors">
                <span className="text-2xl block mb-1">🏷</span>
                <span className="text-xs text-gray-400">{logoSettings.file ? logoSettings.file.name : "ロゴ画像を選択（PNG推奨）"}</span>
              </button>
              <input ref={logoFileInputRef} type="file" accept="image/*" onChange={handleLogoFileSelect} className="hidden" />
              {logoSettings.url && (
                <div className="mt-2 flex justify-center bg-gray-800 rounded-xl p-3">
                  <img src={logoSettings.url} className="max-h-20 object-contain" alt="ロゴプレビュー" />
                </div>
              )}
            </div>
            {/* Position selector */}
            <div>
              <label className="text-xs text-gray-400 block mb-2">表示位置</label>
              <div className="grid grid-cols-3 gap-1 w-36 mx-auto">
                {([
                  { pos: "top-left" as LogoPosition, label: "↖" },
                  { pos: null, label: "" },
                  { pos: "top-right" as LogoPosition, label: "↗" },
                  { pos: null, label: "" },
                  { pos: "center" as LogoPosition, label: "⊙" },
                  { pos: null, label: "" },
                  { pos: "bottom-left" as LogoPosition, label: "↙" },
                  { pos: null, label: "" },
                  { pos: "bottom-right" as LogoPosition, label: "↘" },
                ]).map((item, i) => (
                  <button
                    key={i}
                    onClick={() => item.pos && setLogoSettings((p) => ({ ...p, position: item.pos! }))}
                    disabled={!item.pos}
                    className={`h-10 w-10 rounded-lg text-sm font-bold transition-all ${!item.pos ? "opacity-0 pointer-events-none" : logoSettings.position === item.pos ? "bg-teal-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Size slider */}
            <div>
              <label className="text-xs text-gray-400 block mb-1">サイズ（動画幅の {logoSettings.size}%）</label>
              <input type="range" min={5} max={30} step={1} value={logoSettings.size} onChange={(e) => setLogoSettings((p) => ({ ...p, size: parseInt(e.target.value) }))} className="w-full" />
              <div className="flex justify-between text-[10px] text-gray-600"><span>小（5%）</span><span>大（30%）</span></div>
            </div>
            {/* Opacity slider */}
            <div>
              <label className="text-xs text-gray-400 block mb-1">不透明度 {logoSettings.opacity}%</label>
              <input type="range" min={0} max={100} step={5} value={logoSettings.opacity} onChange={(e) => setLogoSettings((p) => ({ ...p, opacity: parseInt(e.target.value) }))} className="w-full" />
              <div className="flex justify-between text-[10px] text-gray-600"><span>透明</span><span>不透明</span></div>
            </div>
            {/* Margin slider */}
            <div>
              <label className="text-xs text-gray-400 block mb-1">余白 {logoSettings.margin}px</label>
              <input type="range" min={10} max={50} step={2} value={logoSettings.margin} onChange={(e) => setLogoSettings((p) => ({ ...p, margin: parseInt(e.target.value) }))} className="w-full" />
            </div>
            {/* Auto apply toggle label */}
            <div className="flex items-center gap-2 bg-gray-800 rounded-xl px-3 py-2">
              <div className="w-9 h-5 bg-teal-600 rounded-full relative cursor-default">
                <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full" />
              </div>
              <span className="text-xs text-gray-300">全動画に自動適用</span>
            </div>
            {/* Apply button */}
            <button onClick={handleApplyLogoExport} disabled={processing || !logoSettings.file} className="w-full py-3 bg-teal-600 text-white rounded-xl text-sm font-bold hover:bg-teal-500 disabled:opacity-50 transition-colors">
              {processing ? "合成中..." : "ロゴを動画に焼き込む"}
            </button>
            {/* Delete button */}
            {logoSettings.file && (
              <button onClick={() => setLogoSettings((p) => ({ ...p, file: null, url: "" }))} className="w-full py-2 bg-gray-800 text-red-400 rounded-xl text-xs hover:bg-gray-700 transition-colors">
                ロゴを削除
              </button>
            )}
          </div>
        )}
        {/* Collage */}
        {activeTool === "collage" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-200">コラージュ動画</h3>
            <p className="text-xs text-gray-500">複数の動画を分割画面で同時再生します。</p>
            <div>
              <label className="text-xs text-gray-400 block mb-2">レイアウト</label>
              <div className="grid grid-cols-3 gap-2">
                {COLLAGE_LAYOUT_OPTIONS.map((opt) => (
                  <button key={opt.key} onClick={() => handleCollageLayoutChange(opt.key, opt.count)} className={`py-2 px-1 rounded-xl text-xs font-medium transition-all ${collageSettings.layout===opt.key?"bg-indigo-600 text-white":"bg-gray-800 text-gray-300 hover:bg-gray-700"}`}>{opt.label}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-2">動画スロット</label>
              <div className="grid grid-cols-2 gap-2">
                {collageSettings.items.map((item, index) => (
                  <div key={item.id} className="relative">
                    <button onClick={() => collageFileRefs.current[index]?.click()} className="w-full aspect-video bg-gray-800 border-2 border-dashed border-gray-600 rounded-xl flex flex-col items-center justify-center hover:border-indigo-500 transition-colors overflow-hidden">
                      {item.url ? <video src={item.url} className="w-full h-full object-cover" muted /> : <><span className="text-2xl">+</span><span className="text-[10px] text-gray-500 mt-1">動画 {index+1}</span></>}
                    </button>
                    <input type="file" accept="video/*" className="hidden" ref={(el) => { collageFileRefs.current[index] = el; }} onChange={(e) => { const f=e.target.files?.[0]; if(f) handleCollageFileSelect(index,f); e.target.value=""; }} />
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">ボーダー幅 ({collageSettings.borderWidth}px)</label>
                <input type="range" min={0} max={10} value={collageSettings.borderWidth} onChange={(e) => setCollageSettings((p) => ({ ...p, borderWidth: parseInt(e.target.value) }))} className="w-full" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">ボーダー色</label>
                <input type="color" value={collageSettings.borderColor} onChange={(e) => setCollageSettings((p) => ({ ...p, borderColor: e.target.value }))} className="w-full h-8 rounded border border-gray-700 cursor-pointer" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">出力時間 ({collageSettings.outputDuration}秒)</label>
              <input type="range" min={1} max={60} value={collageSettings.outputDuration} onChange={(e) => setCollageSettings((p) => ({ ...p, outputDuration: parseInt(e.target.value) }))} className="w-full" />
            </div>
            <button onClick={handleCreateCollage} disabled={processing} className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-500 disabled:opacity-50 transition-colors">
              {processing ? "作成中..." : "コラージュを作成"}
            </button>
          </div>
        )}

        {/* Slideshow */}
        {activeTool === "slideshow" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-200">スライドショー</h3>
            <button onClick={() => slideshowFileInputRef.current?.click()} className="w-full p-4 border-2 border-dashed border-gray-700 rounded-xl text-center hover:border-indigo-500 transition-colors">
              <span className="text-2xl block mb-1">🖼</span>
              <span className="text-xs text-gray-400">画像をアップロード（複数選択可）</span>
            </button>
            <input ref={slideshowFileInputRef} type="file" accept="image/*" multiple onChange={handleSlideshowImagesUpload} className="hidden" />
            {slideshowSettings.images.length > 0 && (
              <>
                <p className="text-xs text-indigo-400">合計時間: {slideshowSettings.images.reduce((s,img)=>s+img.duration,0).toFixed(1)}秒 ({slideshowSettings.images.length}枚)</p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {slideshowSettings.images.map((img, index) => (
                    <div key={img.id} className="flex items-center gap-2 bg-gray-800 rounded-xl p-2">
                      <img src={img.url} className="w-12 h-9 object-cover rounded" alt="" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-gray-500 truncate">{img.file.name}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-[10px] text-gray-500 w-12">{img.duration}秒</span>
                          <input type="range" min={0.5} max={10} step={0.5} value={img.duration} onChange={(e) => handleSlideshowImageDuration(img.id, parseFloat(e.target.value))} className="flex-1" />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <button onClick={() => handleSlideshowImageMove(index,"up")} disabled={index===0} className="w-5 h-5 bg-gray-700 rounded text-gray-400 text-[10px] disabled:opacity-30 hover:bg-gray-600">↑</button>
                        <button onClick={() => handleSlideshowImageMove(index,"down")} disabled={index===slideshowSettings.images.length-1} className="w-5 h-5 bg-gray-700 rounded text-gray-400 text-[10px] disabled:opacity-30 hover:bg-gray-600">↓</button>
                      </div>
                      <button onClick={() => handleSlideshowImageDelete(img.id)} className="w-6 h-6 bg-red-900/50 rounded text-red-400 text-xs hover:bg-red-800/50">×</button>
                    </div>
                  ))}
                </div>
              </>
            )}
            <div>
              <label className="text-xs text-gray-400 block mb-2">トランジション</label>
              <div className="grid grid-cols-3 gap-1.5">
                {([{value:"none",label:"なし"},{value:"fade",label:"フェード"},{value:"crossfade",label:"クロスフェード"}] as const).map((t) => (
                  <button key={t.value} onClick={() => setSlideshowSettings((p) => ({ ...p, transition: t.value }))} className={`py-2 rounded-xl text-xs font-medium transition-all ${slideshowSettings.transition===t.value?"bg-indigo-600 text-white":"bg-gray-800 text-gray-300 hover:bg-gray-700"}`}>{t.label}</button>
                ))}
              </div>
            </div>
            <button onClick={handleCreateSlideshow} disabled={processing || slideshowSettings.images.length===0} className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-500 disabled:opacity-50 transition-colors">
              {processing ? "作成中..." : "スライドショーを作成"}
            </button>
          </div>
        )}

        {/* PiP */}
        {activeTool === "pip" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-200">ワイプ (ピクチャーインピクチャー)</h3>
            <button onClick={() => pipFileInputRef.current?.click()} className="w-full p-4 border-2 border-dashed border-gray-700 rounded-xl text-center hover:border-indigo-500 transition-colors">
              <span className="text-2xl block mb-1">📺</span>
              <span className="text-xs text-gray-400">{pipSettings.file ? pipSettings.file.name : "ワイプ動画を選択"}</span>
            </button>
            <input ref={pipFileInputRef} type="file" accept="video/*" onChange={handlePipFileSelect} className="hidden" />
            <div>
              <label className="text-xs text-gray-400 block mb-2">表示位置</label>
              <div className="grid grid-cols-2 gap-2 w-40 mx-auto">
                {([{value:"top-left",label:"左上"},{value:"top-right",label:"右上"},{value:"bottom-left",label:"左下"},{value:"bottom-right",label:"右下"}] as const).map((pos) => (
                  <button key={pos.value} onClick={() => setPipSettings((p) => ({ ...p, position: pos.value }))} className={`py-2 rounded-xl text-xs font-medium transition-all ${pipSettings.position===pos.value?"bg-indigo-600 text-white":"bg-gray-800 text-gray-300 hover:bg-gray-700"}`}>{pos.label}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">サイズ ({pipSettings.size}%)</label>
              <input type="range" min={15} max={50} value={pipSettings.size} onChange={(e) => setPipSettings((p) => ({ ...p, size: parseInt(e.target.value) }))} className="w-full" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">ボーダー幅 ({pipSettings.borderWidth}px)</label>
                <input type="range" min={0} max={10} value={pipSettings.borderWidth} onChange={(e) => setPipSettings((p) => ({ ...p, borderWidth: parseInt(e.target.value) }))} className="w-full" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">ボーダー色</label>
                <input type="color" value={pipSettings.borderColor} onChange={(e) => setPipSettings((p) => ({ ...p, borderColor: e.target.value }))} className="w-full h-8 rounded border border-gray-700 cursor-pointer" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-400 block mb-1">開始時間（秒）</label>
                <input type="number" step={0.1} min={0} value={pipSettings.startTime} onChange={(e) => setPipSettings((p) => ({ ...p, startTime: parseFloat(e.target.value)||0 }))} className="w-full px-2 py-1.5 bg-gray-900 border border-gray-700 rounded text-xs text-white" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">終了時間（秒）</label>
                <input type="number" step={0.1} min={0} placeholder={`${duration.toFixed(1)}`} value={pipSettings.endTime||""} onChange={(e) => setPipSettings((p) => ({ ...p, endTime: parseFloat(e.target.value)||0 }))} className="w-full px-2 py-1.5 bg-gray-900 border border-gray-700 rounded text-xs text-white" />
              </div>
            </div>
            <button onClick={handleApplyPip} disabled={processing||!videoFile||!pipSettings.file} className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-500 disabled:opacity-50 transition-colors">
              {processing ? "適用中..." : "ワイプを適用"}
            </button>
          </div>
        )}

        {/* Endcard */}
        {activeTool === "endcard" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-200">エンドカード / CTAカード</h3>
            <p className="text-xs text-gray-400">動画の最後8秒間に自動配置されます。院プロフィールを設定すると院名が自動挿入されます。</p>
            {/* 自動イントロ */}
            <div className="space-y-2 pb-3 border-b border-gray-800">
              <p className="text-xs font-medium text-indigo-400">イントロ（冒頭3秒）</p>
              {[
                { label: "院名イントロ", desc: "院名をフェードインで表示", textContent: clinicProfile?.clinicName || "院名を設定してください", sub: clinicProfile?.area || "", style: { x: 50, y: 45, fontSize: 28, color: "#ffffff", bgColor: "transparent", bold: true, outlineWidth: 3, outlineColor: "#000000" } },
                { label: "専門性アピール", desc: "得意症状＋院名", textContent: `${clinicProfile?.specialties?.[0] || "専門"}のプロフェッショナル`, sub: clinicProfile?.clinicName || "", style: { x: 50, y: 40, fontSize: 22, color: "#ffffff", bgColor: "rgba(79,70,229,0.85)", bold: true, outlineWidth: 0, outlineColor: "#000000" } },
                { label: "キャッチコピー", desc: "信頼＋実績のイントロ", textContent: clinicProfile?.achievements || "年間2,000人以上の施術実績", sub: clinicProfile?.clinicName || "", style: { x: 50, y: 40, fontSize: 20, color: "#FFD700", bgColor: "rgba(0,0,0,0.8)", bold: true, outlineWidth: 2, outlineColor: "#000000" } },
              ].map((intro, i) => (
                <button key={i} onClick={() => {
                  const introOverlays: TextOverlay[] = [
                    { id: `intro-main-${Date.now()}`, text: intro.textContent, x: intro.style.x, y: intro.style.y, fontSize: intro.style.fontSize, fontFamily: "sans-serif", color: intro.style.color, bgColor: intro.style.bgColor, startTime: 0, endTime: 3, bold: intro.style.bold, italic: false, outlineColor: intro.style.outlineColor, outlineWidth: intro.style.outlineWidth, shadowColor: "rgba(0,0,0,0.8)", shadowBlur: 10, shadowOffsetX: 0, shadowOffsetY: 2, animation: "fade-in", keyframes: [] },
                  ];
                  if (intro.sub) {
                    introOverlays.push({ id: `intro-sub-${Date.now()}`, text: intro.sub, x: 50, y: intro.style.y + 10, fontSize: 16, fontFamily: "sans-serif", color: "#cccccc", bgColor: "transparent", startTime: 0.5, endTime: 3, bold: false, italic: false, outlineColor: "#000000", outlineWidth: 2, shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, animation: "fade-in", keyframes: [] });
                  }
                  const newOverlays = [...textOverlays, ...introOverlays];
                  setTextOverlays(newOverlays);
                  pushHistory({ textOverlays: newOverlays, subtitles, silentSegments, videoUrl, stickers, filterSettings, transitionIn, transitionOut });
                }}
                  className="w-full text-left p-2.5 bg-indigo-900/20 rounded-lg hover:bg-indigo-900/40 transition-colors border border-indigo-800/30 hover:border-indigo-500">
                  <p className="text-[11px] font-medium text-indigo-300">{intro.label}</p>
                  <p className="text-[9px] text-gray-500">{intro.desc}</p>
                </button>
              ))}
            </div>
            {/* エンドカード */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-orange-400">エンドカード（末尾8秒）</p>
              {ENDCARD_TEMPLATES.map((tmpl, i) => (
                <button key={tmpl.id} onClick={() => handleApplyEndcard(i)}
                  className="w-full text-left p-3 bg-gray-800 rounded-xl hover:bg-gray-700 transition-colors border border-gray-700 hover:border-indigo-500">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{tmpl.stickers[0]?.emoji || "🔚"}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-200">{tmpl.name}</p>
                      <p className="text-[11px] text-gray-500">{tmpl.desc}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            {/* QRコード生成（LINE/予約URL） */}
            {(clinicProfile?.lineUrl || clinicProfile?.bookingUrl) && (
              <div className="mt-3 p-3 bg-gray-800 rounded-xl space-y-2">
                <p className="text-xs font-bold text-gray-200">📱 QRコード生成</p>
                <p className="text-[9px] text-gray-500">エンドカードにQRコードを表示。視聴者がスマホで読み取って予約・LINE登録できます</p>
                <div className="space-y-1.5">
                  {clinicProfile?.lineUrl && (
                    <button
                      onClick={() => {
                        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(clinicProfile.lineUrl)}`;
                        const id = `qr-line-${Date.now()}`;
                        const newSticker: StickerOverlay = {
                          id, emoji: "📱", x: 80, y: 30, size: 60, rotation: 0,
                          startTime: Math.max(0, (duration || 10) - 8), endTime: duration || 10,
                          opacity: 1, animation: "none", keyframes: [],
                        };
                        const ns = [...stickers, newSticker];
                        setStickers(ns);
                        const lineText: TextOverlay = {
                          id: `qr-line-text-${Date.now()}`, text: `LINE登録はこちら→\n${clinicProfile.lineUrl}`,
                          x: 80, y: 45, fontSize: 14, fontFamily: "sans-serif",
                          color: "#06C755", bgColor: "rgba(0,0,0,0.8)",
                          startTime: Math.max(0, (duration || 10) - 8), endTime: duration || 10,
                          bold: true, italic: false,
                          outlineColor: "#000000", outlineWidth: 0,
                          shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0,
                          animation: "fade-in", keyframes: [],
                        };
                        const newOverlays = [...textOverlays, lineText];
                        setTextOverlays(newOverlays);
                        pushHistory({ textOverlays: newOverlays, subtitles, silentSegments, videoUrl, stickers: ns, filterSettings, transitionIn, transitionOut });
                      }}
                      className="w-full py-2 bg-[#06C755]/20 border border-[#06C755]/40 text-[#06C755] rounded-lg text-xs font-medium hover:bg-[#06C755]/30 transition-colors"
                    >
                      LINE QRコード + テロップを挿入
                    </button>
                  )}
                  {clinicProfile?.bookingUrl && (
                    <button
                      onClick={() => {
                        const bookingText: TextOverlay = {
                          id: `qr-booking-${Date.now()}`, text: `ご予約はこちら→\n${clinicProfile.bookingUrl}`,
                          x: 80, y: 55, fontSize: 14, fontFamily: "sans-serif",
                          color: "#ffffff", bgColor: "rgba(79,70,229,0.9)",
                          startTime: Math.max(0, (duration || 10) - 8), endTime: duration || 10,
                          bold: true, italic: false,
                          outlineColor: "#000000", outlineWidth: 0,
                          shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0,
                          animation: "fade-in", keyframes: [],
                        };
                        const newOverlays = [...textOverlays, bookingText];
                        setTextOverlays(newOverlays);
                        pushHistory({ textOverlays: newOverlays, subtitles, silentSegments, videoUrl, stickers, filterSettings, transitionIn, transitionOut });
                      }}
                      className="w-full py-2 bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 rounded-lg text-xs font-medium hover:bg-indigo-600/30 transition-colors"
                    >
                      予約URL テロップを挿入
                    </button>
                  )}
                </div>
              </div>
            )}
            {duration > 0 && (
              <p className="text-[10px] text-gray-600 text-center">
                配置範囲: {Math.max(0, duration - 8).toFixed(1)}秒 〜 {duration.toFixed(1)}秒
              </p>
            )}
          </div>
        )}

        {/* Export */}
        {activeTool === "export" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-200">SNS向け書き出し</h3>
            <div className="grid grid-cols-2 gap-2">
              {ASPECT_PRESETS.map((preset, i) => (
                <button key={preset.label} onClick={() => setSelectedPresetIdx(i)} className={`p-3 rounded-xl border text-left transition-all ${selectedPresetIdx===i?"border-indigo-500 bg-indigo-500/10":"border-gray-700 bg-gray-800/50 hover:border-gray-600"}`}>
                  <p className="text-sm font-medium text-gray-200">{preset.label}</p>
                  <p className="text-[10px] text-gray-500">{preset.width}x{preset.height} ({preset.ratio})</p>
                </button>
              ))}
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">画質</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(["high", "medium", "low"] as const).map((q) => (
                  <button key={q} onClick={() => setExportQuality(q)} className={`p-2 rounded-lg text-left transition-all border ${exportQuality === q ? "border-indigo-500 bg-indigo-500/10" : "border-gray-700 bg-gray-800/50 hover:border-gray-600"}`}>
                    <p className="text-[11px] font-medium text-gray-200">{EXPORT_QUALITY_MAP[q].label}</p>
                    <p className="text-[9px] text-gray-500">{EXPORT_QUALITY_MAP[q].desc}</p>
                  </button>
                ))}
              </div>
            </div>
            {/* コンプライアンスチェッカー */}
            {(() => {
              const warnings: string[] = [];
              const hasLegalText = textOverlays.some((t) => t.text.includes("個人差") || t.text.includes("効果を保証") || t.text.includes("施術内容"));
              const hasBaContent = textOverlays.some((t) => t.text.includes("ビフォー") || t.text.includes("アフター") || t.text.includes("Before") || t.text.includes("After"));
              if (hasBaContent && !hasLegalText) warnings.push("ビフォーアフター内容がありますが法的注意事項テロップが未設定です");
              if (duration > 0 && duration < 15 && hasBaContent) warnings.push("15秒未満のBA動画は広告審査で不利になる可能性があります");
              if (!clinicProfile?.clinicName) warnings.push("院プロフィールが未設定です（院名・連絡先の自動挿入が無効）");
              if (subtitles.length === 0 && duration > 30) warnings.push("30秒以上の動画に字幕が未設定です（アクセシビリティ・SEO低下）");
              return warnings.length > 0 ? (
                <div className="p-3 bg-yellow-950/30 border border-yellow-800/50 rounded-xl space-y-1">
                  <p className="text-[11px] font-bold text-yellow-400 flex items-center gap-1">⚠️ エクスポート前チェック</p>
                  {warnings.map((w, i) => <p key={i} className="text-[10px] text-yellow-400/80">・{w}</p>)}
                </div>
              ) : (
                <div className="p-2 bg-green-950/30 border border-green-800/50 rounded-xl">
                  <p className="text-[10px] text-green-400 text-center">✅ コンプライアンスチェック問題なし</p>
                </div>
              );
            })()}
            <button onClick={handleExport} disabled={processing} className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-bold hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 transition-all">
              {processing ? "エクスポート中..." : `${ASPECT_PRESETS[selectedPresetIdx].label}用にエクスポート`}
            </button>
            {/* マルチプラットフォーム一括書き出し */}
            <button
              onClick={async () => {
                if (!videoFile || processing) return;
                setProcessing(true);
                try {
                  if (!await ensureFFmpeg()) return;
                  for (let i = 0; i < ASPECT_PRESETS.length; i++) {
                    const p = ASPECT_PRESETS[i];
                    setProgressMsg(`${p.label} (${i+1}/${ASPECT_PRESETS.length}) エクスポート中...`);
                    const blob = await exportWithAspectRatio(videoFile, p.width, p.height, setProgressMsg, EXPORT_QUALITY_MAP[exportQuality].bitrate);
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a"); a.href = url; a.download = `videoforge_${p.platform}_${Date.now()}.mp4`; a.click();
                    URL.revokeObjectURL(url);
                  }
                  setProgressMsg("全プラットフォーム一括エクスポート完了!");
                } catch (e) { setProgressMsg(`一括エクスポートに失敗: ${e instanceof Error ? e.message : "不明なエラー"}`); console.error("batch export error:", e); } finally { setProcessing(false); }
              }}
              disabled={processing}
              className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-xs font-bold hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 transition-all"
            >
              {processing ? "処理中..." : "🚀 全プラットフォーム一括書き出し（YouTube + Reels + Instagram）"}
            </button>
            <button onClick={handleDownloadOriginal} className="w-full py-3 bg-gray-800 text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors">オリジナルサイズでダウンロード</button>
            <div className="pt-2 border-t border-gray-800">
              <h4 className="text-sm font-bold text-gray-200 mb-1">GIF書き出し</h4>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">開始時間（秒）</label>
                    <input type="number" step={0.1} min={0} value={gifStart} onChange={(e) => setGifStart(parseFloat(e.target.value)||0)} className="w-full px-2 py-1.5 bg-gray-900 border border-gray-700 rounded text-xs text-white" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">終了時間（秒）</label>
                    <input type="number" step={0.1} min={0} value={gifEnd} onChange={(e) => setGifEnd(parseFloat(e.target.value)||10)} className="w-full px-2 py-1.5 bg-gray-900 border border-gray-700 rounded text-xs text-white" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">FPS ({gifFps})</label>
                  <input type="range" min={5} max={30} value={gifFps} onChange={(e) => setGifFps(parseInt(e.target.value))} className="w-full" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">横幅 ({gifWidth}px)</label>
                  <input type="range" min={240} max={720} step={10} value={gifWidth} onChange={(e) => setGifWidth(parseInt(e.target.value))} className="w-full" />
                </div>
                <button onClick={handleExportGif} disabled={processing} className="w-full py-3 bg-green-700 text-white rounded-xl text-sm font-bold hover:bg-green-600 disabled:opacity-50 transition-colors">
                  {processing ? "GIF作成中..." : "GIFで書き出す"}
                </button>
              </div>
            </div>

            {/* Thumbnail Generation */}
            <div className="pt-2 border-t border-gray-800">
              <h4 className="text-sm font-bold text-gray-200 mb-2">サムネイル生成</h4>
              <div className="space-y-3">
                <button
                  onClick={extractThumbnailFrames}
                  disabled={thumbnailGenerating || !duration}
                  className="w-full py-2 bg-gray-800 text-gray-300 rounded-xl text-xs font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
                >
                  {thumbnailGenerating ? "フレームを抽出中..." : "ベストシーンを選択（7カット自動抽出）"}
                </button>
                {thumbnailFrames.length > 0 && (
                  <div className="grid grid-cols-4 gap-1.5">
                    {thumbnailFrames.map((frame, i) => (
                      <div
                        key={i}
                        onClick={() => setSelectedThumbnailFrame(i)}
                        className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${selectedThumbnailFrame === i ? "border-indigo-500 ring-1 ring-indigo-400" : "border-gray-700 hover:border-gray-500"}`}
                      >
                        <img src={frame} alt={`フレーム${i + 1}`} className="w-full h-auto" />
                      </div>
                    ))}
                  </div>
                )}
                <div>
                  <label className="text-xs text-gray-400 block mb-1">サムネイルテキスト</label>
                  <input
                    type="text"
                    value={thumbnailText}
                    onChange={(e) => setThumbnailText(e.target.value)}
                    placeholder="例: 腰痛が3分で楽になる方法"
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">サブテキスト（任意）</label>
                  <input
                    type="text"
                    value={thumbnailSubText}
                    onChange={(e) => setThumbnailSubText(e.target.value)}
                    placeholder="例: 整体師が教える / ※個人差があります"
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">配色</label>
                  <div className="grid grid-cols-4 gap-1">
                    {[
                      { label: "赤×白", main: "#ff0000", sub: "#ffffff", bg: "rgba(0,0,0,0.7)" },
                      { label: "黄×黒", main: "#ffff00", sub: "#000000", bg: "rgba(0,0,0,0.8)" },
                      { label: "白×黒", main: "#ffffff", sub: "#000000", bg: "rgba(0,0,0,0.6)" },
                      { label: "緑×白", main: "#00ff00", sub: "#ffffff", bg: "rgba(0,0,0,0.7)" },
                      { label: "青×白", main: "#00bfff", sub: "#ffffff", bg: "rgba(0,0,0,0.7)" },
                      { label: "紫×白", main: "#c084fc", sub: "#ffffff", bg: "rgba(0,0,0,0.7)" },
                      { label: "橙×白", main: "#ff8c00", sub: "#ffffff", bg: "rgba(0,0,0,0.7)" },
                      { label: "桃×白", main: "#ff69b4", sub: "#ffffff", bg: "rgba(0,0,0,0.7)" },
                    ].map((cs, i) => (
                      <button
                        key={i}
                        onClick={() => setThumbnailColorScheme(cs)}
                        className={`py-1.5 rounded-lg text-[9px] font-medium transition-all border ${
                          thumbnailColorScheme.main === cs.main ? "border-indigo-500 bg-gray-700" : "border-gray-700 bg-gray-800 hover:bg-gray-700"
                        }`}
                      >
                        <span style={{ color: cs.main }}>■</span> {cs.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">テンプレート</label>
                  <div className="grid grid-cols-2 gap-1">
                    {[
                      "YouTube風\n大文字中央",
                      "下部グラデ",
                      "ビフォーアフター\n左右分割",
                      "警告・NG系\n赤バナー",
                      "ランキング\n数字大きく",
                      "セルフケア\n手順表示",
                      "患者の声\n星評価付き",
                      "院紹介\nシンプル",
                      "衝撃系\n黄×黒",
                      "CTA\n予約誘導",
                    ].map((label, i) => (
                      <button
                        key={i}
                        onClick={() => setThumbnailTemplate(i)}
                        className={`py-2 rounded-lg text-[10px] font-medium transition-all whitespace-pre-line leading-tight ${thumbnailTemplate === i ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* 画像アップロード */}
                <div className="space-y-2">
                  <label className="text-xs text-gray-400 block">画像を使う（任意）</label>
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2 space-y-1.5">
                    <p className="text-[9px] text-yellow-500/80">⚠️ 患者の顔写真を使用する場合は必ず書面で同意を取得し、個人が特定できないよう加工してください</p>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input type="checkbox" checked={patientConsentChecked} onChange={(e) => setPatientConsentChecked(e.target.checked)}
                        className="mt-0.5 rounded border-yellow-600 text-yellow-500 focus:ring-yellow-500" />
                      <span className="text-[10px] text-yellow-400">患者から書面による撮影・掲載の同意を取得済みです</span>
                    </label>
                  </div>
                  <div className={`grid grid-cols-1 gap-1.5 ${!patientConsentChecked ? "opacity-40 pointer-events-none" : ""}`}>
                    <div>
                      <input ref={thumbnailOverlayRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) { if (thumbnailOverlayImg) URL.revokeObjectURL(thumbnailOverlayImg); setThumbnailOverlayImg(URL.createObjectURL(f)); }
                      }} />
                      <button onClick={() => thumbnailOverlayRef.current?.click()} className="w-full py-2 bg-gray-800 border border-gray-700 rounded-lg text-[11px] text-gray-300 hover:bg-gray-700 transition-colors">
                        {thumbnailOverlayImg ? "✅ 背景画像を変更" : "🖼 背景画像をアップロード"}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <input ref={thumbnailBeforeRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) { if (thumbnailBeforeImg) URL.revokeObjectURL(thumbnailBeforeImg); setThumbnailBeforeImg(URL.createObjectURL(f)); }
                        }} />
                        <button onClick={() => thumbnailBeforeRef.current?.click()} className="w-full py-2 bg-gray-800 border border-gray-700 rounded-lg text-[10px] text-gray-300 hover:bg-gray-700">
                          {thumbnailBeforeImg ? "✅ Before" : "📷 Before画像"}
                        </button>
                      </div>
                      <div>
                        <input ref={thumbnailAfterRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) { if (thumbnailAfterImg) URL.revokeObjectURL(thumbnailAfterImg); setThumbnailAfterImg(URL.createObjectURL(f)); }
                        }} />
                        <button onClick={() => thumbnailAfterRef.current?.click()} className="w-full py-2 bg-gray-800 border border-gray-700 rounded-lg text-[10px] text-gray-300 hover:bg-gray-700">
                          {thumbnailAfterImg ? "✅ After" : "📷 After画像"}
                        </button>
                      </div>
                    </div>
                    {(thumbnailOverlayImg || thumbnailBeforeImg || thumbnailAfterImg) && (
                      <button onClick={() => {
                        if (thumbnailOverlayImg) URL.revokeObjectURL(thumbnailOverlayImg);
                        if (thumbnailBeforeImg) URL.revokeObjectURL(thumbnailBeforeImg);
                        if (thumbnailAfterImg) URL.revokeObjectURL(thumbnailAfterImg);
                        setThumbnailOverlayImg(null); setThumbnailBeforeImg(null); setThumbnailAfterImg(null);
                      }} className="text-[10px] text-red-400 hover:text-red-300">画像をリセット</button>
                    )}
                  </div>
                </div>

                {/* 装飾マーク */}
                <div>
                  <label className="text-xs text-gray-400 block mb-1">装飾マーク（複数選択可）</label>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { id: "arrow-right", label: "→ 矢印（右）" },
                      { id: "arrow-down", label: "↓ 矢印（下）" },
                      { id: "circle", label: "⭕ 丸マーク" },
                      { id: "cross", label: "✕ バツマーク" },
                      { id: "check", label: "✓ チェック" },
                      { id: "star", label: "★ 星マーク" },
                    ].map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setThumbnailMarks((prev) => prev.includes(m.id) ? prev.filter((x) => x !== m.id) : [...prev, m.id])}
                        className={`py-1.5 rounded-lg text-[10px] font-medium transition-all border ${
                          thumbnailMarks.includes(m.id) ? "border-indigo-500 bg-indigo-600/20 text-indigo-300" : "border-gray-700 bg-gray-800 text-gray-400 hover:bg-gray-700"
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleGenerateThumbnail}
                  className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-500 transition-colors"
                >
                  プレビューを生成 (1280x720)
                </button>
                {thumbnailPreviewUrl && (
                  <div className="space-y-2">
                    <div className="rounded-lg overflow-hidden border border-gray-700">
                      <img src={thumbnailPreviewUrl} alt="サムネイルプレビュー" className="w-full h-auto" />
                    </div>
                    <button
                      onClick={handleDownloadThumbnail}
                      className="w-full py-2.5 bg-orange-700 text-white rounded-xl text-sm font-bold hover:bg-orange-600 transition-colors"
                    >
                      サムネイルをダウンロード
                    </button>
                    {/* サムネイル品質スコア */}
                    {(() => {
                      let score = 0; const tips: string[] = [];
                      // テキストがあるか
                      if (thumbnailText.trim()) { score += 25; } else { tips.push("メインテキストを追加してください"); }
                      // サブテキストがあるか
                      if (thumbnailSubText.trim()) { score += 15; } else { tips.push("サブテキストを追加すると情報量UP"); }
                      // 画像を使っているか
                      if (thumbnailOverlayImg || thumbnailBeforeImg) { score += 20; } else { tips.push("画像を使うとクリック率UP"); }
                      // BA両方あるか
                      if (thumbnailBeforeImg && thumbnailAfterImg) { score += 15; } else if (thumbnailBeforeImg || thumbnailAfterImg) { tips.push("Before/After両方揃えると効果的"); }
                      // マーク（矢印等）があるか
                      if (thumbnailMarks.length > 0) { score += 10; } else { tips.push("矢印やマークを追加して視線誘導"); }
                      // テキストが短すぎないか
                      if (thumbnailText.length >= 5 && thumbnailText.length <= 20) { score += 10; } else if (thumbnailText.length > 20) { tips.push("テキストは20文字以内が最適"); } else { tips.push("テキストが短すぎます（5文字以上推奨）"); }
                      // 院名があるか
                      if (clinicProfile?.clinicName && thumbnailText.includes(clinicProfile.clinicName)) { score += 5; }
                      const color = score >= 80 ? "text-green-400" : score >= 50 ? "text-yellow-400" : "text-red-400";
                      const bgColor = score >= 80 ? "bg-green-950/30 border-green-800/50" : score >= 50 ? "bg-yellow-950/30 border-yellow-800/50" : "bg-red-950/30 border-red-800/50";
                      return (
                        <div className={`p-3 ${bgColor} border rounded-xl space-y-1`}>
                          <div className="flex items-center justify-between">
                            <p className="text-[11px] font-bold text-gray-200">サムネイル品質スコア</p>
                            <p className={`text-lg font-black ${color}`}>{score}<span className="text-[10px] text-gray-400">/100</span></p>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full transition-all ${score >= 80 ? "bg-green-500" : score >= 50 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${score}%` }} />
                          </div>
                          {tips.length > 0 && (
                            <div className="pt-1">
                              {tips.map((tip, i) => <p key={i} className="text-[9px] text-gray-400">💡 {tip}</p>)}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>

            {/* SNS Caption Generation */}
            <div className="pt-2 border-t border-gray-800">
              <h4 className="text-sm font-bold text-gray-200 mb-2">AI テキスト一括生成</h4>
              <p className="text-[10px] text-gray-500 mb-2">タイトル・説明文・ハッシュタグを一発生成</p>
              {!whisperApiKey && (
                <p className="text-xs text-yellow-400 mb-2">⚠️ 字幕ツールでOpenAI APIキーを設定してください</p>
              )}
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">プラットフォーム</label>
                  <div className="grid grid-cols-3 gap-1">
                    {(["Instagram", "YouTube", "TikTok"] as const).map((p) => (
                      <button key={p} onClick={() => setCaptionPlatform(p)} className={`py-2 rounded-lg text-xs font-medium transition-all ${captionPlatform === p ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>{p}</button>
                    ))}
                  </div>
                </div>
                {subtitles.length > 0 ? (
                  <p className="text-xs text-green-400">✅ 字幕データを使用します（{subtitles.length}件）</p>
                ) : (
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">動画の話題（字幕がない場合）</label>
                    <input
                      type="text"
                      value={captionTopic}
                      onChange={(e) => setCaptionTopic(e.target.value)}
                      placeholder="例: 腰痛改善のストレッチ紹介"
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}
                <button
                  onClick={handleGenerateCaption}
                  disabled={captionGenerating || !whisperApiKey}
                  className="w-full py-2.5 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-xl text-sm font-bold hover:from-pink-500 hover:to-purple-500 disabled:opacity-50 transition-all"
                >
                  {captionGenerating ? "生成中..." : "タイトル・説明・タグを一括生成"}
                </button>
                {(generatedTitle || generatedCaption) && (
                  <div className="space-y-2">
                    {/* Title */}
                    {generatedTitle && (
                      <div className="bg-gray-900 rounded-xl p-3 border border-gray-700">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[10px] text-gray-500 font-medium">タイトル</p>
                          <button
                            onClick={() => { try { navigator.clipboard.writeText(generatedTitle); setProgressMsg("タイトルをコピーしました"); } catch {} }}
                            className="text-[10px] text-indigo-400 hover:text-indigo-300"
                          >
                            コピー
                          </button>
                        </div>
                        <p className="text-sm text-white font-bold">{generatedTitle}</p>
                      </div>
                    )}
                    {/* Caption */}
                    {generatedCaption && (
                      <div className="bg-gray-900 rounded-xl p-3 border border-gray-700">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[10px] text-gray-500 font-medium">説明文</p>
                          <button
                            onClick={() => { try { navigator.clipboard.writeText(generatedCaption); setProgressMsg("説明文をコピーしました"); } catch {} }}
                            className="text-[10px] text-indigo-400 hover:text-indigo-300"
                          >
                            コピー
                          </button>
                        </div>
                        <p className="text-xs text-gray-300 whitespace-pre-wrap">{generatedCaption}</p>
                      </div>
                    )}
                    {/* Hashtags */}
                    {generatedHashtags.length > 0 && (
                      <div className="bg-gray-900 rounded-xl p-3 border border-gray-700">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[10px] text-gray-500 font-medium">ハッシュタグ</p>
                          <button
                            onClick={() => { try { navigator.clipboard.writeText(generatedHashtags.join(" ")); setProgressMsg("ハッシュタグをコピーしました"); } catch {} }}
                            className="text-[10px] text-indigo-400 hover:text-indigo-300"
                          >
                            コピー
                          </button>
                        </div>
                        <p className="text-xs text-indigo-300">{generatedHashtags.join(" ")}</p>
                      </div>
                    )}
                    {/* Copy all button */}
                    <button
                      onClick={() => {
                        const all = [generatedTitle, generatedCaption, generatedHashtags.join(" ")].filter(Boolean).join("\n\n");
                        try { navigator.clipboard.writeText(all); setProgressMsg("全テキストをコピーしました"); } catch {}
                      }}
                      className="w-full py-2 bg-gray-800 text-gray-300 rounded-lg text-xs font-medium hover:bg-gray-700 transition-colors"
                    >
                      全部まとめてコピー
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Clinic Profile */}
        {activeTool === "clinic-profile" && (
          <div className="space-y-4">
            <ClinicProfileSetup
              profile={clinicProfile}
              onSave={(p) => {
                setClinicProfile(p);
                setProgressMsg(`${p.clinicName}のプロフィールを保存しました。AI生成に反映されます。`);
              }}
            />
            {clinicProfile && (
              <div className="bg-gray-800 rounded-xl p-3 border border-gray-700">
                <h4 className="text-xs font-bold text-gray-300 mb-2">現在の設定</h4>
                <div className="space-y-1 text-[11px] text-gray-400">
                  <p><span className="text-gray-500">院名:</span> {clinicProfile.clinicName}</p>
                  {clinicProfile.area && <p><span className="text-gray-500">地域:</span> {clinicProfile.area}</p>}
                  {clinicProfile.phone && <p><span className="text-gray-500">TEL:</span> {clinicProfile.phone}</p>}
                  {clinicProfile.specialties.length > 0 && <p><span className="text-gray-500">得意:</span> {clinicProfile.specialties.join("、")}</p>}
                  {clinicProfile.treatmentStyle && <p><span className="text-gray-500">手技:</span> {clinicProfile.treatmentStyle}</p>}
                  {clinicProfile.target && <p><span className="text-gray-500">対象:</span> {clinicProfile.target}</p>}
                  {clinicProfile.strengths && <p><span className="text-gray-500">強み:</span> {clinicProfile.strengths}</p>}
                </div>
                <button
                  onClick={() => {
                    try { localStorage.removeItem("videoforge_clinic_profile"); } catch {}
                    setClinicProfile(null);
                    setProgressMsg("プロフィールをリセットしました");
                  }}
                  className="mt-2 text-[10px] text-red-400 hover:text-red-300"
                >
                  プロフィールをリセット
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      </div>{/* End Right Side */}
      </div>{/* End Main Content */}
    </div>
  );
}
