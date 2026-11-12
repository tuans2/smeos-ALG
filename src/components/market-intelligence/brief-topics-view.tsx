"use client";

import { Button } from "@/components/ui/button"
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Lightbulb } from "@/components/ui/icon-set/lightbulb"
import { Copy } from "@/components/ui/icon-set/copy"
import { Check } from "@/components/ui/icon-set/check"
import { Video } from "@/components/ui/icon-set/video"
import { Play } from "@/components/ui/icon-set/play"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { ArrowRight } from "@/components/ui/icon-set/arrow-right"
;
import type { OpportunityItem } from "./opportunity-card";
import { getDualOpportunityEvidencePreview } from "./opportunity-illustration";
import type { Route } from "next"

interface BriefTopicsViewProps {
  opportunities: OpportunityItem[];
  onSelectOpportunity: (item: OpportunityItem) => void;
}

function formatCleanHook(hook: string): string {
  const text = hook.trim();
  if (text.startsWith("Bật mí bí quyết chọn ") && text.endsWith(" không phải ai cũng biết")) {
    const raw = text.replace("Bật mí bí quyết chọn ", "").replace(" không phải ai cũng biết", "").trim();
    const clean = raw.includes(",") ? raw.split(",")[0]?.trim() || raw : raw;
    return `Bật mí bí quyết chọn ${clean} chuẩn gu & đong đầy tình cảm không phải ai cũng biết`;
  }
  if (text.startsWith("Gợi ý món quà tinh tế với ")) {
    const raw = text.replace("Gợi ý món quà tinh tế với ", "").trim();
    const clean = raw.includes(",") ? raw.split(",")[0]?.trim() || raw : raw;
    return `Gợi ý món quà tinh tế với ${clean} ý nghĩa & sang trọng`;
  }
  if (text.includes(",") && text.split(",").length >= 2) {
    const first = text.split(",")[0]?.trim() || text;
    return `${first} — Ý tưởng video thịnh hành`;
  }
  return text;
}

export function BriefTopicsView({
  opportunities,
  onSelectOpportunity,
}: BriefTopicsViewProps) {
  const router = useRouter();
  const [copiedHook, setCopiedHook] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<"ALL" | "VIRAL" | "TUTORIAL" | "GIFTING">("ALL");

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHook(text);
    setTimeout(() => setCopiedHook(null), 2000);
  };

  const handleCreateVideo = (topicName: string, hook: string) => {
    const cleanTopic = topicName.includes(",") ? topicName.split(",")[0]?.trim() || topicName : topicName;
    const prompt = `${cleanTopic} - ${hook}`;
    router.push(`/video?prompt=${encodeURIComponent(prompt)}` as Route);
  };

  // Trích xuất toàn bộ hooks từ danh sách cơ hội
  const allEntries: Array<{
    hook: string;
    topic: string;
    category: "VIRAL" | "TUTORIAL" | "GIFTING";
    item: OpportunityItem;
  }> = [];

  opportunities.forEach((item) => {
    if (Array.isArray(item.recommendedHooks)) {
      item.recommendedHooks.forEach((hk, idx) => {
        if (typeof hk === "string" && hk.trim()) {
          const category = idx % 3 === 0 ? "VIRAL" : idx % 3 === 1 ? "TUTORIAL" : "GIFTING";
          allEntries.push({
            hook: hk.trim(),
            topic: item.topicName,
            category,
            item,
          });
        }
      });
    }
  });

  const filteredEntries = allEntries.filter((e) => {
    if (activeCategory === "ALL") return true;
    return e.category === activeCategory;
  });

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Banner Thư Viện Kịch Bản Bán Hàng */}
      <div className="rounded-2xl border border-warning-border/90 bg-gradient-to-br from-warning-bg/70 via-white to-bg p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning text-text shadow-sm flex-shrink-0">
            <Lightbulb size={20} />
          </div>
          <div>
            <h3 className="text-body-sm font-extrabold text-text">Thư viện kịch bản &amp; câu mở đầu</h3>
            <p className="text-caption text-text-muted mt-0.5">
              Tổng hợp câu mở đầu giật tít để làm video TikTok, Reels và bài đăng Facebook bắt trọn cảm xúc khách hàng
            </p>
          </div>
        </div>

        {/* Filter nhóm nội dung */}
        <div className="flex items-center gap-1.5 text-caption font-bold bg-white p-1 rounded-xl border border-border self-start sm:self-auto">
          <Button variant="ghost"
            type="button"
            onClick={() => setActiveCategory("ALL")}
            className={`text-[length:inherit] h-auto font-[inherit] gap-0 px-2.5 py-1 rounded-lg transition ${
              activeCategory === "ALL" ? "bg-warning-text text-white hover:bg-warning-text" : "text-text-muted hover:text-text"
            }`}
          >
            Tất cả ({allEntries.length})
          </Button>
          <Button variant="ghost"
            type="button"
            onClick={() => setActiveCategory("VIRAL")}
            className={`text-[length:inherit] h-auto font-[inherit] gap-0 px-2.5 py-1 rounded-lg transition ${
              activeCategory === "VIRAL" ? "bg-warning-text text-white hover:bg-warning-text" : "text-text-muted hover:text-text"
            }`}
          >
            ⚡ Bắt trend
          </Button>
          <Button variant="ghost"
            type="button"
            onClick={() => setActiveCategory("TUTORIAL")}
            className={`text-[length:inherit] h-auto font-[inherit] gap-0 px-2.5 py-1 rounded-lg transition ${
              activeCategory === "TUTORIAL" ? "bg-warning-text text-white hover:bg-warning-text" : "text-text-muted hover:text-text"
            }`}
          >
            🎨 Hướng dẫn
          </Button>
          <Button variant="ghost"
            type="button"
            onClick={() => setActiveCategory("GIFTING")}
            className={`text-[length:inherit] h-auto font-[inherit] gap-0 px-2.5 py-1 rounded-lg transition ${
              activeCategory === "GIFTING" ? "bg-warning-text text-white hover:bg-warning-text" : "text-text-muted hover:text-text"
            }`}
          >
            🎁 Quà tặng
          </Button>
        </div>
      </div>

      {/* Grid Hook Cards Tương Tác */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {filteredEntries.map((entry, idx) => {
          const evidence = getDualOpportunityEvidencePreview(entry.item);
          const cleanHook = formatCleanHook(entry.hook);

          return (
            <div
              key={idx}
              className="rounded-2xl border border-border/90 bg-white p-4 space-y-3 shadow-2xs hover:border-warning hover:shadow-xs transition flex flex-col justify-between"
            >
              <div className="flex items-start gap-3">
                {/* Khung Chứa Cả 2 Thumbnail Video Thật: TikTok & YouTube */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {/* Thumbnail TikTok */}
                  <a
              href={evidence.tiktok.videoUrl || undefined}
              target="_blank"
              rel="noopener noreferrer"
                    title={`Mở xem dẫn chứng video thật trên TikTok: ${evidence.tiktok.title}`}
                    className="relative z-10 block h-14 w-14 sm:w-16 rounded-xl overflow-hidden flex-shrink-0 bg-text group/tiktok shadow-xs border border-border/90 cursor-pointer hover:border-primary transition-all hover:scale-[1.03]"
                  >
                    <img
                      src={evidence.tiktok.thumbnailUrl}
                      alt={evidence.tiktok.alt}
                      loading="lazy"
                      className="h-full w-full object-cover group-hover/tiktok:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

                    {/* Platform Badge TikTok */}
                    <div className="absolute top-1 left-1">
                      <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-black/85 text-white text-caption font-black uppercase tracking-wider backdrop-blur-xs border border-primary/30">
                        <Video className="h-2 w-2 text-white" />
                        TikTok
                      </span>
                    </div>

                    {/* Play icon overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-70 group-hover/tiktok:opacity-100 transition-opacity">
                      <div className="h-4.5 w-4.5 rounded-full bg-black/60 text-white flex items-center justify-center border border-primary/40">
                        <Play className="h-2 w-2 fill-current translate-x-0.2 text-white" />
                      </div>
                    </div>

                    {/* Author at bottom */}
                    <div className="absolute bottom-1 inset-x-1 flex items-center justify-between text-caption text-white/95 font-semibold drop-shadow-xs">
                      <span className="truncate" title={evidence.tiktok.author}>
                        {evidence.tiktok.author}
                      </span>
                    </div>
                  </a>

                  {/* Thumbnail YouTube */}
                  <a
              href={evidence.youtube.videoUrl || undefined}
              target="_blank"
              rel="noopener noreferrer"
                    title={`Mở xem dẫn chứng video thật trên YouTube: ${evidence.youtube.title}`}
                    className="relative z-10 block h-14 w-18 sm:w-20 rounded-xl overflow-hidden flex-shrink-0 bg-text group/yt shadow-xs border border-border/90 cursor-pointer hover:border-danger transition-all hover:scale-[1.03]"
                  >
                    <img
                      src={evidence.youtube.thumbnailUrl}
                      alt={evidence.youtube.alt}
                      loading="lazy"
                      className="h-full w-full object-cover group-hover/yt:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

                    {/* Platform Badge YouTube */}
                    <div className="absolute top-1 left-1">
                      <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-danger/90 text-white text-caption font-black uppercase tracking-wider backdrop-blur-xs">
                        <Play className="h-2 w-2 fill-current" />
                        YT
                      </span>
                    </div>

                    {/* Play icon overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-70 group-hover/yt:opacity-100 transition-opacity">
                      <div className="h-4.5 w-4.5 rounded-full bg-black/60 text-white flex items-center justify-center border border-white/40">
                        <Play className="h-2 w-2 fill-current translate-x-0.2 text-white" />
                      </div>
                    </div>

                    {/* Author at bottom */}
                    <div className="absolute bottom-1 inset-x-1 flex items-center justify-between text-caption text-white/95 font-semibold drop-shadow-xs">
                      <span className="truncate" title={evidence.youtube.author}>
                        {evidence.youtube.author}
                      </span>
                    </div>
                  </a>
                </div>

                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-caption font-bold px-2 py-0.5 rounded-full bg-warning-bg text-warning-text border border-warning-border/70">
                      {entry.category === "VIRAL" && "⚡ Bắt trend"}
                      {entry.category === "TUTORIAL" && "🎨 Hướng dẫn"}
                      {entry.category === "GIFTING" && "🎁 Quà tặng"}
                    </span>
                    <span className="text-caption font-semibold text-text-muted truncate">
                      {evidence.tiktok.metrics}
                    </span>
                  </div>

                  <p className="text-caption sm:text-body-sm italic font-semibold text-text leading-relaxed line-clamp-3">
                    &ldquo;{cleanHook}&rdquo;
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-border flex items-center justify-between gap-2">
                <Button variant="ghost"
                  type="button"
                  onClick={() => onSelectOpportunity(entry.item)}
                  className="h-auto p-0 gap-0 text-caption text-text-muted hover:text-primary font-bold underline"
                >
                  Xem chi tiết sản phẩm →
                </Button>

                <div className="flex items-center gap-1.5">
                  <Button variant="outline"
                    type="button"
                    onClick={() => handleCopy(cleanHook)}
                    className="h-auto inline-flex items-center gap-1 text-caption font-bold text-warning-text bg-warning-bg hover:bg-warning-bg px-2.5 py-1.5 rounded-lg border border-warning-border transition"
                    title="Sao chép kịch bản"
                  >
                    {copiedHook === cleanHook ? (
                      <>
                        <Check size={12} className="text-success-text" />
                        <span className="text-success-text">Đã chép!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        <span>Sao chép</span>
                      </>
                    )}
                  </Button>

                  <Button variant="primary"
                    type="button"
                    onClick={() => handleCreateVideo(entry.topic, cleanHook)}
                    className="h-auto inline-flex items-center gap-1 text-caption font-bold text-white bg-primary hover:bg-primary-dark px-3 py-1.5 rounded-lg shadow-2xs transition"
                    title="Tạo video kịch bản này ngay"
                  >
                    <Video size={12} />
                    <span>Tạo Video</span>
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
