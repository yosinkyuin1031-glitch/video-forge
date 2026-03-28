"use client";

import dynamic from "next/dynamic";

const VideoEditor = dynamic(() => import("@/components/VideoEditor"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen p-4">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-4">
        <div className="h-8 w-40 bg-white/10 rounded-lg animate-pulse" />
        <div className="flex gap-2">
          <div className="h-9 w-24 bg-white/10 rounded-lg animate-pulse" />
          <div className="h-9 w-24 bg-white/10 rounded-lg animate-pulse" />
        </div>
      </div>
      {/* Main content skeleton */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-8">
          <div className="aspect-video bg-white/10 rounded-xl animate-pulse mb-4" />
          <div className="h-16 bg-white/10 rounded-lg animate-pulse" />
        </div>
        <div className="col-span-4 space-y-3">
          <div className="h-10 bg-white/10 rounded-lg animate-pulse" />
          <div className="h-32 bg-white/10 rounded-lg animate-pulse" />
          <div className="h-32 bg-white/10 rounded-lg animate-pulse" />
        </div>
      </div>
    </div>
  ),
});

export default function Home() {
  return <VideoEditor />;
}
