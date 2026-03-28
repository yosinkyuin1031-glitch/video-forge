"use client";

import { useState, useMemo } from "react";
import { ViralTemplate, ClinicProfile, ViralScriptSegment } from "@/lib/types";
import { VIRAL_TEMPLATES, filterTemplates, getSymptomCategories, getFormatCategories } from "@/lib/viral-templates";

interface ViralTemplateGalleryProps {
  clinicProfile: ClinicProfile | null;
  onUseTemplate: (template: ViralTemplate) => void;
  onGenerateScript: (template: ViralTemplate) => void;
}

const PLATFORM_FILTERS = [
  { value: "all", label: "全部", icon: "📱" },
  { value: "reels", label: "Reels", icon: "📸" },
  { value: "tiktok", label: "TikTok", icon: "🎵" },
  { value: "youtube", label: "YouTube", icon: "🎬" },
  { value: "shorts", label: "Shorts", icon: "📹" },
];

function BuzzStars({ score }: { score: number }) {
  return (
    <span className="text-[10px]">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < score ? "text-yellow-400" : "text-gray-700"}>★</span>
      ))}
    </span>
  );
}

function SegmentBadge({ type }: { type: ViralScriptSegment["type"] }) {
  const map: Record<string, { bg: string; label: string }> = {
    hook: { bg: "bg-red-500/20 text-red-300", label: "フック" },
    problem: { bg: "bg-orange-500/20 text-orange-300", label: "問題提起" },
    solution: { bg: "bg-green-500/20 text-green-300", label: "解決策" },
    demonstration: { bg: "bg-blue-500/20 text-blue-300", label: "実演" },
    cta: { bg: "bg-purple-500/20 text-purple-300", label: "CTA" },
    bridge: { bg: "bg-gray-500/20 text-gray-300", label: "つなぎ" },
  };
  const info = map[type] || map.bridge;
  return <span className={`text-[9px] px-1.5 py-0.5 rounded ${info.bg}`}>{info.label}</span>;
}

function personalize(text: string, profile: ClinicProfile | null): string {
  if (!profile) return text;
  return text
    .replace(/\{院名\}/g, profile.clinicName || "{院名}")
    .replace(/\{地域\}/g, profile.area || "{地域}")
    .replace(/\{先生名\}/g, profile.clinicName.replace(/整体院|治療院|鍼灸院|接骨院|整骨院/g, "").trim() || "{先生名}")
    .replace(/\{症状\}/g, profile.specialties[0] || "{症状}")
    .replace(/\{得意症状\}/g, profile.specialties.join("・") || "{得意症状}")
    .replace(/\{強み1\}/g, profile.strengths?.split("。")[0] || "{強み1}")
    .replace(/\{強み2\}/g, profile.treatmentStyle || "{強み2}")
    .replace(/\{強み3\}/g, profile.achievements || "{強み3}");
}

export default function ViralTemplateGallery({ clinicProfile, onUseTemplate, onGenerateScript }: ViralTemplateGalleryProps) {
  const [selectedSymptom, setSelectedSymptom] = useState("すべて");
  const [selectedPlatform, setSelectedPlatform] = useState("all");
  const [selectedFormat, setSelectedFormat] = useState("すべて");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const symptoms = useMemo(() => getSymptomCategories(), []);
  const formats = useMemo(() => getFormatCategories(), []);

  const filtered = useMemo(
    () => filterTemplates({ symptom: selectedSymptom, platform: selectedPlatform, format: selectedFormat }),
    [selectedSymptom, selectedPlatform, selectedFormat]
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">🔥</span>
          <h3 className="text-sm font-bold text-gray-200">バズ動画テンプレート</h3>
          <span className="text-[10px] px-2 py-0.5 bg-yellow-500/20 text-yellow-300 rounded-full">{VIRAL_TEMPLATES.length}本</span>
        </div>
        <p className="text-[10px] text-gray-500">実際にバズった動画パターンを分析。症状を選んでテンプレを使うだけ。</p>
      </div>

      {/* Platform filter */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {PLATFORM_FILTERS.map((p) => (
          <button
            key={p.value}
            onClick={() => setSelectedPlatform(p.value)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all ${
              selectedPlatform === p.value
                ? "bg-indigo-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            {p.icon} {p.label}
          </button>
        ))}
      </div>

      {/* Symptom filter */}
      <div>
        <p className="text-[10px] text-gray-500 mb-1.5">症状で絞り込み</p>
        <div className="flex flex-wrap gap-1">
          {symptoms.map((s) => (
            <button
              key={s}
              onClick={() => setSelectedSymptom(s)}
              className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all ${
                selectedSymptom === s
                  ? "bg-purple-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Format filter */}
      <div>
        <p className="text-[10px] text-gray-500 mb-1.5">フォーマット</p>
        <div className="flex flex-wrap gap-1">
          {formats.map((f) => (
            <button
              key={f}
              onClick={() => setSelectedFormat(f)}
              className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all ${
                selectedFormat === f
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <p className="text-[10px] text-gray-500">{filtered.length}件のテンプレート</p>

      {/* Template cards */}
      <div className="space-y-2">
        {filtered.map((t) => {
          const isExpanded = expandedId === t.id;
          const totalDuration = t.scriptStructure.reduce((sum, s) => sum + s.duration, 0);

          return (
            <div key={t.id} className="bg-gray-800/80 rounded-xl border border-gray-700 overflow-hidden">
              {/* Card header */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : t.id)}
                className="w-full text-left p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        t.platform === "reels" ? "bg-pink-500/20 text-pink-300" :
                        t.platform === "tiktok" ? "bg-cyan-500/20 text-cyan-300" :
                        t.platform === "youtube" ? "bg-red-500/20 text-red-300" :
                        "bg-blue-500/20 text-blue-300"
                      }`}>
                        {t.platform}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-gray-700 rounded text-gray-300">{t.symptom}</span>
                      <BuzzStars score={t.buzzScore} />
                    </div>
                    <p className="text-xs font-bold text-white truncate">{t.name}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">{t.description}</p>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`text-gray-500 transition-transform mt-1 shrink-0 ${isExpanded ? "rotate-180" : ""}`}>
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </div>
                {/* Tags */}
                <div className="flex flex-wrap gap-1 mt-1.5">
                  <span className="text-[9px] px-1.5 py-0.5 bg-indigo-500/15 text-indigo-300 rounded">{t.format}</span>
                  <span className="text-[9px] px-1.5 py-0.5 bg-gray-700 text-gray-400 rounded">{t.aspectRatio}</span>
                  <span className="text-[9px] px-1.5 py-0.5 bg-gray-700 text-gray-400 rounded">{totalDuration}秒</span>
                </div>
              </button>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="px-3 pb-3 space-y-3 border-t border-gray-700 pt-3">
                  {/* Hook line */}
                  <div className="bg-red-500/10 rounded-lg p-2.5 border border-red-500/20">
                    <p className="text-[10px] text-red-400 font-bold mb-1">最初の3秒（フック）</p>
                    <p className="text-xs text-white">{personalize(t.hookLine, clinicProfile)}</p>
                  </div>

                  {/* Title pattern */}
                  <div>
                    <p className="text-[10px] text-gray-500 font-medium mb-1">タイトルパターン</p>
                    <p className="text-xs text-gray-300 bg-gray-900 rounded-lg px-2.5 py-2">{personalize(t.titlePattern, clinicProfile)}</p>
                  </div>

                  {/* Script structure */}
                  <div>
                    <p className="text-[10px] text-gray-500 font-medium mb-1.5">台本構成（{totalDuration}秒）</p>
                    <div className="space-y-1.5">
                      {t.scriptStructure.map((seg, i) => (
                        <div key={i} className="flex items-start gap-2 bg-gray-900/50 rounded-lg px-2.5 py-2">
                          <SegmentBadge type={seg.type} />
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] text-gray-200">{personalize(seg.text, clinicProfile)}</p>
                            {seg.note && <p className="text-[9px] text-gray-500 mt-0.5">{seg.note}</p>}
                          </div>
                          <span className="text-[9px] text-gray-500 shrink-0">{seg.duration}秒</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Thumbnail tips */}
                  <div>
                    <p className="text-[10px] text-gray-500 font-medium mb-1">サムネイルのコツ</p>
                    <p className="text-[11px] text-gray-300 bg-gray-900 rounded-lg px-2.5 py-2">{t.thumbnailTips}</p>
                  </div>

                  {/* Caption template */}
                  <div>
                    <p className="text-[10px] text-gray-500 font-medium mb-1">キャプション例</p>
                    <div className="bg-gray-900 rounded-lg px-2.5 py-2 relative">
                      <p className="text-[11px] text-gray-300 whitespace-pre-wrap">{personalize(t.captionTemplate, clinicProfile)}</p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          try { navigator.clipboard.writeText(personalize(t.captionTemplate, clinicProfile)); } catch {}
                        }}
                        className="absolute top-1.5 right-1.5 text-[9px] text-indigo-400 hover:text-indigo-300 px-1.5 py-0.5 bg-gray-800 rounded"
                      >
                        コピー
                      </button>
                    </div>
                  </div>

                  {/* Hashtags */}
                  <div>
                    <p className="text-[10px] text-gray-500 font-medium mb-1">推奨ハッシュタグ</p>
                    <div className="flex flex-wrap gap-1">
                      {t.hashtagStrategy.map((tag) => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-indigo-500/15 text-indigo-300 rounded">
                          {personalize(tag, clinicProfile)}
                        </span>
                      ))}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const tags = t.hashtagStrategy.map((tag) => personalize(tag, clinicProfile)).join(" ");
                        try { navigator.clipboard.writeText(tags); } catch {}
                      }}
                      className="text-[9px] text-indigo-400 hover:text-indigo-300 mt-1"
                    >
                      タグを全コピー
                    </button>
                  </div>

                  {/* Reference */}
                  {t.referenceNote && (
                    <p className="text-[9px] text-yellow-400/70 bg-yellow-500/5 rounded-lg px-2.5 py-1.5">
                      💡 {t.referenceNote}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); onGenerateScript(t); }}
                      className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-xs font-bold hover:from-purple-500 hover:to-indigo-500 transition-all"
                    >
                      AI台本を生成
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onUseTemplate(t); }}
                      className="flex-1 py-2.5 bg-gray-700 text-gray-200 rounded-xl text-xs font-bold hover:bg-gray-600 transition-all"
                    >
                      テロップを適用
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500 text-xs">該当するテンプレートがありません</p>
        </div>
      )}
    </div>
  );
}
