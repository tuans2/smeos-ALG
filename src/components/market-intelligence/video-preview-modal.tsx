"use client";

import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import React, { useEffect } from "react";
import { ExternalLink } from "@/components/ui/icon-set/external-link"
import { Play } from "@/components/ui/icon-set/play"
import { Film } from "@/components/ui/icon-set/film"
;

export interface VideoPreviewModalData {
  title: string;
  videoUrl?: string;
  youtubeUrl?: string;
  tiktokUrl?: string;
  thumbnailUrl?: string;
  author?: string;
  metrics?: string;
  topicName?: string;
}

interface VideoPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: VideoPreviewModalData | null;
}

/**
 * Trích xuất YouTube Video ID từ nhiều định dạng URL khác nhau
 * (watch?v=, youtu.be/, embed/, shorts/, hoặc CDN thumbnail i.ytimg.com/vi/)
 */
export function extractYouTubeVideoId(url?: string): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/)|i\.ytimg\.com\/vi\/)([\w-]{11})/
  );
  return match && match[1] ? match[1] : null;
}

export function VideoPreviewModal({ isOpen, onClose, data }: VideoPreviewModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !data) return null;

  // Tìm YouTube Video ID từ youtubeUrl, videoUrl hoặc thumbnailUrl
  const ytId =
    extractYouTubeVideoId(data.youtubeUrl) ||
    extractYouTubeVideoId(data.videoUrl) ||
    extractYouTubeVideoId(data.thumbnailUrl);

  const directExternalUrl = data.youtubeUrl || data.videoUrl || (ytId ? `https://www.youtube.com/watch?v=${ytId}` : undefined);

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }} size="lg"
      title={data.title || "Video xu hướng"}
      description={data.topicName ? `Dẫn chứng video • ${data.topicName}` : "Dẫn chứng video"}>
      <div className="-m-5 sm:-m-6 flex flex-col bg-text">
        {/* Video Player Area */}
        <div className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden">
          {ytId ? (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1`}
              title={data.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="w-full h-full border-0"
            />
          ) : data.videoUrl?.endsWith(".mp4") ? (
            <video
              src={data.videoUrl}
              controls
              autoPlay
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="text-center p-6 space-y-3">
              <div className="w-12 h-12 rounded-full bg-text text-text-muted flex items-center justify-center mx-auto">
                <Play size={20} className="translate-x-0.5" />
              </div>
              <p className="text-caption text-text-muted">
                Video này có định dạng xem trực tiếp trên nền tảng nguồn
              </p>
              {directExternalUrl && (
                <a
                  href={directExternalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary text-white text-caption font-bold transition-colors"
                >
                  <span>Mở video trên tab mới</span>
                  <ExternalLink size={13} />
                </a>
              )}
            </div>
          )}
        </div>

        {/* Footer Meta & Controls */}
        <div className="px-4 py-2.5 bg-text/90 border-t border-text/80 flex flex-wrap items-center justify-between gap-2 text-caption">
          <div className="flex items-center gap-3 text-surface text-caption">
            {data.author && (
              <span>
                Kênh: <strong className="text-surface">{data.author}</strong>
              </span>
            )}
            {data.metrics && (
              <span>
                Chỉ số: <span className="text-warning-text font-semibold">{data.metrics}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {directExternalUrl && (
              <a
                href={directExternalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-text hover:bg-text text-surface hover:text-white text-caption font-semibold transition-colors"
              >
                <span>Xem trên YouTube</span>
                <ExternalLink size={11} />
              </a>
            )}
            {data.tiktokUrl && (
              <a
                href={data.tiktokUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-text hover:bg-text text-surface hover:text-white text-caption font-semibold transition-colors"
              >
                <span>Kênh TikTok</span>
                <ExternalLink size={11} />
              </a>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
