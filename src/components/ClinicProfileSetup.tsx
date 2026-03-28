"use client";

import { useState } from "react";
import { ClinicProfile } from "@/lib/types";

const SPECIALTY_OPTIONS = [
  "腰痛", "肩こり", "頭痛", "膝痛", "坐骨神経痛",
  "自律神経失調症", "睡眠障害", "めまい", "耳鳴り",
  "脊柱管狭窄症", "ヘルニア", "五十肩", "ぎっくり腰",
  "スポーツ障害", "産後骨盤矯正", "姿勢改善",
  "冷え性", "更年期障害", "顎関節症", "猫背",
];

const TONE_OPTIONS: { value: ClinicProfile["tone"]; label: string; desc: string }[] = [
  { value: "professional", label: "専門的", desc: "信頼感・権威性重視" },
  { value: "friendly", label: "親しみやすい", desc: "カジュアルで話しかけるように" },
  { value: "warm", label: "温かい", desc: "寄り添い・安心感重視" },
  { value: "energetic", label: "元気", desc: "明るく前向きなトーン" },
];

const STORAGE_KEY = "videoforge_clinic_profile";

interface ClinicProfileSetupProps {
  profile: ClinicProfile | null;
  onSave: (profile: ClinicProfile) => void;
}

export default function ClinicProfileSetup({ profile, onSave }: ClinicProfileSetupProps) {
  const [clinicName, setClinicName] = useState(profile?.clinicName || "");
  const [area, setArea] = useState(profile?.area || "");
  const [specialties, setSpecialties] = useState<string[]>(profile?.specialties || []);
  const [customSpecialty, setCustomSpecialty] = useState("");
  const [treatmentStyle, setTreatmentStyle] = useState(profile?.treatmentStyle || "");
  const [target, setTarget] = useState(profile?.target || "");
  const [strengths, setStrengths] = useState(profile?.strengths || "");
  const [achievements, setAchievements] = useState(profile?.achievements || "");
  const [tone, setTone] = useState<ClinicProfile["tone"]>(profile?.tone || "warm");

  const toggleSpecialty = (s: string) => {
    setSpecialties((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  const addCustomSpecialty = () => {
    const trimmed = customSpecialty.trim();
    if (trimmed && !specialties.includes(trimmed)) {
      setSpecialties((prev) => [...prev, trimmed]);
      setCustomSpecialty("");
    }
  };

  const handleSave = () => {
    const p: ClinicProfile = {
      clinicName,
      area,
      specialties,
      treatmentStyle,
      target,
      strengths,
      achievements,
      tone,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    } catch {}
    onSave(p);
  };

  const isValid = clinicName.trim().length > 0;

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">🏥</span>
          <h3 className="text-sm font-bold text-gray-200">院のプロフィール設定</h3>
        </div>
        <p className="text-[10px] text-gray-500">設定するとAI生成が院の特色に合わせた内容になります</p>
      </div>

      {/* 院名 */}
      <div>
        <label className="text-xs text-gray-400 block mb-1">
          院名 <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={clinicName}
          onChange={(e) => setClinicName(e.target.value)}
          placeholder="例: 大口神経整体院"
          className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* 地域 */}
      <div>
        <label className="text-xs text-gray-400 block mb-1">地域・エリア</label>
        <input
          type="text"
          value={area}
          onChange={(e) => setArea(e.target.value)}
          placeholder="例: 横浜市青葉区"
          className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* 得意症状 */}
      <div>
        <label className="text-xs text-gray-400 block mb-1">得意な症状（複数選択可）</label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {SPECIALTY_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => toggleSpecialty(s)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                specialties.includes(s)
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={customSpecialty}
            onChange={(e) => setCustomSpecialty(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCustomSpecialty()}
            placeholder="その他の症状を追加..."
            className="flex-1 px-3 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-[11px] text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={addCustomSpecialty}
            disabled={!customSpecialty.trim()}
            className="px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg text-[11px] hover:bg-gray-600 disabled:opacity-40 transition-colors"
          >
            追加
          </button>
        </div>
        {specialties.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {specialties.map((s) => (
              <span key={s} className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-600/20 text-indigo-300 rounded-md text-[10px]">
                {s}
                <button onClick={() => toggleSpecialty(s)} className="text-indigo-400 hover:text-white">x</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 治療スタイル */}
      <div>
        <label className="text-xs text-gray-400 block mb-1">治療スタイル・手技</label>
        <input
          type="text"
          value={treatmentStyle}
          onChange={(e) => setTreatmentStyle(e.target.value)}
          placeholder="例: 神経整体（バキバキしない優しい施術）"
          className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* ターゲット */}
      <div>
        <label className="text-xs text-gray-400 block mb-1">メインターゲット</label>
        <input
          type="text"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="例: 30〜50代の女性、デスクワーカー"
          className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* 強み */}
      <div>
        <label className="text-xs text-gray-400 block mb-1">院の強み・特徴</label>
        <textarea
          value={strengths}
          onChange={(e) => setStrengths(e.target.value)}
          placeholder="例: 再発させない根本治療。神経学的検査で原因を特定し、神経の流れを整える独自メソッド。"
          rows={2}
          className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 resize-none"
        />
      </div>

      {/* 実績 */}
      <div>
        <label className="text-xs text-gray-400 block mb-1">実績・数字</label>
        <input
          type="text"
          value={achievements}
          onChange={(e) => setAchievements(e.target.value)}
          placeholder="例: 年間2,000人施術、口コミ4.8、開業10年"
          className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* トーン */}
      <div>
        <label className="text-xs text-gray-400 block mb-1">発信のトーン</label>
        <div className="grid grid-cols-2 gap-2">
          {TONE_OPTIONS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTone(t.value)}
              className={`p-2.5 rounded-xl border-2 text-left transition-all ${
                tone === t.value
                  ? "border-indigo-500 bg-indigo-900/30"
                  : "border-gray-700 bg-gray-800 hover:border-gray-600"
              }`}
            >
              <div className="text-xs font-bold text-gray-200">{t.label}</div>
              <div className="text-[10px] text-gray-500 mt-0.5">{t.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={!isValid}
        className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-bold hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 transition-all"
      >
        プロフィールを保存
      </button>

      {profile && (
        <p className="text-[10px] text-green-400 text-center">現在のプロフィール: {profile.clinicName}</p>
      )}
    </div>
  );
}
