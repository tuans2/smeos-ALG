"use client";

import React, { useState } from "react";
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { Clock } from "@/components/ui/icon-set/clock"
import { Coins } from "@/components/ui/icon-set/coins"
import { Film } from "@/components/ui/icon-set/film"
import { Music } from "@/components/ui/icon-set/music"
import { Mic } from "@/components/ui/icon-set/mic"
import { Type } from "@/components/ui/icon-set/type"
;
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import {
  VideoFormat,
  VIDEO_FORMAT_SPECS,
  CaptionStyle,
  CAPTION_STYLE_SPECS,
} from "@/modules/video-studio/domain/video-types";

interface VideoCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    format: VideoFormat;
    musicTrack?: string | undefined;
    voiceCode?: string | undefined;
    captionStyle?: CaptionStyle | undefined;
  }) => Promise<void>;
}

export function VideoCreateModal({
  isOpen,
  onClose,
  onSubmit,
}: VideoCreateModalProps) {
  const [format, setFormat] = useState<VideoFormat>("REEL_15S");
  const [title, setTitle] = useState("Video giới thiệu sản phẩm tươi");
  const [musicTrack, setMusicTrack] = useState("Acoustic Warm Guitar");
  const [voiceCode, setVoiceCode] = useState("vi-VN-Standard-A");
  const [captionStyle, setCaptionStyle] = useState<CaptionStyle>("MODERN_BADGE");
  const [loading, setLoading] = useState(false);

  const currentSpec = VIDEO_FORMAT_SPECS[format];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    try {
      await onSubmit({
        title: title.trim(),
        format,
        musicTrack: musicTrack || undefined,
        voiceCode: voiceCode || undefined,
        captionStyle,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !loading) onClose();
      }}
      size="lg"
      title={
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Film size={18} />
          </div>
          <span>Khởi tạo Video Marketing AI</span>
        </div>
      }
      description="Chọn khuôn định dạng và cấu hình ban đầu cho video thương mại"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button
            variant="ghost"
            type="button"
            onClick={onClose}
            disabled={loading}
          >
            Hủy bỏ
          </Button>
          <Button
            type="submit"
            form="video-create-form"
            disabled={loading || !title.trim()}
            className="gap-2 shadow-xs"
          >
            <Sparkles size={15} />
            {loading ? "Đang khởi tạo..." : "Tạo & Dựng kịch bản"}
          </Button>
        </div>
      }
    >
      <form
        id="video-create-form"
        onSubmit={handleSubmit}
        className="flex flex-col gap-5 text-caption"
      >
        {/* 1. Chọn khuôn video */}
        <div>
          <label className="text-caption font-bold text-text block mb-2">
            1. Chọn khuôn định dạng video (6 chuẩn thương mại)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {(Object.keys(VIDEO_FORMAT_SPECS) as VideoFormat[]).map((fmtKey) => {
              const spec = VIDEO_FORMAT_SPECS[fmtKey];
              const isSelected = format === fmtKey;
              return (
                <Button variant="outline"
                  type="button"
                  key={fmtKey}
                  aria-pressed={isSelected}
                  onClick={() => setFormat(fmtKey)}
                  className={`text-[length:inherit] h-auto font-[inherit] text-left rounded-xl border p-3 transition-all flex flex-col justify-between gap-1.5 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary hover:bg-primary/5"
                      : "border-border bg-surface hover:border-border-hover hover:bg-surface"
                  }`}
                >
                  <div className="flex items-start justify-between gap-1 w-full">
                    <span className="text-caption font-bold text-text">{spec.label}</span>
                    <Badge tone={isSelected ? "success" : "neutral"} className="text-caption px-1.5 py-0">
                      {spec.aspectRatio}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-caption text-text-muted mt-1 w-full">
                    <span className="flex items-center gap-1">
                      <Clock size={11} /> khoảng {spec.targetDurationSeconds} giây
                    </span>
                    <span className="font-semibold text-warning-text flex items-center gap-0.5">
                      <Coins size={11} /> {spec.defaultCreditCost} credits
                    </span>
                  </div>
                </Button>
              );
            })}
          </div>
        </div>

        {/* 2. Tiêu đề video */}
        <div>
          <label className="text-caption font-bold text-text block mb-1.5">
            2. Tên chiến dịch / Tiêu đề video
          </label>
          <Input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="VD: Video giới thiệu sản phẩm hồng Valentine..."
            className="text-caption"
          />
        </div>

        {/* 3. Âm nhạc & Lồng tiếng */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-caption font-semibold text-text-muted flex items-center gap-1 mb-1.5">
              <Music size={13} /> Nhạc nền (Bản quyền miễn phí)
            </label>
            <NativeSelect
              value={musicTrack}
              onChange={(e) => setMusicTrack(e.target.value)}
              className="w-full text-caption"
            >
              <option value="Acoustic Warm Guitar">Acoustic Warm Guitar</option>
              <option value="Upbeat Cheerful Pop">Upbeat Cheerful Pop</option>
              <option value="Lo-Fi Chill Beats">Lo-Fi Chill Beats</option>
              <option value="Romantic Piano Melody">Romantic Piano Melody</option>
              <option value="">Không sử dụng nhạc nền</option>
            </NativeSelect>
          </div>

          <div>
            <label className="text-caption font-semibold text-text-muted flex items-center gap-1 mb-1.5">
              <Mic size={13} /> Giọng đọc lồng tiếng AI
            </label>
            <NativeSelect
              value={voiceCode}
              onChange={(e) => setVoiceCode(e.target.value)}
              className="w-full text-caption"
            >
              <option value="vi-VN-Standard-A">Tiếng Việt - Nữ truyền cảm</option>
              <option value="vi-VN-Standard-B">Tiếng Việt - Nam ấm áp</option>
              <option value="vi-VN-Standard-C">Tiếng Việt - Nữ trẻ trung</option>
              <option value="">Không sử dụng giọng đọc</option>
            </NativeSelect>
          </div>
        </div>

        {/* 4. Phong cách Phụ đề (Caption Styles) */}
        <div>
          <label className="text-caption font-semibold text-text-muted flex items-center gap-1 mb-2">
            <Type size={13} /> Phong cách Phụ đề chữ trên Video (Caption Styles)
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {(Object.keys(CAPTION_STYLE_SPECS) as CaptionStyle[]).map((stKey) => {
              const spec = CAPTION_STYLE_SPECS[stKey];
              const isSel = captionStyle === stKey;
              return (
                <Button variant="outline"
                  type="button"
                  key={stKey}
                  aria-pressed={isSel}
                  onClick={() => setCaptionStyle(stKey)}
                  className={`h-auto font-[inherit] text-left rounded-xl p-2.5 border transition-all text-caption flex flex-col justify-between gap-1 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                    isSel
                      ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary hover:bg-primary/10"
                      : "border-border bg-surface hover:border-border-hover hover:bg-surface"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold text-caption text-text">{spec.label}</span>
                    {isSel && (
                      <span className="h-2 w-2 rounded-full bg-primary" />
                    )}
                  </div>
                  <span className="text-caption text-text-muted leading-tight line-clamp-2">
                    {spec.description}
                  </span>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Chi phí ước tính */}
        <div className="rounded-xl bg-surface-alt border border-border p-3.5 flex items-center justify-between text-caption">
          <div className="flex flex-col">
            <span className="font-bold text-text">Dự toán hạn mức:</span>
            <span className="text-text-muted text-caption">
              {format === "SLIDESHOW" ? "Slideshow cục bộ chi phí $0 API" : "Bao gồm chi phí AI Dựng hình & Giọng đọc"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-body-sm font-extrabold text-warning-text">
            <Coins size={15} />
            {currentSpec?.defaultCreditCost} Credits
          </div>
        </div>
      </form>
    </Dialog>
  );
}
