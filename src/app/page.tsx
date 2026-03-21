"use client";

import dynamic from "next/dynamic";

const VideoEditor = dynamic(() => import("@/components/VideoEditor"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-400">読み込み中...</p>
      </div>
    </div>
  ),
});

export default function Home() {
  return <VideoEditor />;
}
