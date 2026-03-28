"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-indigo-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.999L13.732 4.001c-.77-1.333-2.694-1.333-3.464 0L3.34 16.001C2.57 17.334 3.532 19 5.072 19z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-bold mb-2">エラーが発生しました</h2>
        <p className="text-gray-400 mb-6 text-sm">
          予期しないエラーが発生しました。もう一度お試しください。
        </p>
        <button
          onClick={reset}
          aria-label="ページを再読み込み"
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-colors"
        >
          もう一度試す
        </button>
      </div>
    </div>
  );
}
