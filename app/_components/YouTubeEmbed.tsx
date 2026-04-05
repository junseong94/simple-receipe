"use client";

import { useState } from "react";

interface YouTubeEmbedProps {
  url: string;
  title?: string;
}

/**
 * YouTube URL에서 videoId를 추출합니다.
 * 지원 형식:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 */
function isValidVideoId(id: string): boolean {
  return /^[A-Za-z0-9_-]{11}$/.test(id);
}

function extractVideoId(url: string): string | null {
  const patterns = [
    /[?&]v=([^&#]+)/,
    /youtu\.be\/([^?&#]+)/,
    /\/embed\/([^?&#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1] && isValidVideoId(match[1])) {
      return match[1];
    }
  }

  return null;
}

export default function YouTubeEmbed({ url, title }: YouTubeEmbedProps) {
  const [activated, setActivated] = useState(false);
  const videoId = extractVideoId(url);

  if (!videoId) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
        <p className="text-sm text-gray-500">영상을 불러올 수 없습니다</p>
      </div>
    );
  }

  if (!activated) {
    return (
      <div
        className="relative aspect-video w-full cursor-pointer overflow-hidden rounded-xl bg-gray-100"
        onClick={() => setActivated(true)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
          alt={title ?? "YouTube 동영상 썸네일"}
          className="h-full w-full object-cover"
        />
        {/* 재생 버튼 오버레이 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 shadow-lg">
            <svg
              className="ml-1 h-7 w-7 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl">
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
        title={title ?? "YouTube 동영상"}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        className="absolute inset-0 h-full w-full"
      />
    </div>
  );
}
